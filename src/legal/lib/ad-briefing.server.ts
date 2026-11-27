// Ported from the Legal app (family-law-floater/src/lib/ad-briefing.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { twilioEnv, publicBaseUrl, validateTwilioSignature } from "./twilio.server";
import { briefingPrompt, relayTwiml, voiceReport } from "./ad-briefing-voice";
import { HABOOB_REVISION, speechTwiml } from "./ad-briefing-speech";
import {
  finish,
  isVoicemailGreeting,
  isCallWindow,
  isFreshReport,
  hasActionableAdAlert,
  listen,
  MAX_CALL_SECONDS,
  MAX_QUESTIONS,
  reportSchema,
  sydneyTime,
  type AdReport,
  type ConversationPhase,
  CALL_GREETING,
  conversationAction,
} from "./ad-briefing";

// These private tables are intentionally absent from the client-generated schema.
const db = supabaseAdmin as SupabaseClient;
export const BRIEF_HOOK = "/api/public/hooks/ad-briefing-voice";
type Settings = {
  owner_id: string;
  enabled: boolean;
  recipient: string;
  caller_id: string;
  speech_engine_id?: string | null;
};
type Report = AdReport & { id: string; owner_id: string };
type Call = {
  id: string;
  owner_id: string;
  call_sid: string | null;
  report_id: string | null;
  recipient: string;
  caller_id: string;
  kind: "daily" | "test";
  created_at: string;
  speech_engine_id?: string | null;
  retry_of?: string | null;
};

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function settingsFor(owner: string) {
  const { data, error } = await db
    .from("ad_briefing_settings")
    .select("*")
    .eq("owner_id", owner)
    .maybeSingle();
  check(error);
  return data as Settings | null;
}

