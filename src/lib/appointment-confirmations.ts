import { APP_TIMEZONE, sydneyTodayISO } from "./timezone";
import { clinicSmsAddress } from "./booking-confirmation-sms";
import type { ConfirmationCallback } from "./confirmation-callbacks";

export type ConfirmationOutcome = "confirmed" | "no_answer" | "needs_help";
export type ConfirmationEvent = {
  id: string; appointment_id: string; appointment_updated_at: string;
  kind: ConfirmationOutcome | "sms"; note: string | null; created_at: string;
  actor_name: string; sms_status: string | null; sms_error: string | null;
  sms_body: string | null; sms_phone: string | null;
};
export type ConfirmationBooking = {
  id: string; lead_id: string | null; patient_name: string; patient_phone: string | null;
  appointment_date: string; appointment_time: string; doctor_name: string | null;
  updated_at: string; deposit_amount: number | null; square_payment_id: string | null;
  stripe_payment_intent_id: string | null; outcome: string | null; disqualified_at: string | null;
  clinic: { clinic_name: string; address: string | null; city: string | null; state: string | null } | null;
  reminders: { status: string; confirmation_state?: string }[]; events: ConfirmationEvent[];
  callback?: ConfirmationCallback | null;
};

export function confirmationDate(days = 1, now = new Date()) {
  const date = new Date(sydneyTodayISO(now) + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function confirmationTime(time: string) {
  const h = Number(time.slice(0, 2));
  return `${h % 12 || 12}:${time.slice(3, 5)} ${h >= 12 ? "pm" : "am"}`;
}
export function confirmationDay(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
export function activeConfirmationBooking(b: ConfirmationBooking, now = new Date()) {
  const today = sydneyTodayISO(now);
  const time = now.toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return !b.outcome && !b.disqualified_at && b.reminders.some(r => r.status === "confirmed")
    && (b.appointment_date > today || (b.appointment_date === today && b.appointment_time.slice(0, 5) > time));
}
export function currentConfirmationEvents(b: ConfirmationBooking) {
  return b.events.filter(e => new Date(e.appointment_updated_at).getTime() === new Date(b.updated_at).getTime())
    .sort((a, z) => z.created_at.localeCompare(a.created_at));
}
export function confirmationState(b: ConfirmationBooking): ConfirmationOutcome | "pending" {
  if (b.reminders.some(r => r.confirmation_state === "confirmed")) return "confirmed";
  return (currentConfirmationEvents(b).find(e => e.kind !== "sms")?.kind as ConfirmationOutcome | undefined) ?? "pending";
}
export function confirmationAddress(b: ConfirmationBooking) { return clinicSmsAddress(b.clinic); }
export function confirmationMap(b: ConfirmationBooking) {
  const address = confirmationAddress(b);
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
}
export function paidConfirmationDeposit(b: ConfirmationBooking) {
  return Boolean(b.square_payment_id || b.stripe_payment_intent_id) && (b.deposit_amount ?? 0) > 0;
}
export function confirmationCallGuide(b: ConfirmationBooking, repName?: string | null, now = new Date()) {
  const firstName = b.patient_name.trim().split(/\s+/)[0] || "there";
  const repFirstName = repName?.trim().split(/\s+/)[0] || "[REP NAME]";
  const day = confirmationDay(b.appointment_date);
  const when = b.appointment_date === confirmationDate(1, now) ? `tomorrow, ${day}` : `on ${day}`;
  const provider = b.doctor_name?.trim();
  const providerRole = !provider ? "[doctor/consultant]"
    : /^(?:dr\.?\s|doctor\s)|\b(?:doctor|surgeon)\b/i.test(provider) ? "doctor" : "consultant";
  return [
    `Hi ${firstName}, it’s ${repFirstName}. Our team spoke with you regarding your hair transplant. I’m just checking you have the address for your consultation ${when} at ${confirmationTime(b.appointment_time)}.`,
    ...(paidConfirmationDeposit(b) ? [`Keep in mind, you need to tell reception that you’ve paid your $${Number(b.deposit_amount).toFixed(0)} deposit. Otherwise, you’ll need to pay $395.`] : []),
    `I can see you’re with our most senior ${providerRole}, so you’re in good hands. Good luck!`,
  ];
}
export function confirmationText(b: ConfirmationBooking, missedCall: boolean) {
  const firstName = b.patient_name.trim().split(/\s+/)[0] || "there";
  const address = confirmationAddress(b);
  if (!b.clinic?.clinic_name || !address) throw new Error("Add the clinic name and address before sending an address text.");
  return `Hi ${firstName}, ${missedCall ? "I just tried calling to check you have the address for" : "here are the details for"} your consultation on ${confirmationDay(b.appointment_date)} at ${confirmationTime(b.appointment_time)} at ${b.clinic.clinic_name}.\n\nAddress: ${address}`
    + (paidConfirmationDeposit(b) ? `\n\nYour $${Number(b.deposit_amount).toFixed(0)} deposit is refundable when you attend. Please check in with reception when you arrive.` : "")
    + "\n\nPlease reply YES to confirm you're coming";
}
export function clinicLocalClock(b: ConfirmationBooking, now = new Date()) {
  const west = /^(WA|Western Australia)$/i.test(b.clinic?.state?.trim() ?? "") || /perth/i.test(b.clinic?.city ?? "");
  const zone = west ? "Australia/Perth" : APP_TIMEZONE;
  const hour = Number(now.toLocaleTimeString("en-GB", { timeZone: zone, hour: "2-digit", hourCycle: "h23" }));
  return { label: now.toLocaleTimeString("en-AU", { timeZone: zone, hour: "numeric", minute: "2-digit" }), city: west ? "Perth" : "Sydney", early: hour < 9, late: hour >= 20 };
}
