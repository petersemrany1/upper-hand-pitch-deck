// Ported from the Legal app (family-law-floater/src/lib/ad-briefing-runtime.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../integrations/supabase/client.server";
import { publicBaseUrl, twilioEnv, validateTwilioSignature } from "./twilio.server";
import type { AdReport } from "./ad-briefing";
import { activeVoiceCall } from "./ad-briefing-speech";
import {
  briefingPrompt,
  speechTokens,
  voiceReport,
  type BriefingReplyMode,
} from "./ad-briefing-voice";
import type { VoiceTurn } from "./ad-briefing-conversation";

export const voiceDb = supabaseAdmin as SupabaseClient;
export type PrivateVoiceCall = {
  id: string;
  owner_id: string;
  call_sid: string;
  report_id: string | null;
  recipient: string;
  caller_id: string;
  kind: string;
  created_at: string;
  status: string;
  speech_engine_id: string | null;
  elevenlabs_conversation_id: string | null;
};

export async function checkedMediaCall(request: Request, route: string) {
  const url = new URL(request.url);
  const canonical = new URL(url.pathname + url.search, publicBaseUrl()).href;
  if (
    ![request.url, canonical, canonical.replace(/^https:/, "wss:")].some((candidate) =>
      validateTwilioSignature(candidate, {}, request.headers.get("x-twilio-signature")),
    )
  )
    throw new Response("Unauthorized", { status: 401 });
  const id = url.pathname.slice(route.length + 1);
  if (!/^[a-f0-9-]{36}$/i.test(id) || url.search)
    throw new Response("Bad request", { status: 400 });
  const { data, error } = await voiceDb
    .from("ad_briefing_calls")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const call = data as PrivateVoiceCall | null;
  if (error || !activeVoiceCall(call) || !call?.speech_engine_id)
    throw new Response("Forbidden", { status: 403 });
  return call;
}

export async function reportForCall(call: PrivateVoiceCall) {
  if (!call.report_id) return null;
  const result = await voiceDb
    .from("ad_briefing_reports")
    .select("report_date,collected_at,summary,report")
    .eq("id", call.report_id)
    .eq("owner_id", call.owner_id)
    .single();
  if (result.error) throw new Error("Report unavailable");
  return result.data as AdReport;
}

export async function* privateVoiceReply(
  call: PrivateVoiceCall,
  report: AdReport | null,
  history: VoiceTurn[],
  question: string,
  mode: BriefingReplyMode,
  signal: AbortSignal,
  finalTurn: boolean,
) {
  const key = legalEnv["ANTHROPIC_API_KEY"];
  if (!key) throw new Error("AI unavailable");
  const started = Date.now();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: mode === "brief" ? 190 : 140,
      stream: true,
      system: briefingPrompt(mode, finalTurn),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            test: call.kind === "test",
            report: voiceReport(report),
            prior_turns: history,
            latest_reply: question,
          }),
        },
      ],
    }),
  });
  if (!response.ok || !response.body) throw new Error("Voice reply unavailable");
  let first = true;
  for await (const token of speechTokens(response.body)) {
    if (first) {
      console.info("[ad-briefing] first_reply_token_ms", Date.now() - started);
      first = false;
    }
    yield token.replace(/[<>]/g, "");
  }
  if (first) throw new Error("Empty reply");
}

export async function hangUpPrivateCall(call: PrivateVoiceCall) {
  const { accountSid, authToken } = twilioEnv();
  if (!/^CA[a-f0-9]{32}$/i.test(call.call_sid)) return;
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.call_sid}.json`,
    {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Status: "completed" }),
    },
  );
  if (!response.ok) console.error("[ad-briefing] hangup request failed");
}
