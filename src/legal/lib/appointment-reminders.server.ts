// Ported from the Legal app (family-law-floater/src/lib/appointment-reminders.server.ts). Re-run the port script to refresh.
import { appointmentOffice, type AppointmentOffice } from "./firm-offices";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { INTERNAL_ALERT_TO, sendEmail } from "./email.server";
import {
  claimPoolNumber,
  publicBaseUrl,
  recordOutboundSms,
  toAuE164,
  twilioEnv,
} from "./twilio.server";
import {
  contactWindow,
  localDate,
  localInstant,
  planReminders,
  reminderText,
  shiftDate,
  staffed,
} from "./appointment-reminders";
import type { Attendance, ReminderJob, ReminderSettings } from "./appointment-reminders";

// New tables are isolated here until the generated Supabase schema is refreshed.
const db: SupabaseClient = supabaseAdmin;
export type ReminderAppointment = AppointmentOffice & {
  id: string;
  firm_id: string;
  lead_id: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  outcome: string | null;
  client_name: string | null;
  client_phone: string | null;
  consult_mode: string | null;
  firms: { firm_name: string; address: string | null; city?: string | null; state?: string | null; parking_info?: string | null; nearby_landmarks?: string | null; phone: string | null } | null;
  firm_lawyers: { name: string } | null;
  client_leads: { first_name: string | null; phone: string | null } | null;
};
const APPOINTMENT_SELECT =
  "id,firm_id,lead_id,appointment_date,appointment_time,status,outcome,client_name,client_phone,consult_mode,location_id,location_name,location_address,location_parking_info,location_nearby_landmarks,firms(firm_name,address,city,state,parking_info,nearby_landmarks,phone),firm_lawyers(name),client_leads(first_name,phone)";
const errorIf = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** Paginate explicitly: PostgREST otherwise silently stops at 1,000 rows. */
async function allRows<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await query(from, from + 499);
    errorIf(result.error);
    const page = result.data as T[];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

async function jobsFor(appointmentId: string, version: string): Promise<ReminderJob[]> {
  const { data, error } = await db
    .from("appointment_reminder_jobs")
    .select("*")
    .eq("appointment_id", appointmentId)
    .eq("booking_version", version);
  errorIf(error);
  return data as ReminderJob[];
}

async function needCall(appointmentId: string, version: string, reason: string) {
  const { error } = await db
    .from("appointment_attendance")
    .update({ status: "needs_call", reason })
    .eq("appointment_id", appointmentId)
    .eq("booking_version", version)
    .in("status", ["unrequested", "awaiting", "needs_call"]);
  errorIf(error);
}

