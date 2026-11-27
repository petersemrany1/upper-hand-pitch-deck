// Ported from the Legal app (family-law-floater/src/lib/training/practice.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Saving AI practice calls. ElevenLabs keeps every conversation; we fetch the ones made by
// this rep with our practice agent, check them there (never trusting the browser's word on
// length), and store the transcript and audio. Safe to run again: rows are keyed by the
// ElevenLabs conversation id.

import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import type { Json } from "@/legal/integrations/supabase/types";

import { MIN_PRACTICE_CALL_S } from "./content-facts";
import { PERSONAS, PRACTICE_AGENT_ID } from "./practice";
import { completeModule } from "./training.server";

const BUCKET = "practice-call-recordings";

function apiKey(): string {
  const key = legalEnv["ELEVENLABS_API_KEY"];
  if (!key) throw new Error("The ElevenLabs connection is missing on the server.");
  return key;
}

async function eleven(path: string): Promise<Response> {
  const res = await fetch(`https://api.elevenlabs.io/v1/${path}`, {
    headers: { "xi-api-key": apiKey() },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) {
    throw new Error(
      "ElevenLabs can't find that call — the server's ElevenLabs key may belong to a different account from the practice agent.",
    );
  }
  if (!res.ok) throw new Error(`ElevenLabs connection failed (${res.status}).`);
  return res;
}

type Conversation = {
  agent_id?: string;
  status?: string;
  user_id?: string | null;
  transcript?: { role?: string; message?: string | null; time_in_call_secs?: number }[];
  metadata?: { start_time_unix_secs?: number; call_duration_secs?: number };
  conversation_initiation_client_data?: {
    user_id?: string | null;
    dynamic_variables?: Record<string, unknown> | null;
  };
};

/** Fetch one conversation and save it for this user. Returns null if it isn't finished yet. */
export async function savePracticeCall(userId: string, conversationId: string) {
  const conv = (await (
    await eleven(`convai/conversations/${encodeURIComponent(conversationId)}`)
  ).json()) as Conversation;
  if (conv.agent_id !== PRACTICE_AGENT_ID) throw new Error("That isn't a practice call.");
  const owner = conv.user_id ?? conv.conversation_initiation_client_data?.user_id ?? null;
  if (owner && owner !== userId) throw new Error("That practice call belongs to someone else.");
  if (conv.status !== "done" && conv.status !== "failed") return null;

  const persona = String(
    conv.conversation_initiation_client_data?.dynamic_variables?.["persona"] ?? "",
  );
  const duration = Math.round(conv.metadata?.call_duration_secs ?? 0);
  const startedAt = conv.metadata?.start_time_unix_secs
    ? new Date(conv.metadata.start_time_unix_secs * 1000).toISOString()
    : null;
  const transcript = (conv.transcript ?? [])
    .filter((t) => t.message)
    .map((t) => ({
      who: t.role === "user" ? "rep" : "client",
      text: t.message!,
      at: Math.round(t.time_in_call_secs ?? 0),
    }));

  // Audio is best effort: the transcript and length are what count.
  let audioPath: string | null = null;
  try {
    const audio = await eleven(`convai/conversations/${encodeURIComponent(conversationId)}/audio`);
    const bytes = new Uint8Array(await audio.arrayBuffer());
    if (bytes.length > 0) {
      const path = `${userId}/${conversationId}.mp3`;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
      if (!error) audioPath = path;
    }
  } catch {
    // Keep the call without audio rather than lose it.
  }

  const { error } = await supabaseAdmin.from("practice_call_recordings").upsert(
    {
      auth_user_id: userId,
      conversation_id: conversationId,
      persona: PERSONAS.some((p) => p.id === persona) ? persona : null,
      started_at: startedAt,
      duration_seconds: duration,
      transcript: transcript as unknown as Json,
      ...(audioPath ? { audio_path: audioPath } : {}),
    },
    { onConflict: "conversation_id" },
  );
  if (error) throw new Error(error.message);

  if (duration >= MIN_PRACTICE_CALL_S) {
    try {
      await completeModule(userId, "ai");
    } catch {
      // Not unlocked yet, or already complete: the recording is still saved.
    }
  }
  return { conversationId, durationSeconds: duration };
}

/** Pick up any of this rep's practice calls that weren't saved (tab closed, network blip). */
export async function syncPracticeCalls(userId: string) {
  const list = (await (
    await eleven(
      `convai/conversations?agent_id=${PRACTICE_AGENT_ID}&user_id=${encodeURIComponent(userId)}&page_size=30`,
    )
  ).json()) as { conversations?: { conversation_id: string; status?: string }[] };
  const ids = (list.conversations ?? [])
    .filter((c) => c.status === "done" || c.status === "failed")
    .map((c) => c.conversation_id);
  if (ids.length === 0) return { saved: 0 };

  const { data: have } = await supabaseAdmin
    .from("practice_call_recordings")
    .select("conversation_id")
    .in("conversation_id", ids);
  const known = new Set((have ?? []).map((r) => r.conversation_id));
  let saved = 0;
  for (const id of ids.filter((i) => !known.has(i))) {
    try {
      if (await savePracticeCall(userId, id)) saved++;
    } catch {
      // Skip one bad conversation; the rest still save.
    }
  }
  return { saved };
}

/** Longest saved practice call for the completion check. */
export async function longestPracticeCall(userId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("practice_call_recordings")
    .select("duration_seconds")
    .eq("auth_user_id", userId)
    .order("duration_seconds", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.duration_seconds ?? null;
}

/** The rep flags one call for Peter's review. */
export async function submitBestCall(userId: string, conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("practice_call_recordings")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That practice call hasn't been saved yet.");
  await supabaseAdmin
    .from("practice_call_recordings")
    .update({ submitted_as_best: false })
    .eq("auth_user_id", userId);
  const { error: updateError } = await supabaseAdmin
    .from("practice_call_recordings")
    .update({ submitted_as_best: true })
    .eq("id", data.id);
  if (updateError) throw new Error(updateError.message);
  return { ok: true as const };
}

/** Admin: "Cleared to call" or "Keep practising", with a note. */
export async function reviewPracticeCall(
  callId: string,
  status: "cleared" | "keep_practising",
  note: string,
) {
  const { error } = await supabaseAdmin
    .from("practice_call_recordings")
    .update({
      review_status: status,
      review_note: note || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", callId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/**
 * A short-lived conversation token for the practice agent, for a rep who has reached AI
 * Training. Lets the agent require authentication. Null if the server's ElevenLabs key
 * can't issue one (then the page falls back to the agent id while authentication is off).
 */
export async function practiceToken(userId: string): Promise<{ token: string | null }> {
  const { loadProgress, assertUnlocked } = await import("./training.server");
  const { status } = await loadProgress(userId);
  assertUnlocked(status, "ai");
  const key = legalEnv["ELEVENLABS_API_KEY"];
  if (!key) return { token: null };
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${PRACTICE_AGENT_ID}`,
      { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return { token: null };
    const json = (await res.json()) as { token?: unknown };
    return { token: typeof json.token === "string" ? json.token : null };
  } catch {
    return { token: null };
  }
}
