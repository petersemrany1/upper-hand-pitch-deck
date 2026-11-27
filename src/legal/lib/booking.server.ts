// Ported from the Legal app (family-law-floater/src/lib/booking.server.ts). Re-run the port script to refresh.
import { appointmentOffice } from "./firm-offices";
// All booking side effects in one privileged place. The client may not insert
// appointments, touch packs, or create reminders directly.
import { sendSmsToLead } from "./twilio.server";

export type BookingInput = {
  leadId: string;
  bookingRepId?: string | null;
  firmId: string;
  lawyerId: string | null;
  locationId?: string | null | undefined;
  date: string;
  time: string;
  /** In-person at the firm, or a Zoom video consult the firm hosts. */
  consultMode?: "in_person" | "zoom";
  /** Rep typed a time outside the firm's usual slots. */
  customTime?: boolean;
};

export type BookingResult = {
  appointmentId: string;
  remainingShows: number | null;
  reminders: number;
};

/** Sydney UTC offset (in minutes) at a given instant. */
function sydneyOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    timeZoneName: "shortOffset",
  }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+10";
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return 600;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
}

/**
 * 3pm Sydney time, `daysBefore` days ahead of the appointment date.
 * Returns null when the resulting moment is invalid.
 */
function sydney3pm(daysBefore: number, date: string): string | null {
  const base = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  const target = new Date(base.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth();
  const d = target.getUTCDate();
  // Treat 15:00 local as UTC, then subtract the real Sydney offset at that instant.
  const naive = Date.UTC(y, m, d, 15, 0, 0);
  const offset = sydneyOffsetMinutes(new Date(naive - 10 * 60 * 60 * 1000));
  return new Date(naive - offset * 60 * 1000).toISOString();
}

/** Parses "2:30pm" / "14:30" style times against an ISO date. */
export function parseAppointmentStart(date: string, time: string): Date | null {
  const match = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i.exec(time ?? "");
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  const iso = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The 3-day / 1-day reminder rows for an appointment date (3pm Sydney, future only). */
export function reminderRowsFor(
  appointmentId: string,
  date: string,
): Array<{ appointment_id: string; send_at: string; kind: string }> {
  const now = Date.now();
  return [
    { days: 3, kind: "3d" },
    { days: 1, kind: "1d" },
  ]
    .map(({ days, kind }) => ({ send_at: sydney3pm(days, date), kind }))
    .filter((r): r is { send_at: string; kind: string } => Boolean(r.send_at))
    .filter((r) => new Date(r.send_at).getTime() > now)
    .map((r) => ({ appointment_id: appointmentId, send_at: r.send_at, kind: r.kind }));
}

export async function confirmBookingPrivileged(input: BookingInput): Promise<BookingResult> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("client_leads")
    .select(
      "id, deposit_paid_at, ex_partner_full_name, first_name, last_name, phone, email, call_notes",
    )
    .eq("id", input.leadId)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("Lead not found");

  // Server-side gate — never rely on hidden buttons.
  if (!lead.deposit_paid_at) throw new Error("The client's holding fee has not been received yet");
  if (!String(lead.ex_partner_full_name ?? "").trim()) {
    throw new Error("The other side's full name is required before booking");
  }
  if (!input.date || !input.time || !input.firmId)
    throw new Error("Firm, date and time are required");

  // Capacity gates — computed pack balance, and packs paused for payment.
  const { data: balance } = await supabaseAdmin.rpc("get_firm_pack_balance", {
    _firm_id: input.firmId,
  });
  if (!balance || Number(balance) <= 0) throw new Error("No open pack capacity for this firm");

  const { data: newestPack } = await supabaseAdmin
    .from("firm_packs")
    .select("id, on_hold")
    .eq("firm_id", input.firmId)
    .eq("status", "active")
    .order("purchased_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (newestPack?.on_hold) {
    throw new Error("This firm's pack is on hold — payment pending");
  }

  // Slot must be real: trading hours, blocks, overrides, holidays, existing bookings.
  const { validateSlot, firmFacingBrief } = await import("./firm-portal.server");
  const slotCheck = await validateSlot(
    input.firmId,
    input.date,
    input.time,
    undefined,
    Boolean(input.customTime),
  );
  if (!slotCheck.ok) throw new Error(slotCheck.error ?? "That slot is not available");

  const { data: appointment, error: apptError } = await supabaseAdmin
    .from("firm_appointments")
    .insert({
      lead_id: input.leadId,
      booking_rep_id: input.bookingRepId ?? null,
      firm_id: input.firmId,
      lawyer_id: input.lawyerId,
      location_id: input.locationId ?? null,
      appointment_date: input.date,
      appointment_time: input.time,
      consult_mode: input.consultMode === "zoom" ? "zoom" : "in_person",
      status: "booked",
      conflict_status: "pending",
      client_name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || null,
      client_phone: lead.phone ?? null,
      client_email: lead.email ?? null,
      ex_partner_name: lead.ex_partner_full_name ?? null,
      intel_notes: await firmFacingBrief(input.leadId),
    })
    .select("id")
    .single();
  if (apptError) throw new Error(apptError.message);

  const { error: leadUpdateError } = await supabaseAdmin
    .from("client_leads")
    .update({
      booking_date: input.date,
      booking_time: input.time,
      firm_id: input.firmId,
      lawyer_id: input.lawyerId,
    })
    .eq("id", input.leadId);
  if (leadUpdateError) throw new Error(leadUpdateError.message);

  // Pack capacity is computed from appointments now — nothing writes shows_used.
  const remainingShows = Math.max(0, Number(balance) - 1);

  // Reminders: 3 days before and 1 day before, both at 3pm Sydney time.
  const reminderRows = reminderRowsFor(appointment.id, input.date);
  if (reminderRows.length) {
    const { error: reminderError } = await supabaseAdmin
      .from("appointment_reminders")
      .insert(reminderRows);
    if (reminderError) console.error("[booking] reminders failed", reminderError.message);
  }

  return { appointmentId: appointment.id, remainingShows, reminders: reminderRows.length };
}

/** Updates the existing appointment after the caller's lead access has been checked. */
export async function rescheduleLeadBooking(input: {
  leadId: string;
  date: string;
  time: string;
  customTime?: boolean;
  locationId?: string | null;
}): Promise<{ ok: boolean }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: appointment, error } = await supabaseAdmin
    .from("firm_appointments")
    .select("id, status, outcome")
    .eq("lead_id", input.leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!appointment || appointment.status !== "booked" || appointment.outcome) {
    throw new Error("No active booking to update for this client");
  }
  const { rescheduleAppointment } = await import("./firm-portal.server");
  return rescheduleAppointment(
    appointment.id,
    input.date,
    input.time,
    { leadId: input.leadId },
    Boolean(input.customTime),
    input.locationId,
  );
}

