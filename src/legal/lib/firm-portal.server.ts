// Ported from the Legal app (family-law-floater/src/lib/firm-portal.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { collectPages } from "./collect-pages";
// Server-only machinery behind the firm partner portal.
// Firms never see deposit / refund / Stripe information: every refund path here
// is internal only and its result is never returned to a firm caller.
import { INTERNAL_ALERT_TO, sendEmail } from "./email.server";
import { publicBaseUrl } from "./twilio.server";
import { cleanIntelNotes } from "./handover.server";
import {
  generateSlots,
  hhmmToMin,
  minToHHMM,
  minToLabel,
  type AvailabilityOverride,
  type BlockedSlot,
  type ExistingAppt,
  type TradingHours,
} from "./slot-generation";

export const FIRM_PORTAL_FROM = legalEnv["FIRM_PORTAL_FROM_EMAIL"] ?? undefined;

export type CallerRole = { isAdmin: boolean; firmId: string | null };

type AppointmentRow = {
  id: string;
  firm_id: string | null;
  lead_id: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string;
  outcome: string | null;
  conflict_status: string;
  chase_status: string | null;
  client_name: string | null;
  client_phone: string | null;
  stripe_refund_id: string | null;
  location_id: string | null;
};

const APPT_COLUMNS =
  "id, firm_id, lead_id, appointment_date, appointment_time, status, outcome, conflict_status, chase_status, client_name, client_phone, stripe_refund_id, location_id";

