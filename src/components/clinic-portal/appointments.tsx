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
import { EmptyState } from "@/components/app/EmptyState";
import { AddAppointmentModal } from "./appointment-detail";
import type { ClinicAppointment } from "@/components/ClinicPortalView";

export function AppointmentsTab({ appts, tradingHours, blockedSlots, clinicId, clinicState, isAdmin, onChange, onSelect }: {
  appts: ClinicAppointment[];
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  clinicId: string;
  clinicState: string | null;
  isAdmin: boolean;
  onChange: () => void;
  onSelect: (a: ClinicAppointment) => void;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const month = now.getMonth(), year = now.getFullYear();
  const monthAppts = appts.filter((a) => {
    const d = parseDateOnly(a.appointment_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const counts = {
    upcoming: monthAppts.filter((a) => !a.outcome && parseAppointmentDateTime(a.appointment_date, a.appointment_time) >= now).length,
    show: monthAppts.filter((a) => a.outcome === "show").length,
    proceeded: monthAppts.filter((a) => a.outcome === "proceeded").length,
    noshow: monthAppts.filter((a) => a.outcome === "noshow").length,
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Stat label="Upcoming" value={counts.upcoming} color="#2d5fa0" />
        <Stat label="Showed up" value={counts.show} color="#1a7a4a" />
        <Stat label="Booked" value={counts.proceeded} color="#6b3fa0" />
        <Stat label="No shows" value={counts.noshow} color="#b83232" />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", background: "#fff", border: "1px solid #e2e6ec", borderRadius: 8, padding: 3 }}>
          <ViewToggleBtn active={view === "list"} onClick={() => setView("list")} icon={<ListIcon size={14} />}>List</ViewToggleBtn>
          <ViewToggleBtn active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarIcon size={14} />}>Calendar</ViewToggleBtn>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{ ...navBtn, background: NAVY, color: "#fff", borderColor: NAVY, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Add appointment
          </button>
        )}
      </div>

      {view === "list" ? (
        <ListView appts={appts} onSelect={onSelect} />
      ) : (
        <CalendarView appts={appts} tradingHours={tradingHours} blockedSlots={blockedSlots} clinicState={clinicState} onSelect={onSelect} />
      )}

      {showAdd && isAdmin && (
        <AddAppointmentModal clinicId={clinicId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onChange(); }} />
      )}
    </div>
  );
}

function ViewToggleBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", border: "none",
        background: active ? NAVY : "transparent",
        color: active ? "#fff" : "#6b7785",
        fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
      }}
    >
      {icon} {children}
    </button>
  );
}

/* ---------- LIST VIEW ---------- */

