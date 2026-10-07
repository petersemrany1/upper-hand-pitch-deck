// The user requested an approval preview, not a production activation.
// Set false only in the approved release after applying/testing the migration.
export const CALENDAR_APPROVAL_ONLY = true;

export function isCalendarApprovalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return CALENDAR_APPROVAL_ONLY && (host === "localhost" || host === "127.0.0.1" || (host.endsWith(".lovable.app") && (host.startsWith("preview--") || host.startsWith("id-preview--"))) || host.endsWith("-dev.lovable.app") || host.endsWith(".lovableproject.com"));
}
