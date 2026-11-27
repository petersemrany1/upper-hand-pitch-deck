// Ported from the Legal app (family-law-floater/src/lib/cold-calling/cold-calling.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Server-only helpers for the Firm Cold Call Portal: privileged DB access, the
// TwiML for a prospect call and Twilio status handling.
// Never import from client code.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/legal/integrations/supabase/types";

import { COLD_CALLING_SETTINGS_KEY, parseSettings, type ColdCallingSettings } from "./settings";
import {
  CONNECTED_TELEPHONY_STATUSES,
  TELEPHONY_STATUS_RANK,
  isTerminalTelephonyStatus,
} from "./types";

export type Db = SupabaseClient<Database>;

/**
 * Service-role client when the key is configured (production), otherwise the
 * caller's own RLS-scoped client. The fallback keeps local admin testing
 * working; a non-admin caller on a misconfigured deployment gets an RLS error,
 * never elevated access.
 */
export async function privilegedClient(fallback: Db): Promise<Db> {
  if (!legalEnv["SUPABASE_SERVICE_ROLE_KEY"]) return fallback;
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

export async function loadSettings(db: Db): Promise<ColdCallingSettings> {
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", COLD_CALLING_SETTINGS_KEY)
    .maybeSingle();
  return parseSettings(data?.value ?? null);
}

export async function audit(
  db: Db,
  actorUserId: string | null,
  action: string,
  prospectFirmId: string | null,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await db.from("cold_calling_audit_log").insert({
    actor_user_id: actorUserId,
    action,
    prospect_firm_id: prospectFirmId,
    detail: detail as never,
  });
  if (error) console.error("[cold-calling] audit insert failed", error.message);
}

function say(message: string): string {
  return `<Response><Say voice="alice">${message}</Say><Hangup/></Response>`;
}

/**
 * TwiML for a prospect call, reached from the TwiML App's outbound webhook when
 * the browser passes ProspectAttemptId. The dialled number and caller
 * ID come from the attempt row — never from the request — and every guard is
 * re-checked immediately before the <Dial>.
 */
export async function prospectDialTwiml(attemptId: string, parentCallSid: string): Promise<string> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { publicBaseUrl, xmlEscape } = await import("@/legal/lib/twilio.server");
  const db = supabaseAdmin as unknown as Db;

  const { data: attempt } = await db
    .from("prospect_call_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return say("This call could not be placed. The attempt record was not found.");
  if (attempt.ended_at) return say("This call attempt has already ended.");

  const { data: firm } = await db
    .from("prospect_firms")
    .select("id, do_not_contact, phone_e164, state, prospect_status")
    .eq("id", attempt.prospect_firm_id)
    .maybeSingle();
  const block = async (reason: string) => {
    await db
      .from("prospect_call_attempts")
      .update({ telephony_status: "blocked", ended_at: new Date().toISOString(), notes: reason })
      .eq("id", attemptId);
    return say(reason);
  };
  if (!firm) return block("The firm record was not found.");
  if (firm.do_not_contact)
    return block("This firm is marked do not contact. The call was blocked.");
  if (firm.phone_e164 !== attempt.to_number)
    return block("The firm's number changed since the call was queued. The call was blocked.");
  const { data: suppressed } = await db.rpc("is_phone_suppressed", { p: attempt.to_number });
  if (suppressed === true)
    return block("This number is on the suppression list. The call was blocked.");
  // A number can be retired after the browser prepares the attempt. Check at
  // the last moment before issuing Dial, including attempts already queued.
  const { data: callerId, error: callerIdError } = await db
    .from("phone_numbers")
    .select("id, number, status, verified_with_twilio, can_receive_return_calls")
    .eq("number", attempt.outbound_caller_id_number)
    .maybeSingle();
  if (
    callerIdError ||
    !callerId ||
    callerId.status !== "active" ||
    callerId.verified_with_twilio === false ||
    callerId.can_receive_return_calls === false
  )
    return block(
      "The outbound number is no longer available. Start a new call to use an active number.",
    );
  const settings = await loadSettings(db);

  // Link the Twilio parent call and the durable call_records row.
  let callRecordId = attempt.call_record_id;
  if (!callRecordId && parentCallSid) {
    const { data: created, error: recordError } = await db
      .from("call_records")
      .insert({
        lead_id: null,
        rep_id: attempt.caller_rep_id,
        twilio_call_sid: parentCallSid,
        direction: "outbound",
        call_status: "initiated",
      })
      .select("id")
      .single();
    callRecordId = created?.id ?? null;
    if (recordError) {
      console.error("[cold-calling] call_records insert failed", recordError.message);
      await db.from("error_logs").insert({
        source: "prospect_call",
        message: `call_records insert failed: ${recordError.message}`,
        detail: { attemptId, parentCallSid } as never,
      });
    }
  }
  if (!parentCallSid) {
    await db.from("error_logs").insert({
      source: "prospect_call",
      message: "No CallSid on the outbound TwiML request",
      detail: { attemptId } as never,
    });
  }
  await db
    .from("prospect_call_attempts")
    .update({
      twilio_call_sid: attempt.twilio_call_sid ?? (parentCallSid || null),
      call_record_id: callRecordId,
    })
    .eq("id", attemptId);

  const base = publicBaseUrl();
  const statusUrl = `${base}/api/public/hooks/twilio-status`;
  const recordingUrl = `${base}/api/public/hooks/twilio-recording`;
  // Every prospect call is recorded so a "Zoom set" call can be transcribed
  // and handed over to Peter by email.
  const recordAttrs = ` record="record-from-answer-dual" recordingStatusCallback="${xmlEscape(recordingUrl)}" recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed"`;
  return (
    `<Response><Dial callerId="${xmlEscape(attempt.outbound_caller_id_number)}" answerOnBridge="true" ringTone="au"` +
    ` timeout="${settings.call_timeout_seconds}"${recordAttrs}>` +
    `<Number statusCallback="${xmlEscape(statusUrl)}" statusCallbackMethod="POST"` +
    ` statusCallbackEvent="initiated ringing answered completed">${xmlEscape(attempt.to_number)}</Number></Dial></Response>`
  );
}

/**
 * Apply a Twilio status callback to the matching prospect attempt. Idempotent:
 * statuses only move forward, repeated deliveries are no-ops, and the child
 * (firm) leg's terminal status is never overwritten by the parent leg.
 */
export async function applyProspectTelephonyStatus(
  params: Record<string, string>,
): Promise<boolean> {
  const sid = params["CallSid"] ?? "";
  const parent = params["ParentCallSid"] ?? "";
  const status = params["CallStatus"] ?? "";
  if (!sid || !status) return false;

  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const ids = [sid, parent].filter(Boolean);
  const { data: rows } = await db
    .from("prospect_call_attempts")
    .select(
      "id, twilio_call_sid, twilio_child_call_sid, telephony_status, connected_at, ended_at, started_at, call_record_id",
    )
    .or(ids.flatMap((s) => [`twilio_call_sid.eq.${s}`, `twilio_child_call_sid.eq.${s}`]).join(","))
    .limit(1);
  const attempt = rows?.[0];
  if (!attempt) return false;

  const isChild = !!parent && parent === attempt.twilio_call_sid;
  const patch: Record<string, unknown> = {};
  if (!attempt.call_record_id && attempt.twilio_call_sid) {
    const { data: rec } = await db
      .from("call_records")
      .select("id")
      .eq("twilio_call_sid", attempt.twilio_call_sid)
      .limit(1)
      .maybeSingle();
    if (rec) patch["call_record_id"] = rec.id;
  }
  if (isChild && !attempt.twilio_child_call_sid) patch["twilio_child_call_sid"] = sid;

  const currentRank = TELEPHONY_STATUS_RANK[attempt.telephony_status] ?? -1;
  const nextRank = TELEPHONY_STATUS_RANK[status] ?? -1;
  const childAlreadyTerminal =
    !!attempt.twilio_child_call_sid && isTerminalTelephonyStatus(attempt.telephony_status);
  const fromParentAfterChild = !isChild && childAlreadyTerminal;

  if (nextRank >= currentRank && !fromParentAfterChild && status !== attempt.telephony_status) {
    // Parent-leg "completed" must not masquerade as an answered firm call.
    const parentCompleted = !isChild && status === "completed" && !attempt.connected_at;
    patch["telephony_status"] =
      parentCompleted && !attempt.twilio_child_call_sid ? "canceled" : status;
  }
  if (CONNECTED_TELEPHONY_STATUSES.has(status) && isChild && !attempt.connected_at) {
    patch["connected_at"] = new Date().toISOString();
  }
  if (isTerminalTelephonyStatus(status) && !attempt.ended_at) {
    patch["ended_at"] = new Date().toISOString();
  }
  const duration = params["CallDuration"] ? Number(params["CallDuration"]) : null;
  if (isChild && duration !== null && Number.isFinite(duration))
    patch["duration_seconds"] = duration;

  if (Object.keys(patch).length === 0) return true;
  const { error } = await db
    .from("prospect_call_attempts")
    .update(patch as never)
    .eq("id", attempt.id);
  if (error) console.error("[cold-calling] status update failed", error.message);
  return true;
}

// ------------------------------------------------------------- handover ----

/** Is this call record one of ours? Returns the attempt id if so. */
export async function prospectAttemptForCallRecord(
  callRecordId: string,
  callSid?: string | null,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const { data } = await db
    .from("prospect_call_attempts")
    .select("id")
    .eq("call_record_id", callRecordId)
    .limit(1)
    .maybeSingle();
  if (data) return data.id;
  // Fallback: the TwiML step may have failed to link the record — match on the parent call SID.
  if (callSid) {
    const { data: bySid } = await db
      .from("prospect_call_attempts")
      .select("id, call_record_id")
      .or(`twilio_call_sid.eq.${callSid},twilio_child_call_sid.eq.${callSid}`)
      .limit(1)
      .maybeSingle();
    if (bySid) {
      if (!bySid.call_record_id)
        await db
          .from("prospect_call_attempts")
          .update({ call_record_id: callRecordId })
          .eq("id", bySid.id);
      return bySid.id;
    }
  }
  return null;
}

/**
 * Transcribe a prospect call's recording (once) and, if the call was marked
 * MEETING BOOKED, email the handover. Safe to call repeatedly.
 */
export async function processProspectRecording(
  callRecordId: string,
): Promise<{ transcribed: boolean; handover: "sent" | "skipped" | "failed" | "not_needed" }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const { data: record } = await db
    .from("call_records")
    .select("id, recording_url, transcript, direction, twilio_call_sid")
    .eq("id", callRecordId)
    .maybeSingle();
  if (!record) return { transcribed: false, handover: "not_needed" };
  let transcribed = false;
  let transcript = String(record.transcript ?? "");
  if (!transcript.trim() && record.recording_url) {
    const { transcribeRecording } = await import("@/legal/lib/ai-analysis.server");
    transcript = await transcribeRecording(record.recording_url);
    if (transcript.trim()) {
      await db.from("call_records").update({ transcript }).eq("id", callRecordId);
      transcribed = true;
    }
  }
  if (record.direction === PROSPECT_INBOUND_DIRECTION) {
    // A firm's voicemail after ringing back: put the words on the firm, nothing to hand over.
    if (transcribed && record.twilio_call_sid)
      await attachProspectVoicemail(db, record.twilio_call_sid, transcript);
    return { transcribed, handover: "not_needed" };
  }
  const { data: attempt } = await db
    .from("prospect_call_attempts")
    .select("id, business_disposition")
    .eq("call_record_id", callRecordId)
    .limit(1)
    .maybeSingle();
  if (!attempt || attempt.business_disposition !== "meeting_booked")
    return { transcribed, handover: "not_needed" };
  // The setter reviews and sends the handover from the portal; if it already went out without
  // the transcript, send the transcript as a follow-up. Otherwise the cron sweep covers it.
  await debriefForAttempt(attempt.id);
  const followUp = await sendTranscriptFollowUp(attempt.id);
  return { transcribed, handover: followUp === "sent" ? "sent" : "skipped" };
}

