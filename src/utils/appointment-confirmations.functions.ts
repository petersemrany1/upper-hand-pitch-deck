import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bookingActor } from "./booking-access.server";
import { activeConfirmationBooking, type ConfirmationBooking, type ConfirmationOutcome } from "@/lib/appointment-confirmations";
import { deliverRescheduleOnce } from "@/lib/reschedule-delivery";
import { sendSms } from "../../supabase/functions/send-appointment-reminders/twilio";
import { PATIENT_SMS_FROM } from "@/lib/booking-confirmation-sms";
import { validateCallback, type ScheduleCallbackInput } from "@/lib/confirmation-callbacks";

const fields = "id,lead_id,patient_name,patient_phone,appointment_date,appointment_time,doctor_name,updated_at,deposit_amount,square_payment_id,stripe_payment_intent_id,outcome,disqualified_at,clinic:partner_clinics!clinic_appointments_clinic_id_fkey(clinic_name,address,city,state),reminders:appointment_reminders!appointment_reminders_appointment_id_fkey(status)";
const uuid = (value: string) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid appointment reference"); return value; };
const admin = () => supabaseAdmin as any;
function dateInput(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date) throw new Error("Choose a valid date");
  return date;
}
function actionInput(data: { appointmentId: string; version: string; requestId: string }) {
  if (!data.version || !Number.isFinite(Date.parse(data.version))) throw new Error("Refresh the booking first");
  return { ...data, appointmentId: uuid(data.appointmentId), requestId: uuid(data.requestId) };
}
async function currentBooking(db: any, appointmentId: string, version: string) {
  await bookingActor(db);
  const { data, error } = await db.from("clinic_appointments").select(fields).eq("id", appointmentId).maybeSingle();
  if (error || !data) throw new Error("You do not have access to this booking");
  const booking = { ...data, events: [] } as ConfirmationBooking;
  if (Date.parse(booking.updated_at) !== Date.parse(version)) throw new Error("The booking changed. Refresh its details before confirming or texting.");
  if (!activeConfirmationBooking(booking)) throw new Error("This appointment is no longer awaiting attendance");
  return booking;
}

export const getConfirmationCalls = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { date: string }) => ({ date: dateInput(data.date) }))
  .handler(async ({ data, context }) => {
    await bookingActor(context.supabase);
    const db = context.supabase as any;
    const { data: bookings, error } = await db.from("clinic_appointments").select(fields)
      .eq("appointment_date", data.date).order("appointment_time", { ascending: true }).order("id");
    if (error) throw new Error("Could not load appointments. Please retry.");
    const active = (bookings ?? []).filter((b: ConfirmationBooking) => activeConfirmationBooking(b));
    if (!active.length) return [] as ConfirmationBooking[];
    const { data: events, error: eventError } = await db.from("appointment_confirmation_events")
      .select("id,appointment_id,appointment_updated_at,kind,note,created_at,actor_name,sms_status,sms_error,sms_body,sms_phone")
      .in("appointment_id", active.map((b: ConfirmationBooking) => b.id)).order("created_at", { ascending: false });
    if (eventError) throw new Error("Confirmation history could not be loaded. Please retry before making calls.");
    return active.map((b: ConfirmationBooking) => ({ ...b, events: (events ?? []).filter((e: any) => e.appointment_id === b.id) })) as ConfirmationBooking[];
  });