export async function briefingState(owner: string) {
  const [settings, numbers, reports, calls] = await Promise.all([
    settingsFor(owner),
    db.from("phone_numbers").select("number").eq("status", "active"),
    db
      .from("ad_briefing_reports")
      .select("report_date,collected_at,summary,report")
      .eq("owner_id", owner)
      .order("report_date", { ascending: false })
      .limit(1),
    db
      .from("ad_briefing_calls")
      .select("call_date,kind,status,error_code,duration,created_at")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  check(numbers.error);
  check(reports.error);
  check(calls.error);
  return {
    settings,
    numbers: (numbers.data ?? []) as { number: string }[],
    report: (reports.data?.[0] ?? null) as AdReport | null,
    calls: (calls.data ?? []) as {
      call_date: string;
      kind: string;
      status: string;
      error_code: string | null;
      duration: number | null;
      created_at: string;
    }[],
    ready: Boolean(
      legalEnv["TWILIO_ACCOUNT_SID"] &&
      legalEnv["TWILIO_AUTH_TOKEN"] &&
      legalEnv["ANTHROPIC_API_KEY"],
    ),
    streamingReady: legalEnv["AD_BRIEFING_STREAMING_ENABLED"] === "true",
    privateVoiceReady: Boolean(legalEnv["ELEVENLABS_API_KEY"]),
    today: sydneyTime().date,
  };
}

export async function saveBriefingSettings(
  owner: string,
  input: Pick<Settings, "enabled" | "recipient" | "caller_id">,
) {
  const { data: number, error } = await db
    .from("phone_numbers")
    .select("number")
    .eq("number", input.caller_id)
    .eq("status", "active")
    .maybeSingle();
  check(error);
  if (!number) throw new Error("Choose an existing active Twilio number.");
  if (input.recipient === input.caller_id)
    throw new Error("The receiving mobile must differ from the calling number.");
  if (input.enabled) {
    if (legalEnv["AD_BRIEFING_STREAMING_ENABLED"] !== "true")
      throw new Error("The ElevenLabs voice upgrade needs activation first.");
    twilioEnv();
    if (!legalEnv["ANTHROPIC_API_KEY"]) throw new Error("AI credentials are not configured.");
  }
  const result = await db.from("ad_briefing_settings").upsert({ owner_id: owner, ...input });
  check(result.error);
}

export async function saveBriefingReport(owner: string, input: AdReport) {
  const report = reportSchema.parse(input);
  if (!isFreshReport(report))
    throw new Error(
      "Use today's Sydney date and the actual collection time within the last three hours.",
    );
  if (!(await settingsFor(owner))) throw new Error("Save your call settings first.");
  // Freeze today's briefing once a real call starts; later report edits must not
  // change the facts midway through a conversation.
  const { count, error: callError } = await db
    .from("ad_briefing_calls")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", owner)
    .eq("call_date", report.report_date)
    .eq("kind", "daily");
  check(callError);
  if (count) throw new Error("Today's call already started; its report is locked.");
  const { error } = await db
    .from("ad_briefing_reports")
    .upsert({ ...report, owner_id: owner }, { onConflict: "owner_id,report_date" });
  check(error);
}

async function createPhoneCall(settings: Settings, kind: "daily" | "test", retryOf?: string) {
  if (legalEnv["AD_BRIEFING_STREAMING_ENABLED"] !== "true")
    throw new Error("The ElevenLabs voice upgrade needs activation first.");
  const now = new Date();
  const date = sydneyTime(now).date;
  const { accountSid, authToken } = twilioEnv();
  if (!legalEnv["ANTHROPIC_API_KEY"]) throw new Error("AI credentials are not configured.");
  if (settings.speech_engine_id && !legalEnv["ELEVENLABS_API_KEY"])
    throw new Error("Haboob's private voice connection is missing.");
  const { data: report, error: reportError } = await db
    .from("ad_briefing_reports")
    .select("*")
    .eq("owner_id", settings.owner_id)
    .eq("report_date", date)
    .maybeSingle();
  check(reportError);
  const fresh = kind === "daily" && report && isFreshReport(report, now);
  // Access failures and routine/unchanged checks stay in the written monitor.
  // Never ring merely to say there is no usable data. Tests remain explicit.
  if (kind === "daily" && (!fresh || !hasActionableAdAlert(report)))
    return { status: "no_actionable_alert" };
  // Claim the day before contacting Twilio. Never retry an ambiguous create:
  // that could ring Peter twice. A failed/unknown call is visible in the UI.
  const { data: call, error } = await db
    .from("ad_briefing_calls")
    .insert({
      owner_id: settings.owner_id,
      retry_of: retryOf ?? null,
      call_date: date,
      kind,
      test_revision:
        kind === "test"
          ? settings.speech_engine_id
            ? HABOOB_REVISION
            : "elevenlabs-stream-v1"
          : null,
      speech_engine_id: settings.speech_engine_id ?? null,
      report_id: fresh ? report.id : null,
      recipient: settings.recipient,
      caller_id: settings.caller_id,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { status: "already_attempted" };
  check(error);
  if (!call) throw new Error("Could not reserve the call.");
  const id = String(call.id);
  const url = `${publicBaseUrl()}${BRIEF_HOOK}?id=${id}`;
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: settings.recipient,
          From: settings.caller_id,
          Url: url,
          Method: "POST",
          StatusCallback: `${url}&status=1`,
          StatusCallbackMethod: "POST",
          Timeout: "25",
          TimeLimit: String(kind === "test" ? 120 : MAX_CALL_SECONDS),
          Record: "false",
        }),
      },
    );
    const result = (await response.json()) as { sid?: string; code?: number };
    if (!response.ok || !result.sid) {
      await db
        .from("ad_briefing_calls")
        .update({ status: "failed", error_code: String(result.code ?? response.status) })
        .eq("id", id);
      throw new Error(`Twilio could not place the call (code ${result.code ?? response.status}).`);
    }
    // The welcome callback can bind the SID first if the provider is quick.
    const bound = await db
      .from("ad_briefing_calls")
      .update({ call_sid: result.sid })
      .eq("id", id)
      .is("call_sid", null);
    check(bound.error);
    return { status: "queued" };
  } catch (error) {
    await db
      .from("ad_briefing_calls")
      .update({ status: "unconfirmed", error_code: "check_twilio_before_retry" })
      .eq("id", id)
      .eq("status", "starting");
    throw error;
  }
}

export async function testBriefingCall(owner: string) {
  const settings = await settingsFor(owner);
  if (!settings) throw new Error("Save your call settings first.");
  return createPhoneCall(settings, "test");
}

export async function runAdBriefingCalls() {
  if (!isCallWindow()) return { status: "outside_call_window" };
  const { data, error } = await db.from("ad_briefing_settings").select("*").eq("enabled", true);
  check(error);
  const results = [];
  for (const settings of (data ?? []) as Settings[]) {
    try {
      results.push(await createPhoneCall(settings, "daily"));
    } catch {
      results.push({ status: "failed" });
    }
  }
  return { results };
}