async function handoverAlreadySent(
  db: Db,
  attemptId: string,
): Promise<{ sent: boolean; withTranscript: boolean }> {
  const { data } = await db
    .from("cold_calling_audit_log")
    .select("detail")
    .eq("action", "handover_sent")
    .eq("detail->>attemptId", attemptId)
    .limit(1);
  const row = data?.[0];
  if (!row) return { sent: false, withTranscript: false };
  return {
    sent: true,
    withTranscript: (row.detail as { withTranscript?: boolean } | null)?.withTranscript === true,
  };
}

export type HandoverDraft = {
  attemptId: string;
  firmId: string;
  subject: string;
  text: string;
  html: string;
  transcriptReady: boolean;
  recordingExists: boolean;
  alreadySent: boolean;
  /** No recording can exist (manual outcome, or the call never connected): sending without a transcript is allowed. */
  isManual: boolean;
  /** ready | debriefing | transcribing | no_recording_yet | call_not_found | no_call */
  stage: string;
  debriefReady: boolean;
  /** What Twilio said on the last poll — shown while waiting. */
  detail: string;
};

const TWILIO_API = "https://api.twilio.com/2010-04-01";

async function twilioGet(
  path: string,
): Promise<{ json: Record<string, unknown> | null; error: string | null }> {
  const { twilioEnv } = await import("@/legal/lib/twilio.server");
  const { accountSid, authToken } = twilioEnv();
  const response = await fetch(`${TWILIO_API}/Accounts/${accountSid}${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    const error = `Twilio ${response.status}: ${text.slice(0, 200)}`;
    console.error(`[cold-calling] GET ${path} failed — ${error}`);
    return { json: null, error };
  }
  try {
    return { json: JSON.parse(text) as Record<string, unknown>, error: null };
  } catch {
    return { json: null, error: "Twilio returned a non-JSON response" };
  }
}

/**
 * Find the parent call SID for an attempt straight from Twilio: the leg to the
 * firm's number that started within five minutes of the attempt.
 */
export async function findTwilioCall(
  toNumber: string,
  startedAtISO: string,
): Promise<
  | { parentSid: string; childSid: string | null; status: string; startedDiffSeconds: number }
  | { error: string }
> {
  const started = Date.parse(startedAtISO);
  const tail = toNumber.replace(/\D/g, "").slice(-9);
  const pick = (calls: Array<Record<string, unknown>>) => {
    let best: { sid: string; parent: string | null; status: string; diff: number } | null = null;
    for (const c of calls) {
      const to = String(c["to"] ?? "")
        .replace(/\D/g, "")
        .slice(-9);
      if (to !== tail) continue;
      const t = Date.parse(String(c["start_time"] ?? c["date_created"] ?? ""));
      if (!Number.isFinite(t)) continue;
      const diff = Math.abs(t - started);
      if (diff > 15 * 60000) continue;
      if (!best || diff < best.diff)
        best = {
          sid: String(c["sid"]),
          parent: c["parent_call_sid"] ? String(c["parent_call_sid"]) : null,
          status: String(c["status"] ?? ""),
          diff,
        };
    }
    return best;
  };
  // 1. Filtered by number (fast). 2. Fallback: the 100 most recent calls on the account, matched by number tail.
  const filtered = await twilioGet(`/Calls.json?To=${encodeURIComponent(toNumber)}&PageSize=50`);
  let best = pick((filtered.json?.["calls"] as Array<Record<string, unknown>> | undefined) ?? []);
  let error = filtered.error;
  if (!best) {
    const recent = await twilioGet(`/Calls.json?PageSize=100`);
    best = pick((recent.json?.["calls"] as Array<Record<string, unknown>> | undefined) ?? []);
    if (!best && recent.error) error = recent.error;
    if (!best && !error) {
      const seen = ((recent.json?.["calls"] as Array<Record<string, unknown>> | undefined) ?? [])
        .length;
      error = `Twilio lists ${seen} recent calls on this account, none to …${tail} within 15 minutes of the attempt`;
    }
  }
  if (!best) return { error: error ?? "No matching call on Twilio" };
  // The leg to the firm is a child of the browser call; <Dial record> recordings hang off the parent.
  const startedDiffSeconds = Math.round(best.diff / 1000);
  return best.parent
    ? { parentSid: best.parent, childSid: best.sid, status: best.status, startedDiffSeconds }
    : { parentSid: best.sid, childSid: null, status: best.status, startedDiffSeconds };
}

/** The recording for a call SID, from Twilio's API (bypasses the recording callback). */
export async function fetchTwilioRecording(
  callSid: string,
): Promise<{ sid: string; url: string; status: string } | null> {
  const { json } = await twilioGet(
    `/Recordings.json?CallSid=${encodeURIComponent(callSid)}&PageSize=5`,
  );
  const recs = (json?.["recordings"] as Array<Record<string, unknown>> | undefined) ?? [];
  const done = recs.find((r) => String(r["status"]) === "completed") ?? recs[0];
  if (!done) return null;
  const { twilioEnv } = await import("@/legal/lib/twilio.server");
  const { accountSid } = twilioEnv();
  const sid = String(done["sid"]);
  return {
    sid,
    url: `${TWILIO_API}/Accounts/${accountSid}/Recordings/${sid}`,
    status: String(done["status"] ?? ""),
  };
}

/** Throttle a repeated lookup to once per `seconds` (audit-log based, survives restarts). */
async function throttled(db: Db, action: string, key: string, seconds: number): Promise<boolean> {
  const since = new Date(Date.now() - seconds * 1000).toISOString();
  const { data } = await db
    .from("cold_calling_audit_log")
    .select("id")
    .eq("action", action)
    .eq("detail->>key", key)
    .gte("at", since)
    .limit(1);
  if (data && data.length > 0) return true;
  await audit(db, null, action, null, { key });
  return false;
}

/**
 * Find the Twilio call record for an attempt when the dial webhook did not link
 * it: same rep, no lead, created within a couple of minutes of the attempt
 * starting. Adopts it (persists the link) so recordings and transcripts are found.
 */
export async function resolveCallRecordForAttempt(
  db: Db,
  attempt: {
    id: string;
    call_record_id: string | null;
    caller_rep_id: string | null;
    started_at: string;
    twilio_call_sid: string | null;
  },
): Promise<{ id: string; transcript: string | null; recording_url: string | null } | null> {
  if (attempt.call_record_id) {
    const { data } = await db
      .from("call_records")
      .select("id, transcript, recording_url")
      .eq("id", attempt.call_record_id)
      .maybeSingle();
    if (data) return data;
  }
  let candidate: { id: string; transcript: string | null; recording_url: string | null } | null =
    null;
  if (attempt.twilio_call_sid) {
    candidate =
      (
        await db
          .from("call_records")
          .select("id, transcript, recording_url")
          .eq("twilio_call_sid", attempt.twilio_call_sid)
          .limit(1)
          .maybeSingle()
      ).data ?? null;
  }
  if (!candidate) {
    const started = Date.parse(attempt.started_at);
    const from = new Date(started - 60000).toISOString();
    const to = new Date(started + 180000).toISOString();
    let q = db
      .from("call_records")
      .select("id, transcript, recording_url")
      .is("lead_id", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .limit(5);
    if (attempt.caller_rep_id) q = q.eq("rep_id", attempt.caller_rep_id);
    const { data } = await q;
    for (const rec of data ?? []) {
      // Never adopt a record another attempt already owns.
      const { data: owner } = await db
        .from("prospect_call_attempts")
        .select("id")
        .eq("call_record_id", rec.id)
        .neq("id", attempt.id)
        .limit(1);
      if (!owner || owner.length === 0) {
        candidate = rec;
        break;
      }
    }
  }
  if (candidate) {
    await db
      .from("prospect_call_attempts")
      .update({ call_record_id: candidate.id })
      .eq("id", attempt.id);
    await audit(db, null, "call_record_adopted", null, {
      attemptId: attempt.id,
      callRecordId: candidate.id,
    });
  }
  return candidate;
}

/** Ask the transcription hook to run for a record with a recording but no transcript (fire and forget). */
export async function requestTranscription(callRecordId: string): Promise<void> {
  const secret = legalEnv["INTERNAL_FUNCTION_SECRET"];
  if (!secret) return;
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const since = new Date(Date.now() - 45000).toISOString();
  const { data: recent } = await db
    .from("cold_calling_audit_log")
    .select("id")
    .eq("action", "transcription_requested")
    .eq("detail->>callRecordId", callRecordId)
    .gte("at", since)
    .limit(1);
  if (recent && recent.length > 0) return; // one Whisper job at a time per recording
  await audit(db, null, "transcription_requested", null, { callRecordId });
  void import("@/legal/lib/twilio.server").then(({ publicBaseUrl }) =>
    fetch(`${publicBaseUrl()}/api/public/hooks/prospect-call-transcribed`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ callRecordId }),
    }).catch((error) => console.error("[cold-calling] transcription request failed", error)),
  );
}

/**
 * Build (once) and store the AI debrief for a call record with a transcript.
 * Stored under call_records.call_analysis.firm_debrief so it is never regenerated.
 */
export async function debriefCallRecord(
  callRecordId: string,
  firmContext: string,
): Promise<import("./debrief").FirmDebrief | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const { data: record } = await db
    .from("call_records")
    .select("id, transcript, call_analysis")
    .eq("id", callRecordId)
    .maybeSingle();
  if (!record) return null;
  const existing = (record.call_analysis as { firm_debrief?: unknown } | null)?.firm_debrief;
  const { coerceDebrief, FIRM_DEBRIEF_SYSTEM_PROMPT } = await import("./debrief");
  if (existing && typeof existing === "object")
    return coerceDebrief(existing as Record<string, unknown>);
  const transcript = String(record.transcript ?? "").trim();
  if (!transcript) return null;
  const { anthropic, extractJson } = await import("@/legal/lib/ai-analysis.server");
  const raw = await anthropic(
    FIRM_DEBRIEF_SYSTEM_PROMPT,
    `${firmContext}\n\nTRANSCRIPT:\n\n${transcript}`,
    2500,
  );
  const debrief = coerceDebrief(extractJson(raw));
  const merged = {
    ...((record.call_analysis as Record<string, unknown> | null) ?? {}),
    firm_debrief: debrief,
  };
  await db
    .from("call_records")
    .update({ call_analysis: merged as never })
    .eq("id", callRecordId);
  return debrief;
}

/** Generate the debrief for an attempt's call record (no-op without a transcript). */
export async function debriefForAttempt(
  attemptId: string,
): Promise<import("./debrief").FirmDebrief | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const { data: attempt } = await db
    .from("prospect_call_attempts")
    .select("id, prospect_firm_id, call_record_id, notes")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt?.call_record_id) return null;
  const [{ data: firm }, { data: contacts }] = await Promise.all([
    db
      .from("prospect_firms")
      .select("firm_name, primary_city, state, family_law_team_size, accredited_specialist_count")
      .eq("id", attempt.prospect_firm_id)
      .maybeSingle(),
    db
      .from("prospect_contacts")
      .select("full_name, position, confidence, is_primary_decision_maker")
      .eq("prospect_firm_id", attempt.prospect_firm_id),
  ]);
  const context = [
    `FIRM: ${firm?.firm_name ?? "unknown"} (${[firm?.primary_city, firm?.state].filter(Boolean).join(", ")}); ${firm?.family_law_team_size ?? "?"} family lawyers, ${firm?.accredited_specialist_count ?? "?"} accredited specialists.`,
    `KNOWN CONTACTS: ${(contacts ?? []).map((c) => `${c.full_name}${c.position ? ` (${c.position})` : ""}${c.is_primary_decision_maker ? " [primary decision-maker]" : ""}`).join("; ") || "none on file"}.`,
    attempt.notes ? `SETTER'S OWN NOTES: ${attempt.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return debriefCallRecord(attempt.call_record_id, context);
}

export async function buildHandoverForAttempt(attemptId: string): Promise<HandoverDraft | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const { data: attempt } = await db
    .from("prospect_call_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || attempt.business_disposition !== "meeting_booked") return null;
  let record = await resolveCallRecordForAttempt(db, attempt);
  let stage = "ready";
  let detail = "";
  if (attempt.telephony_status !== "manual" && !String(record?.transcript ?? "").trim()) {
    // Twilio is the source of truth: find the call, then its recording, on every poll (throttled to 8s).
    if (!(await throttled(db, "twilio_lookup", attempt.id, 8))) {
      let parentSid = attempt.twilio_call_sid;
      let childSid = attempt.twilio_child_call_sid;
      if (!parentSid) {
        const call = await findTwilioCall(attempt.to_number, attempt.started_at);
        if (call && !("error" in call)) {
          parentSid = call.parentSid;
          childSid = call.childSid;
          await db
            .from("prospect_call_attempts")
            .update({ twilio_call_sid: parentSid, twilio_child_call_sid: childSid })
            .eq("id", attempt.id);
          detail = `Twilio call ${parentSid} (${call.status}, ${call.startedDiffSeconds}s from the attempt)`;
        } else {
          detail = call && "error" in call ? call.error : `No Twilio call to ${attempt.to_number}`;
        }
      }
      if (parentSid) {
        let found = await fetchTwilioRecording(parentSid);
        if (!found && childSid) found = await fetchTwilioRecording(childSid);
        if (found) {
          detail = `Recording ${found.sid} is ${found.status}`;
          if (found.status === "completed") {
            let target = record;
            if (!target) {
              const { data: bySid } = await db
                .from("call_records")
                .select("id, transcript, recording_url")
                .eq("twilio_call_sid", parentSid)
                .limit(1)
                .maybeSingle();
              target = bySid ?? null;
            }
            if (!target) {
              const { data: created } = await db
                .from("call_records")
                .insert({
                  lead_id: null,
                  rep_id: attempt.caller_rep_id,
                  twilio_call_sid: parentSid,
                  direction: "outbound",
                  call_status: "completed",
                })
                .select("id, transcript, recording_url")
                .single();
              target = created ?? null;
            }
            if (target) {
              if (!target.recording_url)
                await db
                  .from("call_records")
                  .update({ recording_sid: found.sid, recording_url: found.url })
                  .eq("id", target.id);
              await db
                .from("prospect_call_attempts")
                .update({ call_record_id: target.id })
                .eq("id", attempt.id);
              record = { ...target, recording_url: target.recording_url ?? found.url };
              await audit(db, null, "recording_fetched_from_twilio", attempt.prospect_firm_id, {
                attemptId: attempt.id,
                recordingSid: found.sid,
                callSid: parentSid,
              });
            }
          }
        } else if (!detail) {
          detail = `Twilio call ${parentSid}: no recording listed yet`;
        }
      }
      await audit(db, null, "handover_poll", attempt.prospect_firm_id, {
        attemptId: attempt.id,
        detail,
        key: attempt.id,
      });
    }
    if (!record?.recording_url)
      stage = attempt.twilio_call_sid ? "no_recording_yet" : "call_not_found";
    else if (!String(record.transcript ?? "").trim()) stage = "transcribing";
  }
  // A call that never connected (failed / busy / no answer, or zero talk time) has no recording:
  // don't make the setter wait for one. Same if Twilio still has nothing after 10 minutes of looking.
  const neverConnected =
    !attempt.connected_at && !(attempt.duration_seconds && attempt.duration_seconds > 0);
  let noRecordingPossible = attempt.telephony_status === "manual";
  if (!noRecordingPossible && stage === "call_not_found" && neverConnected) {
    noRecordingPossible = true;
    stage = "no_call";
    detail = `The portal call did not connect (${attempt.telephony_status}) — no recording exists.`;
  } else if (!noRecordingPossible && (stage === "call_not_found" || stage === "no_recording_yet")) {
    const { data: polls } = await db
      .from("cold_calling_audit_log")
      .select("at")
      .eq("action", "handover_poll")
      .eq("detail->>attemptId", attempt.id)
      .order("at", { ascending: true })
      .limit(1);
    const firstPoll = polls?.[0]?.at ? Date.parse(polls[0].at) : Date.now();
    if (Date.now() - firstPoll > 10 * 60000) {
      noRecordingPossible = true;
      stage = "no_call";
      detail = `Twilio has no recording for this call after 10 minutes of looking (${detail || "no details"}).`;
    }
  }
  const [{ data: firm }, { data: contacts }, { data: rep }, sent] = await Promise.all([
    db.from("prospect_firms").select("*").eq("id", attempt.prospect_firm_id).maybeSingle(),
    db
      .from("prospect_contacts")
      .select("full_name, position, confidence, is_primary_decision_maker")
      .eq("prospect_firm_id", attempt.prospect_firm_id),
    db.from("sales_reps").select("name, email").eq("user_id", attempt.caller_user_id).maybeSingle(),
    handoverAlreadySent(db, attemptId),
  ]);
  if (!firm) return null;
  const transcript = String(record?.transcript ?? "").trim() || null;
  let debrief: import("./debrief").FirmDebrief | null = null;
  if (record && transcript) {
    const existing = (
      await db.from("call_records").select("call_analysis").eq("id", record.id).maybeSingle()
    ).data?.call_analysis as { firm_debrief?: unknown } | null;
    if (existing?.firm_debrief && typeof existing.firm_debrief === "object") {
      const { coerceDebrief } = await import("./debrief");
      debrief = coerceDebrief(existing.firm_debrief as Record<string, unknown>);
    } else if (stage === "ready") {
      stage = "debriefing";
    }
  }
  const { buildHandoverEmail } = await import("./handover");
  const email = buildHandoverEmail({
    firm,
    contacts: contacts ?? [],
    attempt: {
      started_at: attempt.started_at,
      duration_seconds: attempt.duration_seconds,
      notes: attempt.notes,
      attempt_number: attempt.attempt_number,
    },
    setterName: rep?.name || rep?.email || "Setter",
    debrief,
    debriefNote: debrief
      ? null
      : noRecordingPossible
        ? attempt.telephony_status === "manual"
          ? "No recording was captured for this call (outcome saved without a portal call)."
          : detail || "The portal call did not connect, so there is no recording."
        : "The call summary is still being generated — it will be emailed separately when ready.",
  });
  return {
    attemptId,
    firmId: firm.id,
    subject: email.subject,
    text: email.text,
    html: email.html,
    transcriptReady: !!transcript,
    recordingExists: !!record?.recording_url,
    alreadySent: sent.sent,
    isManual: noRecordingPossible,
    stage,
    debriefReady: !!debrief,
    detail,
  };
}

/**
 * Email Peter the handover for a MEETING BOOKED call. Deduplicated through the
 * audit log. When the transcript is not ready and allowWithoutTranscript is
 * false, nothing is sent yet.
 */
export async function sendMeetingHandover(
  attemptId: string,
  opts: { allowWithoutTranscript: boolean },
): Promise<"sent" | "skipped" | "failed"> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const draft = await buildHandoverForAttempt(attemptId);
  if (!draft || draft.alreadySent) return "skipped";
  if (!draft.debriefReady && !opts.allowWithoutTranscript) return "skipped";
  const { data: attempt } = await db
    .from("prospect_call_attempts")
    .select("caller_user_id")
    .eq("id", attemptId)
    .maybeSingle();
  const { sendEmail, INTERNAL_ALERT_TO } = await import("@/legal/lib/email.server");
  const sent = await sendEmail({
    to: [INTERNAL_ALERT_TO],
    subject: draft.subject,
    text: draft.text,
    html: draft.html,
  });
  await audit(
    db,
    attempt?.caller_user_id ?? null,
    sent.ok ? "handover_sent" : "handover_failed",
    draft.firmId,
    { attemptId, withTranscript: draft.transcriptReady, error: sent.error ?? null },
  );
  return sent.ok ? "sent" : "failed";
}