function ListView({ appts, onSelect }: { appts: ClinicAppointment[]; onSelect: (a: ClinicAppointment) => void }) {
  const [tab, setTab] = useState<"upcoming" | "past" | "noshow">("upcoming");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Use local date (not UTC) so AEST/AEDT users don't see today's appts as "past".
  const todayStr = ymd(new Date());

  // Helper: start of today + helpers for grouping
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const today = startOfDay(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  // End of *this* week = upcoming Sunday (treat Mon-Sun week ending Sun).
  const dow = today.getDay(); // 0 Sun..6 Sat
  const daysToEndOfWeek = dow === 0 ? 0 : 7 - dow;
  const endOfThisWeek = new Date(today); endOfThisWeek.setDate(today.getDate() + daysToEndOfWeek);
  const endOfNextWeek = new Date(endOfThisWeek); endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);

  const now = new Date();
  const isNoShow = (a: ClinicAppointment) => a.outcome === "noshow";
  const isPastAppointment = (a: ClinicAppointment) => Boolean(a.outcome) || parseAppointmentDateTime(a.appointment_date, a.appointment_time) < now;

  // Filter by tab + search + date range first.
  const q = query.trim().toLowerCase();
  const filtered = appts.filter((a) => {
    const noShow = isNoShow(a);
    const isPast = isPastAppointment(a);
    if (tab === "upcoming" && (isPast || noShow)) return false;
    if (tab === "past" && (!isPast || noShow)) return false;
    if (tab === "noshow" && !noShow) return false;
    if (fromDate && a.appointment_date < fromDate) return false;
    if (toDate && a.appointment_date > toDate) return false;
    if (q) {
      const hay = `${a.patient_name ?? ""} ${a.patient_phone ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Sort: upcoming = ascending (soonest first), past/noshow = descending (most recent first).
  const sorted = [...filtered].sort((a, b) => {
    const cmp = a.appointment_date.localeCompare(b.appointment_date);
    if (cmp !== 0) return tab === "upcoming" ? cmp : -cmp;
    return (a.appointment_time || "").localeCompare(b.appointment_time || "");
  });

  // Group into buckets.
  type Bucket = "Today" | "Tomorrow" | "This week" | "Next week" | "Later" | "Past" | "No shows";
  const bucketOf = (appt: ClinicAppointment): Bucket => {
    if (tab === "noshow") return "No shows";
    if (tab === "past" || isPastAppointment(appt)) return "Past";
    const dateStr = appt.appointment_date;
    const d = startOfDay(parseDateOnly(dateStr));
    if (d < today) return "Past";
    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (d <= endOfThisWeek) return "This week";
    if (d <= endOfNextWeek) return "Next week";
    return "Later";
  };
  const order: Bucket[] = tab === "noshow"
    ? ["No shows"]
    : tab === "past"
    ? ["Past"]
    : ["Today", "Tomorrow", "This week", "Next week", "Later"];
  const groups = new Map<Bucket, ClinicAppointment[]>();
  for (const a of sorted) {
    const b = bucketOf(a);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(a);
  }

  const noShowCount = appts.filter(isNoShow).length;
  const upcomingCount = appts.filter((a) => !isPastAppointment(a) && !isNoShow(a)).length;
  const pastCount = appts.filter((a) => isPastAppointment(a) && !isNoShow(a)).length;

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", fontSize: 12, border: "1px solid #e2e6ec", borderRadius: 8,
    color: "#111", fontFamily: "inherit", outline: "none", background: "#fff",
  };

  return (
    <div>
      {/* Toolbar: tabs + search + date range */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "inline-flex", background: "#fff", border: "1px solid #e2e6ec", borderRadius: 8, padding: 3 }}>
          <ViewToggleBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")} icon={null}>Upcoming ({upcomingCount})</ViewToggleBtn>
          <ViewToggleBtn active={tab === "past"} onClick={() => setTab("past")} icon={null}>Past ({pastCount})</ViewToggleBtn>
          <ViewToggleBtn active={tab === "noshow"} onClick={() => setTab("noshow")} icon={null}>No shows ({noShowCount})</ViewToggleBtn>
        </div>
        <input
          type="text"
          placeholder="Search name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 200px", minWidth: 160 }}
        />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} aria-label="From date" />
          <span style={{ fontSize: 12, color: "#6b7785" }}>→</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} aria-label="To date" />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); }}
              style={{ ...inputStyle, cursor: "pointer", color: "#6b7785", padding: "7px 10px" }}
            >Clear</button>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", overflow: "hidden" }}>
        {sorted.length === 0 ? (
          appts.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No appointments yet"
              description="Patient bookings handed over to your clinic will appear here."
            />
          ) : (
            <EmptyState
              icon={CalendarIcon}
              title="No appointments match your filters"
              description="Try a different outcome filter or switch back to the full list."
            />
          )
        ) : (
          order.filter((b) => groups.has(b)).map((bucket) => {
            const rows = groups.get(bucket)!;
            return (
              <div key={bucket}>
                <div style={{
                  padding: "8px 14px", background: "#f7f9fc", borderBottom: "1px solid #e2e6ec",
                  fontSize: 11, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>{bucket}</span>
                  <span style={{ color: "#6b7785", fontWeight: 600 }}>{rows.length}</span>
                </div>
                {rows.map((a) => {
                  const c = OUTCOME_COLORS[a.outcome ?? "upcoming"];
                  const d = parseDateOnly(a.appointment_date);
                  return (
                    <button
                      key={a.id}
                      onClick={() => onSelect(a)}
                      style={{
                        display: "flex", alignItems: "center", gap: 16, padding: 14,
                        borderBottom: "1px solid #f0f2f5", width: "100%", background: "#fff",
                        border: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div style={{ background: c.bg, color: c.fg, padding: "8px 12px", borderRadius: 8, textAlign: "center", minWidth: 64 }}>
                        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{MONTHS[d.getMonth()].slice(0,3)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{a.patient_name}</div>
                        <div style={{ fontSize: 12, color: "#6b7785" }}>{fmtTime(a.appointment_time)} · {a.patient_phone || "no phone"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ background: c.bg, color: c.fg, padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 12 }}>{c.label}</span>
                        {(a.refund_status === "refunded" || a.refund_status === "refunded_manual") && (
                          <span style={{ background: "#e8f5ef", color: "#1a7a4a", padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 10 }}>
                            Deposit refunded{a.refund_status === "refunded_manual" ? " (manual)" : ""}
                          </span>
                        )}
                        {a.refund_status === "failed" && (
                          <span style={{ background: "#fdf0f0", color: "#b83232", padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 10 }}>Refund failed</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ---------- CALENDAR VIEW ---------- */

function CalendarView({ appts, tradingHours, blockedSlots, clinicState, onSelect }: {
  appts: ClinicAppointment[];
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  clinicState: string | null;
  onSelect: (a: ClinicAppointment) => void;
}) {
  const [view, setView] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const monthLabel = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
  const days = useMemo(() => buildMonthGrid(view), [view]);

  const apptsByDate = useMemo(() => {
    const map = new Map<string, ClinicAppointment[]>();
    for (const a of appts) {
      const arr = map.get(a.appointment_date) ?? [];
      arr.push(a);
      map.set(a.appointment_date, arr);
    }
    return map;
  }, [appts]);

  const todayStr = ymd(new Date());

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => setView((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })} style={navBtn}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>{monthLabel}</div>
        <button onClick={() => setView((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })} style={navBtn}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {DAY_SHORT.map((d) => (
          <div key={d} style={{ fontSize: 11, fontWeight: 600, color: "#6b7785", textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 8px" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = ymd(d);
          const summary = summarizeDay(d, tradingHours, blockedSlots, [], [], clinicState);
          const isToday = dateStr === todayStr;
          const dayAppts = apptsByDate.get(dateStr) ?? [];
          let bg = "#fff", border = "1.5px solid #e2e6ec";
          if (summary.closed || summary.allBlocked) { bg = "#fdf0f0"; border = "1.5px solid #f0b8b8"; }
          else if (summary.someBlocked) { bg = "#fef3c7"; border = "1.5px solid #d97706"; }
          if (isToday) { border = `1.5px solid ${NAVY}`; }
          return (
            <div
              key={dateStr}
              style={{
                background: bg, border, borderRadius: 10, minHeight: 82, padding: 6,
                display: "flex", flexDirection: "column", gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{d.getDate()}</span>
                {summary.closed && <span style={{ fontSize: 9, color: "#b83232", fontWeight: 600 }}>Closed</span>}
                {!summary.closed && summary.allBlocked && <span style={{ fontSize: 9, color: "#b83232", fontWeight: 600 }}>Full</span>}
                {!summary.closed && summary.someBlocked && <span style={{ fontSize: 9, color: "#b85c00", fontWeight: 600 }}>Partial</span>}
              </div>
              {dayAppts.map((a) => {
                const c = OUTCOME_COLORS[a.outcome ?? "upcoming"];
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a)}
                    style={{
                      background: c.bg, color: c.fg, fontSize: 10, padding: "3px 6px",
                      borderRadius: 4, border: "none", textAlign: "left", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer",
                    }}
                    title={`${a.patient_name} · ${fmtTime(a.appointment_time)}`}
                  >
                    {fmtTime(a.appointment_time)} {a.patient_name}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16, fontSize: 11, color: "#6b7785" }}>
        {Object.entries(OUTCOME_COLORS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: v.fg }} /> {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7785", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/* ============== AVAILABILITY TAB ============== */

