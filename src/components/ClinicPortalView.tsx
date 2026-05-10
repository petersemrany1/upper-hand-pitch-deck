import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ClipboardList, CalendarDays, List as ListIcon, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateSlots, summarizeDay, dayOfWeekMonFirst, ymdLocal, effectiveHoursFor,
  DAY_NAMES, DAY_SHORT,
  type TradingHours, type BlockedSlot, type Slot, type AvailabilityOverride,
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
  deposit_amount: number | null;
  stripe_payment_intent_id: string | null;
  refund_status: "refunded" | "failed" | null;
  refund_processed_at: string | null;
  stripe_refund_id: string | null;
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
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<ClinicAppointment | null>(null);
  const [clinicDefaultDeposit, setClinicDefaultDeposit] = useState<number>(75);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only show the full-screen loader on the very first fetch.
      if (refresh === 0) setLoading(true);
      const [{ data: a }, { data: th }, { data: bs }, { data: ov }, { data: pc }] = await Promise.all([
        supabase.from("clinic_appointments").select("*").eq("clinic_id", clinicId).order("appointment_date"),
        supabase.from("clinic_trading_hours").select("day_of_week, open_time, close_time, is_closed, consult_duration_mins").eq("clinic_id", clinicId),
        supabase.from("clinic_blocked_slots").select("id, slot_date, slot_start, slot_end, is_recurring, recur_day_of_week, recur_pattern, recur_days_of_week, recur_day_of_month, recur_nth_week, recur_until").eq("clinic_id", clinicId),
        supabase.from("clinic_availability").select("id, override_date, override_type, start_time, end_time").eq("clinic_id", clinicId),
        supabase.from("partner_clinics").select("consult_price_deposit").eq("id", clinicId).maybeSingle(),
      ]);
      if (cancelled) return;
      setAppts((a ?? []) as ClinicAppointment[]);
      setTradingHours((th ?? []) as TradingHours[]);
      setBlockedSlots((bs ?? []) as BlockedSlot[]);
      setOverrides((ov ?? []) as AvailabilityOverride[]);
      if (pc?.consult_price_deposit != null) setClinicDefaultDeposit(Number(pc.consult_price_deposit));
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
          overrides={overrides}
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
          clinicDefaultDeposit={clinicDefaultDeposit}
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: c.bg, color: c.fg, padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 12 }}>{c.label}</span>
              {a.refund_status === "refunded" && (
                <span style={{ background: "#e8f5ef", color: "#1a7a4a", padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 10 }}>Deposit refunded</span>
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
}

/* ---------- CALENDAR VIEW ---------- */

function CalendarView({ appts, tradingHours, blockedSlots, onSelect }: {
  appts: ClinicAppointment[];
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
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
          const summary = summarizeDay(d, tradingHours, blockedSlots, []);
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

function AppointmentDetailModal({ appt, isAdmin, onClose, onChange, clinicDefaultDeposit }: {
  appt: ClinicAppointment; isAdmin: boolean; onClose: () => void; onChange: () => void; clinicDefaultDeposit: number;
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

  const depositAmount = appt.deposit_amount ?? clinicDefaultDeposit;
  const refundDate = appt.refund_processed_at
    ? new Date(appt.refund_processed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "";

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

      {/* Refund status cards (replace outcome buttons when applicable) */}
      {appt.outcome === "show" && appt.refund_status === "refunded" && appt.stripe_refund_id && (
        <div style={{ background: "#e8f5ef", border: "1px solid #9ed4b5", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a7a4a", display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span> ${depositAmount} deposit refunded
          </div>
          <div style={{ fontSize: 11, color: "#1a7a4a", marginTop: 4 }}>
            Processed {refundDate} · Stripe ref {appt.stripe_refund_id}
          </div>
          <div style={{ fontSize: 11, color: "#6b7785", marginTop: 8 }}>Refund complete — no further action needed</div>
        </div>
      )}

      {appt.outcome === "show" && appt.refund_status === "failed" && !appt.stripe_refund_id && (
        <div style={{ background: "#fdf0f0", border: "1px solid #f0b8b8", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#b83232", marginBottom: 6 }}>Refund failed</div>
          <div style={{ fontSize: 11, color: "#b83232", marginBottom: 10 }}>The deposit refund did not go through. Try again or process it manually in Stripe.</div>
          <button onClick={() => setSummaryMode("show")} style={{ ...navBtn, fontSize: 12, padding: "6px 10px", background: "#b83232", color: "#fff", borderColor: "#b83232" }}>
            Retry refund
          </button>
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
          {appt.outcome && !appt.stripe_refund_id && (
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
          clinicDefaultDeposit={clinicDefaultDeposit}
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

type PendingRange = { startTime: string; endTime: string; alreadyBlocked: boolean };

function AvailabilityTab({ tradingHours, blockedSlots, overrides, appts, clinicId, onChange }: {
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  overrides: AvailabilityOverride[];
  appts: ClinicAppointment[];
  clinicId: string;
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
  const selectedTH = effectiveHoursFor(selectedDate, tradingHours, overrides);
  const slots: Slot[] = useMemo(
    () => generateSlots(selectedDate, tradingHours, blockedSlots, appts, overrides),
    [selectedDate, tradingHours, blockedSlots, appts, overrides],
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
            const summary = summarizeDay(date, tradingHours, blockedSlots, appts, overrides);
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

        {isClosedDay ? (
          <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24, textAlign: "center" }}>
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
          </div>
        ) : (
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

function hhmmToMinLocal(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function BlockRangeModal({
  startTime, endTime, startDate, alreadyBlocked, tradingHours, clinicId,
  onClose, onUnblock, onSaved,
}: {
  startTime: string; endTime: string; startDate: string; alreadyBlocked: boolean;
  tradingHours: TradingHours[]; clinicId: string;
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
    const filtered = dates.filter((dstr) => {
      const [yy, mm, dd] = dstr.split("-").map(Number);
      const dt = new Date(yy, mm - 1, dd);
      const dow = dayOfWeekMonFirst(dt);
      const th = tradingHours.find((t) => t.day_of_week === dow);
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

function describeRecurring(r: BlockedSlot): string {
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

type AddPattern = "daily" | "weekly" | "monthly_date" | "monthly_nth_dow";

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

function ConsultSummaryModal({ appt, onClose, onSaved, defaultProceeded = false, clinicDefaultDeposit }: { appt: ClinicAppointment; onClose: () => void; onSaved: () => void; defaultProceeded?: boolean; clinicDefaultDeposit: number }) {
  const [notes, setNotes] = useState(appt.consult_summary ?? "");
  const [proceeded, setProceeded] = useState(defaultProceeded);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const depositAmount = appt.deposit_amount ?? clinicDefaultDeposit;
  const alreadyRefunded = !!appt.stripe_refund_id;
  const noPaymentIntent = !appt.stripe_payment_intent_id;

  const submitLabel = proceeded
    ? "Save & close"
    : alreadyRefunded
      ? "Save & close"
      : noPaymentIntent
        ? "Save & close"
        : `Save & refund $${depositAmount}`;

  const save = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const { processConsultOutcome } = await import("@/utils/consult-outcome.functions");
      const result = await processConsultOutcome({
        data: {
          appointmentId: appt.id,
          summary: notes,
          proceeded,
        },
      });
      if (!result.success) {
        setErrorMsg(`Refund failed — ${result.error}. Please try again or contact Upper Hand.`);
        setSaving(false);
        // Outcome may still have been saved; surface that via a soft toast.
        if ("outcomeSaved" in result && result.outcomeSaved) {
          toast.success("Outcome saved (refund failed)");
          onSaved();
        }
        return;
      }
      toast.success(result.refunded ? `Refunded $${depositAmount}` : "Saved");
      setSaving(false);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(`Refund failed — ${msg}. Please try again or contact Upper Hand.`);
      setSaving(false);
    }
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
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111", marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={proceeded} onChange={(e) => setProceeded(e.target.checked)} />
        The patient booked their procedure today
      </label>

      {proceeded ? (
        <div style={{ background: "#f0f2f5", border: "1px solid #e2e6ec", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#6b7785" }}>Deposit applied to procedure cost — no refund needed</div>
        </div>
      ) : alreadyRefunded ? (
        <div style={{ background: "#e8f5ef", border: "1px solid #9ed4b5", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1a7a4a" }}>Deposit already refunded</div>
          <div style={{ fontSize: 11, color: "#1a7a4a", marginTop: 4 }}>Stripe ref {appt.stripe_refund_id}</div>
        </div>
      ) : noPaymentIntent ? (
        <div style={{ background: "#fef3c7", border: "1px solid #d97706", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>Deposit refund</div>
          <div style={{ fontSize: 11, color: "#92400e" }}>No card on file — process refund manually in Stripe</div>
        </div>
      ) : (
        <div style={{ background: "#fef3c7", border: "1px solid #d97706", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>Deposit refund</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#92400e", marginTop: 2 }}>${depositAmount}</div>
          <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>Will be refunded to the patient's card on submit</div>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "#fdf0f0", border: "1px solid #f0b8b8", color: "#b83232", borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
      {/* Reference for unused-prop linter */}
      
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
    const { error } = await supabase.from("clinic_availability").insert({
      clinic_id: clinicId,
      override_date: dateStr,
      override_type: "open",
      start_time: `${start}:00`,
      end_time: `${end}:00`,
    });
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
