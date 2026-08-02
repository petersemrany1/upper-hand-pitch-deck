import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_TIMEZONE, sydneyTodayISO, daysUntilSydney } from "@/lib/timezone";
import { toast } from "sonner";
import { CheckCircle2, Circle, X, Phone, Mail, AlertTriangle, ExternalLink, Copy, BadgeDollarSign } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { recordClinicflowQuoteDeposit } from "@/lib/clinicflow-quotes.functions";

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
type Row = {
  appt: Appt;
  intake: Intake | null;
  quote: Quote | null;
  status: PipelineStatus | null;
  stage: Stage;
  badges: Badge[];
  followup: Followup | null;
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

function computeRow(appt: Appt, intake: Intake | null, quote: Quote | null, status: PipelineStatus | null, followup: Followup | null, today: string): Row {
  const badges: Badge[] = [];
  const base = { appt, intake, quote, status, followup };

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | Stage>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const today = useMemo(() => sydneyTodayISO(), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, i, q, p, f] = await Promise.all([
      supabase
        .from("clinic_appointments")
        .select("id, patient_name, patient_phone, patient_email, appointment_date, appointment_time, intel_notes")
        .eq("clinic_id", clinicId)
        .not("patient_name", "ilike", "%test%")
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
    ]);
    for (const r of [a, i, q, p, f]) if (r.error) toast.error(r.error.message);

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

    setLoading(false);
  }, [clinicId]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(
    () => appts.map((a) => {
      const quote = quotes[a.id] ?? null;
      return computeRow(
        a,
        intakes[a.id] ?? null,
        quote,
        statuses[a.id] ?? null,
        quote ? followups[quote.id] ?? null : null,
        today,
      );
    }),
    [appts, intakes, quotes, statuses, followups, today],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const s of STAGES) c[s] = 0;
    for (const r of rows) c[r.stage] += 1;
    return c;
  }, [rows]);

  const dueTodayCount = useMemo(
    () => rows.filter((r) => r.stage === "In Follow-up" && r.followup && daysUntilSydney(r.followup.due_date) <= 0).length,
    [rows],
  );

  const visible = useMemo(() => {
    const list = filter === "All" ? rows : rows.filter((r) => r.stage === filter);
    if (filter !== "In Follow-up") return list;
    // soonest / most overdue first, patients with no scheduled task last
    return [...list].sort((x, y) => {
      const dx = x.followup?.due_date ?? "9999-12-31";
      const dy = y.followup?.due_date ?? "9999-12-31";
      return dx < dy ? -1 : dx > dy ? 1 : 0;
    });
  }, [rows, filter]);

  const open = openId ? rows.find((r) => r.appt.id === openId) ?? null : null;

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
        ) : visible.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 40, textAlign: "center", color: GREY, fontSize: 14 }}>
            No patients yet — HTG bookings appear here automatically.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map((r) => {
              const due = r.stage === "In Follow-up" && r.followup ? dueLabel(r.followup.due_date) : null;
              return (
              <button
                key={r.appt.id}
                onClick={() => setOpenId(r.appt.id)}
                style={{
                  textAlign: "left",
                  background: "#fff",
                  border: `1px solid ${due?.overdue ? "#f5c86b" : LINE}`,
                  borderLeft: due ? `4px solid ${due.overdue ? RED : due.today ? AMBER_FG : NAVY}` : `1px solid ${LINE}`,
                  borderRadius: 12,
                  padding: 16, cursor: "pointer", fontFamily: FONT, width: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: NAVY }}>{r.appt.patient_name}</div>
                  <span style={stageChip(r.stage)}>{r.stage}</span>
                </div>
                <div style={{ fontSize: 14, color: GREY, marginTop: 6 }}>
                  {fmtDay(r.appt.appointment_date)} {fmtTime(r.appt.appointment_time)}
                  {r.appt.patient_phone ? ` · ${r.appt.patient_phone}` : ""}
                  {r.quote ? ` · ${fmt$(r.quote.price)}` : ""}
                </div>
                {due && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ ...chipStyle(due.overdue ? RED_BG : AMBER_BG, due.overdue ? RED : AMBER_FG), alignSelf: "flex-start" }}>
                      {due.text}
                    </span>
                    <span style={{ fontSize: 12, color: GREY }}>
                      {TASK_LABEL[r.followup!.task_type] ?? r.followup!.task_type}
                    </span>
                  </div>
                )}
                {r.badges.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {r.badges.map((b, idx) => (
                      <span key={idx} style={chipStyle(b.bg, b.fg)}>{b.text}</span>
                    ))}
                  </div>
                )}
              </button>
              );
            })}

          </div>
        )}
      </div>

      {open && (
        <PatientDrawer
          row={open}
          onClose={() => setOpenId(null)}
          onChanged={() => { void load(); }}
          clinicId={clinicId}
          today={today}
        />
      )}
    </div>
  );
}

