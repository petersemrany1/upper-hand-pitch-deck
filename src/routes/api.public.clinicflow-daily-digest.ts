// Daily morning briefing: emails each ClinicFlow clinic today's patients and
// the follow-ups they owe. Called by pg_cron with the x-cron-secret header.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sydneyTodayISO, sydneyHour } from "@/lib/timezone";
import { APP_TIMEZONE } from "@/lib/timezone";

type FollowupRow = { patient_name: string; due_date: string };
type ApptRow = {
  patient_name: string;
  patient_phone: string | null;
  appointment_time: string;
  intel_notes: string | null;
};

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short", timeZone: APP_TIMEZONE,
  });
}

function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = parseInt(m[1]!, 10);
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m[2]}${ampm}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** First useful line(s) of the intel notes, trimmed for an email. */
function intelSnippet(notes: string | null): string {
  if (!notes) return "";
  const flat = notes.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > 220 ? `${flat.slice(0, 220).trimEnd()}…` : flat;
}


export const Route = createFileRoute("/api/public/clinicflow-daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CLINICFLOW_CRON_SECRET;
        if (!cronSecret) {
          console.error("clinicflow-daily-digest: CLINICFLOW_CRON_SECRET not configured");
          return new Response("Server misconfigured", { status: 500 });
        }
        if (request.headers.get("x-cron-secret") !== cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Two UTC cron jobs (22:00 + 23:00) cover both AEST and AEDT; this gate
        // means exactly one of them actually sends, at 9am Sydney, year-round.
        let source: string | undefined;
        try {
          const body = (await request.json()) as { source?: string } | null;
          source = body?.source;
        } catch {
          source = undefined;
        }
        if (source === "cron" && sydneyHour() !== 9) {
          return Response.json({ skipped: true });
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        const today = sydneyTodayISO();

        const { data: settings, error: settingsError } = await supabase
          .from("clinicflow_clinic_settings")
          .select("clinic_id, notification_email")
          .eq("email_notifications_enabled", true)
          .not("notification_email", "is", null);
        if (settingsError) {
          console.error("clinicflow-daily-digest: settings query failed", settingsError.message);
          return new Response("Query failed", { status: 500 });
        }

        const RESEND_CONNECTION_KEY = process.env.RESEND_API_KEY ?? "";
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY ?? "";

        let clinicsEmailed = 0;

        for (const s of settings ?? []) {
          const clinicId = s.clinic_id as string;
          const to = (s.notification_email as string | null)?.trim();
          if (!to) continue;

          const { data: due } = await supabase
            .from("clinicflow_followups")
            .select("patient_name, due_date")
            .eq("clinic_id", clinicId)
            .eq("status", "open")
            .lte("due_date", today)
            .order("due_date", { ascending: true });

          const rows = (due ?? []) as FollowupRow[];
          if (rows.length === 0) continue;

          const { data: clinic } = await supabase
            .from("partner_clinics")
            .select("clinic_name")
            .eq("id", clinicId)
            .maybeSingle();
          const clinicName = (clinic?.clinic_name as string | undefined) ?? "Your clinic";

          const list = rows
            .map((r) => `<li>${r.patient_name} — due ${fmtDay(r.due_date)}${r.due_date < today ? " <strong>(overdue)</strong>" : ""}</li>`)
            .join("");

          const html = `
            <div style="font-family: system-ui, sans-serif; max-width: 560px; color:#111; line-height:1.55;">
              <h2 style="color:#1a3a6b; margin-bottom:4px;">${rows.length} patient${rows.length === 1 ? "" : "s"} to follow up today</h2>
              <p>${clinicName}</p>
              <ul>${list}</ul>
              <p>Log in to the clinic portal to see them.</p>
            </div>
          `;

          if (!RESEND_CONNECTION_KEY || !LOVABLE_API_KEY) {
            console.error("clinicflow-daily-digest: email service not configured");
            break;
          }

          try {
            const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_CONNECTION_KEY,
              },
              body: JSON.stringify({
                from: "Bold Patients <admin@bold-patients.com>",
                reply_to: "admin@bold-patients.com",
                to: [to],
                subject: `${rows.length} patient${rows.length === 1 ? "" : "s"} to follow up today — ${clinicName}`,
                html,
              }),
            });
            if (!resp.ok) {
              console.error("clinicflow-daily-digest: send failed", resp.status, await resp.text());
              continue;
            }
            clinicsEmailed += 1;
          } catch (e) {
            console.error("clinicflow-daily-digest: send error", e);
          }
        }

        return Response.json({ clinicsEmailed });
      },
    },
  },
});
