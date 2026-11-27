// Ported from the Legal app (family-law-floater/src/lib/firm-booking-follow-up.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/legal/integrations/supabase/types";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import {
  bookingText,
  dueAt,
  FOLLOW_UP_STAGES,
  isTargetedAd,
  nextBusinessNoon,
  reminderWindow,
} from "./firm-booking-follow-up";
import { publicBaseUrl, recordOutboundSms, toAuE164, twilioForm, twilioEnv } from "./twilio.server";

type Job = {
  id: string;
  application_id: string;
  step: number;
  due_at: string;
  status: string;
  claimed_at: string | null;
  sent_at: string | null;
  twilio_sid: string | null;
  last_error: string | null;
};
type FollowUpDatabase = Database & {
  public: {
    Tables: {
      firm_booking_follow_ups: {
        Row: Job;
        Insert: Partial<Job> & Pick<Job, "application_id" | "step" | "due_at">;
        Update: Partial<Job>;
        Relationships: [];
      };
    };
  };
};
const db = supabaseAdmin as unknown as SupabaseClient<FollowUpDatabase>;

export function authenticatedLeadTrigger(request: Request): boolean {
  const expected = legalEnv["FIRM_BOOKING_LEAD_SECRET"];
  const supplied = request.headers.get("x-firm-booking-secret");
  if (!expected || expected.length < 32 || !supplied) return false;
  const a = Buffer.from(expected),
    b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function enabled(): boolean {
  return legalEnv["FIRM_BOOKING_SMS_ENABLED"] === "true";
}

/** Called only after an authenticated lead delivery has been saved. Retrying the
 * same delivery repairs a failed enqueue without resending either SMS. */
export async function enqueueFirmBookingFollowUps(externalLeadId: string | null) {
  if (!enabled()) return { status: "disabled" };
  if (!externalLeadId) return { status: "missing_lead_id" };
  const { data: app, error } = await db
    .from("firm_applications")
    .select("*")
    .eq("lead_id", externalLeadId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return { status: "no_saved_application" };
  if (!isTargetedAd(app.adset_name)) return { status: "other_ad_set" };
  if (!FOLLOW_UP_STAGES.has(app.stage)) return { status: "application_progressed" };
  // Never backfill older enquiries when a connection is switched on or replayed.
  if (Date.now() - new Date(app.created_at).getTime() > 10 * 60_000) return { status: "historical_delivery" };
  const phone = toAuE164(app.phone);
  if (!phone?.startsWith("+614") || !app.email) return { status: "missing_mobile_or_email" };
  const { error: insertError } = await db.from("firm_booking_follow_ups").upsert(
    [1, 2].map((step) => ({ application_id: app.id, step, due_at: dueAt(app.created_at, step) })),
    { onConflict: "application_id,step", ignoreDuplicates: true },
  );
  if (insertError) throw insertError;
  return { status: "enrolled", first_due_at: dueAt(app.created_at, 1), reminder_due_at: dueAt(app.created_at, 2) };
}

const userSchema = z.object({
  resource: z.object({ uri: z.string().url(), scheduling_url: z.string().url() }),
});
const eventsSchema = z.object({
  collection: z.array(z.object({ status: z.literal("active"), uri: z.string().url() })),
});

async function calendlyGet(path: string, token: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(`https://api.calendly.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Calendly check failed (${response.status}); SMS held`);
  return response.json();
}

export async function calendlyOwner(token: string, fetcher: typeof fetch = fetch): Promise<string> {
  const { resource } = userSchema.parse(await calendlyGet("/users/me", token, fetcher));
  if (resource.scheduling_url.replace(/\/$/, "") !== "https://calendly.com/paypershowcall") {
    throw new Error("Calendly connection is not the paypershowcall account; SMS held");
  }
  return resource.uri;
}

/** Internal, read-only readiness check. Never returns tokens or invitee data. */
export async function checkFirmBookingConnections() {
  const token = legalEnv["CALENDLY_API_TOKEN"];
  if (!token) throw new Error("Calendly token is missing");
  const user = await calendlyOwner(token);
  const query = new URLSearchParams({ user, status: "active", count: "1" });
  eventsSchema.parse(await calendlyGet(`/scheduled_events?${query}`, token, fetch));
  const { accountSid, authToken } = twilioEnv();
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`,
    { headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`Twilio number check failed (${response.status})`);
  const data = z.object({ incoming_phone_numbers: z.array(z.object({
    phone_number: z.string(), sms_url: z.string().nullable(), sms_method: z.string().nullable(),
    capabilities: z.object({ sms: z.boolean() }),
  })) }).parse(await response.json());
  const expectedUrl = `${publicBaseUrl()}/api/public/hooks/twilio-sms-inbound`;
  const numbers = data.incoming_phone_numbers.filter(n => n.phone_number.startsWith("+614") && n.capabilities.sms)
    .map(n => ({ number: n.phone_number, repliesConfigured: n.sms_url === expectedUrl && n.sms_method === "POST" }));
  const from = toAuE164(legalEnv["FIRM_BOOKING_SMS_FROM"]);
  return { schedule: "four_minutes_then_next_business_noon_sydney", calendly: "connected", enabled: enabled(), sender: from,
    senderReady: numbers.some(n => n.number === from && n.repliesConfigured), numbers };
}

/** Check immediately before EACH send; failed or malformed checks never mean unbooked. */
export async function hasCalendlyBooking(
  email: string,
  since: string,
  user: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const query = new URLSearchParams({
    user,
    invitee_email: email.trim().toLowerCase(),
    status: "active",
    min_start_time: since,
    count: "1",
  });
  const data = eventsSchema.parse(await calendlyGet(`/scheduled_events?${query}`, token, fetcher));
  return data.collection.length > 0;
}

async function cancel(applicationId: string, reason: string): Promise<void> {
  const { error } = await db
    .from("firm_booking_follow_ups")
    .update({ status: "cancelled", last_error: reason })
    .eq("application_id", applicationId)
    .in("status", ["pending", "checking"]);
  if (error) throw error;
}

async function hasReply(phone: string): Promise<boolean> {
  const { data, error } = await db
    .from("sms_messages")
    .select("id")
    .eq("direction", "inbound")
    .like("phone", `%${phone.slice(-9)}`)
    .limit(1);
  if (error) throw error;
  // Prior replies also suppress this automation; a repeat application must not
  // silently undo an opt-out or restart a conversation staff already own.
  return !!data?.length;
}

export async function recordFirmBookingDeliveryFailure(sid: string, status: string): Promise<void> {
  if (!["failed", "undelivered"].includes(status) || !enabled()) return;
  const { data: job, error } = await db
    .from("firm_booking_follow_ups")
    .update({ status: "failed", last_error: `SMS ${status}` })
    .eq("twilio_sid", sid)
    .eq("status", "sent")
    .select("application_id")
    .maybeSingle();
  if (error) throw error;
  if (job) await cancel(job.application_id, "Previous text was not delivered");
}

export async function runFirmBookingFollowUps(now = new Date()) {
  if (!enabled()) return { status: "disabled", sent: 0 };
  const token = legalEnv["CALENDLY_API_TOKEN"];
  const from = toAuE164(legalEnv["FIRM_BOOKING_SMS_FROM"]);
  if (!token || !from?.startsWith("+614")) return { status: "missing_configuration", sent: 0 };
  // Safe to reclaim a stalled read-only check. Never reclaim 'sending': the
  // provider may have accepted it even if its response or our process was lost.
  const { error: recoveryError } = await db
    .from("firm_booking_follow_ups")
    .update({ status: "pending" })
    .eq("status", "checking")
    .lt("claimed_at", new Date(now.getTime() - 5 * 60_000).toISOString());
  if (recoveryError) throw recoveryError;
  const { data: jobs, error } = await db
    .from("firm_booking_follow_ups")
    .select("*")
    .eq("status", "pending")
    .lte("due_at", now.toISOString())
    .order("due_at")
    .limit(10);
  if (error) throw error;
  if (!jobs?.length) return { status: "no_due_texts", sent: 0 };
  const user = await calendlyOwner(token);
  let sent = 0,
    held = 0;
  for (const job of jobs ?? []) {
    const claimTime = new Date().toISOString();
    const { data: claimed, error: claimError } = await db
      .from("firm_booking_follow_ups")
      .update({ status: "checking", claimed_at: claimTime })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    let sending = false;
    try {
      const { data: app, error: appError } = await db
        .from("firm_applications")
        .select("*")
        .eq("id", job.application_id)
        .single();
      if (appError) throw appError;
      const phone = toAuE164(app.phone);
      if (
        !isTargetedAd(app.adset_name) ||
        !FOLLOW_UP_STAGES.has(app.stage) ||
        !app.email ||
        !phone?.startsWith("+614") ||
        phone === from
      ) {
        await cancel(app.id, "No longer eligible");
        continue;
      }
      // Do not send old messages after downtime or immediately stack two steps.
      if (now.getTime() - new Date(dueAt(app.created_at, job.step)).getTime() > 72 * 60 * 60_000) {
        await cancel(app.id, "Follow-up expired");
        continue;
      }
      if (job.step === 2) {
        const { data: first, error: firstError } = await db
          .from("firm_booking_follow_ups")
          .select("status,sent_at")
          .eq("application_id", app.id)
          .eq("step", 1)
          .single();
        if (firstError) throw firstError;
        if (first.status !== "sent" || !first.sent_at) {
          if (["failed", "cancelled"].includes(first.status))
            await cancel(app.id, "First text was not sent");
          else throw new Error("Waiting for first text");
          continue;
        }
        // A delayed first text must not stack with a reminder on the same day.
        const nextNoon = nextBusinessNoon(new Date(first.sent_at));
        const window = reminderWindow(now);
        const deferredUntil = now.toISOString() < nextNoon ? nextNoon : !window.open ? window.next : null;
        if (deferredUntil) {
          const { error } = await db.from("firm_booking_follow_ups")
            .update({ status: "pending", due_at: deferredUntil, last_error: "Waiting for next business-day noon" })
            .eq("id", job.id).eq("status", "checking").eq("claimed_at", claimTime);
          if (error) throw error;
          continue;
        }
      }
      if (await hasReply(phone)) {
        await cancel(app.id, "Recipient replied");
        continue;
      }
      if (await hasCalendlyBooking(app.email, app.created_at, user, token)) {
        await cancel(app.id, "Calendly booking found");
        continue;
      }
      // Reply/stage database triggers can cancel while Calendly is being checked.
      // Claim token prevents a stale worker from sending after its lease expires.
      const { data: sendClaim, error: sendError } = await db
        .from("firm_booking_follow_ups")
        .update({ status: "sending", last_error: null })
        .eq("id", job.id)
        .eq("status", "checking")
        .eq("claimed_at", claimTime)
        .select("id")
        .maybeSingle();
      if (sendError) throw sendError;
      if (!sendClaim) continue;
      sending = true;
      const body = bookingText(job.step, app.first_name);
      const result = await twilioForm("/Messages.json", {
        To: phone,
        From: from,
        Body: body,
        StatusCallback: `${publicBaseUrl()}/api/public/hooks/twilio-sms-status`,
      });
      if (!result.ok || typeof result.json["sid"] !== "string" || !result.json["sid"]) {
        throw new Error(
          `SMS provider rejected or did not confirm the send (${result.status}); review before retrying`,
        );
      }
      const sid = result.json["sid"];
      const { error: savedError } = await db
        .from("firm_booking_follow_ups")
        .update({ status: "sent", twilio_sid: sid, sent_at: new Date().toISOString() })
        .eq("id", job.id);
      if (savedError) throw savedError;
      sent++;
      await recordOutboundSms(null, phone, body, sid);
    } catch (error) {
      held++;
      const message = error instanceof Error ? error.message : "Follow-up failed";
      const { error: saveError } = await db
        .from("firm_booking_follow_ups")
        .update({
          status: sending ? "failed" : "pending",
          last_error: message,
          ...(!sending ? { due_at: new Date(now.getTime() + 5 * 60_000).toISOString() } : {}),
        })
        .eq("id", job.id)
        .eq("status", sending ? "sending" : "checking")
        .eq("claimed_at", claimTime);
      if (saveError) console.error("[firm-booking-follow-up] could not record failure", job.id);
      console.error("[firm-booking-follow-up] held", job.id, message);
    }
  }
  return { status: "checked", sent, held };
}
