// Ported from the Legal app (family-law-floater/src/lib/call-hook-export.ts). Re-run the port script to refresh.
import type { HookListItem } from "./call-hooks";
import { formatSydney } from "./timezone";

export function qualifiedCallsCsv(items: HookListItem[]) {
  const cell = (value: string) => {
    // Treat imported names and creative text as data, including in spreadsheet apps.
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [
    [
      "Client",
      "Call date (Sydney)",
      "Call ID",
      "Hook to test",
      "Client concern",
      "Booking outcome",
      "What held them back",
      "Review status",
    ],
  ];
  const seen = new Set<string>();
  for (const item of items) {
    if (
      item.status !== "ready" ||
      !item.hook ||
      item.clientSource === false ||
      seen.has(item.callId)
    )
      continue;
    seen.add(item.callId);
    rows.push([
      item.clientName ?? "Unnamed client",
      formatSydney(item.createdAt),
      item.callId,
      item.hook,
      item.insight ?? "",
      item.bookingOutcome ?? (item.successful ? "Booked" : "Not booked"),
      item.barrier ?? "",
      "Evidence checked · creative draft, not a proven result",
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