async function reconcile(
  a: ReminderAppointment,
  s: Attendance,
  settings: ReminderSettings,
  optedOut: boolean,
  now: Date,
) {
  const jobs = await jobsFor(a.id, s.booking_version);
  const start = localInstant(a.appointment_date, a.appointment_time, settings.timezone);
  let planned =
    start > now
      ? planReminders({
          date: a.appointment_date,
          time: a.appointment_time,
          changedAt: s.booking_changed_at,
          settings,
        })
      : [];
  const failure = jobs.find(
    (j) => ["failed", "uncertain"].includes(j.state) && j.kind !== "call" && j.kind !== "ack",
  );
  const phone = toAuE164(a.client_phone || a.client_leads?.phone);
  const issue = optedOut
    ? "Client opted out of reminder texts"
    : !phone
      ? "Client has no valid phone number"
      : failure
        ? "Reminder delivery failed or is uncertain"
        : null;
  if (settings.mode === "confirmation" && s.status !== "confirmed" && start > now) {
    if (issue) {
      await needCall(a.id, s.booking_version, issue);
      s = { ...s, status: s.status === "review" ? "review" : "needs_call" };
    }
    if (s.status === "review" || s.status === "needs_call") {
      planned = planned.filter((j) => !["request", "followup", "call"].includes(j.kind));
      planned.push({
        kind: "call",
        due_at: new Date(
          Math.max(now.getTime(), Date.parse(s.booking_changed_at) + 600000),
        ).toISOString(),
      });
    }
  }
  if (s.status === "confirmed")
    planned = planned.filter((j) => !["request", "followup", "call"].includes(j.kind));
  if (optedOut) planned = planned.filter((j) => j.kind === "call");
  // Actual send times, not just scheduled times, establish the two-hour spacing.
  const request = jobs.find((j) => j.kind === "request" && j.sent_at);
  const followup = jobs.find((j) => j.kind === "followup" && j.sent_at);
  let nextFollowup: number | null = null;
  let cannotFinish = false;
  for (const p of planned) {
    const previous =
      p.kind === "followup"
        ? request?.sent_at
          ? Date.parse(request.sent_at)
          : null
        : p.kind === "call" && !issue && s.status !== "review" && s.status !== "needs_call"
          ? followup?.sent_at
            ? Date.parse(followup.sent_at)
            : nextFollowup
          : null;
    if (previous !== null) {
      const next = contactWindow(
        Math.max(Date.parse(p.due_at), previous + 7200000),
        start.getTime(),
        settings,
      );
      if (next === null) cannotFinish = true;
      else p.due_at = new Date(next).toISOString();
    }
    if (p.kind === "followup") nextFollowup = Date.parse(p.due_at);
  }
  if (cannotFinish && s.status !== "confirmed") {
    await needCall(
      a.id,
      s.booking_version,
      "Not enough staffed time remains for further confirmation texts",
    );
    planned = planned.filter((p) => !["request", "followup", "call"].includes(p.kind));
    planned.push({ kind: "call", due_at: now.toISOString() });
  }
  for (const job of jobs.filter(
    (j) => j.state === "pending" && j.kind !== "ack" && !planned.some((p) => p.kind === j.kind),
  )) {
    const { error } = await db
      .from("appointment_reminder_jobs")
      .update({ state: "cancelled", last_error: "Schedule changed" })
      .eq("id", job.id)
      .eq("state", "pending");
    errorIf(error);
  }
  for (const p of planned) {
    const old = jobs.find((j) => j.kind === p.kind);
    if (!old) {
      const { error } = await db
        .from("appointment_reminder_jobs")
        .upsert(
          { appointment_id: a.id, booking_version: s.booking_version, ...p },
          { onConflict: "appointment_id,booking_version,kind", ignoreDuplicates: true },
        );
      errorIf(error);
    } else if (
      old.state === "pending" ||
      (old.state === "cancelled" && old.last_error === "Schedule changed")
    ) {
      const { error } = await db
        .from("appointment_reminder_jobs")
        .update({ due_at: p.due_at, state: "pending", last_error: null })
        .eq("id", old.id)
        .eq("state", old.state);
      errorIf(error);
    }
  }
}

export async function appointmentReminderDashboard() {
  const [settings, attendance, jobs, firms] = await Promise.all([
    allRows<ReminderSettings>((f, t) =>
      db.from("firm_reminder_settings").select("*").order("firm_id").range(f, t),
    ),
    allRows<Attendance>((f, t) =>
      db.from("appointment_attendance").select("*").order("appointment_id").range(f, t),
    ),
    allRows<ReminderJob>((f, t) =>
      db
        .from("appointment_reminder_jobs")
        .select("*")
        .order("due_at", { ascending: false })
        .order("id")
        .range(f, t),
    ),
    allRows<{ id: string; firm_name: string }>((f, t) =>
      db.from("firms").select("id,firm_name").eq("is_active", true).order("id").range(f, t),
    ),
  ]);
  return { settings, attendance, jobs, firms };
}

