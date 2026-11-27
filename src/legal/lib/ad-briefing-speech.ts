// Ported from the Legal app (family-law-floater/src/lib/ad-briefing-speech.ts). Re-run the port script to refresh.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { escapeXml } from "./ad-briefing.ts";

export const HABOOB_VOICE_ID = "OUVPJgpVbDlN12ABdEeI";
export const SPEECH_BRIDGE_PATH = "/api/public/hooks/ad-briefing-media";
export const SPEECH_BRAIN_PATH = "/api/public/hooks/ad-briefing-speech";
export const HABOOB_REVISION = "haboob-voice2-v1";

export function speechEngineConfig(baseUrl: string, name: string) {
  return {
    name,
    speech_engine: { ws_url: new URL(SPEECH_BRAIN_PATH, baseUrl).href.replace(/^https:/, "wss:") },
    language: "en",
    asr: { provider: "scribe_realtime", user_input_audio_format: "ulaw_8000" },
    tts: {
      voice_id: HABOOB_VOICE_ID,
      model_id: "eleven_v3_conversational",
      agent_output_audio_format: "ulaw_8000",
      speed: 1.08,
      stability: 0.5,
      similarity_boost: 0.8,
      expressive_mode: false,
    },
    turn: {
      turn_model: "turn_v3",
      turn_eagerness: "normal",
      turn_timeout: 30,
      silence_end_call_timeout: 30,
      interruption_ignore_terms: ["mhm", "mm-hmm", "uh-huh"],
    },
    vad: { background_voice_detection: true },
    conversation: {
      max_duration_seconds: 300,
      client_events: [
        "conversation_initiation_metadata",
        "audio",
        "interruption",
        "ping",
        "agent_response",
        "agent_response_correction",
        "agent_response_complete",
      ],
    },
    privacy: {
      record_voice: false,
      retention_days: 1,
      delete_transcript_and_pii: true,
      delete_audio: true,
    },
    call_limits: { agent_concurrency_limit: 1, daily_limit: 2, bursting_enabled: false },
    overrides: { first_message: true },
    tags: [HABOOB_REVISION],
  };
}

export function speechTwiml(baseUrl: string, callId: string) {
  // Twilio Stream URLs do not accept query strings. Bind the call in the path.
  const socket = new URL(`${SPEECH_BRIDGE_PATH}/${callId}`, baseUrl).href.replace(
    /^https:/,
    "wss:",
  );
  const end = `${baseUrl}/api/public/hooks/ad-briefing-voice?id=${callId}&relay-end=1`;
  return `<Response><Connect action="${escapeXml(end)}" method="POST"><Stream url="${escapeXml(socket)}" /></Connect><Hangup/></Response>`;
}

/** ElevenLabs' upstream authentication protocol; never accept an unsigned JWT. */
export function validSpeechEngineJwt(value: string | null, apiKey: string, now = Date.now()) {
  try {
    if (!value || !apiKey || value.length > 4096) return false;
    const parts = value
      .replace(/^Bearer\s+/i, "")
      .trim()
      .split(".");
    if (parts.length !== 3) return false;
    const [header, payload, signature] = parts as [string, string, string];
    if (JSON.parse(Buffer.from(header, "base64url").toString()).alg !== "HS256") return false;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    const secret = createHash("sha256").update(apiKey.trim()).digest();
    const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
    const actual = Buffer.from(signature, "base64url");
    return (
      actual.length === expected.length &&
      timingSafeEqual(actual, expected) &&
      claims.iss === "https://api.elevenlabs.io/convai/speech-engine" &&
      claims.sub === "convai_speech_engine_upstream" &&
      Number.isFinite(claims.exp) &&
      Number.isFinite(claims.iat) &&
      claims.exp + 60 >= now / 1000 &&
      claims.iat - 60 <= now / 1000
    );
  } catch {
    return false;
  }
}

export function activeVoiceCall(
  call: { call_sid: string | null; status: string; kind: string; created_at: string } | null,
  now = Date.now(),
) {
  if (!call?.call_sid) return false;
  const age = now - Date.parse(call.created_at);
  return (
    age >= 0 &&
    age <= (call.kind === "test" ? 150 : 330) * 1000 &&
    !["completed", "failed", "busy", "no-answer", "canceled"].includes(call.status)
  );
}