/** Minute scheduler: unique parent claim prevents duplicate callbacks. */
export async function runAdBriefingCallbacks() {
  const now = new Date();
  const { data, error } = await db
    .from("ad_briefing_calls")
    .select("*")
    .eq("kind", "daily")
    .in("status", ["no-answer", "completed"])
    .is("retry_of", null)
    .lte("retry_due_at", now.toISOString())
    .gte("retry_due_at", new Date(now.getTime() - 10 * 60_000).toISOString());
  check(error);
  const results = [];
  for (const call of data ?? []) {
    if (call.status === "completed") {
      const firstTurn = await db
        .from("ad_briefing_turns")
        .select("question")
        .eq("call_id", call.id)
        .order("step")
        .limit(1)
        .maybeSingle();
      check(firstTurn.error);
      if (!isVoicemailGreeting(firstTurn.data?.question)) continue;
    }
    const settings = await settingsFor(call.owner_id);
    if (
      !settings?.enabled ||
      settings.recipient !== call.recipient ||
      settings.caller_id !== call.caller_id ||
      call.call_date !== sydneyTime(now).date
    )
      continue;
    try {
      results.push(await createPhoneCall(settings, "daily", call.id));
    } catch {
      console.error("[ad-briefing] missed-call callback failed");
      results.push({ status: "failed" });
    }
  }
  return { results };
}

function nextUrl(id: string, step: number, phase: ConversationPhase) {
  return `${publicBaseUrl()}${BRIEF_HOOK}?id=${id}&step=${step}&phase=${phase}`;
}

async function answerQuestion(
  report: Report | null,
  history: { question: string | null; answer: string | null }[],
  question: string,
  test: boolean,
  mode: "brief" | "chat",
) {
  const key = legalEnv["ANTHROPIC_API_KEY"];
  if (!key) throw new Error("AI unavailable");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: mode === "brief" ? 190 : 140,
      system: briefingPrompt(mode),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            test,
            mode,
            report: voiceReport(report),
            prior_turns: history,
            latest_reply: question,
          }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error("AI reply unavailable");
  const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
  const answer = data.content
    ?.filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ")
    .trim();
  if (!answer) throw new Error("AI reply empty");
  return answer.slice(0, 1300);
}