async function admin() {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadAppointment(appointmentId: string): Promise<AppointmentRow> {
  const db = await admin();
  const { data, error } = await db
    .from("firm_appointments")
    .select(APPT_COLUMNS)
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Appointment not found");
  return data as AppointmentRow;
}

/** Admin, or the firm this appointment belongs to. */
export function assertAppointmentAccess(appt: AppointmentRow, caller: CallerRole): void {
  if (caller.isAdmin) return;
  if (caller.firmId && appt.firm_id === caller.firmId) return;
  throw new Error("You cannot act on this appointment");
}

export function assertAdmin(caller: CallerRole): void {
  if (!caller.isAdmin) throw new Error("Admins only");
}

async function logError(source: string, message: string, detail: unknown): Promise<void> {
  try {
    const db = await admin();
    await db.from("error_logs").insert({
      source,
      message,
      detail: detail as never,
    });
  } catch (err) {
    console.error("[firm-portal] error log failed", err);
  }
}

/* ============================== SLOT VALIDATION ============================== */

export type SlotContext = {
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  overrides: AvailabilityOverride[];
  appts: ExistingAppt[];
  firmState: string | null;
  consultationMinutes: number;
  bufferMinutes: number;
};

export async function loadSlotContext(
  firmId: string,
  ignoreAppointmentId?: string,
  ignoreLeadId?: string,
): Promise<SlotContext> {
  const db = await admin();
  const [hours, blocks, overrides, appts, firm] = await Promise.all([
    db
      .from("firm_trading_hours")
      // "*" rather than a column list: slot_times may not exist until the
      // migration has run, and the portal must still load without it.
      .select("*")
      .eq("firm_id", firmId),
    collectPages((from, to) =>
      db
        .from("firm_blocked_slots")
        .select(
          "id, date, start_time, end_time, reason, is_recurring, recur_pattern, recur_day_of_week, recur_days_of_week, recur_day_of_month, recur_nth_week, recur_until, excluded_dates",
        )
        .eq("firm_id", firmId)
        .order("id")
        .range(from, to),
    ),
    collectPages((from, to) =>
      db
        .from("firm_availability")
        .select("id, override_date, override_type, start_time, end_time")
        .eq("firm_id", firmId)
        .order("id")
        .range(from, to),
    ),
    collectPages((from, to) =>
      db
        .from("firm_appointments")
        .select(
          "id, lead_id, appointment_date, appointment_time, client_name, consultation_duration_minutes",
        )
        .eq("firm_id", firmId)
        .neq("status", "cancelled")
        .is("disqualified_at", null)
        .or("outcome.is.null,outcome.neq.disqualified")
        .order("id")
        .range(from, to),
    ),
    db
      .from("firms")
      .select("state, consultation_duration_minutes, buffer_minutes")
      .eq("id", firmId)
      .maybeSingle(),
  ]);

  const failed = [hours, firm].find((r) => r.error)?.error;
  if (failed) throw new Error(failed.message);
  return {
    consultationMinutes:
      appts.find((a) => a.id === ignoreAppointmentId)?.consultation_duration_minutes ??
      firm.data?.consultation_duration_minutes ??
      60,
    bufferMinutes: firm.data?.buffer_minutes ?? 0,
    tradingHours: (hours.data ?? []).map((h) => ({
      day_of_week: h.day_of_week,
      open_time: String(h.open_time ?? "09:00"),
      close_time: String(h.close_time ?? "17:00"),
      is_closed: !h.is_open,
      consult_duration_mins: Number(h.consult_duration_mins ?? 30) || 30,
      slot_times: ((h as { slot_times?: string[] | null }).slot_times ?? null) as string[] | null,
    })),
    blockedSlots: blocks.map((b) => ({
      id: b.id,
      date: b.date,
      start_time: String(b.start_time ?? ""),
      end_time: String(b.end_time ?? ""),
      is_recurring: Boolean(b.is_recurring),
      recur_pattern: (b.recur_pattern ?? null) as BlockedSlot["recur_pattern"],
      recur_day_of_week: b.recur_day_of_week ?? null,
      recur_days_of_week: b.recur_days_of_week ?? null,
      recur_day_of_month: b.recur_day_of_month ?? null,
      recur_nth_week: b.recur_nth_week ?? null,
      recur_until: b.recur_until ?? null,
      reason: b.reason ?? null,
      excluded_dates: b.excluded_dates,
    })) as BlockedSlot[],
    overrides: overrides.map((o) => ({
      id: o.id,
      override_date: String(o.override_date),
      override_type: String(o.override_type ?? ""),
      start_time: o.start_time ? String(o.start_time) : null,
      end_time: o.end_time ? String(o.end_time) : null,
    })),
    appts: appts
      .filter((a) => a.id !== ignoreAppointmentId && (!ignoreLeadId || a.lead_id !== ignoreLeadId))
      .map((a) => ({
        appointment_date: String(a.appointment_date ?? ""),
        appointment_time: String(a.appointment_time ?? ""),
        client_name: a.client_name ?? null,
        consultation_duration_minutes: a.consultation_duration_minutes,
      })),
    firmState: (firm.data as { state?: string | null } | null)?.state ?? null,
  };
}

/**
 * Validates a date + time against trading hours, blocks, overrides and holidays.
 * `allowOffGrid` lets a rep book a time the client asked for (e.g. 2:30pm) that
 * isn't one of the firm's usual starts — a real clash is still refused.
 */
export async function validateSlot(
  firmId: string,
  date: string,
  time: string,
  ignoreAppointmentId?: string,
  allowOffGrid = false,
): Promise<{ ok: boolean; error?: string; time?: string }> {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return { ok: false, error: "Invalid date" };
  const target = new Date(y, m - 1, d);
  const context = await loadSlotContext(firmId, ignoreAppointmentId);
  const slots = generateSlots(
    target,
    context.tradingHours,
    context.blockedSlots,
    context.appts,
    context.overrides,
    context.firmState,
    context.bufferMinutes,
    context.consultationMinutes,
  );
  const wanted = minToHHMM(hhmmToMin(time));
  const slot = slots.find((s) => s.time === wanted);

  if (!slot && allowOffGrid) {
    const customHours = context.tradingHours.map((h) => ({ ...h, slot_times: [wanted] }));
    const candidates = generateSlots(
      target,
      customHours,
      context.blockedSlots,
      context.appts,
      context.overrides,
      context.firmState,
      context.bufferMinutes,
      context.consultationMinutes,
    );
    const candidate = candidates.find((s) => s.time === wanted);
    if (!candidate?.available)
      return {
        ok: false,
        error: "That time is closed, blocked or overlaps a consultation or buffer",
      };
    return { ok: true, time: wanted };
  }

  if (slots.length === 0) {
    return { ok: false, error: "The firm is closed on that date" };
  }
  if (!slot) {
    return {
      ok: false,
      error: `${minToLabel(hhmmToMin(time))} is outside the firm's consulting hours that day`,
    };
  }
  if (slot.blocked) return { ok: false, error: "That time is blocked out by the firm" };
  if (slot.booked) return { ok: false, error: "That time is already booked" };
  return { ok: true, time: slot.time };
}

/** Firm-facing brief denormalised onto the appointment (same text the handover email uses). */
export async function firmFacingBrief(leadId: string | null): Promise<string | null> {
  if (!leadId) return null;
  const db = await admin();
  const { data: lead } = await db
    .from("client_leads")
    .select("call_notes")
    .eq("id", leadId)
    .maybeSingle();
  const notes = cleanIntelNotes(lead?.call_notes ?? null);
  return notes.trim() ? notes : null;
}

/* ================================= REFUNDS ================================= */

/**
 * Internal only. Refunds the client's holding fee once the consult happened
 * (show/signed) or when an admin disqualifies. Never called for no-shows and
 * never surfaced to a firm caller.
 */
async function refundHoldingFee(
  appt: AppointmentRow,
  reason: "consult_complete" | "disqualified",
): Promise<void> {
  const db = await admin();
  if (appt.stripe_refund_id) return;

  const { data: lead } = appt.lead_id
    ? await db
        .from("client_leads")
        .select(
          "id, first_name, last_name, phone, stripe_payment_intent_id, deposit_paid_at, deposit_amount",
        )
        .eq("id", appt.lead_id)
        .maybeSingle()
    : { data: null };

  const clientLabel =
    appt.client_name ?? ([lead?.first_name, lead?.last_name].filter(Boolean).join(" ") || "client");
  const intent = lead?.stripe_payment_intent_id ?? null;

  if (!intent) {
    await db.from("firm_appointments").update({ refund_status: "manual" }).eq("id", appt.id);
    // Say WHY so the admin knows which drawer to open.
    const depositTaken = Boolean(lead?.deposit_paid_at);
    const why = depositTaken
      ? `A $${lead?.deposit_amount ?? 75} deposit was recorded on ${String(lead?.deposit_paid_at).slice(0, 10)} but it was taken manually (bank transfer, phone, or outside the portal), so there is no card to refund automatically. Refund it the same way it came in.`
      : "The portal has NO deposit recorded for this client. If you took one outside the portal (a standalone payment link, the old system), refund it there. If none was taken, nothing is owed.";
    await sendEmail({
      to: [INTERNAL_ALERT_TO],
      subject: `Manual refund needed — ${clientLabel}`,
      text: [
        "A consultation is complete and the deposit could not be refunded automatically.",
        "",
        `Client: ${clientLabel}`,
        `Appointment: ${appt.appointment_date ?? "?"} ${appt.appointment_time ?? ""}`,
        `Outcome: ${reason}`,
        "",
        why,
        "",
        `Once refunded, mark it done here: ${publicBaseUrl()}/booked-appointments`,
      ].join("\n"),
    });
    return;
  }

  try {
    // Deposits are taken through Square (AU); the *_stripe_* column names are legacy.
    // Bookings paid before the Square switch still hold a Stripe PaymentIntent.
    const amountCents = lead?.deposit_amount ? lead.deposit_amount * 100 : null;
    const note =
      reason === "disqualified" ? "Disqualified — deposit refunded" : "Consultation complete";
    const isStripeLegacy = /^(pi_|ch_|cs_)/.test(intent);
    const refunded = isStripeLegacy
      ? await (
          await import("./stripe-refund.server")
        ).refundStripePayment({
          paymentIntentId: intent,
          amountCents,
          reason: note,
        })
      : await (
          await import("./square-deposit.server")
        ).refundSquarePayment({
          paymentId: intent,
          amountCents,
          reason: note,
        });
    const acceptedStatuses = isStripeLegacy ? ["pending", "succeeded"] : ["PENDING", "COMPLETED"];
    if (!refunded.refundId || !acceptedStatuses.includes(refunded.status)) {
      throw new Error(`Refund was not initiated (${refunded.status})`);
    }
    // Only the request that first records this refund may notify the client.
    const { data: saved, error: saveError } = await db
      .from("firm_appointments")
      .update({
        refund_status: "refunded",
        stripe_refund_id: refunded.refundId,
        refund_processed_at: new Date().toISOString(),
      })
      .eq("id", appt.id)
      .is("stripe_refund_id", null)
      .select("id")
      .maybeSingle();
    if (saveError) throw new Error(saveError.message);
    if (!saved) return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("firm_appointments")
      .update({ refund_status: "failed" })
      .eq("id", appt.id)
      .is("stripe_refund_id", null);
    await logError("firm-portal/refund", message, { appointmentId: appt.id, reason });
    await sendEmail({
      to: [INTERNAL_ALERT_TO],
      subject: `Refund failed — ${clientLabel}`,
      text: [
        "An automatic refund failed and needs manual attention.",
        "",
        `Client: ${clientLabel}`,
        `Appointment: ${appt.appointment_date ?? "?"} ${appt.appointment_time ?? ""}`,
        `Error: ${message}`,
      ].join("\n"),
    });
    return;
  }

  if (reason !== "consult_complete") return;
  // SMS failures must not turn an accepted refund into a failed refund.
  try {
    const { sendSmsToLead } = await import("./twilio.server");
    const sms = await sendSmsToLead(
      appt.lead_id,
      appt.client_phone || lead?.phone || null,
      `Hi, your $${lead?.deposit_amount ?? 75} deposit refund has been initiated. It can take 4–14 business days to appear in your account.`,
    );
    if (!sms.ok) throw new Error(sms.error ?? "Refund notification could not be sent");
  } catch (err) {
    await logError("firm-portal/refund-sms", err instanceof Error ? err.message : String(err), {
      appointmentId: appt.id,
      leadId: appt.lead_id,
    });
  }
}

/* ============================ OUTCOME + WORKFLOW ============================ */

export async function processConsultOutcome(
  appointmentId: string,
  input: { summary?: string; signed?: boolean },
  caller: CallerRole,
): Promise<{ ok: boolean }> {
  const appt = await loadAppointment(appointmentId);
  assertAppointmentAccess(appt, caller);
  if (appt.outcome === "disqualified") throw new Error("This appointment is disqualified");

  const db = await admin();
  const { error } = await db
    .from("firm_appointments")
    .update({
      outcome: input.signed ? "signed" : "show",
      consult_summary: String(input.summary ?? "").slice(0, 4000) || null,
    })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);

  // Internal money handling — after the outcome is safely saved.
  await refundHoldingFee(
    { ...appt, outcome: input.signed ? "signed" : "show" },
    "consult_complete",
  );
  return { ok: true };
}

