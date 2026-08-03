import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_TIMEZONE, sydneyTodayISO, daysUntilSydney } from "@/lib/timezone";
import { toast } from "sonner";
import { CheckCircle2, Circle, X, Phone, Mail, ExternalLink, Copy, BadgeDollarSign, CalendarDays, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { recordClinicflowQuoteDeposit } from "@/lib/clinicflow-quotes.functions";
import { requestBoldChase } from "@/lib/clinicflow-chase.functions";
import { ClinicFlowConsult } from "@/components/ClinicFlowConsult";

const NAVY = "#1a3a6b";
const NAVY_PALE = "#edf2f9";
const GREY = "#8A9099";
const TEXT = "#374151";
const LINE = "#E6E8EB";
const PAGE_BG = "#FAFAFA";
const CHIP_BG = "#F3F4F6";
const CHIP_FG = "#4B5563";
const GREEN = "#10B981";
const GREEN_BG = CHIP_BG;
const AMBER_BG = CHIP_BG;
const AMBER_FG = CHIP_FG;
const RED = "#EF4444";
const RED_BG = CHIP_BG;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "0.06em", color: GREY,
};
const btnBase: React.CSSProperties = {
  minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 6, borderRadius: 8, padding: "0 14px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: FONT, boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = { ...btnBase, background: NAVY, color: "#fff", border: `1px solid ${NAVY}` };
const btnGhost: React.CSSProperties = { ...btnBase, background: "#fff", color: TEXT, border: `1px solid ${LINE}` };

const INPUT_CSS = `
.cf-input::-webkit-calendar-picker-indicator{opacity:0;position:absolute;right:0;top:0;width:34px;height:34px;cursor:pointer}
.cf-input::-webkit-inner-spin-button,.cf-input::-webkit-clear-button{display:none}
.cf-input:focus{outline:none;border-color:#C9CDD3}
.cf-card:hover{border-color:#C9CDD3}
`;

function Field({ type, value, onChange, min, icon, flex }: {
  type: "date" | "time"; value: string; onChange: (v: string) => void;
  min?: string; icon: React.ReactNode; flex?: string;
}) {
  return (
    <div style={{ position: "relative", flex: flex ?? "1 1 150px" }}>
      <input
        className="cf-input"
        type={type}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", height: 36, boxSizing: "border-box", padding: "0 32px 0 10px",
          border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, fontFamily: FONT,
          color: TEXT, background: "#fff", appearance: "none", WebkitAppearance: "none",
        }}
      />
      <span style={{ position: "absolute", right: 9, top: 9, color: GREY, pointerEvents: "none", display: "flex" }}>
        {icon}
      </span>
    </div>
  );
}

type Appt = {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  appointment_date: string;
  appointment_time: string;
  intel_notes: string | null;
};

type Intake = {
  id: string;
  appointment_id: string;
  status: string;
  completed_at: string | null;
  medications: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  previous_treatments: string | null;
  wellbeing_review: boolean;
};

type Quote = {
  id: string;
  appointment_id: string;
  status: string;
  price: number;
  deposit_amount: number | null;
  diagnosis: string | null;
  norwood: string | null;
  grafts: number | null;
  graft_unit: string | null;
  valid_until: string;
  booked_date: string | null;
  deposit_method: string | null;
  deposit_recorded_at: string | null;
  created_at: string;
};

type PipelineStatus = {
  id: string;
  appointment_id: string;
  lost_reason: string | null;
  lost_note: string | null;
  lost_at: string | null;
  next_followup_date: string | null;
  next_followup_note: string | null;
};


type Stage = "Booked" | "Showed" | "Quoted" | "In Follow-up" | "Won" | "Lost";
const STAGES: Stage[] = ["Booked", "Showed", "Quoted", "In Follow-up", "Won", "Lost"];

const LOST_REASONS: { value: string; label: string }[] = [
  { value: "no_show", label: "Didn't show up" },
  { value: "no_money", label: "No money right now" },
  { value: "decision_maker_absent", label: "Decision-maker wasn't there" },
  { value: "went_elsewhere", label: "Went with another clinic" },
  { value: "not_suitable", label: "Not suitable for treatment" },
  { value: "other", label: "Other" },
];
const reasonLabel = (v: string | null) => LOST_REASONS.find((r) => r.value === v)?.label ?? "Other";

