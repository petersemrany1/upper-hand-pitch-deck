// Ported from the Legal app (family-law-floater/src/lib/availability-blocks.ts). Re-run the port script to refresh.
import { hhmmToMin, recurrenceMatches, type BlockedSlot } from "./slot-generation";

export type BlockRepeat = "none" | "daily" | "weekly" | "monthly";
const dateParts = (value: string) => value.split("-").map(Number);
export function localBlockDate(value: string) {
  const [y, m, d] = dateParts(value);
  return new Date(y!, m! - 1, d!);
}
export function directlyBlocked(blocks: BlockedSlot[], date: Date, time: string): boolean {
  const minute = hhmmToMin(time);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return blocks.some(
    (b) =>
      (b.is_recurring ? recurrenceMatches(b, date) : b.date === dateStr) &&
      (!b.start_time ||
        !b.end_time ||
        (minute >= hhmmToMin(b.start_time) && minute < hhmmToMin(b.end_time))),
  );
}
export function makeAvailabilityBlock(
  firmId: string,
  date: string,
  start: string,
  end: string,
  repeat: BlockRepeat,
  until: string,
) {
  if (hhmmToMin(start) >= hhmmToMin(end)) throw new Error("End time must be after start time");
  if (repeat !== "none" && (!until || until < date))
    throw new Error("Choose an end date on or after the selected day");
  const day = localBlockDate(date);
  return {
    firm_id: firmId,
    date,
    start_time: start,
    end_time: end,
    is_recurring: repeat !== "none",
    recur_pattern:
      repeat === "none" ? null : repeat === "monthly" ? ("monthly_date" as const) : repeat,
    recur_day_of_week: repeat === "weekly" ? day.getDay() : null,
    recur_day_of_month: repeat === "monthly" ? day.getDate() : null,
    recur_until: repeat === "none" ? null : until,
  };
}
// Older daily/weekly blocks were expanded into independent rows. Only include
// exact matching times in the explicitly chosen date range; never other times.
export function matchingBlockIds(
  blocks: BlockedSlot[],
  date: string,
  start: string,
  end: string,
  repeat: BlockRepeat,
  until: string,
): string[] {
  const selected = localBlockDate(date);
  return blocks
    .filter((b) => {
      if (!b.id) return false;
      const overlaps =
        hhmmToMin(b.start_time) < hhmmToMin(end) && hhmmToMin(b.end_time) > hhmmToMin(start);
      if (b.is_recurring) return recurrenceMatches(b, selected) && overlaps;
      if (!b.date) return false;
      if (repeat === "none") return b.date === date && overlaps;
      if (
        b.date < date ||
        b.date > until ||
        hhmmToMin(b.start_time) !== hhmmToMin(start) ||
        hhmmToMin(b.end_time) !== hhmmToMin(end)
      )
        return false;
      const candidate = localBlockDate(b.date);
      return (
        repeat === "daily" ||
        (repeat === "weekly"
          ? candidate.getDay() === selected.getDay()
          : candidate.getDate() === selected.getDate())
      );
    })
    .map((b) => b.id!);
}
