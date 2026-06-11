// Public belt-and-braces endpoint: receives a conversationId from
// navigator.sendBeacon when a rep closes the tab mid practice call.
// Just enqueues a pending row — the cron processor handles the actual
// fetch from ElevenLabs and upload. Body is opaque (only a conversation ID),
// so worst-case abuse is a junk row that fails after MAX_ATTEMPTS.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BodySchema = z.object({
  conversationId: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/),
  durationSeconds: z.number().int().min(0).max(60 * 60).optional(),
  repId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/public/hooks/enqueue-practice-recording")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return new Response("Missing secrets", { status: 500 });
        }

        let parsed: z.infer<typeof BodySchema>;
        try {
          const raw = await request.text();
          parsed = BodySchema.parse(JSON.parse(raw));
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error } = await supabase
          .from("practice_call_save_queue")
          .upsert(
            {
              conversation_id: parsed.conversationId,
              rep_id: parsed.repId ?? null,
              duration_seconds: parsed.durationSeconds ?? null,
              status: "pending",
            },
            { onConflict: "conversation_id", ignoreDuplicates: true },
          );
        if (error) return new Response(error.message, { status: 500 });

        return new Response("ok");
      },
    },
  },
});