function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${min}${ampm}`;
}
function fmtDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short", timeZone: APP_TIMEZONE,
  });
}
/** "Today 10:30am" / "Tomorrow 9:00am", else the full day + time. */
function fmtWhen(date: string, time: string) {
  const days = daysUntilSydney(date);
  if (days === 0) return `Today ${fmtTime(time)}`;
  if (days === 1) return `Tomorrow ${fmtTime(time)}`;
  return `${fmtDay(date)} ${fmtTime(time)}`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE });
}
function fmt$(n: number | null | undefined) {
  return typeof n === "number" ? "$" + Math.round(n).toLocaleString() : "";
}

const chipStyle = (_bg?: string, _fg?: string): React.CSSProperties => ({
  background: CHIP_BG, color: CHIP_FG, fontSize: 12, fontWeight: 600,
  padding: "4px 9px", borderRadius: 6, whiteSpace: "nowrap",
  display: "inline-flex", alignItems: "center", gap: 6,
});

const STAGE_DOT: Record<Stage, string> = {
  "Booked": "#6B7280",
  "Showed": "#3B82F6",
  "Quoted": "#8B5CF6",
  "In Follow-up": "#F59E0B",
  "Won": "#10B981",
  "Lost": "#EF4444",
};

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span style={chipStyle()}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: STAGE_DOT[stage], flexShrink: 0 }} />
      {stage}
    </span>
  );
}

type Badge = { text: string; bg: string; fg: string };
type Followup = { id: string; quote_id: string; due_date: string; task_type: string; status: string };
type Chase = { id: string; appointment_id: string; note: string | null; requested_at: string; status: string };
type Row = {
  appt: Appt;
  intake: Intake | null;
  quote: Quote | null;
  status: PipelineStatus | null;
  stage: Stage;
  badges: Badge[];
  followup: Followup | null;
  chase: Chase | null;
};

const TASK_LABEL: Record<string, string> = {
  checkin: "Check in — any questions, which way are they leaning?",
  nudge: "Nudge — send timeline photos or recovery FAQ",
  expiring: "Quote expiring — offer to hold a date",
};

/** Human wording for a follow-up due date, in Sydney time. */
function dueLabel(due: string): { text: string; overdue: boolean; today: boolean } {
  const days = daysUntilSydney(due);
  if (days < 0) return { text: `Follow up overdue — ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, overdue: true, today: false };
  if (days === 0) return { text: "Follow up today", overdue: false, today: true };
  if (days === 1) return { text: "Follow up tomorrow", overdue: false, today: false };
  return { text: `Follow up ${fmtDay(due)}`, overdue: false, today: false };
}

/** The date this patient should be chased: the manually set one wins, then the auto task. */
function nextFollowupDate(row: Row): string | null {
  return row.status?.next_followup_date ?? row.followup?.due_date ?? null;
}
function nextFollowupNote(row: Row): string | null {
  if (row.status?.next_followup_date) return row.status.next_followup_note ?? null;
  if (row.followup) return TASK_LABEL[row.followup.task_type] ?? row.followup.task_type;
  return null;
}



function computeRow(appt: Appt, intake: Intake | null, quote: Quote | null, status: PipelineStatus | null, followup: Followup | null, chase: Chase | null, today: string): Row {
  const badges: Badge[] = [];
  const base = { appt, intake, quote, status, followup, chase };


  if (status?.lost_at) return { ...base, stage: "Lost", badges };

  if (quote) {
    const expired = quote.status === "expired" || quote.valid_until < today;
    if (quote.status === "deposit_recorded") return { ...base, stage: "Won", badges };
    if (quote.status === "booked") {
      badges.push({
        text: `Date booked — collect deposit${quote.booked_date ? ` · ${fmtDay(quote.booked_date)}` : ""}`,
        bg: GREEN_BG, fg: GREEN,
      });
      return { ...base, stage: "In Follow-up", badges };
    }
    if (quote.status === "presented" || quote.status === "expired") {
      const quotedToday = quote.created_at.slice(0, 10) === today
        || new Date(quote.created_at).toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE }) === today;
      if (expired) badges.push({ text: "Quote expired", bg: RED_BG, fg: RED });
      if (quotedToday) return { ...base, stage: "Quoted", badges };
      const days = Math.abs(daysUntilSydney(new Date(quote.created_at).toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE })));
      badges.push({ text: `${days} days since quoted`, bg: AMBER_BG, fg: AMBER_FG });
      return { ...base, stage: "In Follow-up", badges };
    }
    if (quote.status === "draft") {
      badges.push({ text: "Consult in progress", bg: NAVY_PALE, fg: NAVY });
      return { ...base, stage: "Showed", badges };
    }
  }

  if (intake && intake.status === "completed") return { ...base, stage: "Showed", badges };

  if (appt.appointment_date < today) badges.push({ text: "Didn't attend?", bg: AMBER_BG, fg: AMBER_FG });
  return { ...base, stage: "Booked", badges };
}


