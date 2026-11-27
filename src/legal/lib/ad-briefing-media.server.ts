// Ported from the Legal app (family-law-floater/src/lib/ad-briefing-media.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { defineWebSocketHandler } from "nitro";
import { CALL_GREETING } from "./ad-briefing";
import { SPEECH_BRIDGE_PATH } from "./ad-briefing-speech";
import { speechSignedUrl } from "./ad-briefing-elevenlabs.server";
import { checkedMediaCall, voiceDb, type PrivateVoiceCall } from "./ad-briefing-runtime.server";
import { twilioEnv } from "./twilio.server";

type MediaState = {
  call: PrivateVoiceCall;
  starting: boolean;
  stopped: boolean;
  streamSid: string | null;
  socket: WebSocket | null;
  pending: string[];
  bound: boolean;
  deadline: ReturnType<typeof setTimeout> | null;
};

export default defineWebSocketHandler({
  async upgrade(request) {
    if (
      legalEnv["AD_BRIEFING_STREAMING_ENABLED"] !== "true" ||
      !legalEnv["ELEVENLABS_API_KEY"]
    )
      throw new Response("Voice unavailable", { status: 503 });
    const call = await checkedMediaCall(request, SPEECH_BRIDGE_PATH);
    return {
      context: {
        media: {
          call,
          starting: false,
          stopped: false,
          streamSid: null,
          socket: null,
          pending: [],
          bound: false,
          deadline: null,
        } satisfies MediaState,
      },
    };
  },
  open(peer) {
    const state = peer.context["media"] as MediaState;
    state.deadline = setTimeout(
      () => peer.close(1000, "Call ended"),
      Math.max(
        1000,
        (state.call.kind === "test" ? 120 : 300) * 1000 -
          (Date.now() - Date.parse(state.call.created_at)),
      ),
    );
  },
  async message(peer, message) {
    const state = peer.context["media"] as MediaState;
    if (state.stopped) return;
    const fail = () => {
      console.error("[ad-briefing] private voice connection failed");
      state.stopped = true;
      state.socket?.close();
      peer.close(1011, "Voice unavailable");
    };
    try {
      const raw = message.text();
      if (raw.length > 16000) throw new Error("Oversize message");
      const event = JSON.parse(raw);
      if (event.event === "start") {
        const start = event.start;
        if (
          state.starting ||
          start?.callSid !== state.call.call_sid ||
          start?.accountSid !== twilioEnv().accountSid ||
          !/^MZ[a-f0-9]{32}$/i.test(start?.streamSid ?? "") ||
          start?.mediaFormat?.encoding !== "audio/x-mulaw" ||
          start?.mediaFormat?.sampleRate !== 8000 ||
          start?.mediaFormat?.channels !== 1
        )
          throw new Error("Call mismatch");
        state.starting = true;
        state.streamSid = start.streamSid;
        const claim = await voiceDb
          .from("ad_briefing_calls")
          .update({ media_stream_sid: state.streamSid })
          .eq("id", state.call.id)
          .is("media_stream_sid", null)
          .select("id")
          .maybeSingle();
        if (claim.error || !claim.data) throw new Error("Stream already reserved");
        const signedUrl = await speechSignedUrl(state.call.speech_engine_id!);
        if (state.stopped) return;
        const socket = new WebSocket(signedUrl);
        state.socket = socket;
        const openingTimeout = setTimeout(fail, 12000);
        socket.addEventListener("open", () => {
          clearTimeout(openingTimeout);
          if (state.stopped) {
            socket.close();
            return;
          }
          socket.send(
            JSON.stringify({
              type: "conversation_initiation_client_data",
              conversation_config_override: { agent: { first_message: CALL_GREETING } },
            }),
          );
          for (const payload of state.pending)
            socket.send(JSON.stringify({ user_audio_chunk: payload }));
          state.pending = [];
        });
        socket.addEventListener("message", (input) => {
          void (async () => {
            if (state.stopped) return;
            if (typeof input.data !== "string" || input.data.length > 512000)
              throw new Error("Bad provider message");
            const data = JSON.parse(input.data);
            if (data.type === "conversation_initiation_metadata") {
              if (state.bound) throw new Error("Duplicate conversation");
              state.bound = true;
              const metadata = data.conversation_initiation_metadata_event;
              if (
                !/^conv_[a-zA-Z0-9]+$/.test(metadata?.conversation_id ?? "") ||
                metadata?.agent_output_audio_format !== "ulaw_8000" ||
                metadata?.user_input_audio_format !== "ulaw_8000"
              )
                throw new Error("Audio format mismatch");
              const result = await voiceDb
                .from("ad_briefing_calls")
                .update({ elevenlabs_conversation_id: metadata.conversation_id })
                .eq("id", state.call.id)
                .is("elevenlabs_conversation_id", null)
                .select("id")
                .maybeSingle();
              if (result.error || !result.data) throw new Error("Could not bind conversation");
            } else if (data.type === "audio" && state.streamSid) {
              const payload = data.audio_event?.audio_base_64;
              if (typeof payload !== "string" || !/^[A-Za-z0-9+/=]+$/.test(payload))
                throw new Error("Invalid audio");
              peer.send(
                JSON.stringify({ event: "media", streamSid: state.streamSid, media: { payload } }),
              );
            } else if (data.type === "interruption") {
              peer.send(JSON.stringify({ event: "clear", streamSid: state.streamSid }));
            } else if (data.type === "ping") {
              socket.send(JSON.stringify({ type: "pong", event_id: data.ping_event?.event_id }));
            } else if (data.type === "error") throw new Error("Provider error");
          })().catch(fail);
        });
        socket.addEventListener("error", () => {
          clearTimeout(openingTimeout);
          fail();
        });
        socket.addEventListener("close", () => {
          clearTimeout(openingTimeout);
          peer.close(1000, "Conversation ended");
        });
      } else if (event.event === "media") {
        if (!state.starting || event.streamSid !== state.streamSid)
          throw new Error("Stream mismatch");
        const payload = event.media?.payload;
        if (
          typeof payload !== "string" ||
          payload.length > 12000 ||
          !/^[A-Za-z0-9+/=]+$/.test(payload)
        )
          throw new Error("Invalid audio");
        if (state.socket?.readyState === WebSocket.OPEN)
          state.socket.send(JSON.stringify({ user_audio_chunk: payload }));
        else {
          // Bound startup buffering to two seconds of typical 20ms packets.
          if (state.pending.length >= 100) state.pending.shift();
          state.pending.push(payload);
        }
      } else if (event.event === "dtmf" && event.streamSid === state.streamSid) {
        if (event.dtmf?.digit === "0") peer.close(1000, "Call ended");
        else if (event.dtmf?.digit === "1" && state.socket?.readyState === WebSocket.OPEN)
          state.socket.send(JSON.stringify({ type: "user_message", text: "Yes" }));
      } else if (event.event === "stop") peer.close(1000, "Call ended");
    } catch {
      fail();
    }
  },
  close(peer) {
    const state = peer.context["media"] as MediaState;
    state.stopped = true;
    state.pending = [];
    state.socket?.close();
    if (state.deadline) clearTimeout(state.deadline);
  },
  error(peer) {
    const state = peer.context["media"] as MediaState;
    state.stopped = true;
    state.socket?.close();
    if (state.deadline) clearTimeout(state.deadline);
  },
});