/** When the transcript lands after the handover already went out, email it as a follow-up. */
export async function sendTranscriptFollowUp(
  attemptId: string,
): Promise<"sent" | "skipped" | "failed"> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const sent = await handoverAlreadySent(db, attemptId);
  if (!sent.sent || sent.withTranscript) return "skipped";
  const { data: dup } = await db
    .from("cold_calling_audit_log")
    .select("id")
    .eq("action", "transcript_sent")
    .eq("detail->>attemptId", attemptId)
    .limit(1);
  if (dup && dup.length > 0) return "skipped";
  const draft = await buildHandoverForAttempt(attemptId);
  if (!draft || !draft.debriefReady) return "skipped";
  const { sendEmail, INTERNAL_ALERT_TO } = await import("@/legal/lib/email.server");
  const subject = `Call summary: ${draft.subject.replace(/^Zoom set: /, "")}`;
  const r = await sendEmail({
    to: [INTERNAL_ALERT_TO],
    subject,
    text: draft.text,
    html: draft.html,
  });
  await audit(db, null, r.ok ? "transcript_sent" : "transcript_failed", draft.firmId, {
    attemptId,
    error: r.error ?? null,
  });
  return r.ok ? "sent" : "failed";
}

/**
 * Cron safety net: any MEETING BOOKED call from the last 7 days without a sent
 * handover gets one — transcribing the recording if needed, and after 10
 * minutes sending even without a transcript so nothing is lost.
 */