function PatientDrawer({ row, onClose, onChanged, clinicId, today }: {
  row: Row; onClose: () => void; onChanged: () => void; clinicId: string; today: string;
}) {
  const [showLost, setShowLost] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { appt, intake, quote, status, stage } = row;
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>(String(quote?.deposit_amount ?? 1000));
  const [depositMethod, setDepositMethod] = useState("card_machine");
  const [depositSaving, setDepositSaving] = useState(false);
  const recordDepositFn = useServerFn(recordClinicflowQuoteDeposit);

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
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#f6f8fb", width: "min(520px, 100%)", height: "100%", overflowY: "auto",
          fontFamily: FONT, boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ background: "#fff", borderBottom: `1px solid ${LINE}`, padding: 20, position: "sticky", top: 0, zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{appt.patient_name}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={stageChip(stage)}>{stage}</span>
                {row.followup && (() => {
                  const d = dueLabel(row.followup.due_date);
                  return <span style={chipStyle(d.overdue ? RED_BG : AMBER_BG, d.overdue ? RED : AMBER_FG)}>{d.text}</span>;
                })()}
              </div>
              {row.followup && (
                <div style={{ fontSize: 13, color: GREY, marginTop: 6 }}>
                  {TASK_LABEL[row.followup.task_type] ?? row.followup.task_type}
                </div>
              )}

            </div>
            <button onClick={onClose} aria-label="Close"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: GREY, padding: 4 }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", fontSize: 13 }}>
            {appt.patient_phone && (
              <a href={`tel:${appt.patient_phone}`} style={{ color: NAVY, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <Phone size={14} /> {appt.patient_phone}
              </a>
            )}
            {appt.patient_email && (
              <a href={`mailto:${appt.patient_email}`} style={{ color: NAVY, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={14} /> {appt.patient_email}
              </a>
            )}
          </div>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Timeline">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {milestones.map((m) => (
                <div key={m.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ marginTop: 1, color: m.done ? NAVY : "#cbd5e1" }}>
                    {m.done ? <CheckCircle2 size={20} fill={NAVY} color="#fff" /> : <Circle size={20} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: m.done ? NAVY : GREY }}>{m.label}</div>
                    <div style={{ fontSize: 13, color: GREY, marginTop: 2 }}>{m.detail ?? "Pending"}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {quote && (
            <Card title="Quote">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{fmt$(quote.price)}</div>
                <span style={chipStyle(NAVY_PALE, NAVY)}>{quote.status.replace(/_/g, " ")}</span>
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
                  style={{ display: "flex", alignItems: "center", gap: 6, background: NAVY, color: "#fff", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
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
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", color: NAVY, border: `1px solid ${LINE}`, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                  <Copy size={14} /> Copy link
                </button>
              </div>

              <div style={{ marginTop: 16, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
                {quote.deposit_recorded_at ? (
                  <div style={{ background: GREEN_BG, color: GREEN, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                    Deposit of {fmt$(Number(quote.deposit_amount ?? 0))} received
                    {quote.deposit_method ? ` · ${quote.deposit_method.replace(/_/g, " ")}` : ""}
                    <div style={{ fontWeight: 500, marginTop: 2 }}>{fmtDateTime(quote.deposit_recorded_at)}</div>
                    <button
                      onClick={() => setDepositOpen(true)}
                      style={{ marginTop: 8, background: "transparent", border: "none", color: NAVY, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: FONT }}
                    >
                      Edit deposit
                    </button>
                  </div>
                ) : !depositOpen ? (
                  <button
                    onClick={() => setDepositOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: GREEN, color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
                  >
                    <BadgeDollarSign size={15} /> Record deposit taken in clinic
                  </button>
                ) : null}

                {depositOpen && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: GREY }}>
                      Amount (AUD)
                      <input
                        type="number"
                        min={1}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        style={{ display: "block", marginTop: 4, width: "100%", padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 14, fontFamily: FONT, color: "#111" }}
                      />
                    </label>
                    <label style={{ fontSize: 12, fontWeight: 700, color: GREY }}>
                      How was it paid?
                      <select
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value)}
                        style={{ display: "block", marginTop: 4, width: "100%", padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 14, fontFamily: FONT, color: "#111", background: "#fff" }}
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
                        style={{ background: GREEN, color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: depositSaving ? 0.6 : 1 }}
                      >
                        {depositSaving ? "Saving…" : "Save deposit"}
                      </button>
                      <button
                        onClick={() => setDepositOpen(false)}
                        disabled={depositSaving}
                        style={{ background: "#fff", color: GREY, border: `1px solid ${LINE}`, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {intake && (
            <Card title="Check-in summary">
              {intake.wellbeing_review && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: AMBER_BG, color: AMBER_FG, border: `1px solid #fed7aa`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  <AlertTriangle size={16} /> Wellbeing review recommended
                </div>
              )}
              {([
                ["Medications", intake.medications],
                ["Allergies", intake.allergies],
                ["Medical conditions", intake.medical_conditions],
                ["Previous treatments", intake.previous_treatments],
              ] as const).filter(([, v]) => v && v.trim()).map(([label, v]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: GREY, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 14, color: "#1f2937", marginTop: 2, whiteSpace: "pre-wrap" }}>{v}</div>
                </div>
              ))}
            </Card>
          )}

          <Card title="Phone notes">
            <div style={{ fontSize: 13, color: appt.intel_notes ? "#1f2937" : GREY, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {appt.intel_notes || "No phone notes on this patient."}
            </div>
          </Card>

          {stage === "Lost" && status ? (
            <div style={{ background: "#f1f5f9", border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREY }}>
                Lost — {reasonLabel(status.lost_reason)}
                {status.lost_at ? ` · ${fmtDateTime(status.lost_at)}` : ""}
              </div>
              {status.lost_note && (
                <div style={{ fontSize: 13, color: GREY, marginTop: 6, whiteSpace: "pre-wrap" }}>{status.lost_note}</div>
              )}
              <button onClick={() => void reopen()} disabled={saving}
                style={{ marginTop: 12, background: "transparent", border: "none", color: NAVY, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: FONT }}>
                Reopen
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLost(true)}
              style={{ background: "#fff", color: RED, border: `1px solid ${RED}`, borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              Mark as Lost
            </button>
          )}
        </div>
      </div>

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: GREY, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