export function ClinicFlowPatients({ clinicId }: { clinicId: string }) {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [intakes, setIntakes] = useState<Record<string, Intake>>({});
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [statuses, setStatuses] = useState<Record<string, PipelineStatus>>({});
  const [followups, setFollowups] = useState<Record<string, Followup>>({});
  const [chases, setChases] = useState<Record<string, Chase>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | Stage>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [noShowId, setNoShowId] = useState<string | null>(null);
  const [consultId, setConsultId] = useState<string | null>(null);


  const today = useMemo(() => sydneyTodayISO(), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, i, q, p, f, c] = await Promise.all([
      supabase
        .from("clinic_appointments")
        .select("id, patient_name, patient_phone, patient_email, appointment_date, appointment_time, intel_notes")
        .eq("clinic_id", clinicId)
        .order("appointment_date", { ascending: false })

        .order("appointment_time", { ascending: true }),
      supabase.from("clinicflow_intakes").select("*").eq("clinic_id", clinicId),
      supabase.from("clinicflow_quotes").select("*").eq("clinic_id", clinicId),
      supabase.from("clinicflow_pipeline_status").select("*").eq("clinic_id", clinicId),
      supabase
        .from("clinicflow_followups")
        .select("id, quote_id, due_date, task_type, status")
        .eq("clinic_id", clinicId)
        .eq("status", "open")
        .order("due_date", { ascending: true }),
      supabase
        .from("clinicflow_chase_requests")
        .select("id, appointment_id, note, requested_at, status")
        .eq("clinic_id", clinicId)
        .eq("status", "requested")
        .order("requested_at", { ascending: false }),
    ]);
    for (const r of [a, i, q, p, f, c]) if (r.error) toast.error(r.error.message);

    setAppts((a.data ?? []) as Appt[]);

    const im: Record<string, Intake> = {};
    for (const row of (i.data ?? []) as Intake[]) im[row.appointment_id] = row;
    setIntakes(im);

    const qm: Record<string, Quote> = {};
    for (const row of (q.data ?? []) as Quote[]) {
      const prev = qm[row.appointment_id];
      if (!prev || row.created_at > prev.created_at) qm[row.appointment_id] = row;
    }
    setQuotes(qm);

    const pm: Record<string, PipelineStatus> = {};
    for (const row of (p.data ?? []) as PipelineStatus[]) pm[row.appointment_id] = row;
    setStatuses(pm);

    // earliest open follow-up per quote
    const fm: Record<string, Followup> = {};
    for (const row of (f.data ?? []) as Followup[]) {
      const prev = fm[row.quote_id];
      if (!prev || row.due_date < prev.due_date) fm[row.quote_id] = row;
    }
    setFollowups(fm);

    // latest open chase request per appointment
    const cm: Record<string, Chase> = {};
    for (const row of (c.data ?? []) as Chase[]) {
      if (!cm[row.appointment_id]) cm[row.appointment_id] = row;
    }
    setChases(cm);

    setLoading(false);
  }, [clinicId]);

  useEffect(() => { void load(); }, [load]);

  const quickNoShow = useCallback(async (apptId: string) => {
    const { error } = await supabase
      .from("clinicflow_pipeline_status")
      .upsert({
        clinic_id: clinicId,
        appointment_id: apptId,
        lost_reason: "no_show",
        lost_note: null,
        lost_at: new Date().toISOString(),
      }, { onConflict: "appointment_id" });
    if (error) { toast.error(error.message); return; }
    void load();
    toast.success("Marked as no-show", {
      action: {
        label: "Undo",
        onClick: () => {
          void (async () => {
            const { error: undoErr } = await supabase
              .from("clinicflow_pipeline_status")
              .upsert({
                clinic_id: clinicId,
                appointment_id: apptId,
                lost_reason: null,
                lost_note: null,
                lost_at: null,
              }, { onConflict: "appointment_id" });
            if (undoErr) { toast.error(undoErr.message); return; }
            toast.success("No-show undone");
            void load();
          })();
        },
      },
    });
  }, [clinicId, load]);


  const rows = useMemo(
    () => appts.map((a) => {
      const quote = quotes[a.id] ?? null;
      return computeRow(
        a,
        intakes[a.id] ?? null,
        quote,
        statuses[a.id] ?? null,
        quote ? followups[quote.id] ?? null : null,
        chases[a.id] ?? null,
        today,
      );
    }),

    [appts, intakes, quotes, statuses, followups, chases, today],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const s of STAGES) c[s] = 0;
    for (const r of rows) c[r.stage] += 1;
    return c;
  }, [rows]);

  const dueTodayCount = useMemo(
    () => rows.filter((r) => {
      if (r.stage === "Lost" || r.stage === "Won") return false;
      const d = nextFollowupDate(r);
      return !!d && daysUntilSydney(d) <= 0;
    }).length,
    [rows],
  );

  const groups = useMemo(() => {
    const list = filter === "All" ? rows : rows.filter((r) => r.stage === filter);
    const todayG: Row[] = [], action: Row[] = [], coming: Row[] = [], play: Row[] = [], done: Row[] = [];

    for (const r of list) {
      const d = r.appt.appointment_date;
      if (d === today && r.stage !== "Won" && r.stage !== "Lost") { todayG.push(r); continue; }
      if (r.stage === "Won" || r.stage === "Lost") { done.push(r); continue; }
      const due = nextFollowupDate(r);
      const hasDeposit = r.badges.some((b) => b.text.startsWith("Date booked"));
      const overdueOrToday = !!due && daysUntilSydney(due) <= 0;
      const missedVisit = r.stage === "Booked" && d < today;
      if (hasDeposit || overdueOrToday || missedVisit) { action.push(r); continue; }
      if (d > today) { coming.push(r); continue; }
      play.push(r);
    }

    const byDate = (x: Row, y: Row) => {
      const kx = `${x.appt.appointment_date} ${x.appt.appointment_time}`;
      const ky = `${y.appt.appointment_date} ${y.appt.appointment_time}`;
      return kx < ky ? -1 : kx > ky ? 1 : 0;
    };
    const byFollowup = (x: Row, y: Row) => {
      const dx = nextFollowupDate(x) ?? "9999-12-31";
      const dy = nextFollowupDate(y) ?? "9999-12-31";
      return dx < dy ? -1 : dx > dy ? 1 : 0;
    };
    const urgency = (r: Row) => (r.badges.some((b) => b.text.startsWith("Date booked")) ? 0 : 1);

    todayG.sort((x, y) => (x.appt.appointment_time < y.appt.appointment_time ? -1 : x.appt.appointment_time > y.appt.appointment_time ? 1 : 0));
    action.sort((x, y) => urgency(x) - urgency(y) || byFollowup(x, y) || byDate(x, y));
    coming.sort(byDate);
    play.sort(byFollowup);
    done.sort((x, y) => -byDate(x, y));

    return [
      { key: "today", label: "Today", rows: todayG },
      { key: "action", label: "Needs action", rows: action },
      { key: "coming", label: "Coming up", rows: coming },
      { key: "play", label: "In play", rows: play },
      { key: "done", label: "Done", rows: done },
    ].filter((g) => g.rows.length > 0);
  }, [rows, filter, today]);

  const visibleCount = useMemo(() => groups.reduce((n, g) => n + g.rows.length, 0), [groups]);

  const open = openId ? rows.find((r) => r.appt.id === openId) ?? null : null;
  const consult = consultId ? rows.find((r) => r.appt.id === consultId) ?? null : null;

  if (consult) {
    return (
      <ClinicFlowConsult
        clinicId={clinicId}
        appointmentId={consult.appt.id}
        onBack={() => { setConsultId(null); void load(); }}
      />
    );
  }


  return (
    <div style={{ padding: 24, fontFamily: FONT, background: PAGE_BG, minHeight: "100%" }}>
      <style>{INPUT_CSS}</style>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#111827", margin: 0, letterSpacing: "-0.01em" }}>Patients</h1>
        <p style={{ fontSize: 13, color: GREY, marginTop: 6 }}>
          Every HTG patient, and exactly where they're up to.
        </p>

        <div style={{ display: "flex", gap: 20, overflowX: "auto", margin: "20px 0 24px", borderBottom: `1px solid ${LINE}`, WebkitOverflowScrolling: "touch" }}>
          {(["All", ...STAGES] as const).map((s) => {
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  flexShrink: 0, padding: "0 0 9px", background: "transparent",
                  border: "none", borderBottom: `2px solid ${active ? NAVY : "transparent"}`,
                  marginBottom: -1,
                  color: active ? "#111827" : GREY,
                  fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: FONT,
                }}
              >
                {s} <span style={{ color: GREY, fontWeight: 400, marginLeft: 4 }}>{counts[s] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {!loading && dueTodayCount > 0 && filter !== "In Follow-up" && (
          <button
            onClick={() => setFilter("In Follow-up")}
            style={{
              width: "100%", textAlign: "left", marginBottom: 16, cursor: "pointer", fontFamily: FONT,
              background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: "12px 16px",
              color: TEXT, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#F59E0B", flexShrink: 0 }} />
            {dueTodayCount} patient{dueTodayCount === 1 ? "" : "s"} to follow up today — tap to see them
          </button>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: GREY, fontSize: 13 }}>Loading patients…</div>
        ) : visibleCount === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 40, textAlign: "center", color: GREY, fontSize: 13 }}>
            No patients yet — HTG bookings appear here automatically.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {groups.map((g) => (
              <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={LABEL_STYLE}>{g.label}</div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: GREY }}>{g.rows.length}</span>
                </div>


                {g.rows.map((r) => {
              const isToday = g.key === "today";
              const muted = g.key === "done";
              const active = r.stage !== "Lost" && r.stage !== "Won";
              const dueDate = active ? nextFollowupDate(r) : null;
              const due = dueDate ? dueLabel(dueDate) : null;
              const noteText = dueDate ? nextFollowupNote(r) : null;
              const needsDate = active && !dueDate && (r.stage === "In Follow-up" || r.stage === "Quoted");
              const bookedBadge = r.badges.find((b) => b.text.startsWith("Date booked")) ?? null;
              const noShowBadge = r.badges.find((b) => b.text === "Didn't attend?") ?? null;
              const checkedIn = r.intake?.status === "completed";
              return (

              <button
                key={r.appt.id}
                className="cf-card"
                onClick={() => (isToday ? setConsultId(r.appt.id) : setOpenId(r.appt.id))}
                style={{
                  textAlign: "left",
                  background: "#fff",
                  border: `1px solid ${LINE}`,
                  borderLeft: openId === r.appt.id ? `2px solid ${NAVY}` : `1px solid ${LINE}`,
                  borderRadius: 8,
                  padding: 16, cursor: "pointer", fontFamily: FONT, width: "100%",
                  opacity: muted ? 0.72 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{r.appt.patient_name}</div>
                  <StageBadge stage={r.stage} />
                </div>
                <div style={{ fontSize: 13, color: GREY, marginTop: 6 }}>
                  {fmtWhen(r.appt.appointment_date, r.appt.appointment_time)}
                  {r.appt.patient_phone ? ` · ${r.appt.patient_phone}` : ""}
                  {r.quote ? ` · ${fmt$(r.quote.price)}` : ""}
                  {r.chase ? (
                    <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: CHIP_BG, color: GREY, fontSize: 11, fontWeight: 500 }}>
                      Bold chasing
                    </span>
                  ) : null}
                </div>

                {isToday && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={chipStyle()}>
                      {checkedIn ? <CheckCircle2 size={13} color={GREEN} /> : <Circle size={13} color={GREY} />}
                      {checkedIn ? "Checked in" : "Not checked in"}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setConsultId(r.appt.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); setConsultId(r.appt.id); } }}
                      style={btnPrimary}
                    >
                      Start consult
                    </span>
                  </div>
                )}

                {bookedBadge ? (
                  <div style={{ marginTop: 12 }}>
                    <span style={chipStyle()}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN, flexShrink: 0 }} />
                      {bookedBadge.text}
                    </span>
                  </div>
                ) : due && dueDate ? (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ ...chipStyle(), alignSelf: "flex-start" }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: due.overdue ? RED : "#F59E0B", flexShrink: 0 }} />
                      {due.text}
                    </span>
                    {noteText && <span style={{ fontSize: 12, color: GREY }}>{noteText}</span>}
                  </div>
                ) : noShowBadge ? (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={chipStyle()}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: RED, flexShrink: 0 }} />
                      {noShowBadge.text}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); void quickNoShow(r.appt.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); void quickNoShow(r.appt.id); } }}
                      style={btnGhost}
                    >
                      Mark no-show
                    </span>
                  </div>
                ) : needsDate ? (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ ...chipStyle(), alignSelf: "flex-start" }}>
                      No follow-up date set — tap to set one
                    </span>
                  </div>
                ) : null}


              </button>
              );
                })}
              </div>
            ))}
          </div>
        )}

      </div>

      {open && (
        <PatientDrawer
          row={open}
          onClose={() => { setOpenId(null); setNoShowId(null); }}
          onChanged={() => { void load(); }}
          clinicId={clinicId}
          today={today}
          initialNoShow={noShowId === open.appt.id}
        />
      )}

    </div>
  );
}

