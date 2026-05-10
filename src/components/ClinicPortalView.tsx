import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ClipboardList, CalendarDays, List as ListIcon, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateSlots, summarizeDay, dayOfWeekMonFirst, ymdLocal,
  DAY_NAMES, DAY_SHORT,
  type TradingHours, type BlockedSlot, type Slot,
} from "@/lib/slot-generation";

export type ClinicAppointment = {
  id: string;
  clinic_id: string;
  lead_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string;
  intel_notes: string | null;
  outcome: "show" | "noshow" | "proceeded" | null;
  consult_summary: string | null;
};

const NAVY = "#1a3a6b";
const NAVY_PALE = "#edf2f9";

const OUTCOME_COLORS: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  upcoming: { bg: "#edf2f9", fg: "#2d5fa0", border: "#cfdcef", label: "Upcoming" },
  show: { bg: "#e8f5ef", fg: "#1a7a4a", border: "#9ed4b5", label: "Showed up" },
  noshow: { bg: "#fdf0f0", fg: "#b83232", border: "#f0b8b8", label: "No show" },
  proceeded: { bg: "#f3eefa", fg: "#6b3fa0", border: "#d6c5ec", label: "Booked procedure" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ymd(d: Date) { return ymdLocal(d); }

function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${min}${ampm}`;
}

export function ClinicPortalView({
  clinicId,
  clinicName,
  isAdmin = false,
}: {
  clinicId: string;
  clinicName: string;
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<"appointments" | "availability">("appointments");
  const [appts, setAppts] = useState<ClinicAppointment[]>([]);
  const [tradingHours, setTradingHours] = useState<TradingHours[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<ClinicAppointment | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: th }, { data: bs }] = await Promise.all([
        supabase.from("clinic_appointments").select("*").eq("clinic_id", clinicId).order("appointment_date"),
        supabase.from("clinic_trading_hours").select("day_of_week, open_time, close_time, is_closed, consult_duration_mins").eq("clinic_id", clinicId),
        supabase.from("clinic_blocked_slots").select("id, slot_date, slot_start, slot_end, is_recurring, recur_day_of_week").eq("clinic_id", clinicId),
      ]);
      if (cancelled) return;
      setAppts((a ?? []) as ClinicAppointment[]);
      setTradingHours((th ?? []) as TradingHours[]);
      setBlockedSlots((bs ?? []) as BlockedSlot[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId, refresh]);

  const reload = () => setRefresh((n) => n + 1);

  useEffect(() => {
    if (selected) {
      const fresh = appts.find((a) => a.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
  }, [appts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e6ec" }}>
        <div style={{ display: "flex", gap: 0, padding: "0 24px" }}>
          <TabBtn active={tab === "appointments"} onClick={() => setTab("appointments")} icon={<ClipboardList size={16} />}>Appointments</TabBtn>
          <TabBtn active={tab === "availability"} onClick={() => setTab("availability")} icon={<CalendarDays size={16} />}>Availability</TabBtn>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: "#6b7785", fontSize: 14 }}>Loading…</div>
      ) : tab === "appointments" ? (
        <AppointmentsTab
          appts={appts}
          tradingHours={tradingHours}
          blockedSlots={blockedSlots}
          clinicId={clinicId}
          isAdmin={isAdmin}
          onChange={reload}
          onSelect={setSelected}
        />
      ) : (
        <AvailabilityTab
          tradingHours={tradingHours}
          blockedSlots={blockedSlots}
          appts={appts}
          clinicId={clinicId}
          onChange={reload}
        />
      )}

      <div style={{ padding: 16, textAlign: "center", color: "#9aa5b1", fontSize: 11 }}>
        {clinicName} · Clinic Partner Portal
      </div>

      {selected && (
        <AppointmentDetailModal
          appt={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onChange={() => { reload(); }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "16px 20px",
        background: "transparent",
        color: active ? NAVY : "#6b7785",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        borderBottom: active ? `2px solid ${NAVY}` : "2px solid transparent",
        cursor: "pointer",
      }}
    >
      {icon} {children}
    </button>
  );
}

/* ============== APPOINTMENTS TAB (List + Calendar views) ============== */

function AppointmentsTab({ appts, tradingHours, blockedSlots, clinicId, isAdmin, onChange, onSelect }: {
  appts: ClinicAppointment[];
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  clinicId: string;
  isAdmin: boolean;
  onChange: () => void;
  onSelect: (a: ClinicAppointment) => void;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const month = now.getMonth(), year = now.getFullYear();
  const monthAppts = appts.filter((a) => {
    const d = new Date(a.appointment_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const counts = {
    upcoming: monthAppts.filter((a) => !a.outcome).length,
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
        <CalendarView appts={appts} tradingHours={tradingHours} blockedSlots={blockedSlots} onSelect={onSelect} />
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
  const sorted = [...appts].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", overflow: "hidden" }}>
      {sorted.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7785" }}>No appointments yet.</div>
      ) : sorted.map((a) => {
        const c = OUTCOME_COLORS[a.outcome ?? "upcoming"];
        const d = new Date(a.appointment_date);
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
            <span style={{ background: c.bg, color: c.fg, padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 12 }}>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- CALENDAR VIEW ---------- */

function CalendarView({ appts, avails, onSelect }: {
  appts: ClinicAppointment[]; avails: ClinicAvailability[]; onSelect: (a: ClinicAppointment) => void;
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

  const availByDate = useMemo(() => {
    const m = new Map<string, ClinicAvailability[]>();
    for (const a of avails) {
      const arr = m.get(a.override_date) ?? [];
      arr.push(a);
      m.set(a.override_date, arr);
    }
    return m;
  }, [avails]);

  const todayStr = ymd(new Date());

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => setView((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })} style={navBtn}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>{monthLabel}</div>
        <button onClick={() => setView((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })} style={navBtn}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} style={{ fontSize: 11, fontWeight: 600, color: "#6b7785", textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 8px" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = ymd(d);
          const dayAvails = availByDate.get(dateStr) ?? [];
          const { fullDay, blockedSlots } = bucketBlocksForDate(dateStr, dayAvails);
          const partialBlocks = !fullDay && blockedSlots.size > 0;
          const hasOpenOverride = dayAvails.some((a) => a.override_type === "open");
          const isToday = dateStr === todayStr;
          const dayAppts = apptsByDate.get(dateStr) ?? [];
          let bg = "#fff", border = "1.5px solid #e2e6ec";
          if (fullDay) { bg = "#fdf0f0"; border = "1.5px solid #f0b8b8"; }
          else if (hasOpenOverride) { bg = "#e8f5ef"; border = "1.5px solid #9ed4b5"; }
          else if (isToday) { bg = NAVY_PALE; border = `1.5px solid ${NAVY}`; }
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
                {fullDay && <span style={{ fontSize: 9, color: "#b83232", fontWeight: 600 }}>Closed</span>}
                {!fullDay && partialBlocks && <span style={{ fontSize: 9, color: "#b85c00", fontWeight: 600 }}>{blockedSlots.size} blocked</span>}
                {!fullDay && hasOpenOverride && <span style={{ fontSize: 9, color: "#1a7a4a", fontWeight: 600 }}>Open</span>}
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

const navBtn: React.CSSProperties = {
  background: "#fff", border: "1px solid #e2e6ec", borderRadius: 6, padding: "8px 14px",
  fontSize: 14, color: "#111", cursor: "pointer",
};


function buildMonthGrid(monthStart: Date): (Date | null)[] {
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

/* ============== UNIFIED APPOINTMENT DETAIL MODAL ============== */

function AppointmentDetailModal({ appt, isAdmin, onClose, onChange }: {
  appt: ClinicAppointment; isAdmin: boolean; onClose: () => void; onChange: () => void;
}) {
  const [summaryMode, setSummaryMode] = useState<null | "show" | "proceeded">(null);
  const c = OUTCOME_COLORS[appt.outcome ?? "upcoming"];

  const setOutcome = async (outcome: "noshow" | "proceeded") => {
    const { error } = await supabase.from("clinic_appointments").update({ outcome }).eq("id", appt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Outcome saved");
    onChange();
    onClose();
  };

  const resetOutcome = async () => {
    const { error } = await supabase.from("clinic_appointments").update({ outcome: null, consult_summary: null }).eq("id", appt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Outcome reset");
    onChange();
  };

  const deleteAppt = async () => {
    if (!confirm("Delete this appointment?")) return;
    const { error } = await supabase.from("clinic_appointments").delete().eq("id", appt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment deleted");
    onChange();
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 4 }}>{appt.patient_name}</div>
      <div style={{ fontSize: 12, color: "#6b7785", marginBottom: 8 }}>
        {new Date(appt.appointment_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(appt.appointment_time)}
      </div>
      {appt.patient_phone && (
        <a href={`tel:${appt.patient_phone}`} style={{ fontSize: 13, color: NAVY, fontWeight: 500, display: "block", marginBottom: 10 }}>{appt.patient_phone}</a>
      )}
      <div style={{
        display: "inline-block", padding: "3px 10px", fontSize: 11, fontWeight: 600,
        background: c.bg, color: c.fg, borderRadius: 12, marginBottom: 14,
      }}>{c.label}</div>

      {appt.intel_notes && (
        <div style={{ background: NAVY_PALE, padding: 12, borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Patient Intel</div>
          <div style={{ fontSize: 12, color: "#111", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{appt.intel_notes}</div>
        </div>
      )}

      {appt.consult_summary && (
        <div style={{ background: NAVY_PALE, padding: 12, borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Consult summary</div>
          <div style={{ fontSize: 12, color: "#111", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{appt.consult_summary}</div>
        </div>
      )}

      {!appt.outcome && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => setSummaryMode("show")} style={outcomeBtn("#1a7a4a", "#e8f5ef")}>✅ They showed up</button>
          <button onClick={() => setSummaryMode("proceeded")} style={outcomeBtn("#6b3fa0", "#f3eefa")}>⭐ They booked the procedure!</button>
          <button onClick={() => setOutcome("noshow")} style={outcomeBtn("#b83232", "#fdf0f0")}>❌ No show</button>
        </div>
      )}

      {(appt.outcome || isAdmin) && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e2e6ec", display: "flex", flexDirection: "column", gap: 8 }}>
          {appt.outcome && (
            <button onClick={resetOutcome} style={{ ...navBtn, fontSize: 12, padding: "6px 10px" }}>Reset outcome</button>
          )}
          {isAdmin && (
            <button onClick={deleteAppt} style={{ ...navBtn, fontSize: 12, padding: "6px 10px", color: "#b83232", borderColor: "#f0b8b8" }}>Delete appointment</button>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Close</button>
      </div>

      {summaryMode && (
        <ConsultSummaryModal
          appt={appt}
          defaultProceeded={summaryMode === "proceeded"}
          onClose={() => setSummaryMode(null)}
          onSaved={() => { setSummaryMode(null); onChange(); onClose(); }}
        />
      )}
    </ModalShell>
  );
}

function outcomeBtn(color: string, bg: string): React.CSSProperties {
  return {
    background: bg, color, border: `1px solid ${color}33`, padding: "10px 12px",
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
  };
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7785", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/* ============== AVAILABILITY TAB ============== */

function AvailabilityTab({ avails, clinicId, onChange }: { avails: ClinicAvailability[]; clinicId: string; onChange: () => void }) {
  const todayStr = ymd(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const month = viewMonth.getMonth(), year = viewMonth.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstWeekday + 6) % 7; // shift so Mon=0

  const dayBuckets = useMemo(() => {
    const m = new Map<string, { fullDay: boolean; blockedSlots: Set<string>; openOverride: boolean }>();
    const dates = new Set(avails.map((a) => a.override_date));
    for (const d of dates) {
      const list = avails.filter((a) => a.override_date === d);
      const { fullDay, blockedSlots } = bucketBlocksForDate(d, list);
      m.set(d, { fullDay, blockedSlots, openOverride: list.some((a) => a.override_type === "open") });
    }
    return m;
  }, [avails]);

  const selectedAvails = useMemo(() => avails.filter((a) => a.override_date === selectedDate), [avails, selectedDate]);
  const selectedBucket = useMemo(() => bucketBlocksForDate(selectedDate, selectedAvails), [selectedDate, selectedAvails]);

  const fullDayRow = selectedAvails.find((a) => a.override_type === "blocked" && !a.start_time && !a.end_time) ?? null;

  const toggleSlot = async (slotStart: string, slotEnd: string) => {
    if (selectedBucket.fullDay) {
      toast.error("Whole day is blocked — un-block it first to edit individual slots.");
      return;
    }
    // Find a row that exactly covers this slot
    const existing = selectedAvails.find((a) => a.override_type === "blocked" && a.start_time === slotStart && a.end_time === slotEnd);
    if (existing) {
      await supabase.from("clinic_availability").delete().eq("id", existing.id);
    } else {
      // Check if slot is inside a wider blocked range — if so, we need to split that range
      const wider = selectedAvails.find((a) => a.override_type === "blocked" && a.start_time && a.end_time && hhmmToMin(a.start_time) <= hhmmToMin(slotStart) && hhmmToMin(a.end_time) >= hhmmToMin(slotEnd));
      if (wider) {
        // Split wider into [start..slotStart] and [slotEnd..end]
        const ws = wider.start_time!, we = wider.end_time!;
        await supabase.from("clinic_availability").delete().eq("id", wider.id);
        if (hhmmToMin(ws) < hhmmToMin(slotStart)) {
          await supabase.from("clinic_availability").insert({ clinic_id: clinicId, override_date: selectedDate, override_type: "blocked", start_time: ws, end_time: slotStart });
        }
        if (hhmmToMin(slotEnd) < hhmmToMin(we)) {
          await supabase.from("clinic_availability").insert({ clinic_id: clinicId, override_date: selectedDate, override_type: "blocked", start_time: slotEnd, end_time: we });
        }
      } else {
        await supabase.from("clinic_availability").insert({ clinic_id: clinicId, override_date: selectedDate, override_type: "blocked", start_time: slotStart, end_time: slotEnd });
      }
    }
    onChange();
  };

  const toggleFullDay = async () => {
    if (fullDayRow) {
      await supabase.from("clinic_availability").delete().eq("id", fullDayRow.id);
    } else {
      // Clear any partial blocks first so we don't double-store
      const partials = selectedAvails.filter((a) => a.override_type === "blocked" && (a.start_time || a.end_time));
      if (partials.length) {
        await supabase.from("clinic_availability").delete().in("id", partials.map((p) => p.id));
      }
      await supabase.from("clinic_availability").insert({ clinic_id: clinicId, override_date: selectedDate, override_type: "blocked", start_time: null, end_time: null });
    }
    onChange();
  };

  const clearAllForDay = async () => {
    const ids = selectedAvails.map((a) => a.id);
    if (!ids.length) return;
    await supabase.from("clinic_availability").delete().in("id", ids);
    onChange();
  };

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
      {/* LEFT — month picker */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setViewMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })} style={navBtn}>‹</button>
          <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{MONTHS[month]} {year}</div>
          <button onClick={() => setViewMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })} style={navBtn}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, color: "#6b7785", textAlign: "center", padding: 2 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: offset }, (_, i) => <div key={`o${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const date = ymd(new Date(year, month, day));
            const b = dayBuckets.get(date);
            const isSelected = date === selectedDate;
            const isToday = date === todayStr;
            let bg = "#f7f8fa", color = "#111", border = "1px solid transparent";
            if (b?.fullDay) { bg = "#fdf0f0"; color = "#b83232"; border = "1px solid #f0b8b8"; }
            else if (b && b.blockedSlots.size > 0) { bg = "#fff4e6"; color = "#b85c00"; border = "1px solid #f0c896"; }
            else if (b?.openOverride) { bg = "#e8f5ef"; color = "#1a7a4a"; border = "1px solid #9ed4b5"; }
            if (isSelected) { border = `2px solid ${NAVY}`; }
            else if (isToday) { border = `1.5px solid ${NAVY}`; }
            return (
              <button key={day} onClick={() => setSelectedDate(date)}
                style={{ background: bg, color, border, padding: "8px 0", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {day}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14, fontSize: 10, color: "#6b7785", display: "flex", flexDirection: "column", gap: 4 }}>
          <LegendDot color="#b83232" bg="#fdf0f0" label="Closed all day" />
          <LegendDot color="#b85c00" bg="#fff4e6" label="Some times blocked" />
          <LegendDot color="#1a7a4a" bg="#e8f5ef" label="One-off open day" />
        </div>
      </div>

      {/* RIGHT — slot editor for selected day */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e6ec", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7785", textTransform: "uppercase", letterSpacing: 0.5 }}>Editing</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>{formatPrettyDate(selectedDate)}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => void toggleFullDay()}
              style={{ background: selectedBucket.fullDay ? "#b83232" : "#fdf0f0", color: selectedBucket.fullDay ? "#fff" : "#b83232",
                border: "1px solid #f0b8b8", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {selectedBucket.fullDay ? "Closed all day ✓" : "Close whole day"}
            </button>
            {selectedAvails.length > 0 && (
              <button onClick={() => void clearAllForDay()} style={{ ...navBtn, fontSize: 12, padding: "6px 10px" }}>Clear</button>
            )}
          </div>
        </div>

        {selectedBucket.fullDay ? (
          <div style={{ background: "#fdf0f0", border: "1px solid #f0b8b8", borderRadius: 8, padding: 16, fontSize: 13, color: "#b83232", textAlign: "center" }}>
            Clinic is closed all day. No appointments will be booked for this date.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "#6b7785", marginBottom: 8 }}>
              Tap any 15-min slot to block it. Blocked slots are hidden from sales reps when booking.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
              {ALL_SLOTS.map((s) => {
                const isBlocked = selectedBucket.blockedSlots.has(s.start);
                return (
                  <button key={s.start} onClick={() => void toggleSlot(s.start, s.end)}
                    style={{
                      background: isBlocked ? "#fdf0f0" : "#f7f8fa",
                      color: isBlocked ? "#b83232" : "#111",
                      border: isBlocked ? "1px solid #f0b8b8" : "1px solid #e2e6ec",
                      borderRadius: 6, padding: "8px 4px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      textDecoration: isBlocked ? "line-through" : "none",
                    }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
            {selectedBucket.blockedSlots.size > 0 && (
              <div style={{ marginTop: 12, fontSize: 11, color: "#b85c00", fontWeight: 600 }}>
                {selectedBucket.blockedSlots.size} × 15-min slot{selectedBucket.blockedSlots.size === 1 ? "" : "s"} blocked
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 18, background: NAVY_PALE, padding: 12, borderRadius: 8, fontSize: 11, color: "#111", lineHeight: 1.5 }}>
          <strong style={{ color: NAVY }}>How this works —</strong> Hours run 8am–9pm in 15-minute slots.
          Block any slots the clinic can't take patients (lunch, doctor away, surgery time, etc.).
          Sales reps can't book patients into blocked times. Changes save instantly.
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${color}55` }} />
      <span>{label}</span>
    </div>
  );
}

function formatPrettyDate(ymdStr: string) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()];
  return `${wd} ${d} ${MONTHS[m - 1]} ${y}`;
}


/* ============== MODALS ============== */

function ConsultSummaryModal({ appt, onClose, onSaved, defaultProceeded = false }: { appt: ClinicAppointment; onClose: () => void; onSaved: () => void; defaultProceeded?: boolean }) {
  const [notes, setNotes] = useState("");
  const [proceeded, setProceeded] = useState(defaultProceeded);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("clinic_appointments").update({
      outcome: proceeded ? "proceeded" : "show",
      consult_summary: notes.trim() || null,
    }).eq("id", appt.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    onSaved();
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 4 }}>How did the consult go?</div>
      <div style={{ fontSize: 12, color: "#6b7785", marginBottom: 14 }}>{appt.patient_name} · {fmtTime(appt.appointment_time)}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7785", textTransform: "uppercase", marginBottom: 6 }}>Notes from today</div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What was discussed? How did the patient seem? Any follow-up needed?"
        rows={5}
        style={{ width: "100%", padding: 10, fontSize: 13, border: "1px solid #e2e6ec", borderRadius: 8, resize: "vertical", outline: "none", marginBottom: 12, color: "#111" }}
        className="clinic-consult-textarea"
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111", marginBottom: 18, cursor: "pointer" }}>
        <input type="checkbox" checked={proceeded} onChange={(e) => setProceeded(e.target.checked)} />
        The patient booked their procedure today
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
          Save & Close
        </button>
      </div>
    </ModalShell>
  );
}

function AddAppointmentModal({ clinicId, onClose, onSaved }: { clinicId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !date || !time) { toast.error("Patient name, date and time required"); return; }
    setSaving(true);
    const { error } = await supabase.from("clinic_appointments").insert({
      clinic_id: clinicId,
      patient_name: name.trim(),
      patient_phone: phone.trim() || null,
      appointment_date: date,
      appointment_time: time,
      intel_notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment added");
    onSaved();
  };

  const inp: React.CSSProperties = { width: "100%", padding: 10, fontSize: 13, border: "1px solid #e2e6ec", borderRadius: 8, outline: "none", marginBottom: 12 };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 14 }}>Add appointment</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" style={inp} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={inp} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inp} />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Intel notes (visible to clinic)" rows={3} style={{ ...inp, resize: "vertical" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
          Save
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {children}
      </div>
    </div>
  );
}
