import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_TIMEZONE, sydneyTodayISO, daysUntilSydney } from "@/lib/timezone";
import { toast } from "sonner";
import { CheckCircle2, Circle, X, Phone, Mail, MoreHorizontal, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { recordClinicflowQuoteDeposit } from "@/lib/clinicflow-quotes.functions";
import { requestBoldChase } from "@/lib/clinicflow-chase.functions";
import { ClinicFlowConsult } from "@/components/ClinicFlowConsult";

const NAVY = "#1a3a6b";
const NAVY_PALE = "#edf2f9";
const GREY = "#6b7785";
const LINE = "#e2e6ec";
const GREEN = "#15803d";
const GREEN_BG = "#dcfce7";
const AMBER_BG = "#fff7ed";
const AMBER_FG = "#9a3412";
const RED = "#b91c1c";
const RED_BG = "#fee2e2";
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

type Appt = {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  appointment_date: string;
  appointment_time: string;
  intel_notes: string | null;
  created_at?: string | null;
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

const chipStyle = (bg: string, fg: string): React.CSSProperties => ({
  background: bg, color: fg, fontSize: 12, fontWeight: 600,
  padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
});
function stageChip(stage: Stage) {
  switch (stage) {
    case "Booked": return chipStyle(NAVY_PALE, NAVY);
    case "Showed": return chipStyle("#e0f2fe", "#075985");
    case "Quoted": return chipStyle(AMBER_BG, AMBER_FG);
    case "In Follow-up": return chipStyle("#fed7aa", AMBER_FG);
    case "Won": return chipStyle(GREEN_BG, GREEN);
    case "Lost": return chipStyle("#f1f5f9", GREY);
  }
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
        .select("id, patient_name, patient_phone, patient_email, appointment_date, appointment_time, intel_notes, created_at")
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
    <div style={{ padding: 24, fontFamily: FONT }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: NAVY, margin: 0 }}>Patients</h1>
        <p style={{ fontSize: 14, color: GREY, marginTop: 6 }}>
          Every HTG patient, and exactly where they're up to.
        </p>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 0", WebkitOverflowScrolling: "touch" }}>
          {(["All", ...STAGES] as const).map((s) => {
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 999,
                  border: `1px solid ${active ? NAVY : LINE}`,
                  background: active ? NAVY : "#fff",
                  color: active ? "#fff" : GREY,
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                }}
              >
                {s} <span style={{ opacity: 0.75 }}>{counts[s] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {!loading && dueTodayCount > 0 && filter !== "In Follow-up" && (
          <button
            onClick={() => setFilter("In Follow-up")}
            style={{
              width: "100%", textAlign: "left", marginBottom: 12, cursor: "pointer", fontFamily: FONT,
              background: AMBER_BG, border: "1px solid #f5c86b", borderRadius: 12, padding: "12px 14px",
              color: AMBER_FG, fontSize: 14, fontWeight: 700,
            }}
          >
            {dueTodayCount} patient{dueTodayCount === 1 ? "" : "s"} to follow up today — tap to see them
          </button>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: GREY, fontSize: 14 }}>Loading patients…</div>
        ) : visibleCount === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 40, textAlign: "center", color: GREY, fontSize: 14 }}>
            No patients yet — HTG bookings appear here automatically.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {groups.map((g) => (
              <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: g.key === "done" ? GREY : NAVY }}>
                    {g.label}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: GREY }}>{g.rows.length}</span>
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
                onClick={() => (isToday ? setConsultId(r.appt.id) : setOpenId(r.appt.id))}
                style={{
                  textAlign: "left",
                  background: "#fff",
                  border: `1px solid ${due?.overdue ? "#f5c86b" : LINE}`,
                  borderLeft: due ? `4px solid ${due.overdue ? RED : due.today ? AMBER_FG : NAVY}` : `1px solid ${LINE}`,
                  borderRadius: 12,
                  padding: 16, cursor: "pointer", fontFamily: FONT, width: "100%",
                  opacity: muted ? 0.72 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: NAVY }}>{r.appt.patient_name}</div>
                  <span style={stageChip(r.stage)}>{r.stage}</span>
                </div>
                <div style={{ fontSize: 14, color: GREY, marginTop: 6 }}>
                  {fmtWhen(r.appt.appointment_date, r.appt.appointment_time)}
                  {r.appt.patient_phone ? ` · ${r.appt.patient_phone}` : ""}
                  {r.quote ? ` · ${fmt$(r.quote.price)}` : ""}
                  {r.chase ? (
                    <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: GREY, fontSize: 11, fontWeight: 600 }}>
                      Bold chasing
                    </span>
                  ) : null}
                </div>

                {isToday && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ ...chipStyle(checkedIn ? GREEN_BG : "#eef2f7", checkedIn ? GREEN : "#334155"), display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {checkedIn ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                      {checkedIn ? "Checked in" : "Not checked in"}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setConsultId(r.appt.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); setConsultId(r.appt.id); } }}
                      style={{
                        padding: "8px 14px", borderRadius: 8, border: "none",
                        background: NAVY, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Start consult
                    </span>
                  </div>
                )}

                {bookedBadge ? (
                  <div style={{ marginTop: 10 }}>
                    <span style={chipStyle(bookedBadge.bg, bookedBadge.fg)}>{bookedBadge.text}</span>
                  </div>
                ) : due && dueDate ? (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ ...chipStyle(due.overdue ? RED_BG : AMBER_BG, due.overdue ? RED : AMBER_FG), alignSelf: "flex-start" }}>
                      {due.text}
                    </span>
                    {noteText && <span style={{ fontSize: 12, color: GREY }}>{noteText}</span>}
                  </div>
                ) : noShowBadge ? (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={chipStyle(noShowBadge.bg, noShowBadge.fg)}>{noShowBadge.text}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); void quickNoShow(r.appt.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); void quickNoShow(r.appt.id); } }}

                      style={{
                        padding: "4px 10px", borderRadius: 999, border: `1px solid ${LINE}`,
                        background: "#fff", color: NAVY, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Mark no-show
                    </span>
                  </div>
                ) : needsDate ? (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ ...chipStyle("#f1f5f9", GREY), alignSelf: "flex-start" }}>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [rsOpen, setRsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);


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

  const [fuDateState, setFuDate] = useState<string>(status?.next_followup_date ?? "");
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

  const saveFollowup = async (clear = false, dateOverride?: string) => {
    const fuDate = dateOverride ?? fuDateState;
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

  const dotColour: Record<Stage, string> = {
    Booked: "#94a3b8", Showed: "#3b82f6", Quoted: "#8b5cf6",
    "In Follow-up": "#f59e0b", Won: "#16a34a", Lost: "#dc2626",
  };

  // Split any schedule-change lines out of the notes so they can collapse.
  const noteLines = (appt.intel_notes ?? "").split("\n");
  const historyLines = noteLines.filter((l) => /reschedul|moved to|schedule change/i.test(l));
  const bodyNote = noteLines.filter((l) => !historyLines.includes(l)).join("\n").trim();

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#f6f8fb", width: "min(520px, 100%)", height: "100%", overflowY: "auto",
          fontFamily: FONT, padding: 16,
        }}
      >
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "visible" }}>
          {/* HEADER */}
          <div style={{ position: "sticky", top: 0, zIndex: 3, background: "#fff", borderBottom: `1px solid ${LINE}`, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", flex: 1, minWidth: 0 }}>{appt.patient_name}</div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#475569",
                fontSize: 12, fontWeight: 400, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColour[stage] }} />
                {stage}
              </span>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More actions"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: GREY, padding: 6, lineHeight: 0 }}
                >
                  <MoreHorizontal size={18} />
                </button>
                {menuOpen && (
                  <div style={{
                    position: "absolute", right: 0, top: 30, background: "#fff", border: `1px solid ${LINE}`,
                    borderRadius: 8, minWidth: 150, zIndex: 5, overflow: "hidden",
                  }}>
                    {stage === "Lost" && status ? (
                      <button
                        onClick={() => { setMenuOpen(false); void reopen(); }}
                        disabled={saving}
                        style={{ width: "100%", textAlign: "left", background: "#fff", border: "none", padding: "10px 14px", fontSize: 13, fontWeight: 400, color: NAVY, cursor: "pointer", fontFamily: FONT }}
                      >
                        Reopen patient
                      </button>
                    ) : (
                      <button
                        onClick={() => { setMenuOpen(false); setShowLost(true); }}
                        style={{ width: "100%", textAlign: "left", background: "#fff", border: "none", padding: "10px 14px", fontSize: 13, fontWeight: 400, color: RED, cursor: "pointer", fontFamily: FONT }}
                      >
                        Mark as lost
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button onClick={onClose} aria-label="Close"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: GREY, padding: 6, lineHeight: 0 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap", fontSize: 12, color: GREY }}>
              {appt.patient_phone && (
                <a href={`tel:${appt.patient_phone}`} style={{ color: GREY, fontWeight: 400, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                  <Phone size={12} /> {appt.patient_phone}
                </a>
              )}
              {appt.patient_email && (
                <a href={`mailto:${appt.patient_email}`} style={{ color: GREY, fontWeight: 400, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                  <Mail size={12} /> {appt.patient_email}
                </a>
              )}
            </div>
          </div>

          {/* CONSULT */}
          <Section>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", flex: 1 }}>
                {fmtDay(appt.appointment_date)} · {fmtTime(appt.appointment_time)}
              </div>
              <button
                onClick={() => setRsOpen((v) => !v)}
                style={{
                  background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: "5px 12px",
                  fontSize: 12, fontWeight: 400, color: "#111827", cursor: "pointer", fontFamily: FONT,
                }}
              >
                {rsOpen ? "Close" : "Reschedule"}
              </button>
            </div>
            {rsOpen && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={rsDate}
                  onChange={(e) => setRsDate(e.target.value)}
                  style={{ flex: "1 1 150px", height: 40, padding: "0 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13, fontFamily: FONT }}
                />
                <input
                  type="time"
                  value={rsTime}
                  onChange={(e) => setRsTime(e.target.value)}
                  style={{ flex: "1 1 110px", height: 40, padding: "0 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13, fontFamily: FONT }}
                />
                <button
                  disabled={rsSaving || !rsChanged}
                  onClick={() => void saveReschedule()}
                  style={{
                    background: "#fff", color: "#111827", border: `1px solid ${LINE}`, borderRadius: 8,
                    height: 40, padding: "0 16px", fontSize: 13, fontWeight: 500, fontFamily: FONT,
                    cursor: rsChanged ? "pointer" : "default", opacity: rsSaving || !rsChanged ? 0.5 : 1,
                  }}
                >
                  {rsSaving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </Section>

          {/* NEXT FOLLOW-UP */}
          <Section>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: GREY }}>Next follow-up</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: fuDateState ? "#111827" : GREY, marginTop: 3 }}>
                  {fuDateState ? fuLabel(fuDateState) : "None set"}
                  {fuDateState && fuNote ? <span style={{ fontWeight: 400, color: GREY }}> · {fuNote}</span> : null}
                </div>
              </div>
              <button
                onClick={() => setFuEdit((v) => !v)}
                style={{
                  background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: "5px 12px",
                  fontSize: 12, fontWeight: 400, color: "#111827", cursor: "pointer", fontFamily: FONT,
                }}
              >
                {fuEdit ? "Close" : fuDateState ? "Change" : "Set date"}
              </button>
            </div>

            {fuEdit && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {([["Tomorrow", 1], ["3 days", 3], ["1 week", 7], ["2 weeks", 14]] as const).map(([label, d]) => {
                    const val = quickDate(d);
                    const active = fuDateState === val;
                    return (
                      <button
                        key={label}
                        disabled={fuSaving}
                        onClick={() => { setFuDate(val); void saveFollowup(false, val); }}
                        style={{
                          background: active ? "#eef1f5" : "#fff", border: `1px solid ${LINE}`, color: "#111827",
                          borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 400, cursor: "pointer", fontFamily: FONT,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ position: "relative", height: 36 }}>
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
                    border: `1px solid ${LINE}`, borderRadius: 8, padding: "0 12px", fontSize: 13,
                    color: fuDateState ? "#111827" : GREY, background: "#fff", pointerEvents: "none",
                  }}>
                    <span>
                      {fuDateState
                        ? new Date(fuDateState + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: APP_TIMEZONE })
                        : "Pick a date"}
                    </span>
                    <CalendarIcon size={15} color={GREY} />
                  </div>
                  <input
                    type="date"
                    value={fuDateState}
                    min={today}
                    onChange={(e) => { setFuDate(e.target.value); if (e.target.value) void saveFollowup(false, e.target.value); }}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", fontFamily: FONT }}
                  />
                </div>
                <input
                  type="text"
                  value={fuNote}
                  placeholder="What's the follow-up about? (optional)"
                  onChange={(e) => setFuNote(e.target.value)}
                  onBlur={() => { if (fuDateState) void saveFollowup(false, fuDateState); }}
                  style={{ width: "100%", marginTop: 8, height: 36, padding: "0 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13, fontFamily: FONT }}
                />
              </div>
            )}

            {(stage === "Quoted" || stage === "In Follow-up") && (
              <div style={{ marginTop: 10, fontSize: 12, color: GREY }}>
                {row.chase ? (
                  <>Bold chasing — requested {fmtDateTime(row.chase.requested_at)}</>
                ) : (
                  <button
                    onClick={() => setChaseOpen(true)}
                    style={{ background: "transparent", border: "none", padding: 0, color: NAVY, fontSize: 12, fontWeight: 400, cursor: "pointer", textDecoration: "underline", fontFamily: FONT }}
                  >
                    Ask Bold to chase {firstName}
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* PROGRESS */}
          <Section>
            <div style={{ fontSize: 12, color: GREY, marginBottom: 10 }}>Progress</div>
            <div style={{ display: "flex", gap: 4 }}>
              {milestones.map((m) => (
                <div key={m.label} style={{ flex: 1 }} title={`${m.label} — ${m.detail ?? "Pending"}`}>
                  <div style={{ height: 3, borderRadius: 999, background: m.done ? GREEN : "#e5e9ef" }} />
                  <div style={{ fontSize: 11, color: GREY, marginTop: 6, textAlign: "center", fontWeight: 400 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* QUOTE */}
          {quote && (
            <Section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 500, color: "#111827" }}>{fmt$(quote.price)}</div>
                <div style={{ fontSize: 12, color: GREY }}>
                  {expiresIn >= 0 ? `Expires in ${expiresIn} day${expiresIn === 1 ? "" : "s"}` : `Expired ${Math.abs(expiresIn)} day${Math.abs(expiresIn) === 1 ? "" : "s"} ago`}
                </div>
              </div>
              <div style={{ fontSize: 12, color: GREY, marginTop: 6 }}>
                {quote.diagnosis ?? "—"}
                {quote.grafts ? ` · ${quote.grafts} ${quote.graft_unit === "hairs" ? "hairs" : "grafts"}` : ""}
              </div>

              {quote.deposit_recorded_at ? (
                <div style={{ fontSize: 12, color: GREY, marginTop: 12 }}>
                  Deposit of {fmt$(Number(quote.deposit_amount ?? 0))} received
                  {quote.deposit_method ? ` · ${quote.deposit_method.replace(/_/g, " ")}` : ""} · {fmtDateTime(quote.deposit_recorded_at)}
                  <div style={{ marginTop: 6 }}>
                    <button
                      onClick={() => setDepositOpen(true)}
                      style={{ background: "transparent", border: "none", padding: 0, color: NAVY, fontSize: 12, fontWeight: 400, cursor: "pointer", textDecoration: "underline", fontFamily: FONT }}
                    >
                      Edit deposit
                    </button>
                  </div>
                </div>
              ) : !depositOpen ? (
                <button
                  onClick={() => setDepositOpen(true)}
                  style={{
                    marginTop: 14, width: "100%", minHeight: 40, background: NAVY, color: "#fff", border: "none",
                    borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  Record deposit
                </button>
              ) : null}

              {depositOpen && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 400, color: GREY }}>
                    Amount (AUD)
                    <input
                      type="number"
                      min={1}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      style={{ display: "block", marginTop: 4, width: "100%", height: 40, padding: "0 12px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, color: "#111" }}
                    />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 400, color: GREY }}>
                    How was it paid?
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      style={{ display: "block", marginTop: 4, width: "100%", height: 40, padding: "0 12px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, color: "#111", background: "#fff" }}
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
                      style={{ flex: 1, minHeight: 40, background: NAVY, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT, opacity: depositSaving ? 0.6 : 1 }}
                    >
                      {depositSaving ? "Saving…" : "Save deposit"}
                    </button>
                    <button
                      onClick={() => setDepositOpen(false)}
                      disabled={depositSaving}
                      style={{ flex: 1, minHeight: 40, background: "#fff", color: "#111827", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: FONT }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <a href={`/clinic-quote/${quote.id}`} target="_blank" rel="noreferrer"
                  style={{ color: NAVY, fontSize: 12, fontWeight: 400, textDecoration: "underline" }}>
                  View quote
                </a>
                <button
                  onClick={() => {
                    if (!quoteUrl) return;
                    void navigator.clipboard.writeText(quoteUrl).then(
                      () => toast.success("Quote link copied"),
                      () => toast.error("Couldn't copy link"),
                    );
                  }}
                  style={{ background: "transparent", border: "none", padding: 0, color: NAVY, fontSize: 12, fontWeight: 400, cursor: "pointer", textDecoration: "underline", fontFamily: FONT }}>
                  Copy link
                </button>
              </div>
            </Section>
          )}

          {/* NOTES */}
          {/* ACTIVITY */}
          <Section last>
            <div style={{ fontSize: 12, color: GREY, marginBottom: 12 }}>Notes &amp; activity</div>
            {timeline.length === 0 ? (
              <div style={{ fontSize: 13, color: GREY }}>Nothing logged on this patient yet.</div>
            ) : (
              <div>
                {timeline.map((ev, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i === timeline.length - 1 ? 0 : 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: ev.tone === "bad" ? RED : ev.tone === "good" ? GREEN : "#c2cad6", flex: "none" }} />
                      {i !== timeline.length - 1 && <span style={{ width: 1, flex: 1, background: LINE, marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{ev.label}</div>
                      {ev.detail && (
                        <div style={{ fontSize: 12.5, color: "#4b5563", marginTop: 3, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ev.detail}</div>
                      )}
                      {ev.when && <div style={{ fontSize: 11.5, color: GREY, marginTop: 3 }}>{ev.when}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>


      {chaseOpen && (
        <div
          onClick={(e) => { e.stopPropagation(); setChaseOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
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
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
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

function Section({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: "16px 18px", borderBottom: last ? "none" : `1px solid ${LINE}` }}>
      {children}
    </div>
  );
}

