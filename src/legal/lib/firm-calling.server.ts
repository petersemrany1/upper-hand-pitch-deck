// Ported from the Legal app (family-law-floater/src/lib/firm-calling.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { claimPoolNumber, publicBaseUrl, xmlEscape } from "./twilio.server";
import { repIdentity } from "./twilio-voice.server";
import { FIRM_CALL_SUMMARY_PROMPT } from "./firm-calling";

const db = supabaseAdmin as SupabaseClient;

export async function firmApplicationDialTwiml(id: string, sid: string, identity: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^CA[0-9a-f]{32}$/i.test(sid))
    throw new Error("Invalid call");
  const { data: call, error } = await db
    .from("firm_application_calls")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !call || identity !== `client:${repIdentity(call.rep_id)}`)
    throw new Error("Call is not owned by this advisor");
  if (call.twilio_call_sid && call.twilio_call_sid !== sid)
    throw new Error("Call has already been used");
  if (!call.twilio_call_sid && Date.now() - Date.parse(call.created_at) > 5 * 60_000)
    throw new Error("Call expired; please dial again");
  let from = call.local_number;
  if (from) {
    const { data: pooled, error: poolError } = await db
      .from("phone_numbers")
      .select("status")
      .eq("number", from)
      .maybeSingle();
    if (poolError) throw new Error("Could not check the outbound number. Please try again.");
    if (pooled && pooled.status !== "active") from = null;
  }
  if (!from) from = await claimPoolNumber();
  if (!from) throw new Error("No outbound number available. Check phone settings.");
  const { data: claimed, error: claimError } = await db
    .from("firm_application_calls")
    .update({ twilio_call_sid: sid, status: "initiated", local_number: from })
    .eq("id", id)
    .or(`twilio_call_sid.is.null,twilio_call_sid.eq.${sid}`)
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) throw new Error("Call already started");
  const base = publicBaseUrl();
  return `<Response><Dial callerId="${xmlEscape(from)}" record="record-from-answer-dual" answerOnBridge="true" ringTone="au" timeout="25" recordingStatusCallback="${xmlEscape(`${base}/api/public/legal/hooks/twilio-recording`)}" recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed"><Number statusCallback="${xmlEscape(`${base}/api/public/legal/hooks/twilio-status`)}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">${xmlEscape(call.phone)}</Number></Dial></Response>`;
}

export async function applyFirmCallStatus(params: Record<string, string>) {
  const sid = params["ParentCallSid"] || params["CallSid"];
  if (!sid) return;
  const duration = Number(params["CallDuration"]);
  const patch: Record<string, unknown> = { status: params["CallStatus"] || "unknown" };
  if (params["CallDuration"] && Number.isFinite(duration)) patch["duration_seconds"] = duration;
  // Late ringing callbacks must not overwrite a finished call.
  const { error } = await db
    .from("firm_application_calls")
    .update(patch)
    .eq("twilio_call_sid", sid)
    .not("status", "in", "(completed,busy,no-answer,failed,canceled)");
  if (error && !["42P01", "PGRST205"].includes(error.code)) throw new Error(error.message);
}

