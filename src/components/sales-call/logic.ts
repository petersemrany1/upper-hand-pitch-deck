import type { Json } from "@/integrations/supabase/types";

/**
 * Pure domain logic for the sales-call portal: lead types, status
 * normalisation, queue timing rules. No React, no Supabase — fully unit
 * tested (see logic.test.ts, written as characterization tests before the
 * portal was decomposed).
 */

export type Lead = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; funding_preference: string | null;
  ad_name: string | null; ad_set_name: string | null; campaign_name: string | null;
  status: string | null; call_notes: string | null; created_at: string;
  callback_scheduled_at: string | null; day_number: number | null;
  finance_eligible: boolean | null; booking_date: string | null; booking_time: string | null;
  clinic_id: string | null; rep_id: string | null; raw_payload: Json | null;
  pipeline_summary?: string | null; pipeline_summary_updated_at?: string | null;
  deposit_paid_at?: string | null; deposit_amount?: number | null;
  stripe_payment_intent_id?: string | null; stripe_checkout_session_id?: string | null;
  handover_sent_at?: string | null;
};

export type Clinic = {
  id: string; clinic_name: string; address: string | null;
  city: string | null; state: string | null;
  consult_price_original: number | null; consult_price_deposit: number | null;
  parking_info: string | null; nearby_landmarks: string | null;
};

export type PartnerDoctor = {
  id: string; clinic_id: string; name: string; title: string | null;
  years_experience: number | null; specialties: string | null;
  what_makes_them_different: string | null;
  natural_results_approach: string | null;
  advanced_cases: string | null; talking_points: string | null;
  aftercare_included: string | null;
};

export const PRACTICE_AGENT_ID = "agent_1301kt5fgx3ye9krpyc25900fy60";

export const SALES_CALL_LEAD_LIMIT = 200;
export const SALES_CALL_LEAD_SELECT = `
  id, first_name, last_name, email, phone, funding_preference,
  ad_name, ad_set_name, campaign_name, status, call_notes, created_at,
  callback_scheduled_at, day_number, finance_eligible, booking_date,
  booking_time, clinic_id, rep_id, raw_payload, pipeline_summary,
  pipeline_summary_updated_at,
  deposit_paid_at, deposit_amount, stripe_payment_intent_id, stripe_checkout_session_id,
  handover_sent_at
`;

export const COLORS = {
  bg: "#f7f7f5",
  card: "#ffffff",
  line: "#ebebeb",
  text: "#111111",
  muted: "#111111",
  hint: "#111111",
  placeholder: "#111111",
  coral: "#f4522d",
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  amberDark: "#92400e",
  amberBg: "#fffbeb",
  red: "#ef4444",
  gold: "#d97706",
};

export function leadHasBookedSale(lead: Lead) {
  const paid = lead as Lead & { deposit_paid_at?: string | null; stripe_payment_intent_id?: string | null };
  return lead.status === "booked_deposit_paid" || Boolean(lead.booking_date && lead.booking_time && (paid.deposit_paid_at || paid.stripe_payment_intent_id));
}

export function statusColor(s: string | null) {
  switch (s) {
    case "new": return COLORS.blue;
    case "contacted": return COLORS.amber;
    case "booked": return COLORS.green;
    case "ineligible": return COLORS.red;
    case "dropped": return COLORS.muted;
    default: return COLORS.blue;
  }
}

export function fmtTime(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function normalisePhoneDigits(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("61") && digits.length === 11) return `0${digits.slice(2)}`;
  return digits;
}

export const ATTEMPTS_PER_DAY = (day: number) => (day <= 7 ? 3 : 1);

// Day-in-pipeline derived from the first call (calendar-day diff, 1-indexed).
// Day 1 = first day the rep called. If no call yet, they're still Day 1
// (waiting on their first attempt). Once called, the counter ticks over
// each calendar day.
export function pipelineDay(
  l: { created_at: string; day_number?: number | null },
  firstCallAt?: string | null,
): number {
  if (!firstCallAt) return 1;
  const first = new Date(firstCallAt);
  const a = new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime();
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.floor((b - a) / 86400000) + 1;
  return Math.max(1, days);
}

export type LeadUrgency = "overdue" | "due" | "upcoming";

