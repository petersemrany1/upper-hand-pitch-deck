// Production release: partner availability and sales use the database schedule.
// The standalone /calendar-preview route remains an isolated example calendar.
export const CALENDAR_APPROVAL_ONLY = false;

export function isCalendarApprovalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return CALENDAR_APPROVAL_ONLY && (host === "localhost" || host === "127.0.0.1" || (host.endsWith(".lovable.app") && (host.startsWith("preview--") || host.startsWith("id-preview--"))) || host.endsWith("-dev.lovable.app") || host.endsWith(".lovableproject.com"));
}
