// Ported from the Legal app (family-law-floater/src/lib/ad-briefing-elevenlabs.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../integrations/supabase/client.server";
import { publicBaseUrl } from "./twilio.server";
import { HABOOB_VOICE_ID, HABOOB_REVISION, speechEngineConfig } from "./ad-briefing-speech";

const db = supabaseAdmin as SupabaseClient;
export async function elevenRequest(path: string, method = "GET", body?: unknown) {
  const key = legalEnv["ELEVENLABS_API_KEY"];
  if (!key) throw new Error("The private ElevenLabs connection is missing.");
  const response = await fetch(`https://api.elevenlabs.io/v1/${path}`, {
    method,
    signal: AbortSignal.timeout(12000),
    headers: { "xi-api-key": key, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    // Provider bodies can include headers/secrets; expose only the status.
    throw new Error(`ElevenLabs connection failed (${response.status}).`);
  }
  return response.json();
}

/** Called only by the authenticated owner's admin action. Does not place a call. */
export async function connectHaboobVoice(owner: string) {
  const settings = await db
    .from("ad_briefing_settings")
    .select("speech_engine_id")
    .eq("owner_id", owner)
    .single();
  if (settings.error) throw new Error("Save your call settings first.");
  const voice = await elevenRequest(`voices/${HABOOB_VOICE_ID}`);
  if (voice.voice_id !== HABOOB_VOICE_ID) throw new Error("The selected Voice 2 is unavailable.");
  const name = `Haboob Voice 2 ${owner.slice(0, 8)} ${HABOOB_REVISION}`;
  let id = settings.data.speech_engine_id as string | null;
  if (!id) {
    // Recover an earlier successful create if its database save was interrupted.
    const list = await elevenRequest(
      `speech-engine?page_size=100&search=${encodeURIComponent(name)}`,
    );
    id =
      (list.speech_engines ?? []).find((engine: { name: string }) => engine.name === name)
        ?.speech_engine_id ?? null;
  }
  const config = speechEngineConfig(publicBaseUrl(), name);
  const engine = await elevenRequest(
    id ? `speech-engine/${encodeURIComponent(id)}` : "speech-engine",
    id ? "PATCH" : "POST",
    config,
  );
  const savedId = engine.speech_engine_id;
  if (
    typeof savedId !== "string" ||
    !/^seng_[a-zA-Z0-9]+$/.test(savedId) ||
    engine.tts?.voice_id !== HABOOB_VOICE_ID ||
    engine.privacy?.record_voice !== false ||
    engine.access_info?.anonymous_access_level_override != null
  )
    throw new Error("ElevenLabs did not confirm the selected voice and privacy settings.");
  const result = await db
    .from("ad_briefing_settings")
    .update({ speech_engine_id: savedId })
    .eq("owner_id", owner);
  if (result.error)
    throw new Error("Voice is configured but could not be saved. Reconnect before calling.");
  return { voice: "Haboob — Lebanese Voice 2" };
}

export async function speechSignedUrl(engineId: string) {
  if (!/^seng_[a-zA-Z0-9]+$/.test(engineId)) throw new Error("Voice is not connected.");
  const result = await elevenRequest(
    `convai/conversation/get-signed-url?agent_id=${encodeURIComponent(engineId)}`,
  );
  const url = new URL(result.signed_url);
  if (
    url.protocol !== "wss:" ||
    url.hostname !== "api.elevenlabs.io" ||
    !url.pathname.startsWith("/v1/convai/")
  )
    throw new Error("Invalid voice connection.");
  return url.href;
}
