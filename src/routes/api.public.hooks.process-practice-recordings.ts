// Drains practice_call_save_queue: for each pending row, fetch the audio
// from ElevenLabs and upload it to the practice-call-recordings bucket, then
// insert/upsert into practice_call_recordings and mark the queue row done.
// If ElevenLabs isn't ready yet, bumps attempts and schedules a retry.
// Gives up after MAX_ATTEMPTS and marks failed.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 5;

export const Route = createFileRoute("/api/public/hooks/process-practice-recordings")({
  server: {
    handlers: {
      POST: async () => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!supabaseUrl || !serviceKey || !apiKey) {
          return new Response(
            JSON.stringify({ error: "Missing required secrets" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: rows, error: selErr } = await supabase
          .from("practice_call_save_queue")
          .select("id, conversation_id, rep_id, duration_seconds, attempts")
          .eq("status", "pending")
          .lte("next_attempt_at", new Date().toISOString())
          .order("created_at", { ascending: true })
          .limit(BATCH_SIZE);
        if (selErr) {
          return new Response(JSON.stringify({ error: selErr.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        const results: Array<{ id: string; outcome: string; error?: string }> = [];

        for (const row of rows ?? []) {
          const attempts = (row.attempts ?? 0) + 1;
          try {
            const audioRes = await fetch(
              `https://api.elevenlabs.io/v1/convai/conversations/${row.conversation_id}/audio`,
              { headers: { "xi-api-key": apiKey } },
            );

            if (!audioRes.ok) {
              const retryable = audioRes.status === 404 || audioRes.status === 202 || audioRes.status === 425;
              const errBody = await audioRes.text().catch(() => "");
              const errMsg = `ElevenLabs ${audioRes.status}: ${errBody.slice(0, 300)}`;
              if (retryable && attempts < MAX_ATTEMPTS) {
                // Exponential-ish backoff: 30s, 1m, 2m, 4m, ... capped at 10m
                const delayMs = Math.min(30_000 * Math.pow(2, attempts - 1), 10 * 60_000);
                await supabase
                  .from("practice_call_save_queue")
                  .update({
                    attempts,
                    last_error: errMsg,
                    next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
                  })
                  .eq("id", row.id);
                results.push({ id: row.id, outcome: "retry" });
              } else {
                await supabase
                  .from("practice_call_save_queue")
                  .update({ attempts, status: "failed", last_error: errMsg })
                  .eq("id", row.id);
                results.push({ id: row.id, outcome: "failed", error: errMsg });
              }
              continue;
            }

            const buf = new Uint8Array(await audioRes.arrayBuffer());
            const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
            const ext = contentType.includes("wav") ? "wav" : contentType.includes("mp4") ? "mp4" : "mp3";
            const folder = row.rep_id ?? "unknown";
            const path = `${folder}/${row.conversation_id}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from("practice-call-recordings")
              .upload(path, buf, { contentType, upsert: true });
            if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

            const { error: insErr } = await supabase
              .from("practice_call_recordings")
              .upsert(
                {
                  rep_id: row.rep_id,
                  conversation_id: row.conversation_id,
                  audio_path: path,
                  duration_seconds: row.duration_seconds ?? null,
                },
                { onConflict: "conversation_id" },
              );
            if (insErr) throw new Error(`DB insert failed: ${insErr.message}`);

            await supabase
              .from("practice_call_save_queue")
              .update({ attempts, status: "done", done_at: new Date().toISOString(), last_error: null })
              .eq("id", row.id);
            results.push({ id: row.id, outcome: "done" });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (attempts >= MAX_ATTEMPTS) {
              await supabase
                .from("practice_call_save_queue")
                .update({ attempts, status: "failed", last_error: msg })
                .eq("id", row.id);
              results.push({ id: row.id, outcome: "failed", error: msg });
            } else {
              const delayMs = Math.min(60_000 * attempts, 10 * 60_000);
              await supabase
                .from("practice_call_save_queue")
                .update({
                  attempts,
                  last_error: msg,
                  next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
                })
                .eq("id", row.id);
              results.push({ id: row.id, outcome: "retry", error: msg });
            }
          }
        }

        return new Response(
          JSON.stringify({ processed: results.length, results }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