async function confirmationKey(leadId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("firm_appointments")
    .select("id, rebooked_from, appointment_date, appointment_time, location_id, consult_mode, location_revision")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not check the booking confirmation. Please retry.");
  // Keep existing send history intact. Each rebooked visit gets its own guard.
  if (data?.location_id && data.location_revision > 0) return `booking_confirmation_sms:${leadId}:${data.id}:${data.appointment_date}:${data.appointment_time}:${data.consult_mode}:${data.location_id}`;
  return data?.rebooked_from
    ? `booking_confirmation_sms:${leadId}:${data.id}:${data.appointment_date}:${data.appointment_time}`
    : `booking_confirmation_sms:${leadId}`;
}

/** Composes the confirmation SMS the rep reviews before it goes out. */
export async function buildConfirmationSms(leadId: string): Promise<{
  ok: boolean;
  error?: string;
  body?: string;
  phone?: string | null;
  bookingKey?: string;
}> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const bookingKey = await confirmationKey(leadId);
  const { data: lead } = await supabaseAdmin
    .from("client_leads")
    .select("id, first_name, phone, booking_date, booking_time, firm_id, lawyer_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found" };
  if (!lead.booking_date || !lead.booking_time) {
    return { ok: false, error: "No booking on this lead" };
  }

  const { data: firm } = lead.firm_id
    ? await supabaseAdmin
        .from("firms")
        .select("firm_name, phone, address, city, state, parking_info, nearby_landmarks")
        .eq("id", lead.firm_id)
        .maybeSingle()
    : { data: null };
  const { data: lawyer } = lead.lawyer_id
    ? await supabaseAdmin.from("firm_lawyers").select("name").eq("id", lead.lawyer_id).maybeSingle()
    : { data: null };

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("firm_appointments")
    .select("consult_mode, location_id, location_name, location_address, location_parking_info, location_nearby_landmarks")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (appointmentError || !appointment) return { ok: false, error: "Could not load the booked office. Please retry." };
  const isZoom = appointment?.consult_mode === "zoom";
  const office = appointmentOffice(appointment, firm);

  const when = new Date(`${lead.booking_date}T00:00:00`).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const body = [
    `Hi ${lead.first_name ?? "there"}, your free family law consultation is confirmed for ${when} at ${lead.booking_time}.`,
    firm?.firm_name ? `${firm.firm_name}${lawyer?.name ? ` with ${lawyer.name}` : ""}.` : "",
    !isZoom && office.name ? `Office: ${office.name}.` : "",
    isZoom
      ? `This one is over Zoom — ${firm?.firm_name ?? "the firm"} will email you the Zoom link before your appointment.`
      : office.address
        ? `Address: ${office.address}.`
        : "",
    !isZoom && office.parking ? `Parking: ${office.parking}.` : "",
    !isZoom && office.directions ? `Getting here: ${office.directions}.` : "",
    firm?.phone ? `Please call the firm on ${firm.phone} if anything changes.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (bookingKey !== (await confirmationKey(leadId))) {
    return { ok: false, error: "The appointment changed. Please review the confirmation again." };
  }
  return { ok: true, body, phone: lead.phone, bookingKey };
}

/**
 * Booking confirmation SMS — one per booking (legacy leads retain their key). The guard is a unique row in
 * app_settings, so a refresh or double click can never send a second text.
 * The rep may pass an edited body from the review dialog.
 */
export async function sendBookingConfirmationSms(
  leadId: string,
  bodyOverride?: string,
  expectedBookingKey?: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");

  const composed = await buildConfirmationSms(leadId);
  if (!composed.ok) return { ok: false, error: composed.error ?? "Not ready" };
  if (
    (expectedBookingKey && expectedBookingKey !== composed.bookingKey) ||
    (composed.bookingKey !== `booking_confirmation_sms:${leadId}` && !expectedBookingKey)
  ) {
    return {
      ok: false,
      error: "The appointment has changed. Close this text and review the new confirmation.",
    };
  }
  const body = String(bodyOverride ?? "").trim() || composed.body!;

  const { error: claimError } = await supabaseAdmin
    .from("app_settings")
    .insert({ key: composed.bookingKey!, value: { sent_at: new Date().toISOString() } });
  if (claimError) {
    // Unique violation = already sent once.
    return claimError.code === "23505"
      ? { ok: true, skipped: true }
      : { ok: false, error: "Could not reserve the confirmation send. Please retry." };
  }

  const result = await sendSmsToLead(leadId, composed.phone ?? null, body);
  if (!result.ok) {
    // Release the guard so a genuine failure can be retried.
    await supabaseAdmin.from("app_settings").delete().eq("key", composed.bookingKey!);
    return { ok: false, error: result.error ?? "SMS failed" };
  }
  return { ok: true };
}

export async function bookingConfirmationSent(leadId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key")
    .eq("key", await confirmationKey(leadId))
    .maybeSingle();
  return Boolean(data);
}

/** Admin testing: clears the once-ever confirmation SMS guard for this lead. */
export async function resetBookingConfirmation(leadId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  await supabaseAdmin
    .from("app_settings")
    .delete()
    .eq("key", await confirmationKey(leadId));
}

/** The consult mode on the lead's most recent appointment. */
export async function getConsultMode(leadId: string): Promise<"in_person" | "zoom" | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("firm_appointments")
    .select("consult_mode, location_id, location_name, location_address, location_parking_info, location_nearby_landmarks")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data.consult_mode === "zoom" ? "zoom" : "in_person";
}

/** Switches an already-booked consult between in person and Zoom. */
export async function setConsultMode(
  leadId: string,
  mode: "in_person" | "zoom",
  locationId?: string | null,
): Promise<{ ok: boolean; updated: boolean }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: appointment } = await supabaseAdmin
    .from("firm_appointments")
    .select("id, status, outcome")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!appointment || appointment.status !== "booked" || appointment.outcome)
    return { ok: true, updated: false };
  const { error } = await supabaseAdmin
    .from("firm_appointments")
    .update({ consult_mode: mode, ...(locationId === undefined ? {} : { location_id: locationId }) })
    .eq("id", appointment.id);
  if (error) throw new Error(error.message);
  return { ok: true, updated: true };
}
