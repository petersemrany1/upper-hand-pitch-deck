// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/send-reminders.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function matches(given: string, expected: string | null | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Accepts the internal secret, or the scheduler's own token stored in settings. */
async function callerOk(given: string | null): Promise<boolean> {
  if (!given) return false;
  if (matches(given, legalEnv["INTERNAL_FUNCTION_SECRET"])) return true;
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "cron_token")
    .maybeSingle();
  const token = (data?.value as { token?: string } | null)?.token;
  return matches(given, token);
}

export const Route = createFileRoute("/api/public/hooks/send-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        if (!(await callerOk(request.headers.get("x-internal-secret")))) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Preserve the scheduler's read-only connection check.
        if (request.headers.get("x-booking-check-only") !== "true") {
          try {
            const { sendFirmPackOrderNotifications } =
              await import("@/legal/lib/firm-pack-orders.server");
            await sendFirmPackOrderNotifications();
          } catch {
            console.error("[firm-pack-order] queued notifications could not be processed");
          }
        }

        if (request.headers.get("x-booking-follow-ups-only") === "true") {
          try {
            if (request.headers.get("x-booking-check-only") === "true") {
              const { checkFirmBookingConnections } =
                await import("@/legal/lib/firm-booking-follow-up.server");
              return Response.json(await checkFirmBookingConnections());
            }
            // Keep booking state current even after SMS jobs finish or are disabled.
            let calendly: unknown;
            let calendlyFailed = false;
            try {
              const { syncFirmCalendlyBookings } = await import("@/legal/lib/firm-calendly.server");
              const result = await syncFirmCalendlyBookings();
              calendly = result;
              calendlyFailed = result.failed > 0 || result.status === "missing_configuration";
            } catch {
              calendlyFailed = true;
              calendly = { status: "failed" };
              console.error("[firm-calendly] scheduler failed; booking state held");
            }
            // Service callbacks on the existing minute timer without changing SMS timing.
            try {
              const { runAdBriefingCallbacks } = await import("@/legal/lib/ad-briefing.server");
              await runAdBriefingCallbacks();
            } catch (error) {
              console.error("[ad-briefing] callback scheduler failed", error);
            }
            const { runFirmBookingFollowUps } = await import("@/legal/lib/firm-booking-follow-up.server");
            return Response.json(
              { ...(await runFirmBookingFollowUps()), calendly },
              { status: calendlyFailed ? 500 : 200 },
            );
          } catch (error) {
            console.error("[firm-booking-follow-up] scheduler failed", error);
            return Response.json({ status: "failed", sent: 0 }, { status: 500 });
          }
        }

        // Reuse the existing cloud timer. The personal caller checks Sydney time
        // and claims each date atomically, independently of CRM reminders.
        let adBriefings: unknown = null;
        try {
          const { runAdBriefingCalls } = await import("@/legal/lib/ad-briefing.server");
          adBriefings = await runAdBriefingCalls();
        } catch {
          adBriefings = { status: "failed" };
          console.error("[ad-briefing] scheduled call check failed");
        }

        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
        const { runAppointmentReminders } = await import("@/legal/lib/appointment-reminders.server");
        let appointments: unknown;
        let appointmentWorkerFailed = false;
        try {
          appointments = await runAppointmentReminders();
        } catch (error) {
          console.error("[send-reminders] appointment worker failed", error);
          appointmentWorkerFailed = true;
          appointments = { status: "failed" };
        }

        // Contract chase (Bold Marketing Agreement) rides the same schedule.
        // Rows carry their own 9am-Sydney next_reminder_at, so no hour guard here.
        let contracts: { sent: number; flagged: number } | { error: string } = {
          sent: 0,
          flagged: 0,
        };
        try {
          const { runContractReminders } = await import("@/legal/lib/firm-contracts.server");
          contracts = await runContractReminders();
        } catch (e) {
          contracts = { error: (e as Error).message };
          await supabaseAdmin.from("error_logs").insert({
            source: "send-reminders",
            message: "contract reminders failed",
            detail: { error: (e as Error).message },
          });
        }
        let handovers: unknown = null;
        try {
          const { sweepMeetingHandovers } = await import("@/legal/lib/cold-calling/cold-calling.server");
          handovers = await sweepMeetingHandovers();
        } catch (error) {
          console.error("[send-reminders] handover sweep failed", error);
        }

        return Response.json(
          {
            ok: !appointmentWorkerFailed,
            appointments,
            contracts,
            handovers,
            adBriefings,
          },
          { status: appointmentWorkerFailed ? 500 : 200 },
        );
      },
    },
  },
});
