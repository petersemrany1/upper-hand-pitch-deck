// Ported from the Legal app (family-law-floater/src/lib/firm-calendly.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { z } from "zod";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { calendlyOwner } from "./firm-booking-follow-up.server";

const eventSchema = z
  .object({
    uri: z.string().regex(/^https:\/\/api\.calendly\.com\/scheduled_events\/[a-zA-Z0-9-]+$/),
    status: z.literal("active"),
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }),
  })
  .refine((event) => Date.parse(event.end_time) > Date.parse(event.start_time));
const eventsSchema = z.object({
  collection: z.array(eventSchema),
  pagination: z.object({ next_page_token: z.string().nullable() }),
});
const inviteesSchema = z.object({
  collection: z.array(z.object({ email: z.string().email(), status: z.literal("active") })),
});
type CalendlyBooking = z.infer<typeof eventSchema>;

async function get(path: string, token: string, fetcher: typeof fetch, signal?: AbortSignal) {
  const response = await fetcher(`https://api.calendly.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.any([AbortSignal.timeout(10_000), ...(signal ? [signal] : [])]),
  });
  if (!response.ok) throw new Error(`Calendly booking sync failed (${response.status})`);
  return response.json();
}

/** An active group event can still have a cancelled invitee. Verify both. */
export async function findUpcomingFirmBooking(
  email: string,
  user: string,
  token: string,
  now: Date,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<CalendlyBooking | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const query = new URLSearchParams({
    user,
    invitee_email: normalizedEmail,
    status: "active",
    min_start_time: now.toISOString(),
    sort: "start_time:asc",
    count: "100",
  });
  const seenPages = new Set<string>();
  for (;;) {
    const page = eventsSchema.parse(
      await get(`/scheduled_events?${query}`, token, fetcher, signal),
    );
    for (const event of page.collection) {
      if (Date.parse(event.start_time) < now.getTime()) continue;
      const inviteeQuery = new URLSearchParams({
        email: normalizedEmail,
        status: "active",
        count: "100",
      });
      const invitees = inviteesSchema.parse(
        await get(
          `${new URL(event.uri).pathname}/invitees?${inviteeQuery}`,
          token,
          fetcher,
          signal,
        ),
      );
      if (
        invitees.collection.some(
          (invitee) => invitee.email.trim().toLowerCase() === normalizedEmail,
        )
      ) {
        return event;
      }
    }
    const next = page.pagination.next_page_token;
    if (!next) return null;
    if (seenPages.has(next))
      throw new Error("Calendly returned a repeated page; booking state held");
    seenPages.add(next);
    query.set("page_token", next);
  }
}

/** Existing minute timer; independent of ad source, replies and SMS enablement. */
export async function syncFirmCalendlyBookings(now = new Date()) {
  const token = legalEnv["CALENDLY_API_TOKEN"];
  if (!token) return { status: "missing_configuration", checked: 0, updated: 0, failed: 0 };
  const { data: apps, error } = await supabaseAdmin
    .from("firm_applications")
    .select("id,email,calendly_booking_email,stage")
    .in("stage", ["new", "no_answer", "follow_up", "calendly_booked"])
    .or("email.not.is.null,calendly_booking_email.not.is.null")
    .order("calendly_sync_attempted_at", { ascending: true, nullsFirst: true })
    .order("id")
    .limit(20);
  if (error) throw error;
  if (!apps?.length) return { status: "no_open_applications", checked: 0, updated: 0, failed: 0 };
  const user = await calendlyOwner(token);
  const deadline = AbortSignal.timeout(40_000);
  let checked = 0,
    updated = 0,
    failed = 0;
  // Five concurrent reads keep the minute worker bounded without a request burst.
  for (let index = 0; index < apps.length; index += 5) {
    await Promise.all(
      apps.slice(index, index + 5).map(async (app) => {
        try {
          // Rotate failed checks too, so an invalid address cannot starve other leads.
          // A newer attempt also prevents an overlapping older response from applying.
          const { data: claimed, error: claimError } = await supabaseAdmin
            .from("firm_applications")
            .update({ calendly_sync_attempted_at: now.toISOString() })
            .eq("id", app.id)
            .eq("stage", app.stage)
            .or(
              `calendly_sync_attempted_at.is.null,calendly_sync_attempted_at.lt.${now.toISOString()}`,
            )
            .select("id")
            .maybeSingle();
          if (claimError) throw claimError;
          if (!claimed) return;
          const bookingEmail = app.calendly_booking_email || app.email;
          if (!bookingEmail?.trim()) throw new Error("Missing booking email");
          const booking = await findUpcomingFirmBooking(
            bookingEmail,
            user,
            token,
            now,
            fetch,
            deadline,
          );
          const { data, error } = await supabaseAdmin.rpc("sync_firm_calendly_booking", {
            p_application_id: app.id,
            p_expected_email: bookingEmail,
            p_expected_stage: app.stage,
            p_checked_at: now.toISOString(),
            p_event_uri: (booking?.uri ?? null) as string,
            p_start_at: (booking?.start_time ?? null) as string,
            p_end_at: (booking?.end_time ?? null) as string,
          });
          if (error) throw error;
          checked++;
          if (data === "updated") updated++;
        } catch {
          // Provider/database failures never mean cancelled or unbooked.
          failed++;
          console.error("[firm-calendly] booking state held", app.id);
        }
      }),
    );
  }
  return { status: failed ? "partial_failure" : "checked", checked, updated, failed };
}