/** Reuses the existing cloud timer; no provider calls are made by page views or settings saves. */
export async function runAppointmentReminders(now = new Date()) {
  const [settingsRows, appointments, attendance, optOuts] = await Promise.all([
    allRows<ReminderSettings>((f, t) =>
      db.from("firm_reminder_settings").select("*").order("firm_id").range(f, t),
    ),
    allRows<ReminderAppointment>((f, t) =>
      db
        .from("firm_appointments")
        .select(APPOINTMENT_SELECT)
        .eq("status", "booked")
        .is("outcome", null)
        .gte("appointment_date", shiftDate(now.toISOString().slice(0, 10), -1))
        .order("id")
        .range(f, t),
    ),
    allRows<Attendance>((f, t) =>
      db.from("appointment_attendance").select("*").order("appointment_id").range(f, t),
    ),
    allRows<{ phone: string }>((f, t) =>
      db.from("appointment_sms_opt_outs").select("phone").order("phone").range(f, t),
    ),
  ]);
  const settings = new Map(settingsRows.map((s) => [s.firm_id, s]));
  const states = new Map(attendance.map((s) => [s.appointment_id, s]));
  const suppressed = new Set(optOuts.map((s) => s.phone));
  // A process may die after the provider accepted a message. Never resend that job automatically.
  const { data: abandoned, error: abandonedError } = await db
    .from("appointment_reminder_jobs")
    .update({
      state: "uncertain",
      last_error: "Send outcome unknown; review provider delivery history",
    })
    .eq("state", "sending")
    .lt("claimed_at", new Date(now.getTime() - 10 * 60000).toISOString())
    .select("*");
  errorIf(abandonedError);
  for (const j of (abandoned ?? []) as ReminderJob[])
    if (j.kind !== "call" && j.kind !== "ack")
      await needCall(j.appointment_id, j.booking_version, "Reminder delivery is uncertain");
  const errors: string[] = [];
  for (const a of appointments) {
    const s = states.get(a.id),
      cfg = settings.get(a.firm_id);
    if (!s || !cfg || !a.appointment_time || !a.appointment_date) continue;
    try {
      await reconcile(
        a,
        s,
        cfg,
        suppressed.has(toAuE164(a.client_phone || a.client_leads?.phone) ?? ""),
        now,
      );
    } catch (error) {
      errors.push(`${a.id}: ${error instanceof Error ? error.message : "Planning failed"}`);
    }
  }
  const { data: due, error } = await db
    .from("appointment_reminder_jobs")
    .select("*")
    .eq("state", "pending")
    .lte("due_at", now.toISOString())
    .order("due_at")
    .limit(100);
  errorIf(error);
  let sent = 0;
  for (const job of (due ?? []) as ReminderJob[]) {
    try {
      if (await deliverJob(job, now)) sent++;
    } catch (error) {
      errors.push(`${job.id}: ${error instanceof Error ? error.message : "Delivery failed"}`);
      const { error: holdError } = await db
        .from("appointment_reminder_jobs")
        .update({
          state: "failed",
          last_error: "Reminder could not be prepared; review appointment details",
        })
        .eq("id", job.id)
        .eq("state", "pending");
      errorIf(holdError);
    }
  }
  if (errors.length) {
    const { error: logError } = await db.from("error_logs").insert({
      source: "appointment-reminders",
      message: `${errors.length} reminder issues`,
      detail: { errors },
    });
    errorIf(logError);
  }
  return { due: due?.length ?? 0, sent, issues: errors.length };
}

