// Ported from the Legal app (family-law-floater/src/lib/ad-briefing-relay.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { defineWebSocketHandler } from "nitro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../integrations/supabase/client.server";
import { publicBaseUrl, twilioEnv, validateTwilioSignature } from "./twilio.server";
import { MAX_CALL_SECONDS, type AdReport } from "./ad-briefing";
import { briefingPrompt, speechTokens, voiceReport, RELAY_PATH } from "./ad-briefing-voice";
import { createBriefingConversation } from "./ad-briefing-conversation";

const db = supabaseAdmin as SupabaseClient;
type RelayCall = {
  id: string;
  owner_id: string;
  call_sid: string;
  report_id: string | null;
  recipient: string;
  caller_id: string;
  kind: string;
  created_at: string;
  status: string;
};
type RelayState = {
  call: RelayCall;
  setup: boolean;
  conversation: ReturnType<typeof createBriefingConversation> | null;
  ready: Promise<void> | null;
  timer: ReturnType<typeof setTimeout> | null;
  closingTimer: ReturnType<typeof setTimeout> | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

export default defineWebSocketHandler({
  async upgrade(request) {
    if (legalEnv["AD_BRIEFING_STREAMING_ENABLED"] !== "true")
      throw new Response("Voice upgrade not active", { status: 503 });
    const url = new URL(request.url);
    const canonical = new URL(RELAY_PATH + url.search, publicBaseUrl());
    const candidates = [request.url, canonical.href, canonical.href.replace(/^https:/, "wss:")];
    if (
      !candidates.some((candidate) =>
        validateTwilioSignature(candidate, {}, request.headers.get("x-twilio-signature")),
      )
    )
      throw new Response("Unauthorized", { status: 401 });
    const id = url.searchParams.get("id");
    if (!id || !/^[a-f0-9-]{36}$/i.test(id)) throw new Response("Bad request", { status: 400 });
    const { data, error } = await db
      .from("ad_briefing_calls")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const call = data as RelayCall | null;
    const age = call ? Date.now() - Date.parse(call.created_at) : Infinity;
    if (
      error ||
      !call?.call_sid ||
      age < 0 ||
      age > (call.kind === "test" ? 150 : MAX_CALL_SECONDS + 30) * 1000 ||
      ["completed", "failed", "busy", "no-answer", "canceled"].includes(call.status)
    )
      throw new Response("Forbidden", { status: 403 });
    return {
      context: {
        briefing: {
          call,
          setup: false,
          conversation: null,
          ready: null,
          timer: null,
          closingTimer: null,
          idleTimer: null,
        } satisfies RelayState,
      },
    };
  },
  open(peer) {
    const state = peer.context["briefing"] as RelayState;
    state.timer = setTimeout(
      () => peer.close(1000, "Call ended"),
      Math.max(
        1000,
        (state.call.kind === "test" ? 120 : MAX_CALL_SECONDS) * 1000 -
          (Date.now() - Date.parse(state.call.created_at)),
      ),
    );
    state.idleTimer = setTimeout(() => peer.close(1000, "No reply"), 30000);
  },
  async message(peer, message) {
    const state = peer.context["briefing"] as RelayState;
    try {
      const raw = message.text();
      if (raw.length > 12000) {
        peer.close(1009, "Message too large");
        return;
      }
      const input = JSON.parse(raw) as Record<string, unknown>;
      if (input["type"] === "setup") {
        if (state.setup) {
          peer.close(1008, "Duplicate setup");
          return;
        }
        const { accountSid } = twilioEnv();
        if (
          input["accountSid"] !== accountSid ||
          input["callSid"] !== state.call.call_sid ||
          input["to"] !== state.call.recipient ||
          input["from"] !== state.call.caller_id
        ) {
          peer.close(1008, "Call mismatch");
          return;
        }
        state.setup = true;
        state.ready = (async () => {
          // Reserve unused step 9 as a durable one-session claim. Reconnects
          // cannot repeat the briefing or double the model spend.
          const claim = await db
            .from("ad_briefing_turns")
            .insert({ call_id: state.call.id, step: 9, twiml: "relay-session" });
          if (claim.error) throw new Error("Session already reserved");
          let report: AdReport | null = null;
          if (state.call.report_id) {
            const result = await db
              .from("ad_briefing_reports")
              .select("report_date,collected_at,summary,report")
              .eq("id", state.call.report_id)
              .eq("owner_id", state.call.owner_id)
              .single();
            if (result.error) throw new Error("Report unavailable");
            report = result.data as AdReport;
          }
          state.conversation = createBriefingConversation({
            send: (value) => {
              if (state.idleTimer) clearTimeout(state.idleTimer);
              state.idleTimer = setTimeout(() => state.conversation?.end(), 30000);
              peer.send(JSON.stringify(value));
            },
            async *reply(history, question, mode, signal, finalTurn) {
              const key = legalEnv["ANTHROPIC_API_KEY"];
              if (!key) throw new Error("AI unavailable");
              const started = Date.now();
              let first = true;
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
                        test: state.call.kind === "test",
                        report: voiceReport(report),
                        prior_turns: history,
                        latest_reply: question,
                      }),
                    },
                  ],
                }),
              });
              if (!response.ok || !response.body) throw new Error("Voice reply unavailable");
              for await (const token of speechTokens(response.body)) {
                if (first) {
                  console.info("[ad-briefing] first_reply_token_ms", Date.now() - started);
                  first = false;
                }
                // Plain text only; model output cannot inject SSML commands.
                yield token.replace(/[<>]/g, "");
              }
              if (first) throw new Error("Empty reply");
            },
            async save(step, turn) {
              const result = await db.from("ad_briefing_turns").upsert({
                call_id: state.call.id,
                step,
                question: turn.question,
                answer: turn.answer,
                twiml: "relay-turn",
              });
              if (result.error) throw new Error("Could not save conversation");
            },
            afterSpeech(text, done) {
              if (state.closingTimer) clearTimeout(state.closingTimer);
              state.closingTimer = setTimeout(
                done,
                Math.min(25000, text.split(/\s+/).length * 450 + 1500),
              );
            },
          });
        })();
        await state.ready;
        return;
      }
      if (!state.setup || !state.ready) {
        peer.close(1008, "Setup required");
        return;
      }
      await state.ready;
      if (input["type"] === "prompt" || input["type"] === "dtmf") {
        if (state.idleTimer) clearTimeout(state.idleTimer);
        state.idleTimer = setTimeout(() => state.conversation?.end(), 30000);
      }
      if (input["type"] === "error") {
        console.error("[ad-briefing] streaming provider error");
        state.conversation?.end();
        return;
      }
      await state.conversation?.handle(input);
    } catch {
      // Never log transcripts, reports, phone numbers or authentication values.
      console.error("[ad-briefing] streaming session failed");
      state.conversation?.close();
      peer.close(1011, "Voice unavailable");
    }
  },
  close(peer) {
    const state = peer.context["briefing"] as RelayState;
    state.conversation?.close();
    if (state.timer) clearTimeout(state.timer);
    if (state.closingTimer) clearTimeout(state.closingTimer);
    if (state.idleTimer) clearTimeout(state.idleTimer);
  },
  error(peer) {
    const state = peer.context["briefing"] as RelayState;
    state.conversation?.close();
    console.error("[ad-briefing] voice socket error");
  },
});