export const recordConfirmationOutcome = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; version: string; requestId: string; outcome: ConfirmationOutcome; note: string }) => {
    if (!["confirmed", "no_answer", "needs_help"].includes(data.outcome)) throw new Error("Choose a call outcome");
    if (typeof data.note !== "string" || data.note.length > 1000) throw new Error("Keep notes under 1000 characters");
    return { ...data, ...actionInput(data) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("record_appointment_confirmation", {
      p_id: data.appointmentId, p_request: data.requestId, p_version: data.version, p_kind: data.outcome, p_note: data.note,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getConfirmationCallbacks = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await bookingActor(context.supabase);
    const db = context.supabase as any;
    // Deliberately independent of appointment date and attendance: an overdue callback must remain visible.
    const { data, error } = await db.from("appointment_confirmation_callbacks")
      .select(`id,appointment_id,callback_date,callback_time,note,actor_name,created_at,booking:clinic_appointments!inner(${fields})`)
      .eq("status", "pending").order("callback_date").order("callback_time", { nullsFirst: true }).order("id");
    if (error) throw new Error("Could not load callbacks. Please refresh before making calls.");
    if (!data?.length) return [] as ConfirmationBooking[];
    const { data: events, error: historyError } = await db.from("appointment_confirmation_events")
      .select("id,appointment_id,appointment_updated_at,kind,note,created_at,actor_name,sms_status,sms_error,sms_body,sms_phone")
      .in("appointment_id", data.map((row: any) => row.appointment_id)).order("created_at", { ascending: false });
    if (historyError) throw new Error("Callback history could not be loaded. Please retry.");
    return data.map(({ booking, ...callback }: any) => ({ ...booking, callback,
      events: (events ?? []).filter((event: any) => event.appointment_id === booking.id),
    })) as ConfirmationBooking[];
  });

export const scheduleConfirmationCallback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: ScheduleCallbackInput) => {
    validateCallback(data.date, data.time);
    if (typeof data.note !== "string" || data.note.length > 1000) throw new Error("Keep notes under 1000 characters");
    return { ...data, ...actionInput(data), expectedCallbackId: data.expectedCallbackId === null ? null : uuid(data.expectedCallbackId) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("schedule_confirmation_callback", {
      p_id: data.appointmentId, p_request: data.requestId, p_version: data.version,
      p_expected: data.expectedCallbackId, p_date: data.date, p_time: data.time || null, p_note: data.note,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const completeConfirmationCallback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; callbackId: string }) => ({ appointmentId: uuid(data.appointmentId), callbackId: uuid(data.callbackId) }))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("complete_confirmation_callback", { p_id: data.appointmentId, p_callback: data.callbackId });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const sendConfirmationText = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; version: string; requestId: string; body: string }) => {
    if (typeof data.body !== "string" || !data.body.trim() || data.body.length > 1600) throw new Error("Text must contain 1–1600 characters");
    return { ...data, ...actionInput(data), body: data.body.trim() };
  })
  .handler(async ({ data, context }) => {
    const booking = await currentBooking(context.supabase, data.appointmentId, data.version);
    const account = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
    if (!account || !token) throw new Error("SMS service is not configured");
    const { data: eventId, error } = await (context.supabase as any).rpc("record_appointment_confirmation", {
      p_id: data.appointmentId, p_request: data.requestId, p_version: data.version, p_kind: "sms", p_body: data.body,
    });
    if (error) throw new Error(error.message);
    const db = admin();
    const { data: event, error: readError } = await db.from("appointment_confirmation_events").select("sms_body,sms_status").eq("id", eventId).single();
    if (readError) throw new Error("Could not check the saved text. Refresh before trying again.");
    if (event.sms_body !== data.body) throw new Error("A text has already been saved for this appointment. Refresh to review it in the history.");
    return deliverRescheduleOnce({
      async claim() {
        await currentBooking(context.supabase, data.appointmentId, data.version);
        const { data: claimed, error } = await db.from("appointment_confirmation_events").update({ sms_status: "sending", sms_error: null })
          .eq("id", eventId).in("sms_status", ["pending", "failed"]).select("appointment_id,sms_phone,sms_body").maybeSingle();
        if (error) throw error;
        return claimed;
      },
      async existing() {
        const { data: saved, error } = await db.from("appointment_confirmation_events").select("sms_status,sms_error").eq("id", eventId).single();
        if (error) throw error;
        return { status: saved.sms_status, error: saved.sms_error };
      },
      async send(e) {
        return sendSms(account, token, e.sms_phone, e.sms_body, async (url, init) => {
          const body = new URLSearchParams(init?.body as URLSearchParams);
          body.set("StatusCallback", "https://hairtransplantgroup.lovable.app/api/public/hooks/twilio-message-status");
          return fetch(url, { ...init, body, signal: AbortSignal.timeout(15000) });
        });
      },
      async finish(status, result) {
        const { error } = await db.from("appointment_confirmation_events").update({ sms_status: status, sms_sid: result.sid ?? null, sms_error: result.error ?? null }).eq("id", eventId);
        if (error) throw error;
      },
      async log(e, result) {
        // Provider acceptance is already recorded. Inbox failure must not invite a duplicate send.
        try {
          const { data: existing } = await db.from("sms_threads").select("id").eq("phone", e.sms_phone).maybeSingle();
          let threadId = existing?.id;
          if (!threadId) {
            const { data: thread, error } = await db.from("sms_threads").insert({ phone: e.sms_phone, display_name: booking.patient_name }).select("id").single();
            if (error) throw error;
            threadId = thread.id;
          }
          const { error } = await db.from("sms_messages").insert({ thread_id: threadId, direction: "outbound", body: e.sms_body, twilio_message_sid: result.sid, status: result.status ?? "queued", from_number: PATIENT_SMS_FROM, to_number: e.sms_phone, lead_id: booking.lead_id, sent_at: new Date().toISOString() });
          if (error) throw error;
        } catch (error) { console.warn("Confirmation text accepted but inbox logging failed", error); }
      },
    });
  });