export async function sweepMeetingHandovers(): Promise<{
  checked: number;
  sent: number;
  failed: number;
}> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: attempts } = await db
    .from("prospect_call_attempts")
    .select("id, call_record_id, ended_at")
    .eq("business_disposition", "meeting_booked")
    .gte("started_at", since)
    .limit(200);
  let sent = 0;
  let failed = 0;
  for (const a of attempts ?? []) {
    try {
      if ((await handoverAlreadySent(db, a.id)).sent) continue;
      if (a.call_record_id) {
        try {
          await processProspectRecording(a.call_record_id);
        } catch (error) {
          console.error("[cold-calling] sweep transcription failed", error);
        }
        if ((await handoverAlreadySent(db, a.id)).sent) {
          sent += 1;
          continue;
        }
      }
      // Real calls wait for the transcript, however long it takes; only manual outcomes go without one.
      const draft = await buildHandoverForAttempt(a.id);
      if (draft && (draft.transcriptReady || draft.isManual)) {
        const r = await sendMeetingHandover(a.id, { allowWithoutTranscript: draft.isManual });
        if (r === "sent") sent += 1;
        if (r === "failed") failed += 1;
      }
    } catch (error) {
      failed += 1;
      console.error("[cold-calling] sweep failed", error);
    }
  }
  return { checked: attempts?.length ?? 0, sent, failed };
}