export async function receiveFirmRecording(params: Record<string, string>): Promise<boolean> {
  const { data: call, error } = await db
    .from("firm_application_calls")
    .select("id, summary, direction, status")
    .eq("twilio_call_sid", params["CallSid"])
    .maybeSingle();
  // Keep existing client/cold-call callbacks working during migration rollout.
  if (error && ["42P01", "PGRST205"].includes(error.code)) return false;
  if (error) throw new Error(error.message);
  if (!call) return false;
  if (params["RecordingStatus"] && params["RecordingStatus"] !== "completed") return true;
  // Dial recordings are answered conversations, even when their callback
  // arrives before the Dial action marks the incoming call completed.
  const conversation = params["RecordingSource"] === "DialVerb" || call.status === "completed";
  const { error: updateError } = await db
    .from("firm_application_calls")
    .update({
      recording_sid: params["RecordingSid"],
      recording_url: params["RecordingUrl"],
      ...(call.direction === "inbound"
        ? {
            status: conversation ? "completed" : "voicemail",
            duration_seconds: Number(params["RecordingDuration"]) || null,
            ...(conversation ? { reviewed_at: new Date().toISOString() } : {}),
          }
        : {}),
    })
    .eq("id", call.id);
  if (updateError) throw new Error(updateError.message);
  if (!call.summary) {
    const secret = legalEnv["INTERNAL_FUNCTION_SECRET"];
    if (!secret) {
      await db
        .from("firm_application_calls")
        .update({ analysis_status: "failed" })
        .eq("id", call.id);
      return true;
    }
    try {
      const response = await fetch(`${publicBaseUrl()}/api/public/legal/hooks/auto-analyse-call`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify({ firmCallId: call.id }),
        signal: AbortSignal.timeout(150_000),
      });
      if (!response.ok) throw new Error("Call note processing failed");
    } catch (error) {
      await db
        .from("firm_application_calls")
        .update({ analysis_status: "failed" })
        .eq("id", call.id)
        .not("analysis_status", "in", "(complete,processing)");
      console.error("[firm-call] notes failed", error);
    }
  }
  return true;
}

export async function analyseFirmCall(id: string) {
  const { data: call, error } = await db
    .from("firm_application_calls")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !call) throw new Error("Call not found");
  if (!call.recording_url && !String(call.transcript ?? "").trim()) {
    if (!["completed", "voicemail"].includes(call.status)) {
      throw new Error("The recording is not ready yet");
    }
    const { findFirmCallRecording } = await import("./firm-recording-recovery.server");
    const recording = await findFirmCallRecording(call.twilio_call_sid);
    const { error: recoveryError } = await db
      .from("firm_application_calls")
      .update(recording)
      .eq("id", id);
    if (recoveryError) throw new Error(recoveryError.message);
    Object.assign(call, recording);
  }
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: claimed, error: claimError } = await db
    .from("firm_application_calls")
    .update({ analysis_status: "processing", analysis_started_at: now })
    .eq("id", id)
    .or(`analysis_status.neq.processing,analysis_started_at.lt.${stale}`)
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) return;
  try {
    const { transcribeRecording, anthropic } = await import("./ai-analysis.server");
    const transcript = call.transcript || (await transcribeRecording(call.recording_url));
    if (!transcript.trim()) throw new Error("The recording contained no transcript");
    const { error: transcriptError } = await db
      .from("firm_application_calls")
      .update({ transcript })
      .eq("id", id);
    if (transcriptError) throw new Error(transcriptError.message);
    const inboundContext =
      call.direction !== "inbound"
        ? ""
        : call.status === "voicemail"
          ? "INBOUND VOICEMAIL from a firm returning our call. Do not describe a two-way conversation.\n"
          : "INBOUND CONVERSATION: a firm called us back and spoke with our advisor. Summarise both sides of the conversation.\n";
    const summary =
      call.summary ||
      (await anthropic(
        FIRM_CALL_SUMMARY_PROMPT,
        `${inboundContext}TRANSCRIPT:\n${transcript}`,
        1800,
      ));
    if (!summary.trim()) throw new Error("No summary was generated");
    // The unique call ID makes retries safe: one activity note per call.
    const { error: noteError } = await db.from("firm_application_notes").upsert(
      {
        application_id: call.application_id,
        firm_call_id: id,
        kind: "system",
        body: `Call notes (AI-generated)\n\n${summary}`,
      },
      { onConflict: "firm_call_id", ignoreDuplicates: true },
    );
    if (noteError) throw new Error(noteError.message);
    const { error: summaryError } = await db
      .from("firm_application_calls")
      .update({ summary, analysis_status: "complete" })
      .eq("id", id);
    if (summaryError) throw new Error(summaryError.message);
  } catch (error) {
    await db.from("firm_application_calls").update({ analysis_status: "failed" }).eq("id", id);
    throw error;
  }
}
