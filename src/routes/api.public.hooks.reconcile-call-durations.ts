// Daily reconciliation job: finds any call_records older than 10 minutes
// where the Twilio webhook said the call completed but duration is still
// NULL/0, then re-fetches the real duration from Twilio's REST API and
// patches the row. Belt-and-braces backstop for the dual-write webhook + DB
// trigger. If this ever has to fix more than ~5 rows in a day, the webhook
// is misbehaving and should be investigated.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/reconcile-call-durations")({
  server: {
    handlers: {
      POST: async () => {
        const supabaseUrl = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const twilioSid = process.env.TWILIO_ACCOUNT_SID!;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN!;

        if (!supabaseUrl || !serviceKey || !twilioSid || !twilioToken) {
          return new Response(
            JSON.stringify({ error: "Missing required secrets" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Find candidates: rows older than 10 min, have a Twilio SID, but
        // duration is missing or zero. Cap at 200 rows per run to keep
        // Twilio API usage sane.
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: rows, error: fetchErr } = await supabase
          .from("call_records")
          .select("id, twilio_call_sid, status, called_at, duration, duration_seconds")
          .lt("called_at", tenMinAgo)
          .not("twilio_call_sid", "is", null)
          .or("duration.is.null,duration.eq.0")
          .or("duration_seconds.is.null,duration_seconds.eq.0")
          .order("called_at", { ascending: false })
          .limit(200);

        if (fetchErr) {
          console.error("reconcile-call-durations: fetch error", fetchErr);
          return new Response(
            JSON.stringify({ error: fetchErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const candidates = (rows ?? []) as Array<{
          id: string;
          twilio_call_sid: string;
          status: string | null;
          called_at: string;
          duration: number | null;
          duration_seconds: number | null;
        }>;

        let patched = 0;
        let stillMissing = 0;
        let twilioErrors = 0;
        const authHeader = "Basic " + btoa(`${twilioSid}:${twilioToken}`);

        for (const row of candidates) {
          try {
            const resp = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls/${row.twilio_call_sid}.json`,
              { headers: { Authorization: authHeader } },
            );
            if (!resp.ok) {
              twilioErrors++;
              continue;
            }
            const call = (await resp.json()) as {
              duration?: string | null;
              status?: string | null;
            };
            const dur = call.duration ? parseInt(call.duration, 10) : 0;

            if (dur > 0) {
              const { error: upErr } = await supabase
                .from("call_records")
                .update({
                  duration: dur,
                  duration_seconds: dur,
                  // Don't overwrite status unless Twilio confirms completed.
                  ...(call.status === "completed" ? { status: "completed" } : {}),
                })
                .eq("id", row.id);
              if (!upErr) patched++;
            } else {
              stillMissing++;
            }
          } catch (e) {
            console.error("reconcile-call-durations: row error", row.id, e);
            twilioErrors++;
          }
        }

        // Alert if we had to patch a lot — webhook likely broken.
        if (patched >= 5) {
          await supabase.from("error_logs").insert({
            function_name: "reconcile-call-durations",
            error_message: `Patched ${patched} call_records with missing durations — webhook may be misbehaving`,
            context: {
              patched,
              stillMissing,
              twilioErrors,
              candidates: candidates.length,
            },
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            candidates: candidates.length,
            patched,
            stillMissing,
            twilioErrors,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
