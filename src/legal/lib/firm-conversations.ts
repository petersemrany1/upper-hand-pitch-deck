// Ported from the Legal app (family-law-floater/src/lib/firm-conversations.ts). Re-run the port script to refresh.
export type FirmMessage = {
  id: string;
  application_id: string;
  direction: "inbound" | "outbound";
  phone: string;
  local_number: string | null;
  body: string;
  status: string;
  error_code: string | null;
  reviewed_at: string | null;
  created_at: string;
};
export type FirmConversationOverview = {
  application_id: string;
  last_activity_at: string;
  unread_count: number;
  preview: string;
};

/** Preserve Postgres microseconds when comparing timestamps from a thread. */
export function firmEventTime(value: string): string {
  const seconds = new Date(value).toISOString().slice(0, 19);
  const fraction = (value.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0");
  return `${seconds}.${fraction}`;
}

export function latestFirmIncomingAt(
  rows: { direction?: string; created_at: string }[],
): string | null {
  return (
    rows
      .filter((row) => row.direction === "inbound")
      .sort((a, b) => firmEventTime(a.created_at).localeCompare(firmEventTime(b.created_at)))
      .at(-1)?.created_at ?? null
  );
}

export function firmEventWasRead(
  row: { direction?: string; created_at: string },
  through: string | null,
): boolean {
  return (
    row.direction === "inbound" &&
    !!through &&
    firmEventTime(row.created_at) <= firmEventTime(through)
  );
}
export function callbackText(firstName: string | null, number: string) {
  const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi,";
  return `${greeting} it's Peter from Bold. I tried giving you a call about your firm's enquiry. Please call me back on ${number} when you have a moment, or reply here with a convenient time. Thanks, Peter`;
}
export function smsOptOut(body: string) {
  return /^(stop|stopall|unsubscribe|cancel|end|quit|revoke|opt\s*out)$/i.test(body.trim());
}
export function smsOptIn(body: string) {
  return /^(start|unstop)$/i.test(body.trim());
}

export type FirmSendResult = { status: string; rejectionReason?: string };
