import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  conversationId: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/),
  durationSeconds: z.number().int().min(0).max(60 * 60).optional(),
});

// Fast enqueue — writes a durable row in <100ms so the recording is
// captured even if the rep slams the tab shut before the upload finishes.
// The cron at /api/public/hooks/process-practice-recordings drains the queue.
export const enqueuePracticeCallSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    let repId: string | null = null;
    if (email) {
      const { data: rep } = await supabaseAdmin
        .from("sales_reps")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      repId = rep?.id ?? null;
    }
    const { error } = await supabaseAdmin
      .from("practice_call_save_queue")
      .upsert(
        {
          conversation_id: data.conversationId,
          rep_id: repId,
          duration_seconds: data.durationSeconds ?? null,
          status: "pending",
        },
        { onConflict: "conversation_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(`Enqueue failed: ${error.message}`);
    return { ok: true };
  });

export const listPracticeCallRecordings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims?.email as string | undefined)?.toLowerCase();

    let repId: string | null = null;
    let isAdmin = false;
    if (email) {
      const { data: rep } = await supabaseAdmin
        .from("sales_reps")
        .select("id, role")
        .ilike("email", email)
        .maybeSingle();
      repId = rep?.id ?? null;
      isAdmin = rep?.role === "admin";
    }

    let query = supabaseAdmin
      .from("practice_call_recordings")
      .select("id, rep_id, conversation_id, audio_path, duration_seconds, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!isAdmin) query = query.eq("rep_id", repId ?? "00000000-0000-0000-0000-000000000000");

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Get rep names for admin view
    const repIds = Array.from(new Set((rows ?? []).map((r) => r.rep_id).filter(Boolean))) as string[];
    let repMap: Record<string, string> = {};
    if (isAdmin && repIds.length) {
      const { data: reps } = await supabaseAdmin
        .from("sales_reps")
        .select("id, name")
        .in("id", repIds);
      repMap = Object.fromEntries((reps ?? []).map((r) => [r.id, r.name as string]));
    }

    const enriched = await Promise.all(
      (rows ?? []).map(async (r) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("practice-call-recordings")
          .createSignedUrl(r.audio_path, 60 * 60);
        return {
          id: r.id,
          conversation_id: r.conversation_id,
          duration_seconds: r.duration_seconds,
          created_at: r.created_at,
          rep_name: r.rep_id ? repMap[r.rep_id] ?? null : null,
          audio_url: signed?.signedUrl ?? null,
        };
      }),
    );

    return { recordings: enriched, isAdmin };
  });


export const savePracticeCallRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up sales_rep id for this auth user (matches current_sales_rep_id())
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    let repId: string | null = null;
    if (email) {
      const { data: rep } = await supabaseAdmin
        .from("sales_reps")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      repId = rep?.id ?? null;
    }

    // Poll ElevenLabs for the recording (it takes a few seconds to be ready)
    const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${data.conversationId}/audio`;
    let audioRes: Response | null = null;
    let lastStatus = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      const res = await fetch(audioUrl, { headers: { "xi-api-key": apiKey } });
      lastStatus = res.status;
      if (res.ok) {
        audioRes = res;
        break;
      }
      // 404 = not ready yet, 202 = processing
      if (res.status !== 404 && res.status !== 202 && res.status !== 425) {
        const body = await res.text().catch(() => "");
        throw new Error(`ElevenLabs audio fetch failed [${res.status}]: ${body.slice(0, 200)}`);
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    if (!audioRes) {
      throw new Error(`Recording not ready after polling (last status ${lastStatus})`);
    }

    const buf = new Uint8Array(await audioRes.arrayBuffer());
    const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
    const ext = contentType.includes("wav") ? "wav" : contentType.includes("mp4") ? "mp4" : "mp3";
    const folder = repId ?? "unknown";
    const path = `${folder}/${data.conversationId}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("practice-call-recordings")
      .upload(path, buf, { contentType, upsert: true });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { error: insertErr } = await supabaseAdmin
      .from("practice_call_recordings")
      .upsert(
        {
          rep_id: repId,
          conversation_id: data.conversationId,
          audio_path: path,
          duration_seconds: data.durationSeconds ?? null,
        },
        { onConflict: "conversation_id" },
      );
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    return { ok: true, path };
  });
