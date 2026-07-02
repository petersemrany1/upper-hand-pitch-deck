import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ClipboardList, CalendarDays, List as ListIcon, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateSlots, summarizeDay, dayOfWeekMonFirst, ymdLocal, effectiveHoursFor, holidayLabelFor,
  DAY_NAMES, DAY_SHORT,
  type TradingHours, type BlockedSlot, type Slot, type AvailabilityOverride,
} from "@/lib/slot-generation";
import {
  NAVY, NAVY_PALE, OUTCOME_COLORS, MONTHS, ymd, parseDateOnly,
  parseAppointmentDateTime, fmtTime, navBtn, buildMonthGrid, outcomeBtn,
  hhmmToMinLocal, describeRecurring,
  type ApptNote, type AddPattern,
} from "./shared";
import { ModalShell } from "./modal-shell";
import { ConsultSummaryModal, AddAppointmentModal } from "./appointment-detail";
import type { ClinicAppointment } from "@/components/ClinicPortalView";

type PendingRange = { startTime: string; endTime: string; alreadyBlocked: boolean };

export function AvailabilityTab({ tradingHours, blockedSlots, overrides, appts, clinicId, clinicState, onChange }: {
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  overrides: AvailabilityOverride[];
  appts: ClinicAppointment[];
  clinicId: string;
  clinicState: string | null;
  onChange: () => void;
}) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  // drag-select state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingRange | null>(null);

  const month = viewMonth.getMonth(), year = viewMonth.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const offset = (firstWeekday + 6) % 7;

  const selectedDow = dayOfWeekMonFirst(selectedDate);
  const selectedDateStr = ymd(selectedDate);
  const baseTH = tradingHours.find((t) => t.day_of_week === selectedDow);
  const selectedOverride = overrides.find((o) => o.override_date === selectedDateStr);
  const selectedTH = effectiveHoursFor(selectedDate, tradingHours, overrides, clinicState);
  const slots: Slot[] = useMemo(
    () => generateSlots(selectedDate, tradingHours, blockedSlots, appts, overrides, clinicState),
    [selectedDate, tradingHours, blockedSlots, appts, overrides, clinicState],
  );

  // "Open this day" modal state — for opening a normally-closed day
  const [openDayModal, setOpenDayModal] = useState(false);

  const recurring = useMemo(
    () => blockedSlots.filter((b) => b.is_recurring).sort((a, b) => {
      const ad = a.recur_day_of_week ?? 0, bd = b.recur_day_of_week ?? 0;
      if (ad !== bd) return ad - bd;
      return a.slot_start.localeCompare(b.slot_start);
    }),
    [blockedSlots],
  );

  const rangeIndices = (): [number, number] | null => {
    if (dragStart == null || dragEnd == null) return null;
    return [Math.min(dragStart, dragEnd), Math.max(dragStart, dragEnd)];
  };
  const inDragRange = (i: number) => {
    const r = rangeIndices(); return !!r && i >= r[0] && i <= r[1];
  };

  const onSlotPointerDown = (i: number, slot: Slot) => {
    if (slot.booked) return;
    setDragStart(i); setDragEnd(i);
  };
  const onSlotPointerEnter = (i: number) => {
    if (dragStart == null) return;
    setDragEnd(i);
  };

  // Finalise on global pointerup
  useEffect(() => {
    if (dragStart == null) return;
    const handler = () => {
      const r = rangeIndices();
      if (!r) { setDragStart(null); setDragEnd(null); return; }
      const [a, b] = r;
      const first = slots[a], last = slots[b];
      if (!first || !last) { setDragStart(null); setDragEnd(null); return; }
      for (let i = a; i <= b; i++) {
        if (slots[i].booked) {
          setDragStart(null); setDragEnd(null);
          toast.error("Selection includes a booked appointment");
          return;
        }
      }
      const dur = selectedTH?.consult_duration_mins ?? 30;
      const [lh, lm] = last.time.split(":").map(Number);
      const endMin = lh * 60 + lm + dur;
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      const allBlocked = slots.slice(a, b + 1).every((s) => s.blocked);
      setPending({ startTime: first.time, endTime, alreadyBlocked: allBlocked });
      setDragStart(null); setDragEnd(null);
    };
    window.addEventListener("pointerup", handler);
    return () => window.removeEventListener("pointerup", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragStart, dragEnd, slots, selectedTH]);

  const unblockRange = async (startTime: string, endTime: string) => {
    const sMin = hhmmToMinLocal(startTime);
    const eMin = hhmmToMinLocal(endTime);
    const matches = blockedSlots.filter((b) => {
      if (b.is_recurring) return false;
      if (b.slot_date !== selectedDateStr) return false;
      const bs = hhmmToMinLocal(b.slot_start);
      const be = hhmmToMinLocal(b.slot_end);
      return bs < eMin && be > sMin;
    });
    if (matches.length === 0) {
      toast.error("Those slots are blocked by a recurring rule. Remove it from 'Recurring blocks' below.");
      return;
    }
    const ids = matches.map((b) => b.id!).filter(Boolean);
    const { error } = await supabase.from("clinic_blocked_slots").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success("Slots unblocked");
    onChange();
  };

  const closeWholeDay = async () => {
    if (!selectedTH || selectedTH.is_closed) return;
    const allBlocked = slots.length > 0 && slots.every((s) => s.blocked);
    if (allBlocked) {
      const ids = blockedSlots.filter((b) => !b.is_recurring && b.slot_date === selectedDateStr).map((b) => b.id!).filter(Boolean);
      if (ids.length) await supabase.from("clinic_blocked_slots").delete().in("id", ids);
    } else {
      await supabase.from("clinic_blocked_slots").insert({
        clinic_id: clinicId,
        slot_date: selectedDateStr,
        slot_start: selectedTH.open_time.slice(0, 8).length === 5 ? `${selectedTH.open_time}:00` : selectedTH.open_time,
        slot_end: selectedTH.close_time.slice(0, 8).length === 5 ? `${selectedTH.close_time}:00` : selectedTH.close_time,
        is_recurring: false,
      });
    }
    onChange();
  };

  // Remove an "open" override → day reverts to normally closed
  const removeOpenOverride = async () => {
    if (!selectedOverride) return;
    const { error } = await supabase.from("clinic_availability").delete().eq("override_date", selectedDateStr).eq("clinic_id", clinicId);
    if (error) { toast.error(error.message); return; }
    toast.success("Day closed again");
    onChange();
  };

  const baseClosed = !baseTH || baseTH.is_closed;
  const isClosedDay = !selectedTH || selectedTH.is_closed;
  const allBlocked = !isClosedDay && slots.length > 0 && slots.every((s) => s.blocked);

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "420px 1fr", gap: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* LEFT — calendar */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setViewMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })} style={navBtn}>‹</button>
          <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{MONTHS[month]} {year}</div>
          <button onClick={() => setViewMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })} style={navBtn}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DAY_SHORT.map((d) => (
            <div key={d} style={{ fontSize: 10, fontWeight: 600, color: "#6b7785", textAlign: "center", padding: 4 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: offset }, (_, i) => <div key={`o${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const date = new Date(year, month, day);
            const summary = summarizeDay(date, tradingHours, blockedSlots, appts, overrides, clinicState);
            const dateStr = ymd(date);
            const isSelected = dateStr === ymd(selectedDate);
            const isToday = dateStr === ymd(today);
            let bg = "#fff", color = "#111", border = "1px solid #e6e6e6";
            if (summary.closed) { bg = "#f3f4f6"; color = "#9ca3af"; border = "1px solid #e5e7eb"; }
            else if (summary.allBlocked) { bg = "#fdf0f0"; color = "#b83232"; border = "1px solid #b83232"; }
            else if (summary.someBlocked) { bg = "#fef3c7"; color = "#92400e"; border = "1px solid #d97706"; }
            if (isSelected) { border = `2px solid ${NAVY}`; }
            else if (isToday) { border = `2px solid ${NAVY}`; }
            return (
              <button key={day} onClick={() => setSelectedDate(date)}
                style={{ background: bg, color, border, padding: "10px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                {day}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: "#6b7785", display: "flex", flexDirection: "column", gap: 6 }}>
          <LegendDot color="#9ca3af" bg="#f3f4f6" label="Clinic closed" />
          <LegendDot color="#d97706" bg="#fef3c7" label="Some slots blocked" />
          <LegendDot color="#b83232" bg="#fdf0f0" label="Fully closed" />
          <LegendDot color={NAVY} bg="#fff" label="Today" />
        </div>
      </div>

      {/* RIGHT — slot editor */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7785", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Editing</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>
              {DAY_SHORT[selectedDow]} {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </div>
          </div>
          {!isClosedDay && !selectedOverride && (
            <button
              onClick={() => void closeWholeDay()}
              style={{
                background: "#fff", color: "#b83232", border: "1.5px solid #b83232",
                borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#b83232"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#b83232"; }}
            >
              {allBlocked ? "Reopen day" : "Close whole day"}
            </button>
          )}
          {selectedOverride?.override_type === "open" && (
            <button
              onClick={() => void removeOpenOverride()}
              style={{
                background: "#fff", color: "#b83232", border: "1.5px solid #b83232",
                borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Close again
            </button>
          )}
        </div>

        {isClosedDay ? (() => {
          const holidayName = holidayLabelFor(selectedDate, overrides, clinicState);
          return (
          <div style={{ background: holidayName ? "#fff8e6" : "#f3f4f6", border: holidayName ? "1px solid #f5d77a" : "1px solid #e5e7eb", borderRadius: 10, padding: 24, textAlign: "center" }}>
            {holidayName ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#8a6500", marginBottom: 6 }}>Public holiday — {holidayName}</div>
                <div style={{ fontSize: 12, color: "#6b7785", marginBottom: 14 }}>
                  Your clinic is closed by default on public holidays. You can choose to open this day if you'll be trading.
                </div>
                <button
                  onClick={() => setOpenDayModal(true)}
                  style={{
                    background: NAVY, color: "#fff", border: "none", borderRadius: 8,
                    padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Open this day
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, color: "#6b7785", marginBottom: 14 }}>
                  Your clinic is normally closed on <strong>{DAY_NAMES[selectedDow]}s</strong>.
                </div>
                {baseClosed && (
                  <button
                    onClick={() => setOpenDayModal(true)}
                    style={{
                      background: NAVY, color: "#fff", border: "none", borderRadius: 8,
                      padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Open this day
                  </button>
                )}
                {!baseClosed && (
                  <div style={{ fontSize: 12, color: "#9aa5b1", marginTop: 6 }}>
                    Contact admin to change your weekly trading hours.
                  </div>
                )}
              </>
            )}
          </div>
          );
        })() : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, userSelect: "none", touchAction: "none" }}>
              {slots.map((s, i) => {
                const dragging = inDragRange(i);
                let bg = "#fff", color = "#111", border = "1px solid #e6e6e6";
                if (s.booked) { bg = "#edf2f9"; color = NAVY; border = "1px solid #cfdcef"; }
                else if (s.blocked) { bg = "#fdf0f0"; color = "#b83232"; border = "1px solid #f0b8b8"; }
                if (dragging && !s.booked) { bg = "#fde2e2"; border = "2px solid #b83232"; color = "#b83232"; }
                return (
                  <button
                    key={s.time}
                    onPointerDown={(e) => { e.preventDefault(); onSlotPointerDown(i, s); }}
                    onPointerEnter={() => onSlotPointerEnter(i)}
                    disabled={s.booked}
                    style={{
                      background: bg, color, border, borderRadius: 8,
                      padding: "10px 6px", fontSize: 14, fontWeight: 600,
                      cursor: s.booked ? "default" : "pointer",
                      opacity: s.booked ? 0.85 : 1, fontFamily: "inherit",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    }}
                  >
                    <span>{s.label}</span>
                    {s.booked && s.patientName && (
                      <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>{s.patientName.split(" ")[0]}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 18, background: NAVY_PALE, padding: 14, borderRadius: 10, fontSize: 12, color: "#111", lineHeight: 1.55 }}>
              <strong style={{ color: NAVY }}>Tip —</strong> Click and drag across slots to block a range ({fmtTime(selectedTH!.open_time)}–{fmtTime(selectedTH!.close_time)}, {selectedTH?.consult_duration_mins ?? 30}-min slots). You can choose to repeat the block daily, weekly or monthly.
            </div>
          </>
        )}

        {/* Recurring blocks */}
        <RecurringBlocks
          recurring={recurring}
          clinicId={clinicId}
          onChange={onChange}
        />
      </div>

      {pending && (
        <BlockRangeModal
          startTime={pending.startTime}
          endTime={pending.endTime}
          startDate={selectedDateStr}
          alreadyBlocked={pending.alreadyBlocked}
          tradingHours={tradingHours}
          overrides={overrides}
          clinicId={clinicId}
          onClose={() => setPending(null)}
          onUnblock={async () => { await unblockRange(pending.startTime, pending.endTime); setPending(null); }}
          onSaved={() => { setPending(null); onChange(); }}
        />
      )}

      {openDayModal && (
        <OpenDayModal
          dateStr={selectedDateStr}
          dayName={DAY_NAMES[selectedDow]}
          clinicId={clinicId}
          onClose={() => setOpenDayModal(false)}
          onSaved={() => { setOpenDayModal(false); onChange(); }}
        />
      )}
    </div>
  );
}

function BlockRangeModal({
  startTime, endTime, startDate, alreadyBlocked, tradingHours, overrides, clinicId,
  onClose, onUnblock, onSaved,
}: {
  startTime: string; endTime: string; startDate: string; alreadyBlocked: boolean;
  tradingHours: TradingHours[]; overrides: AvailabilityOverride[]; clinicId: string;
  onClose: () => void; onUnblock: () => void; onSaved: () => void;
}) {
  type Repeat = "none" | "daily" | "weekly" | "monthly";
  const [repeat, setRepeat] = useState<Repeat>("none");
  const defaultUntil = useMemo(() => {
    const [y, m, d] = startDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setMonth(dt.getMonth() + 3);
    return ymdLocal(dt);
  }, [startDate]);
  const [until, setUntil] = useState<string>(defaultUntil);
  const [saving, setSaving] = useState(false);

  const buildDates = (): string[] => {
    const [y, m, d] = startDate.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const [uy, um, ud] = until.split("-").map(Number);
    const end = new Date(uy, um - 1, ud);
    const out = new Set<string>([ymdLocal(start)]);
    if (repeat === "none") return Array.from(out);
    const cursor = new Date(start);
    for (let i = 0; i < 1000; i++) {
      if (repeat === "daily") cursor.setDate(cursor.getDate() + 1);
      else if (repeat === "weekly") cursor.setDate(cursor.getDate() + 7);
      else if (repeat === "monthly") cursor.setMonth(cursor.getMonth() + 1);
      if (cursor > end) break;
      out.add(ymdLocal(cursor));
    }
    return Array.from(out);
  };

  const save = async () => {
    setSaving(true);
    const dates = buildDates();
    // Honour per-date "open" overrides — a normally-closed weekday that's been
    // opened for this specific date should still allow blocks.
    const filtered = dates.filter((dstr) => {
      const [yy, mm, dd] = dstr.split("-").map(Number);
      const dt = new Date(yy, mm - 1, dd);
      const th = effectiveHoursFor(dt, tradingHours, overrides);
      return th && !th.is_closed;
    });
    if (filtered.length === 0) {
      setSaving(false); toast.error("No open trading days in that range"); return;
    }
    const rows = filtered.map((dstr) => ({
      clinic_id: clinicId,
      slot_date: dstr,
      slot_start: `${startTime}:00`,
      slot_end: `${endTime}:00`,
      is_recurring: false,
    }));
    const { error } = await supabase.from("clinic_blocked_slots").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Blocked ${filtered.length} ${filtered.length === 1 ? "day" : "days"}`);
    onSaved();
  };

  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "pm" : "am";
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, "0")}${ap}`;
  };

  return (
    <ModalShell onClose={onClose}>
      {alreadyBlocked ? (
        <>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 4 }}>Unblock this range?</div>
          <div style={{ fontSize: 13, color: "#6b7785", marginBottom: 18 }}>
            {fmt(startTime)}–{fmt(endTime)} on this day will be reopened.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
            <button onClick={onUnblock} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Unblock
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 4 }}>Block time off</div>
          <div style={{ fontSize: 13, color: "#6b7785", marginBottom: 18 }}>
            <strong style={{ color: "#111" }}>{fmt(startTime)} – {fmt(endTime)}</strong> on {startDate}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7785", textTransform: "uppercase", marginBottom: 8 }}>Repeat</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
            {(["none","daily","weekly","monthly"] as Repeat[]).map((r) => (
              <button key={r} onClick={() => setRepeat(r)}
                style={{
                  padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: repeat === r ? NAVY : "#fff",
                  color: repeat === r ? "#fff" : "#111",
                  border: `1.5px solid ${repeat === r ? NAVY : "#e2e6ec"}`,
                  fontFamily: "inherit", textTransform: "capitalize",
                }}>
                {r === "none" ? "Just once" : r}
              </button>
            ))}
          </div>

          {repeat !== "none" && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7785", textTransform: "uppercase", marginBottom: 6 }}>Until</div>
              <input type="date" value={until} min={startDate} onChange={(e) => setUntil(e.target.value)}
                style={{ width: "100%", padding: 10, fontSize: 13, border: "1px solid #e2e6ec", borderRadius: 8, marginBottom: 10, color: "#111" }} />
              <div style={{ fontSize: 11, color: "#6b7785", marginBottom: 14 }}>
                One block per {repeat === "daily" ? "day" : repeat === "weekly" ? "week" : "month"} until {until}. Days the clinic is closed are skipped.
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ background: "#b83232", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
              Block time
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

function RecurringBlocks({ recurring, clinicId, onChange }: { recurring: BlockedSlot[]; clinicId: string; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [pattern, setPattern] = useState<AddPattern>("weekly");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([0]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [nthWeek, setNthWeek] = useState<number>(1); // 1-4, 5 = last
  const [nthDow, setNthDow] = useState<number>(0);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [until, setUntil] = useState<string>("");

  const resetForm = () => {
    setPattern("weekly");
    setWeeklyDays([0]);
    setDayOfMonth(1);
    setNthWeek(1);
    setNthDow(0);
    setStart("12:00");
    setEnd("13:00");
    setUntil("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("clinic_blocked_slots").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  const toggleDay = (d: number) => {
    setWeeklyDays((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b));
  };

  const save = async () => {
    if (start >= end) { toast.error("End time must be after start time"); return; }

    const row: {
      clinic_id: string;
      slot_date: null;
      slot_start: string;
      slot_end: string;
      is_recurring: true;
      recur_pattern: AddPattern;
      recur_until: string | null;
      recur_day_of_week: number | null;
      recur_days_of_week: number[] | null;
      recur_day_of_month: number | null;
      recur_nth_week: number | null;
    } = {
      clinic_id: clinicId,
      slot_date: null,
      slot_start: `${start}:00`,
      slot_end: `${end}:00`,
      is_recurring: true,
      recur_pattern: pattern,
      recur_until: until || null,
      recur_day_of_week: null,
      recur_days_of_week: null,
      recur_day_of_month: null,
      recur_nth_week: null,
    };

    if (pattern === "weekly") {
      if (weeklyDays.length === 0) { toast.error("Pick at least one weekday"); return; }
      row.recur_days_of_week = weeklyDays;
      row.recur_day_of_week = weeklyDays[0]; // back-compat
    } else if (pattern === "monthly_date") {
      if (dayOfMonth < 1 || dayOfMonth > 31) { toast.error("Day of month must be 1–31"); return; }
      row.recur_day_of_month = dayOfMonth;
    } else if (pattern === "monthly_nth_dow") {
      row.recur_nth_week = nthWeek;
      row.recur_day_of_week = nthDow;
    }
    // daily: no extra fields

    const { error } = await supabase.from("clinic_blocked_slots").insert(row);
    if (error) { toast.error(error.message); return; }
    setAdding(false);
    resetForm();
    onChange();
  };

  const sortedRecurring = [...recurring].sort((a, b) => {
    const pa = a.recur_pattern ?? "weekly";
    const pb = b.recur_pattern ?? "weekly";
    if (pa !== pb) return pa.localeCompare(pb);
    return a.slot_start.localeCompare(b.slot_start);
  });

  const inputStyle: React.CSSProperties = { padding: "6px 8px", border: "1px solid #e2e6ec", borderRadius: 6, fontSize: 12, fontFamily: "inherit" };
  const dayChip = (active: boolean): React.CSSProperties => ({
    padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${active ? NAVY : "#cfdcef"}`, background: active ? NAVY : "#fff",
    color: active ? "#fff" : NAVY, fontFamily: "inherit",
  });

  return (
    <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #e2e6ec" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Recurring blocks</div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ ...navBtn, fontSize: 12, padding: "6px 10px", color: NAVY, borderColor: "#cfdcef" }}>
            + Add recurring block
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: "#6b7785", marginBottom: 10 }}>
        Apply automatically on a schedule (e.g. lunch every day, surgery on the 1st Monday of each month).
      </div>

      {sortedRecurring.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: "#9aa5b1", fontStyle: "italic", padding: "6px 0" }}>None yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sortedRecurring.map((r) => (
          <div key={r.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fdf0f0", border: "1px solid #f0b8b8", borderRadius: 8, padding: "8px 12px",
          }}>
            <div style={{ fontSize: 13, color: "#b83232", fontWeight: 600 }}>
              {describeRecurring(r)}
            </div>
            <button onClick={() => void remove(r.id!)}
              style={{ background: "transparent", border: "none", color: "#b83232", cursor: "pointer", padding: 4 }}
              title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div style={{
          marginTop: 10, background: "#f7f8fa", border: "1px solid #e2e6ec",
          borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Repeat pattern */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>Repeat</label>
            <select value={pattern} onChange={(e) => setPattern(e.target.value as AddPattern)} style={inputStyle}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (pick days)</option>
              <option value="monthly_date">Monthly on a date (e.g. 15th)</option>
              <option value="monthly_nth_dow">Monthly on Nth weekday (e.g. 1st Monday)</option>
            </select>
          </div>

          {/* Pattern-specific controls */}
          {pattern === "weekly" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>Days of week</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAY_SHORT.map((n, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)} style={dayChip(weeklyDays.includes(i))}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setWeeklyDays([0,1,2,3,4])} style={{ ...navBtn, fontSize: 11, padding: "4px 8px" }}>Weekdays</button>
                <button type="button" onClick={() => setWeeklyDays([5,6])} style={{ ...navBtn, fontSize: 11, padding: "4px 8px" }}>Weekends</button>
                <button type="button" onClick={() => setWeeklyDays([0,1,2,3,4,5,6])} style={{ ...navBtn, fontSize: 11, padding: "4px 8px" }}>All</button>
              </div>
            </div>
          )}

          {pattern === "monthly_date" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>Day of month (1–31)</label>
              <input type="number" min={1} max={31} value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                style={{ ...inputStyle, width: 100 }} />
              <div style={{ fontSize: 11, color: "#6b7785" }}>Skipped in months that don't have this day.</div>
            </div>
          )}

          {pattern === "monthly_nth_dow" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>Which</label>
                <select value={nthWeek} onChange={(e) => setNthWeek(Number(e.target.value))} style={inputStyle}>
                  <option value={1}>1st</option>
                  <option value={2}>2nd</option>
                  <option value={3}>3rd</option>
                  <option value={4}>4th</option>
                  <option value={5}>Last</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>Weekday</label>
                <select value={nthDow} onChange={(e) => setNthDow(Number(e.target.value))} style={inputStyle}>
                  {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 11, color: "#6b7785", paddingBottom: 8 }}>of every month</div>
            </div>
          )}

          {/* Time range */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>From</label>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>To</label>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>Until (optional)</label>
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setAdding(false); resetForm(); }} style={{ ...navBtn, fontSize: 12, padding: "6px 12px" }}>Cancel</button>
            <button onClick={() => void save()} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: bg, border: `1.5px solid ${color}` }} />
      <span>{label}</span>
    </div>
  );
}