async function deliverJob(job: ReminderJob, now: Date): Promise<boolean> {
  const [{ data: a, error: aError }, { data: s, error: sError }] = await Promise.all([
    db.from("firm_appointments").select(APPOINTMENT_SELECT).eq("id", job.appointment_id).single(),
    db.from("appointment_attendance").select("*").eq("appointment_id", job.appointment_id).single(),
  ]);
  errorIf(aError);
  errorIf(sError);
  const appointment = a as unknown as ReminderAppointment,
    attendance = s as Attendance;
  const { data: cfg, error: cfgError } = await db
    .from("firm_reminder_settings")
    .select("*")
    .eq("firm_id", appointment.firm_id)
    .single();
  errorIf(cfgError);
  const settings = cfg as ReminderSettings;
  const start = localInstant(
    appointment.appointment_date,
    appointment.appointment_time,
    settings.timezone,
  );
  const cancel = async (reason: string) => {
    const { error } = await db
      .from("appointment_reminder_jobs")
      .update({ state: "cancelled", last_error: reason })
      .eq("id", job.id)
      .eq("state", "pending");
    errorIf(error);
    return false;
  };
  if (
    appointment.status !== "booked" ||
    appointment.outcome ||
    attendance.booking_version !== job.booking_version ||
    start <= now
  )
    return cancel("Appointment changed or passed");
  if (settings.mode === "off") return cancel("Schedule changed");
  if (job.kind === "ack" && attendance.status !== "confirmed")
    return cancel("Acknowledgement no longer appropriate");
  if (
    ["request", "followup", "call"].includes(job.kind) &&
    (settings.mode !== "confirmation" || attendance.status === "confirmed")
  )
    return cancel("Confirmation no longer required");
  if (
    ["request", "followup"].includes(job.kind) &&
    ["needs_call", "review"].includes(attendance.status)
  )
    return cancel("Team is handling confirmation");
  // Do not deliver stale ordinary reminders on a different date after an outage.
  const today = localDate(now, settings.timezone);
  if (
    ["3d", "1d"].includes(job.kind) &&
    localDate(new Date(job.due_at), settings.timezone) !== today
  )
    return cancel("Reminder window passed");
  if (["request", "followup"].includes(job.kind)) {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: settings.timezone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    );
    if (
      !staffed(today, settings) ||
      hour < 9 ||
      hour >= 17 ||
      start.getTime() - now.getTime() < (job.kind === "request" ? 4 : 2) * 3600000
    ) {
      await needCall(
        job.appointment_id,
        job.booking_version,
        "Too little staffed time remains for confirmation texts",
      );
      return cancel("Confirmation window passed; call required");
    }
  }
  const to = toAuE164(appointment.client_phone || appointment.client_leads?.phone);
  if (job.kind !== "call") {
    const { data: optOut, error } = to
      ? await db.from("appointment_sms_opt_outs").select("phone").eq("phone", to).maybeSingle()
      : { data: null, error: null };
    errorIf(error);
    if (!to || optOut) {
      if (settings.mode === "confirmation")
        await needCall(job.appointment_id, job.booking_version, "Text unavailable; call required");
      if (optOut) return cancel("Client opted out of reminder texts");
      const { error: invalidPhoneError } = await db
        .from("appointment_reminder_jobs")
        .update({ state: "failed", last_error: "Client has no valid phone number" })
        .eq("id", job.id)
        .eq("state", "pending");
      errorIf(invalidPhoneError);
      return false;
    }
  }
  const from = job.kind === "call" ? null : await claimPoolNumber();
  if (job.kind !== "call" && !from) {
    const { error } = await db
      .from("appointment_reminder_jobs")
      .update({ state: "failed", last_error: "No active SMS number" })
      .eq("id", job.id)
      .eq("state", "pending");
    errorIf(error);
    if (settings.mode === "confirmation")
      await needCall(
        job.appointment_id,
        job.booking_version,
        "No active SMS number; call required",
      );
    return false;
  }
  const { data: claimed, error: claimError } = await db.rpc("claim_appointment_reminder", {
    p_id: job.id,
    p_from: from,
    p_to: to,
    p_settings_updated_at: settings.updated_at ?? null,
  });
  errorIf(claimError);
  if (!claimed) return false;
  let accepted = false;
  try {
    if (job.kind === "call") {
      const jobs = await jobsFor(job.appointment_id, job.booking_version);
      const format = (date: string) =>
        new Date(date).toLocaleString("en-AU", { timeZone: settings.timezone });
      const result = await sendEmail({
        to: [settings.alert_email || INTERNAL_ALERT_TO],
        subject: `Confirmation call needed — ${appointment.firms?.firm_name ?? "Consultation"}`,
        text: [
          `${appointment.client_name || appointment.client_leads?.first_name || "Client"}: ${to || "No valid phone number"}`,
          `${appointment.firms?.firm_name ?? "Firm"} — ${appointment.appointment_date} at ${appointment.appointment_time} (${settings.timezone})`,
          ...jobs
            .filter((j) => ["request", "followup"].includes(j.kind))
            .map(
              (j) =>
                `${j.kind === "request" ? "Confirmation request" : "Follow-up"}: ${j.sent_at ? format(j.sent_at) : j.state}`,
            ),
          attendance.reason || "Attendance has not been confirmed.",
          attendance.latest_reply
            ? `Latest reply: ${attendance.latest_reply}`
            : "No reply recorded.",
          `${publicBaseUrl()}/booked-appointments?appointment=${appointment.id}`,
          "Check the latest appointment status before calling; the client may have confirmed since this email was sent.",
        ].join("\n"),
        redactErrors: true,
      });
      if (!result.ok) {
        await finishJob(job.id, "failed", result.error ?? "Call alert email failed");
        return false;
      }
      accepted = true;
      await finishJob(job.id, "sent");
      return true;
    }
    const office = appointmentOffice(appointment, appointment.firms);
    const body = reminderText(job.kind, {
      firstName:
        appointment.client_leads?.first_name || appointment.client_name?.split(" ")[0] || "there",
      firmName: appointment.firms?.firm_name || "your law firm",
      lawyerName: appointment.firm_lawyers?.name ?? null,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      timezone: settings.timezone,
      address: office.address,
      officeName: office.name,
      parking: office.parking,
      directions: office.directions,
      phone: appointment.firms?.phone ?? null,
      zoom: appointment.consult_mode === "zoom",
    });
    const { accountSid, authToken } = twilioEnv();
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to!,
          From: from!,
          Body: body,
          StatusCallback: `${publicBaseUrl()}/api/public/legal/hooks/twilio-sms-status?appointmentReminderId=${job.id}`,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) {
      // 5xx/timeout outcomes may have reached the provider; neither is retried automatically.
      await finishJob(
        job.id,
        response.status >= 500 ? "uncertain" : "failed",
        `SMS provider returned ${response.status}`,
      );
      if (settings.mode === "confirmation")
        await needCall(job.appointment_id, job.booking_version, "SMS failed; call required");
      return false;
    }
    accepted = true;
    const result = (await response.json()) as { sid?: string };
    if (!result.sid) throw new Error("SMS accepted without a message reference");
    const { error } = await db
      .from("appointment_reminder_jobs")
      .update({ state: "sent", sent_at: new Date().toISOString(), twilio_sid: result.sid })
      .eq("id", job.id)
      .eq("state", "sending");
    errorIf(error);
    await recordOutboundSms(appointment.lead_id, to!, body, result.sid);
    return true;
  } catch (error) {
    await finishJob(
      job.id,
      "uncertain",
      accepted
        ? "Provider accepted send; delivery history needs review"
        : "Send outcome unknown; check provider before retrying",
    );
    if (settings.mode === "confirmation" && job.kind !== "call" && job.kind !== "ack")
      await needCall(
        job.appointment_id,
        job.booking_version,
        "SMS outcome uncertain; call required",
      );
    throw error;
  }
}

async function finishJob(
  id: string,
  state: "sent" | "failed" | "uncertain",
  error: string | null = null,
) {
  const { error: writeError } = await db
    .from("appointment_reminder_jobs")
    .update({
      state,
      last_error: error,
      ...(state === "sent" ? { sent_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)
    .eq("state", "sending");
  errorIf(writeError);
}

export async function recordAppointmentReply(input: {
  sid: string;
  from: string;
  to: string;
  body: string;
  optOut: string;
}) {
  const { error } = await db.rpc("record_appointment_reply", {
    p_sid: input.sid,
    p_from: toAuE164(input.from),
    p_to: toAuE164(input.to),
    p_body: input.body,
    p_opt_out: input.optOut,
  });
  errorIf(error);
}

export async function recordAppointmentDelivery(
  sid: string,
  status: string,
  id: string | null,
  errorCode: string | null,
) {
  if (!/^(queued|accepted|sending|sent|delivered|undelivered|failed|read)$/.test(status)) return;
  const { error } = await db.rpc("record_appointment_delivery", {
    p_id: id && /^[0-9a-f-]{36}$/i.test(id) ? id : null,
    p_sid: sid,
    p_status: status,
    p_error: errorCode,
  });
  errorIf(error);
}