export async function handleBriefingWebhook(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(new URLSearchParams(await request.text()));
  const { accountSid } = twilioEnv();
  // Unlike the generic legacy helper, bind the full query string too.
  const canonical = `${publicBaseUrl()}${BRIEF_HOOK}${url.search}`;
  const signature = request.headers.get("x-twilio-signature");
  if (
    ![request.url, canonical].some((candidate) =>
      validateTwilioSignature(candidate, params, signature),
    ) ||
    params["AccountSid"] !== accountSid
  )
    return new Response("Unauthorized", { status: 401 });
  const id = url.searchParams.get("id");
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) return new Response("Bad request", { status: 400 });
  const { data, error } = await db.from("ad_briefing_calls").select("*").eq("id", id).maybeSingle();
  check(error);
  let call = data as Call | null;
  if (
    !call ||
    params["To"] !== call.recipient ||
    params["From"] !== call.caller_id ||
    !/^CA[a-f0-9]{32}$/i.test(params["CallSid"] ?? "")
  )
    return new Response("Forbidden", { status: 403 });
  const sid = params["CallSid"]!;
  if (!call.call_sid) {
    const bound = await db
      .from("ad_briefing_calls")
      .update({ call_sid: sid })
      .eq("id", id)
      .is("call_sid", null)
      .select("*")
      .maybeSingle();
    check(bound.error);
    if (!bound.data) return new Response("Conflict", { status: 409 });
    call = bound.data as Call;
  }
  if (call.call_sid !== sid) return new Response("Forbidden", { status: 403 });
  if (url.searchParams.get("status") === "1") {
    const status = params["CallStatus"] ?? "unknown";
    const duration = Number(params["CallDuration"]);
    check(
      (
        await db
          .from("ad_briefing_calls")
          .update({ status, duration: Number.isFinite(duration) ? duration : null })
          .eq("id", id)
      ).error,
    );
    let missed = status === "no-answer";
    if (status === "completed" && call.kind === "daily" && !call.retry_of) {
      const firstTurn = await db
        .from("ad_briefing_turns")
        .select("question")
        .eq("call_id", id)
        .order("step")
        .limit(1)
        .maybeSingle();
      check(firstTurn.error);
      missed = isVoicemailGreeting(firstTurn.data?.question);
    }
    if (missed && call.kind === "daily" && !call.retry_of) {
      check(
        (
          await db
            .from("ad_briefing_calls")
            .update({ retry_due_at: new Date(Date.now() + 5 * 60_000).toISOString() })
            .eq("id", id)
            .is("retry_due_at", null)
        ).error,
      );
    }
    return new Response("ok");
  }
  const xml = (text: string) =>
    new Response(`<?xml version="1.0" encoding="UTF-8"?>${text}`, {
      headers: { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" },
    });
  if (Date.now() - Date.parse(call.created_at) > (MAX_CALL_SECONDS + 60) * 1000)
    return xml(finish("This briefing has ended. Goodbye."));
  const step = Number(url.searchParams.get("step") ?? "-1");
  if (url.searchParams.get("relay-end") === "1") return xml("<Response><Hangup/></Response>");
  if (step === -1 && legalEnv["AD_BRIEFING_STREAMING_ENABLED"] === "true")
    return xml(
      call.speech_engine_id ? speechTwiml(publicBaseUrl(), id) : relayTwiml(publicBaseUrl(), id),
    );
  const phase = url.searchParams.get("phase") ?? "permission";
  if (!["permission", "wellbeing", "chat"].includes(phase))
    return new Response("Bad request", { status: 400 });
  if (step === -1) return xml(listen(nextUrl(id, 0, "permission"), CALL_GREETING));
  if (!Number.isInteger(step) || step < 0 || step > MAX_QUESTIONS)
    return xml(finish("That is the end of today's briefing. Goodbye."));
  if (step > 0) {
    const previous = await db
      .from("ad_briefing_turns")
      .select("twiml")
      .eq("call_id", id)
      .eq("step", step - 1)
      .maybeSingle();
    check(previous.error);
    if (!previous.data?.twiml?.includes("<Gather"))
      return new Response("Forbidden", { status: 403 });
  }
  const claimed = await db
    .from("ad_briefing_turns")
    .insert({ call_id: id, step })
    .select("step")
    .maybeSingle();
  if (claimed.error?.code === "23505") {
    const cached = await db
      .from("ad_briefing_turns")
      .select("twiml")
      .eq("call_id", id)
      .eq("step", step)
      .single();
    return cached.data?.twiml
      ? xml(String(cached.data.twiml))
      : xml(
          finish("I'm unable to complete that answer right now. Please see your written review."),
        );
  }
  check(claimed.error);
  let report: Report | null = null;
  if (call.report_id) {
    const result = await db
      .from("ad_briefing_reports")
      .select("*")
      .eq("id", call.report_id)
      .eq("owner_id", call.owner_id)
      .single();
    check(result.error);
    report = result.data as Report;
  }
  let twiml: string;
  let answer: string | null = null;
  const question = (params["SpeechResult"] ?? "").slice(0, 1500);
  const action = conversationAction(phase as ConversationPhase, question, params["Digits"]);
  if (action === "finish")
    twiml = finish("No worries, I'll let you get on with your morning. Catch you later, Peter.");
  else if (action === "clarify") {
    answer =
      phase === "permission"
        ? "Just checking—good time for a quick chat?"
        : "Sorry, I missed that. What were you saying?";
    twiml =
      step >= MAX_QUESTIONS
        ? finish("I'll leave you to it. Catch you later.")
        : listen(nextUrl(id, step + 1, phase as ConversationPhase), answer);
  } else if (action === "wellbeing") {
    answer = "How are you this morning, anyway?";
    twiml =
      step >= MAX_QUESTIONS
        ? finish("Let's leave it there for today. Catch you later.")
        : listen(nextUrl(id, step + 1, "wellbeing"), answer);
  } else {
    try {
      const history = await db
        .from("ad_briefing_turns")
        .select("question,answer")
        .eq("call_id", id)
        .lt("step", step)
        .order("step");
      check(history.error);
      answer = await answerQuestion(
        report,
        history.data ?? [],
        question,
        call.kind === "test",
        action,
      );
      twiml =
        step >= MAX_QUESTIONS
          ? finish(`${answer} I'll let you get on with your morning. Catch you later.`)
          : listen(nextUrl(id, step + 1, "chat"), answer);
    } catch {
      twiml = finish(
        "Sorry, my connection's playing up. Let's use the written review before making any ad changes. Catch you later, Peter.",
      );
    }
  }
  check(
    (
      await db
        .from("ad_briefing_turns")
        .update({ question: question || null, answer, twiml })
        .eq("call_id", id)
        .eq("step", step)
    ).error,
  );
  return xml(twiml);
}
