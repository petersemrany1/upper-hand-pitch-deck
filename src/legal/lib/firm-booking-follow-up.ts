// Ported from the Legal app (family-law-floater/src/lib/firm-booking-follow-up.ts). Re-run the port script to refresh.
import { isPublicHoliday } from "@/legal/data/au-public-holidays";

export const BOOKING_URL = "https://calendly.com/paypershowcall/discovery-call";

export function bookingText(step: number, firstName: string | null): string {
  const name = firstName?.trim().replace(/\s+/g, " ").slice(0, 60) || "there";
  return step === 1
    ? `Hi ${name}, John from Bold here. Thanks for enquiring about pay-per-show marketing for your family law firm. Let's discuss how it could work for your practice. Choose a time here: ${BOOKING_URL}`
    : `Hi ${name}, John from Bold again. Are you looking to bring more family law enquiries into your practice? Let's talk through how pay-per-show works and whether it suits your firm. Book a time here: ${BOOKING_URL}`;
}

export function isTargetedAd(adset: string | null): boolean {
  const name = adset
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/, "|");
  // The existing Meta bridge still sends the original SYD ad-set label.
  return name === "legal pitch|targeted" || name === "legal pitch|targeted syd";
}

const sydney = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function localParts(now: Date) {
  const p = Object.fromEntries(sydney.formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${p["year"]}-${p["month"]}-${p["day"]}`, hour: Number(p["hour"]), minute: Number(p["minute"]) };
}

function businessDate(date: string): boolean {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  // Extra NSW Anzac holiday gazetted for 2026, absent in the shared calendar.
  // https://www.nsw.gov.au/about-nsw/public-holidays
  return weekday !== 0 && weekday !== 6 && date !== "2026-04-27" && !isPublicHoliday(date, "NSW");
}

function sydneyNoon(date: string): Date {
  const candidate = new Date(`${date}T12:00:00Z`);
  const local = localParts(candidate);
  return new Date(candidate.getTime() - (local.hour - 12) * 60 * 60_000 - local.minute * 60_000);
}

/** Noon on the next Sydney business date, respecting daylight saving. */
export function nextBusinessNoon(after: Date): string {
  const day = new Date(`${localParts(after).date}T12:00:00Z`);
  do { day.setUTCDate(day.getUTCDate() + 1); }
  while (!businessDate(day.toISOString().slice(0, 10)));
  return sydneyNoon(day.toISOString().slice(0, 10)).toISOString();
}

/** If an outage misses noon, hold the reminder for another business-day noon. */
export function reminderWindow(now: Date): { open: boolean; next: string } {
  const local = localParts(now);
  if (businessDate(local.date) && local.hour === 12) return { open: true, next: now.toISOString() };
  if (businessDate(local.date) && local.hour < 12)
    return { open: false, next: sydneyNoon(local.date).toISOString() };
  return { open: false, next: nextBusinessNoon(now) };
}

export function dueAt(createdAt: string, step: number): string {
  const first = new Date(new Date(createdAt).getTime() + 4 * 60_000);
  return step === 1 ? first.toISOString() : nextBusinessNoon(first);
}

export const FOLLOW_UP_STAGES = new Set(["new", "no_answer"]);