// ---------------------------------------------------------- firms ringing / texting back ----

/** call_records.direction for a firm ringing one of our pool numbers back (never a client call). */
export const PROSPECT_INBOUND_DIRECTION = "prospect_inbound";

type CallbackFirmRow = import("./callbacks").CallbackFirm & { phone_e164: string | null };

const CALLBACK_FIRM_COLUMNS =
  "id, firm_name, prospect_status, do_not_contact, last_disposition, next_follow_up_at, follow_up_note, follow_up_owner_user_id, assigned_caller_user_id, phone_e164";

/** The firm whose public number this is (exact E.164 first, then the last nine digits). */
export async function findProspectByPhone(db: Db, phone: string): Promise<CallbackFirmRow | null> {
  const e164 = phone.trim();
  if (!e164) return null;
  const exact = await db
    .from("prospect_firms")
    .select(CALLBACK_FIRM_COLUMNS)
    .eq("phone_e164", e164)
    .limit(1)
    .maybeSingle();
  if (exact.data) return exact.data as CallbackFirmRow;
  const tail = e164.replace(/\D/g, "").slice(-9);
  if (tail.length < 9) return null;
  const loose = await db
    .from("prospect_firms")
    .select(CALLBACK_FIRM_COLUMNS)
    .like("phone_e164", `%${tail}`)
    .limit(1)
    .maybeSingle();
  return (loose.data as CallbackFirmRow | null) ?? null;
}

