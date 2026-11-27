// Ported from the Legal app (family-law-floater/src/lib/ad-briefing-speech.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { defineWebSocketHandler } from "nitro";
import { createBriefingConversation } from "./ad-briefing-conversation";
import { activeVoiceCall, validSpeechEngineJwt } from "./ad-briefing-speech";
import {
  voiceDb,
  reportForCall,
  privateVoiceReply,
  hangUpPrivateCall,
  type PrivateVoiceCall,
} from "./ad-briefing-runtime.server";

type SpeechState = {
  call: PrivateVoiceCall | null;
  conversation: ReturnType<typeof createBriefingConversation> | null;
  initializing: boolean;
  ready: Promise<void> | null;
  closed: boolean;
  eventId: number;
  deadline: ReturnType<typeof setTimeout> | null;
  closing: ReturnType<typeof setTimeout> | null;
};

export default defineWebSocketHandler({
  upgrade(request) {
    if (
      !validSpeechEngineJwt(
        request.headers.get("x-elevenlabs-speech-engine-authorization"),
        legalEnv["ELEVENLABS_API_KEY"] ?? "",
      )
    )
      throw new Response("Unauthorized", { status: 401 });
    return {
      context: {
        speech: {
          call: null,
          conversation: null,
          initializing: false,
          ready: null,
          closed: false,
          eventId: -1,
          deadline: null,
          closing: null,
        } satisfies SpeechState,
      },
    };
  },
  open(peer) {
    const state = peer.context["speech"] as SpeechState;
    state.deadline = setTimeout(() => peer.close(1008, "Setup required"), 5000);
  },
  async message(peer, message) {
    const state = peer.context["speech"] as SpeechState;
    if (state.closed) return;
    const end = () => {
      if (state.closed) return;
      state.closed = true;
      state.conversation?.close();
      if (state.call)
        void hangUpPrivateCall(state.call).catch(() =>
          console.error("[ad-briefing] hangup unavailable"),
        );
      peer.close(1000, "Conversation ended");
    };
    try {
      const raw = message.text();
      if (raw.length > 50000) throw new Error("Oversize transcript");
      const input = JSON.parse(raw);
      if (input.type === "ping") {
        peer.send(JSON.stringify({ type: "pong" }));
        return;
      }
      if (input.type === "close") {
        end();
        return;
      }
      if (input.type === "init") {
        if (state.initializing || !/^conv_[a-zA-Z0-9]+$/.test(input.conversation_id ?? ""))
          throw new Error("Invalid initialization");
        state.initializing = true;
        state.ready = (async () => {
          // The metadata event on the separately authenticated audio bridge can
          // arrive just after this init. Match it durably, never through a
          // process-global map or caller-provided owner/report identifier.
          let call: PrivateVoiceCall | null = null;
          for (let attempt = 0; attempt < 15 && !state.closed; attempt++) {
            const result = await voiceDb
              .from("ad_briefing_calls")
              .select("*")
              .eq("elevenlabs_conversation_id", input.conversation_id)
              .maybeSingle();
            if (result.error) throw new Error("Call lookup failed");
            call = result.data as PrivateVoiceCall | null;
            if (call) break;
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
          if (state.closed || !activeVoiceCall(call) || !call?.speech_engine_id)
            throw new Error("Unbound conversation");
          const claimed = await voiceDb
            .from("ad_briefing_calls")
            .update({ speech_engine_claimed: true })
            .eq("id", call.id)
            .eq("speech_engine_claimed", false)
            .select("id")
            .maybeSingle();
          if (claimed.error || !claimed.data) throw new Error("Conversation already used");
          state.call = call;
          const report = await reportForCall(call);
          if (state.closed) return;
          if (state.deadline) clearTimeout(state.deadline);
          state.deadline = setTimeout(
            end,
            Math.max(
              1000,
              (call.kind === "test" ? 120 : 300) * 1000 -
                (Date.now() - Date.parse(call.created_at)),
            ),
          );
          state.conversation = createBriefingConversation({
            send(value) {
              if (state.closed) return;
              if (value["type"] === "end") {
                end();
                return;
              }
              if (value["type"] !== "text") return;
              const content = String(value["token"] ?? "");
              if (content)
                peer.send(
                  JSON.stringify({
                    type: "agent_response",
                    event_id: state.eventId,
                    content,
                    is_final: false,
                  }),
                );
              if (value["last"] === true)
                peer.send(
                  JSON.stringify({
                    type: "agent_response",
                    event_id: state.eventId,
                    content: "",
                    is_final: true,
                  }),
                );
            },
            reply: (history, question, mode, signal, finalTurn) =>
              privateVoiceReply(call!, report, history, question, mode, signal, finalTurn),
            async save(step, turn) {
              const saved = await voiceDb.from("ad_briefing_turns").upsert({
                call_id: call!.id,
                step,
                question: turn.question,
                answer: turn.answer,
                twiml: "haboob-voice2-turn",
              });
              if (saved.error) throw new Error("Could not save conversation");
            },
            afterSpeech(text, done) {
              if (state.closing) clearTimeout(state.closing);
              state.closing = setTimeout(
                done,
                Math.min(25000, text.split(/\s+/).length * 450 + 1500),
              );
            },
          });
        })();
        await state.ready;
        return;
      }
      if (!state.ready) throw new Error("Setup required");
      await state.ready;
      if (input.type === "error") throw new Error("Provider error");
      if (input.type !== "user_transcript") return;
      if (!Number.isSafeInteger(input.event_id) || input.event_id <= state.eventId) return;
      const turns = input.user_transcript;
      if (!Array.isArray(turns) || turns.length > 40) throw new Error("Invalid transcript");
      const latest = turns.at(-1);
      if (latest?.role !== "user" || typeof latest.content !== "string" || !latest.content.trim())
        return;
      const eventId = input.event_id;
      state.eventId = eventId;
      // The provider supplies the corrected history after an interruption.
      // Abort the old generation before assigning any new text to this event.
      const lastAgent = turns
        .slice(0, -1)
        .reverse()
        .find((turn) => turn.role === "agent");
      await state.conversation?.handle({
        type: "interrupt",
        utteranceUntilInterrupt: typeof lastAgent?.content === "string" ? lastAgent.content : "",
      });
      if (state.eventId !== eventId || state.closed) return;
      await state.conversation?.handle({ type: "prompt", voicePrompt: latest.content, last: true });
    } catch {
      console.error("[ad-briefing] private speech session failed");
      end();
    }
  },
  close(peer) {
    const state = peer.context["speech"] as SpeechState;
    state.closed = true;
    state.conversation?.close();
    if (state.deadline) clearTimeout(state.deadline);
    if (state.closing) clearTimeout(state.closing);
  },
  error(peer) {
    const state = peer.context["speech"] as SpeechState;
    state.conversation?.close();
    peer.close(1011, "Voice unavailable");
  },
});