export function leadUrgency(l: Lead): LeadUrgency {
  if (!l.callback_scheduled_at) return "upcoming";
  const t = new Date(l.callback_scheduled_at).getTime();
  const now = Date.now();
  if (Number.isNaN(t)) return "upcoming";
  if (t < now) return "overdue";
  // due now if within next 30 min
  if (t - now < 30 * 60 * 1000) return "due";
  return "upcoming";
}

export function getTimeSlot(lead: Lead): "9am" | "12pm" | "3pm" {
  if (lead.callback_scheduled_at) {
    const h = new Date(lead.callback_scheduled_at).getHours();
    if (h < 10) return "9am";
    if (h < 13) return "12pm";
    return "3pm";
  }
  const hour = new Date().getHours();
  if (hour < 10) return "9am";
  if (hour < 13) return "12pm";
  return "3pm";
}

export const fmtShort = (s: string) =>
  new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

/* The statuses the rep can cycle through inline. Keeping them here so the
 * card and the popover stay in sync. */
export type StatusKey =
  | "new"
  | "no_answer"
  | "callback_scheduled"
  | "had_convo_chase_up"
  | "had_convo_no_sale"
  | "not_interested"
  | "booked_no_deposit"
  | "booked_deposit_paid"
  | "dropped";

export const STATUS_OPTIONS: { key: StatusKey; label: string; emoji: string; color: string; bg: string }[] = [
  { key: "new",                  label: "New",                  emoji: "🔵", color: "#1d4ed8", bg: "#dbeafe" },
  { key: "no_answer",            label: "No Answer",            emoji: "🟡", color: "#a16207", bg: "#fef9c3" },
  { key: "callback_scheduled",   label: "Callback Scheduled",   emoji: "🟠", color: "#c2410c", bg: "#ffedd5" },
  { key: "had_convo_chase_up",   label: "Had Convo — Chase Up", emoji: "🟤", color: "#92400e", bg: "#fde68a" },
  { key: "had_convo_no_sale",    label: "Had Convo — No Sale",  emoji: "🩷", color: "#be185d", bg: "#fce7f3" },
  { key: "not_interested",       label: "Not Interested",       emoji: "🔴", color: "#b91c1c", bg: "#fee2e2" },
  { key: "booked_no_deposit",    label: "Booked — No Deposit",  emoji: "🟣", color: "#7e22ce", bg: "#f3e8ff" },
  { key: "booked_deposit_paid",  label: "Booked — Deposit Paid",emoji: "🟢", color: "#15803d", bg: "#dcfce7" },
  { key: "dropped",              label: "Dropped",              emoji: "⚫", color: "#374151", bg: "#e5e7eb" },
];

// Map any legacy / loose status string we might find in the DB onto the new key set.
export function normaliseStatus(s: string | null | undefined, l?: Lead): StatusKey {
  const raw = (s ?? "").toLowerCase().replace(/\s+/g, "_");
  if (raw.includes("deposit_paid")) return "booked_deposit_paid";
  if (raw.includes("booked")) {
    if (l?.booking_date) return "booked_no_deposit";
    return "booked_no_deposit";
  }
  if (raw.includes("callback")) return "callback_scheduled";
  if (raw.includes("no_sale") || raw.includes("did_not_get_the_sale") || raw.includes("did_not_sale")) return "had_convo_no_sale";
  if (raw.includes("chase") || raw.includes("had_convo")) return "had_convo_chase_up";
  if (raw.includes("not_interested") || raw === "ineligible") return "not_interested";
  if (raw.includes("no_answer") || raw === "contacted") return "no_answer";
  if (raw === "dropped") return "dropped";
  if (l?.callback_scheduled_at) return "callback_scheduled";
  return "new";
}

export function statusMeta(s: string | null | undefined, l?: Lead) {
  const key = normaliseStatus(s, l);
  return STATUS_OPTIONS.find((o) => o.key === key) ?? STATUS_OPTIONS[0];
}

export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type RawPayloadObject = { [key: string]: Json | undefined };

export const rawPayloadObject = (raw: Json | null): RawPayloadObject => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as RawPayloadObject;
  return {};
};

export const sameLocalDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