/* ============== MODALS ============== */

function OpenDayModal({
  dateStr, dayName, clinicId, onClose, onSaved,
}: {
  dateStr: string; dayName: string; clinicId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (start >= end) { toast.error("End time must be after start time"); return; }
    setSaving(true);
    // Upsert so any pre-existing override row for this date is replaced
    // (the table has UNIQUE (clinic_id, override_date)).
    const { error } = await supabase.from("clinic_availability").upsert({
      clinic_id: clinicId,
      override_date: dateStr,
      override_type: "open",
      start_time: `${start}:00`,
      end_time: `${end}:00`,
    }, { onConflict: "clinic_id,override_date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Day opened");
    onSaved();
  };

  const inputStyle: React.CSSProperties = {
    padding: 10, fontSize: 13, border: "1px solid #e2e6ec", borderRadius: 8,
    color: "#111", fontFamily: "inherit", width: "100%",
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 4 }}>Open this day</div>
      <div style={{ fontSize: 13, color: "#6b7785", marginBottom: 18 }}>
        {dayName} {dateStr} — normally closed. Pick the hours you'll be open.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7785", textTransform: "uppercase", marginBottom: 6 }}>From</div>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7785", textTransform: "uppercase", marginBottom: 6 }}>To</div>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
        <button onClick={() => void save()} disabled={saving}
          style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
          Open day
        </button>
      </div>
    </ModalShell>
  );
}