export async function markNoShow(
  appointmentId: string,
  input: { summary?: string },
  caller: CallerRole,
): Promise<{ ok: boolean }> {
  const appt = await loadAppointment(appointmentId);
  assertAppointmentAccess(appt, caller);
  if (appt.outcome === "disqualified") throw new Error("This appointment is disqualified");
  const db = await admin();
  const { error } = await db
    .from("firm_appointments")
    .update({
      outcome: "noshow",
      consult_summary: String(input.summary ?? "").slice(0, 4000) || null,
    })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);
  // The consult is over — no unsent reminders should survive.
  await db
    .from("appointment_reminders")
    .delete()
    .eq("appointment_id", appointmentId)
    .is("sent_at", null);
  return { ok: true };
}

export async function requestChase(
  appointmentId: string,
  note: string | undefined,
  caller: CallerRole,
): Promise<{ ok: boolean }> {
  const appt = await loadAppointment(appointmentId);
  assertAppointmentAccess(appt, caller);
  if (appt.chase_status === "requested") throw new Error("Legal Group is already following up");

  const db = await admin();
  const trimmed = String(note ?? "")
    .slice(0, 2000)
    .trim();
  const { error } = await db
    .from("firm_appointments")
    .update({
      chase_status: "requested",
      chase_requested_at: new Date().toISOString(),
      chase_note: trimmed || null,
    })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);

  const { data: firm } = appt.firm_id
    ? await db.from("firms").select("firm_name").eq("id", appt.firm_id).maybeSingle()
    : { data: null };

  try {
    await sendEmail({
      to: [INTERNAL_ALERT_TO],
      subject: `Chase requested — ${appt.client_name ?? "client"}`,
      text: [
        "A partner firm has asked Legal Group to chase a client.",
        "",
        `Client: ${appt.client_name ?? "unknown"}`,
        `Phone: ${appt.client_phone ?? "unknown"}`,
        `Firm: ${firm?.firm_name ?? "unknown"}`,
        `Appointment: ${appt.appointment_date ?? "?"} ${appt.appointment_time ?? ""}`,
        `Note: ${trimmed || "—"}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[firm-portal] chase alert email failed", err);
  }
  return { ok: true };
}

export type ChaseResult = "rebooked" | "not_proceeding" | "no_answer" | "voicemail";

export async function resolveChase(
  appointmentId: string,
  result: ChaseResult,
  caller: CallerRole,
): Promise<{ ok: boolean }> {
  assertAdmin(caller);
  const appt = await loadAppointment(appointmentId);
  if (appt.chase_status !== "requested") throw new Error("No open chase on this appointment");
  const db = await admin();
  const { error } = await db
    .from("firm_appointments")
    .update({ chase_status: result, chase_result_at: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function flagConflict(
  appointmentId: string,
  reason: string,
  caller: CallerRole,
): Promise<{ ok: boolean }> {
  const appt = await loadAppointment(appointmentId);
  assertAppointmentAccess(appt, caller);
  const trimmed = String(reason ?? "").trim();
  if (trimmed.length < 5) throw new Error("Please describe the conflict (at least 5 characters)");
  if (appt.outcome || appt.status === "cancelled") {
    throw new Error("Conflicts can only be raised on upcoming appointments");
  }
  if (appt.conflict_status !== "pending") throw new Error("A conflict decision already exists");

  const db = await admin();
  const { error } = await db
    .from("firm_appointments")
    .update({
      conflict_status: "flagged",
      conflict_reason: trimmed.slice(0, 2000),
      conflict_flagged_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);

  const { data: firm } = appt.firm_id
    ? await db.from("firms").select("firm_name").eq("id", appt.firm_id).maybeSingle()
    : { data: null };
  try {
    await sendEmail({
      to: [INTERNAL_ALERT_TO],
      subject: `⚠️ Conflict flagged — ${appt.client_name ?? "client"}`,
      text: [
        "A partner firm has flagged a conflict on a booked consultation.",
        "",
        `Client: ${appt.client_name ?? "unknown"}`,
        `Firm: ${firm?.firm_name ?? "unknown"}`,
        `Appointment: ${appt.appointment_date ?? "?"} ${appt.appointment_time ?? ""}`,
        `Reason: ${trimmed}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[firm-portal] conflict alert email failed", err);
  }
  return { ok: true };
}

export async function clearConflict(
  appointmentId: string,
  caller: CallerRole,
): Promise<{ ok: boolean }> {
  assertAdmin(caller);
  const db = await admin();
  const { error } = await db
    .from("firm_appointments")
    .update({ conflict_status: "clear", conflict_resolved_at: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function cancelAppointment(
  appointmentId: string,
  caller: CallerRole,
): Promise<{ ok: boolean }> {
  assertAdmin(caller);
  const db = await admin();
  const { error } = await db
    .from("firm_appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);
  await db
    .from("appointment_reminders")
    .delete()
    .eq("appointment_id", appointmentId)
    .is("sent_at", null);
  return { ok: true };
}

export async function disqualifyAppointment(
  appointmentId: string,
  reason: string,
  caller: CallerRole & { userId: string },
): Promise<{ ok: boolean }> {
  assertAdmin(caller);
  const trimmed = String(reason ?? "").trim();
  if (trimmed.length < 5) throw new Error("Please give a reason (at least 5 characters)");
  const appt = await loadAppointment(appointmentId);

  const db = await admin();
  const { error } = await db
    .from("firm_appointments")
    .update({
      outcome: "disqualified",
      disqualified_reason: trimmed.slice(0, 2000),
      disqualified_at: new Date().toISOString(),
      disqualified_by: caller.userId,
    })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);

  // Verify the write actually landed before touching money.
  const check = await loadAppointment(appointmentId);
  if (check.outcome !== "disqualified") throw new Error("Disqualification did not save");

  await refundHoldingFee({ ...appt, outcome: "disqualified" }, "disqualified");
  return { ok: true };
}

/* ================================ RESCHEDULE ================================ */

export async function rescheduleAppointment(
  appointmentId: string,
  date: string,
  time: string,
  caller: CallerRole | { leadId: string },
  customTime = false,
  locationId?: string | null,
): Promise<{ ok: boolean }> {
  const appt = await loadAppointment(appointmentId);
  if ("leadId" in caller) {
    // This scope is supplied only after the booking endpoint verifies lead access.
    if (appt.lead_id !== caller.leadId) throw new Error("You cannot act on this appointment");
  } else {
    assertAppointmentAccess(appt, caller);
  }
  if (!appt.firm_id) throw new Error("This appointment has no firm");
  if (appt.status === "cancelled") throw new Error("This appointment is cancelled");

  const valid = await validateSlot(appt.firm_id, date, time, appointmentId, customTime);
  if (!valid.ok) throw new Error(valid.error ?? "That slot is not available");

  const db = await admin();
  const { reminderRowsFor } = await import("./booking.server");
  const { error } = await (db as unknown as import("./firm-pack-orders").PackOrderRpc).rpc(
    "reschedule_firm_appointment",
    {
      p_appointment: appointmentId,
      p_date: date,
      p_time: minToLabel(hhmmToMin(time)),
      p_expected_date: appt.appointment_date,
      p_expected_time: appt.appointment_time,
      ...(locationId === undefined ? {} : { p_location: locationId, p_change_location: true, p_expected_location: appt.location_id }),
      p_author: "leadId" in caller || caller.isAdmin ? "admin" : "firm",
      p_reminders: reminderRowsFor(appointmentId, date),
    },
  );
  if (error) throw new Error(error.message);

  return { ok: true };
}

/* ============================ NOTES + PORTAL USERS ============================ */

export async function addAppointmentNote(
  appointmentId: string,
  body: string,
  caller: CallerRole & { authorName?: string | null },
): Promise<{ ok: boolean }> {
  const appt = await loadAppointment(appointmentId);
  assertAppointmentAccess(appt, caller);
  const trimmed = String(body ?? "").trim();
  if (!trimmed) throw new Error("Write a note first");
  const db = await admin();
  if (!appt.firm_id) throw new Error("This appointment has no firm");
  const { error } = await db.from("firm_appointment_notes").insert({
    appointment_id: appointmentId,
    firm_id: appt.firm_id,
    author_type: caller.isAdmin ? "admin" : "firm",
    author_name: caller.authorName ?? null,
    body: trimmed.slice(0, 4000),
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}
