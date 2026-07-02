import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ClipboardList, CalendarDays, List as ListIcon, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateSlots, summarizeDay, dayOfWeekMonFirst, ymdLocal, effectiveHoursFor, holidayLabelFor,
  DAY_NAMES, DAY_SHORT,
  type TradingHours, type BlockedSlot, type Slot, type AvailabilityOverride,
} from "@/lib/slot-generation";

import type { ClinicAppointment } from "@/components/ClinicPortalView";


export const NAVY = "#1a3a6b";
export const NAVY_PALE = "#edf2f9";

export const OUTCOME_COLORS: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  upcoming: { bg: "#edf2f9", fg: "#2d5fa0", border: "#cfdcef", label: "Upcoming" },
  show: { bg: "#e8f5ef", fg: "#1a7a4a", border: "#9ed4b5", label: "Showed up" },
  noshow: { bg: "#fdf0f0", fg: "#b83232", border: "#f0b8b8", label: "No show" },
  proceeded: { bg: "#f3eefa", fg: "#6b3fa0", border: "#d6c5ec", label: "Booked procedure" },
};

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function ymd(d: Date) { return ymdLocal(d); }

export function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function parseAppointmentDateTime(dateStr: string, timeStr: string | null | undefined) {
  const base = parseDateOnly(dateStr);
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr ?? "");
  if (match) base.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return base;
}

export function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${min}${ampm}`;
}
export const navBtn: React.CSSProperties = {
  background: "#fff", border: "1px solid #e2e6ec", borderRadius: 6, padding: "8px 14px",
  fontSize: 14, color: "#111", cursor: "pointer",
};

export function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const first = new Date(monthStart);
  first.setDate(1);
  const dow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < dow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ============== NOTES TRAIL ============== */

export type ApptNote = {
  id: string;
  appointment_id: string;
  clinic_id: string;
  author_type: "admin" | "clinic";
  author_name: string | null;
  body: string;
  created_at: string;
};

export function outcomeBtn(color: string, bg: string): React.CSSProperties {
  return {
    background: bg, color, border: `1px solid ${color}33`, padding: "10px 12px",
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
  };
}

export function hhmmToMinLocal(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function describeRecurring(r: BlockedSlot): string {
  const time = `${fmtTime(r.slot_start)}–${fmtTime(r.slot_end)}`;
  const pattern = r.recur_pattern ?? "weekly";
  const until = r.recur_until ? ` (until ${r.recur_until})` : "";

  if (pattern === "daily") return `Every day · ${time}${until}`;

  if (pattern === "weekly") {
    const days = (r.recur_days_of_week && r.recur_days_of_week.length > 0)
      ? r.recur_days_of_week
      : (r.recur_day_of_week != null ? [r.recur_day_of_week] : []);
    const sorted = [...days].sort((a, b) => a - b);
    const label = sorted.length === 7 ? "Every day"
      : sorted.length === 5 && sorted.every((d) => d < 5) ? "Weekdays"
      : sorted.length === 2 && sorted.includes(5) && sorted.includes(6) ? "Weekends"
      : `Every ${sorted.map((d) => DAY_SHORT[d]).join(", ")}`;
    return `${label} · ${time}${until}`;
  }

  if (pattern === "monthly_date") {
    const d = r.recur_day_of_month ?? 1;
    const suf = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
    return `Monthly on the ${d}${suf} · ${time}${until}`;
  }

  if (pattern === "monthly_nth_dow") {
    const nth = r.recur_nth_week ?? 1;
    const nthLabel = nth === 5 ? "last" : ["1st", "2nd", "3rd", "4th"][nth - 1] ?? `${nth}th`;
    const dayName = DAY_NAMES[r.recur_day_of_week ?? 0];
    return `Monthly on the ${nthLabel} ${dayName} · ${time}${until}`;
  }

  return `${time}${until}`;
}

export type AddPattern = "daily" | "weekly" | "monthly_date" | "monthly_nth_dow";