/**
 * Whose queue a callback lands in: today's holder of the number the firm dialled,
 * else whoever last called the firm. Null means "first free setter".
 */
export async function ownerForCallback(
  db: Db,
  firmId: string,
  dialledNumber: string,
  now: Date,
): Promise<string | null> {
  const { sydneyWorkDate } = await import("./daily-phone");
  if (dialledNumber) {
    const { data: holder } = await db
      .from("daily_phone_assignments")
      .select("caller_user_id")
      .eq("outbound_caller_id_number", dialledNumber)
      .eq("work_date", sydneyWorkDate(now))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (holder?.caller_user_id) return holder.caller_user_id;
  }
  const { data: last } = await db
    .from("prospect_call_attempts")
    .select("caller_user_id")
    .eq("prospect_firm_id", firmId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return last?.caller_user_id ?? null;
}

/**
 * A firm rang or texted a pool number back. Flags the firm as a follow-up due
 * now for the right setter (top of their queue, no ringtone anywhere) and logs it.
 * Returns null when the number is not one of our firms.
 */
export async function recordProspectCallback(input: {
  from: string;
  to: string;
  kind: import("./callbacks").CallbackKind;
  body?: string | null;
  callSid?: string | null;
  now?: Date;
}): Promise<{ firmId: string; firmName: string; ownerUserId: string | null } | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const { callbackPatch, isOptOutText } = await import("./callbacks");
  const now = input.now ?? new Date();
  const firm = await findProspectByPhone(db, input.from);
  if (!firm) return null;
  if (input.kind === "sms" && isOptOutText(input.body)) {
    // "STOP" after our text: Do Not Contact (the trigger suppresses the number and clears follow-ups).
    const { error } = await db
      .from("prospect_firms")
      .update({
        do_not_contact: true,
        do_not_contact_reason: `Replied "${(input.body ?? "").trim().slice(0, 40)}" by text`,
      })
      .eq("id", firm.id);
    if (error) console.error("[cold-calling] STOP → DNC failed", error.message);
    await audit(db, null, "firm_opted_out_by_text", firm.id, {
      from: input.from,
      body: input.body,
    });
    return { firmId: firm.id, firmName: firm.firm_name, ownerUserId: null };
  }
  const ownerUserId = await ownerForCallback(db, firm.id, input.to, now);
  const patch = callbackPatch(firm, {
    kind: input.kind,
    from: input.from,
    body: input.body ?? null,
    now,
    ownerUserId,
  });
  if (patch) {
    const { error } = await db
      .from("prospect_firms")
      .update(patch as never)
      .eq("id", firm.id);
    if (error) console.error("[cold-calling] callback update failed", error.message);
  }
  if (input.kind === "call" && input.callSid) {
    const { error } = await db.from("call_records").insert({
      twilio_call_sid: input.callSid,
      direction: PROSPECT_INBOUND_DIRECTION,
      call_status: "ringing",
    });
    if (error) console.error("[cold-calling] inbound call_records insert failed", error.message);
  }
  await audit(db, null, input.kind === "call" ? "firm_called_back" : "firm_texted_back", firm.id, {
    from: input.from,
    to: input.to,
    ownerUserId,
    callSid: input.callSid ?? null,
    body: input.body ?? null,
    flagged: !!patch,
  });
  return { firmId: firm.id, firmName: firm.firm_name, ownerUserId };
}

/** Append a ringing-back firm's voicemail transcript to its notes. The caller is looked up on Twilio. */
async function attachProspectVoicemail(db: Db, callSid: string, transcript: string): Promise<void> {
  const call = await twilioGet(`/Calls/${encodeURIComponent(callSid)}.json`);
  const from = String(call.json?.["from"] ?? "");
  if (!from) {
    console.error("[cold-calling] voicemail: Twilio call lookup failed", call.error);
    return;
  }
  const firm = await findProspectByPhone(db, from);
  if (!firm) return;
  const { callbackNoteLine } = await import("./callbacks");
  const line = callbackNoteLine({ kind: "call", from, now: new Date() }).replace(
    "Called back from",
    "Voicemail from",
  );
  const note = `${line}: ${transcript.trim().slice(0, 1000)}`;
  const { error } = await db
    .from("prospect_firms")
    .update({ follow_up_note: firm.follow_up_note ? `${firm.follow_up_note}\n${note}` : note })
    .eq("id", firm.id);
  if (error) console.error("[cold-calling] voicemail note failed", error.message);
}
