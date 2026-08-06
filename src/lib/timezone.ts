// HARD RULE: This app runs on Sydney time everywhere.
// Always import APP_TIMEZONE from here instead of hard-coding "Australia/Sydney".
// See mem://rules/timezone-sydney for the full rule.

export const APP_TIMEZONE = "Australia/Sydney" as const;

/** YYYY-MM-DD string for "today" in Sydney. */
export function sydneyTodayISO(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

/** Whole days between Sydney-today and a YYYY-MM-DD booking date (positive = future). */
export function daysUntilSydney(bookingDateISO: string, now: Date = new Date()): number {
  const today = new Date(sydneyTodayISO(now) + "T00:00:00Z").getTime();
  const target = new Date(bookingDateISO + "T00:00:00Z").getTime();
  return Math.round((target - today) / 86400000);
}

/** Format a Date for display in Sydney time. */
export function formatSydney(
  d: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Date(d).toLocaleString("en-AU", { ...opts, timeZone: APP_TIMEZONE });
}