function PatientDrawer({ row, onClose, onChanged, clinicId, today, initialNoShow = false }: {
  row: Row; onClose: () => void; onChanged: () => void; clinicId: string; today: string; initialNoShow?: boolean;
}) {
  const [showLost, setShowLost] = useState(initialNoShow);
  const [reason, setReason] = useState<string | null>(initialNoShow ? "no_show" : null);

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { appt, intake, quote, status, stage } = row;
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>(String(quote?.deposit_amount ?? 1000));
  const [depositMethod, setDepositMethod] = useState("card_machine");
  const [depositSaving, setDepositSaving] = useState(false);
  const recordDepositFn = useServerFn(recordClinicflowQuoteDeposit);

  const drawerDueDate = stage === "Lost" || stage === "Won" ? null : nextFollowupDate(row);
  const drawerDue = drawerDueDate ? dueLabel(drawerDueDate) : null;

  const [fuDate, setFuDate] = useState<string>(status?.next_followup_date ?? "");
  const [fuNote, setFuNote] = useState<string>(status?.next_followup_note ?? "");
  const [fuSaving, setFuSaving] = useState(false);

  // ---- Reschedule the consult appointment ----
  const to24 = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return "";
    const pm = /pm/i.test(t);
    let h = parseInt(m[1], 10);
    if (pm && h < 12) h += 12;
    if (/am/i.test(t) && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m[2]}`;
  };
  const [rsDate, setRsDate] = useState<string>(appt.appointment_date);
  const [rsTime, setRsTime] = useState<string>(to24(appt.appointment_time));
  const [rsSaving, setRsSaving] = useState(false);
  const rsChanged = rsDate !== appt.appointment_date || rsTime !== to24(appt.appointment_time);

  const saveReschedule = async () => {
    if (!rsDate || !rsTime) { toast.error("Pick a date and time"); return; }
    setRsSaving(true);
    const { error } = await supabase
      .from("clinic_appointments")
      .update({ appointment_date: rsDate, appointment_time: rsTime })
      .eq("id", appt.id);
    setRsSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Moved to ${fmtDay(rsDate)} at ${fmtTime(rsTime)}`);
    onChanged();
  };

  const saveFollowup = async (clear = false) => {
    if (!clear && !fuDate) { toast.error("Pick a date first"); return; }
    setFuSaving(true);
    const { error } = await supabase
      .from("clinicflow_pipeline_status")
      .upsert({
        clinic_id: clinicId,
        appointment_id: appt.id,
        next_followup_date: clear ? null : fuDate,
        next_followup_note: clear ? null : (fuNote.trim() || null),
      }, { onConflict: "appointment_id" });

    // Keep the Follow-ups screen, sidebar badge and due-today chip in sync:
    // one active follow-up task per patient at a time.
    if (!error && quote) {
      const { error: skipError } = await supabase
        .from("clinicflow_followups")
        .update({ status: "skipped" })
        .eq("quote_id", quote.id)
        .eq("status", "open");
      if (skipError) console.error("skip followups failed", skipError.message);
      if (!clear) {
        const { error: insError } = await supabase
          .from("clinicflow_followups")
          .insert({
            clinic_id: clinicId,
            quote_id: quote.id,
            patient_name: appt.patient_name,
            due_date: fuDate,
            task_type: "custom",
          });
        if (insError) console.error("insert followup failed", insError.message);
      }
    }

    setFuSaving(false);
    if (error) { toast.error(error.message); return; }
    if (clear) { setFuDate(""); setFuNote(""); }
    toast.success(clear ? "Follow-up date cleared" : `Follow-up set for ${fmtDay(fuDate)}`);
    onChanged();
  };

  const [chaseOpen, setChaseOpen] = useState(false);
  const [chaseNote, setChaseNote] = useState("");
  const [chaseSaving, setChaseSaving] = useState(false);
  const requestChaseFn = useServerFn(requestBoldChase);

  const submitChase = async () => {
    setChaseSaving(true);
    try {
      await requestChaseFn({
        data: {
          clinicId,
          appointmentId: appt.id,
          quoteId: quote?.id ?? null,
          patientName: appt.patient_name,
          patientPhone: appt.patient_phone,
          note: chaseNote.trim() || null,
        },
      });
      setChaseOpen(false);
      setChaseNote("");
      toast.success("Bold's on it");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the chase request");
    } finally {
      setChaseSaving(false);
    }
  };


  const quickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
  };


  const saveDeposit = async () => {
    if (!quote) return;
    const amt = Number(depositAmount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Enter a deposit amount"); return; }
    setDepositSaving(true);
    try {
      await recordDepositFn({ data: { quoteId: quote.id, depositAmount: amt, method: depositMethod } });
      toast.success("Deposit recorded");
      setDepositOpen(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record the deposit");
    }
    setDepositSaving(false);
  };
  const firstName = appt.patient_name.split(" ")[0] || "this patient";

  const markLost = async () => {
    if (!reason) { toast.error("Pick a reason first"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("clinicflow_pipeline_status")
      .upsert({
        clinic_id: clinicId,
        appointment_id: appt.id,
        lost_reason: reason,
        lost_note: note.trim() || null,
        lost_at: new Date().toISOString(),
      }, { onConflict: "appointment_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as lost");
    setShowLost(false);
    setReason(null);
    setNote("");
    onChanged();
  };

  const reopen = async () => {
    if (!status) return;
    setSaving(true);
    const { error } = await supabase
      .from("clinicflow_pipeline_status")
      .update({ lost_at: null, lost_reason: null, lost_note: null })
      .eq("id", status.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Patient reopened");
    onChanged();
  };

  const quoteUrl = quote ? `${typeof window !== "undefined" ? window.location.origin : ""}/clinic-quote/${quote.id}` : null;

  const milestones: { label: string; detail: string | null; done: boolean }[] = [
    { label: "Booked", detail: `${fmtDay(appt.appointment_date)} · ${fmtTime(appt.appointment_time)}`, done: true },
    { label: "Checked in", detail: intake?.completed_at ? fmtDateTime(intake.completed_at) : null, done: !!intake?.completed_at },
    { label: "Quoted", detail: quote ? `${fmtDateTime(quote.created_at)} · ${fmt$(quote.price)}` : null, done: !!quote },
    { label: "Date booked", detail: quote?.booked_date ? fmtDay(quote.booked_date) : null, done: !!quote?.booked_date },
    {
      label: "Deposit",
      detail: quote?.deposit_recorded_at ? `${fmtDateTime(quote.deposit_recorded_at)}${quote.deposit_method ? ` · ${quote.deposit_method}` : ""}` : null,
      done: !!quote?.deposit_recorded_at,
    },
  ];

  const expiresIn = quote ? daysUntilSydney(quote.valid_until) : 0;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", width: "min(520px, 100%)", height: "100%", overflowY: "auto",
          fontFamily: FONT, borderLeft: `1px solid ${LINE}`,
        }}
      >
        <style>{INPUT_CSS}</style>

        {/* Sticky header */}
        <div style={{ background: "#fff", borderBottom: `1px solid ${LINE}`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {appt.patient_name}
            </div>
            <StageBadge stage={stage} />
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: GREY, padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "0 20px 24px" }}>
          {/* Contact */}
          <Section>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
              {appt.patient_phone && (
                <a href={`tel:${appt.patient_phone}`} style={{ color: NAVY, fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <Phone size={14} /> {appt.patient_phone}
                </a>
              )}
              {appt.patient_email && (
                <a href={`mailto:${appt.patient_email}`} style={{ color: NAVY, fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <Mail size={14} /> {appt.patient_email}
                </a>
              )}
            </div>
            {drawerDue && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={chipStyle()}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: drawerDue.overdue ? RED : "#F59E0B", flexShrink: 0 }} />
                  {drawerDue.text} · {fmtDay(drawerDueDate!)}
                </span>
                {nextFollowupNote(row) && <span style={{ fontSize: 12, color: GREY }}>{nextFollowupNote(row)}</span>}
              </div>
            )}
          </Section>

          {/* Consult appointment */}
          <Section title="Consult appointment">
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 }}>
              {fmtDay(appt.appointment_date)} · {fmtTime(appt.appointment_time)}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Field type="date" value={rsDate} onChange={setRsDate} icon={<CalendarDays size={14} />} />
              <Field type="time" value={rsTime} onChange={setRsTime} icon={<Clock size={14} />} flex="1 1 110px" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                disabled={rsSaving || !rsChanged}
                onClick={() => void saveReschedule()}
                style={{ ...btnPrimary, cursor: rsChanged ? "pointer" : "default", opacity: rsSaving || !rsChanged ? 0.5 : 1 }}
              >
                {rsSaving ? "Saving…" : "Reschedule"}
              </button>
              {rsChanged && (
                <button
                  onClick={() => { setRsDate(appt.appointment_date); setRsTime(to24(appt.appointment_time)); }}
                  style={btnGhost}
                >
                  Cancel
                </button>
              )}
            </div>
          </Section>

          {/* Next follow-up */}
          <Section title="Next follow-up">
            {status?.next_followup_date ? (
              <div style={{ fontSize: 13, color: "#111827", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={chipStyle()}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: drawerDue?.overdue ? RED : "#F59E0B", flexShrink: 0 }} />
                  {fmtDay(status.next_followup_date)} — {drawerDue?.text}
                </span>
                {status.next_followup_note ? (
                  <span style={{ fontSize: 12, color: GREY }}>{status.next_followup_note}</span>
                ) : null}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: GREY, marginBottom: 12 }}>
                No follow-up date set for {firstName}. Pick a date so it shows on their card.
              </div>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7], ["In 2 weeks", 14]].map(([label, d]) => (
                <button
                  key={label as string}
                  onClick={() => setFuDate(quickDate(d as number))}
                  style={{
                    height: 28, background: "#fff", border: `1px solid ${LINE}`, color: TEXT, borderRadius: 6,
                    padding: "0 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  {label as string}
                </button>
              ))}
            </div>

            <Field type="date" value={fuDate} min={today} onChange={setFuDate} icon={<CalendarDays size={14} />} flex="1 1 100%" />
            <input
              type="text"
              value={fuNote}
              placeholder="What's the follow-up about? (optional)"
              onChange={(e) => setFuNote(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 8, height: 36, padding: "0 10px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13, fontFamily: FONT, color: TEXT }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                disabled={fuSaving}
                onClick={() => void saveFollowup(false)}
                style={{ ...btnPrimary, opacity: fuSaving ? 0.6 : 1 }}
              >
                {status?.next_followup_date ? "Update follow-up date" : "Set follow-up date"}
              </button>
              {status?.next_followup_date && (
                <button disabled={fuSaving} onClick={() => void saveFollowup(true)} style={btnGhost}>
                  Clear
                </button>
              )}
            </div>
          </Section>

          {(stage === "Quoted" || stage === "In Follow-up") && (
            <Section title="Need a hand?">
              {row.chase ? (
                <div>
                  <span style={chipStyle()}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: NAVY, flexShrink: 0 }} />
                    Bold chasing
                  </span>
                  <div style={{ fontSize: 13, color: GREY, marginTop: 8 }}>
                    Requested {fmtDateTime(row.chase.requested_at)}
                    {row.chase.note ? ` — ${row.chase.note}` : ""}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: GREY, marginBottom: 10 }}>
                    Bold can call {firstName} for you and report back.
                  </div>
                  <button onClick={() => setChaseOpen(true)} style={btnPrimary}>
                    Ask Bold to chase
                  </button>
                </>
              )}
            </Section>
          )}

          {/* Timeline */}
          <Section title="Timeline">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {milestones.map((m) => (
                <div key={m.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ marginTop: 1, color: m.done ? NAVY : "#D1D5DB" }}>
                    {m.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: m.done ? "#111827" : GREY }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: GREY, marginTop: 2 }}>{m.detail ?? "Pending"}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {quote && (
            <Section title="Quote">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>{fmt$(quote.price)}</div>
                <span style={chipStyle()}>{quote.status.replace(/_/g, " ")}</span>
              </div>
              <div style={{ fontSize: 13, color: GREY, marginTop: 8, lineHeight: 1.6 }}>
                {quote.diagnosis ?? "—"}
                {quote.grafts ? ` · ${quote.grafts} ${quote.graft_unit === "hairs" ? "hairs" : "grafts"}` : ""}
                <br />
                Valid until {fmtDay(quote.valid_until)}
                <br />
                {expiresIn >= 0 ? `Expires in ${expiresIn} day${expiresIn === 1 ? "" : "s"}` : `Expired ${Math.abs(expiresIn)} day${Math.abs(expiresIn) === 1 ? "" : "s"} ago`}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <a href={`/clinic-quote/${quote.id}`} target="_blank" rel="noreferrer"
                  style={{ ...btnGhost, textDecoration: "none" }}>
                  <ExternalLink size={14} /> View quote page
                </a>
                <button
                  onClick={() => {
                    if (!quoteUrl) return;
                    void navigator.clipboard.writeText(quoteUrl).then(
                      () => toast.success("Quote link copied"),
                      () => toast.error("Couldn't copy link"),
                    );
                  }}
                  style={btnGhost}>
                  <Copy size={14} /> Copy link
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                {quote.deposit_recorded_at ? (
                  <div style={{ fontSize: 13, color: "#111827" }}>
                    <span style={chipStyle()}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN, flexShrink: 0 }} />
                      Deposit of {fmt$(Number(quote.deposit_amount ?? 0))} received
                      {quote.deposit_method ? ` · ${quote.deposit_method.replace(/_/g, " ")}` : ""}
                    </span>
                    <div style={{ color: GREY, fontSize: 12, marginTop: 6 }}>{fmtDateTime(quote.deposit_recorded_at)}</div>
                    <button
                      onClick={() => setDepositOpen(true)}
                      style={{ marginTop: 8, background: "transparent", border: "none", color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: FONT }}
                    >
                      Edit deposit
                    </button>
                  </div>
                ) : !depositOpen ? (
                  <button onClick={() => setDepositOpen(true)} style={btnPrimary}>
                    <BadgeDollarSign size={15} /> Record deposit taken in clinic
                  </button>
                ) : null}

                {depositOpen && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ ...LABEL_STYLE }}>
                      Amount (AUD)
                      <input
                        type="number"
                        min={1}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        style={{ display: "block", marginTop: 6, width: "100%", boxSizing: "border-box", height: 36, padding: "0 10px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, color: TEXT }}
                      />
                    </label>
                    <label style={{ ...LABEL_STYLE }}>
                      How was it paid?
                      <select
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value)}
                        style={{ display: "block", marginTop: 6, width: "100%", boxSizing: "border-box", height: 36, padding: "0 10px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, color: TEXT, background: "#fff" }}
                      >
                        <option value="card_machine">Clinic card machine (EFTPOS)</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => void saveDeposit()}
                        disabled={depositSaving}
                        style={{ ...btnPrimary, opacity: depositSaving ? 0.6 : 1 }}
                      >
                        {depositSaving ? "Saving…" : "Save deposit"}
                      </button>
                      <button onClick={() => setDepositOpen(false)} disabled={depositSaving} style={btnGhost}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Notes */}
          <Section title="Phone notes">
            <PhoneNotes text={appt.intel_notes} />
          </Section>

          {stage === "Lost" && status ? (
            <Section>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
                Lost — {reasonLabel(status.lost_reason)}
                {status.lost_at ? ` · ${fmtDateTime(status.lost_at)}` : ""}
              </div>
              {status.lost_note && (
                <div style={{ fontSize: 13, color: GREY, marginTop: 6, whiteSpace: "pre-wrap" }}>{status.lost_note}</div>
              )}
              <button onClick={() => void reopen()} disabled={saving}
                style={{ marginTop: 12, background: "transparent", border: "none", color: NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: FONT }}>
                Reopen
              </button>
            </Section>
          ) : (
            <div style={{ paddingTop: 20 }}>
              <button onClick={() => setShowLost(true)}
                style={{ background: "transparent", color: RED, border: "none", padding: 0, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT, textDecoration: "underline" }}>
                Mark as Lost
              </button>
            </div>
          )}
        </div>
      </div>


      {chaseOpen && (
        <div
          onClick={(e) => { e.stopPropagation(); setChaseOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, padding: 20, width: "min(420px, 100%)", fontFamily: FONT }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>Want Bold to chase {firstName} for you?</div>
            <textarea
              value={chaseNote}
              onChange={(e) => setChaseNote(e.target.value)}
              placeholder="Anything Bold should know? (optional)"
              rows={3}
              style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 14, fontFamily: FONT, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setChaseOpen(false)}
                style={{ background: "#fff", color: GREY, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                Cancel
              </button>
              <button onClick={() => void submitChase()} disabled={chaseSaving}
                style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: chaseSaving ? "default" : "pointer", opacity: chaseSaving ? 0.7 : 1, fontFamily: FONT }}>
                {chaseSaving ? "Sending…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}


      {showLost && (
        <div
          onClick={(e) => { e.stopPropagation(); setShowLost(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, padding: 20, width: "min(460px, 100%)", maxHeight: "90vh", overflowY: "auto", fontFamily: FONT }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>Why didn't {firstName} go ahead?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {LOST_REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <button key={r.value} onClick={() => setReason(r.value)}
                    style={{
                      textAlign: "left", padding: "14px 16px", borderRadius: 10,
                      border: `1px solid ${active ? NAVY : LINE}`,
                      background: active ? NAVY_PALE : "#fff",
                      color: active ? NAVY : "#1f2937",
                      fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                    }}>
                    {r.label}
                  </button>
                );
              })}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" rows={3}
              style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 14, fontFamily: FONT, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLost(false)}
                style={{ background: "#fff", color: GREY, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                Cancel
              </button>
              <button onClick={() => void markLost()} disabled={saving}
                style={{ background: RED, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT }}>
                Confirm — mark as lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid ${LINE}`, padding: "20px 0" }}>
      {title ? <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>{title}</div> : null}
      {children}
    </div>
  );
}

function PhoneNotes({ text }: { text: string | null }) {
  const [showHistory, setShowHistory] = useState(false);
  const lines = (text ?? "").split("\n");
  const history = lines.filter((l) => /^\s*—\s*Rescheduled/i.test(l));
  const note = lines.filter((l) => !/^\s*—\s*Rescheduled/i.test(l)).join("\n").trim();

  return (
    <div>
      <div style={{ fontSize: 13, color: note ? "#1f2937" : GREY, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        {note || "No phone notes on this patient."}
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowHistory((v) => !v)}
            style={{ background: "transparent", border: "none", padding: 0, color: GREY, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT }}
          >
            {showHistory ? "Hide" : "Show"} {history.length} schedule change{history.length === 1 ? "" : "s"}
          </button>
          {showHistory && (
            <div style={{ marginTop: 8, fontSize: 12, color: GREY, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {history.join("\n")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
