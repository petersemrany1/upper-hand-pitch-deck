import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_TIMEZONE, sydneyTodayISO } from "@/lib/timezone";
import {
  listClinicflowFollowups,
  markClinicflowFollowupDone,
} from "@/lib/clinicflow-phase4.functions";

const NAVY = "#1a3a6b";
const GREY = "#6b7785";
const LINE = "#e2e6ec";
const AMBER = "#b45309";
const AMBER_BG = "#fff7ed";

type Followup = {
  id: string;
  quote_id: string;
  patient_name: string;
  due_date: string;
  task_type: string;
  status: string;
};

type Chase = {
  id: string;
  patient_name: string;
  note: string | null;
  requested_at: string;
};

const TASK_LABEL: Record<string, string> = {
  checkin: "Check-in — any questions, and which way are you leaning?",
  nudge: "Nudge — send timeline photos or recovery FAQ",
  expiring: "Quote expiring — offer to hold a date",
  custom: "Scheduled follow-up",
};

function waMessageFor(taskType: string, firstName: string): string {
  const name = firstName || "there";
  switch (taskType) {
    case "checkin":
      return `Hi ${name}, just checking in after your consult — any questions, and which way are you leaning?`;
    case "nudge":
      return `Hi ${name}, thought I'd send through some timeline photos so you can see what recovery actually looks like. Happy to answer anything.`;
    case "expiring":
      return `Hi ${name}, your consult quote is coming up on its validity date. If you're ready, I can hold a procedure date for you — just say the word.`;
    default:
      return `Hi ${name}, following up from your consult.`;
  }
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: APP_TIMEZONE,
  });
}

export function ClinicFlowFollowups({ clinicId }: { clinicId: string }) {
  const listFn = useServerFn(listClinicflowFollowups);
  const doneFn = useServerFn(markClinicflowFollowupDone);
  const [rows, setRows] = useState<Followup[]>([]);
  const [phones, setPhones] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [chases, setChases] = useState<Chase[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const markChaseDoneFn = useServerFn(markChaseDone);
  const [chaseBusyId, setChaseBusyId] = useState<string | null>(null);

  const loadChases = async () => {
    const [{ data: chaseRows }, { data: admin }] = await Promise.all([
      supabase
        .from("clinicflow_chase_requests")
        .select("id, patient_name, note, requested_at")
        .eq("clinic_id", clinicId)
        .eq("status", "requested")
        .order("requested_at", { ascending: true }),
      supabase.rpc("is_admin_user"),
    ]);
    setChases((chaseRows ?? []) as Chase[]);
    setIsAdmin(admin === true);
  };

  const onChaseDone = async (id: string) => {
    setChaseBusyId(id);
    try {
      await markChaseDoneFn({ data: { chaseId: id } });
      setChases((prev) => prev.filter((c) => c.id !== id));
      toast.success("Marked done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setChaseBusyId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      void loadChases();
      const { followups } = await listFn({ data: { clinicId } });
      const open = (followups as Followup[]).filter((f) => f.status === "open");
      setRows(open);
      // Fetch patient phone via quote → appointment

      const quoteIds = Array.from(new Set(open.map((f) => f.quote_id)));
      if (quoteIds.length > 0) {
        const { data: quotes } = await supabase
          .from("clinicflow_quotes")
          .select("id, appointment_id")
          .in("id", quoteIds);
        const apptIds = (quotes ?? []).map((q) => q.appointment_id as string);
        const { data: appts } = await supabase
          .from("clinic_appointments")
          .select("id, patient_phone")
          .in("id", apptIds);
        const apptPhone: Record<string, string | null> = {};
        (appts ?? []).forEach((a) => {
          apptPhone[a.id as string] = (a.patient_phone as string | null) ?? null;
        });
        const map: Record<string, string | null> = {};
        (quotes ?? []).forEach((q) => {
          map[q.id as string] = apptPhone[q.appointment_id as string] ?? null;
        });
        setPhones(map);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [clinicId]);

  const today = sydneyTodayISO();

  const onDone = async (id: string) => {
    setBusyId(id);
    try {
      await doneFn({ data: { followupId: id } });
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Marked done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  function waLink(row: Followup): string {
    const raw = (phones[row.quote_id] ?? "").replace(/[^0-9]/g, "");
    const intl = raw.startsWith("0") ? "61" + raw.slice(1) : raw;
    const first = row.patient_name.split(" ")[0] || "";
    return `https://wa.me/${intl}?text=${encodeURIComponent(waMessageFor(row.task_type, first))}`;
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: GREY }}><Loader2 size={16} className="animate-spin" style={{ verticalAlign: "middle" }} /> Loading…</div>;
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: GREY, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        No open follow-ups. Fresh quotes will populate this list automatically.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: "0 0 6px" }}>Follow-ups</h1>
      <p style={{ color: GREY, fontSize: 13, marginBottom: 20 }}>
        A human always sends the message — tap the WhatsApp button to open it with the text pre-filled.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => {
          const overdue = r.due_date < today;
          const hasPhone = !!(phones[r.quote_id] ?? "").replace(/[^0-9]/g, "");
          return (
            <div
              key={r.id}
              style={{
                background: overdue ? AMBER_BG : "#fff",
                border: `1px solid ${overdue ? "#f5c86b" : LINE}`,
                borderRadius: 12,
                padding: 16,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{r.patient_name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: overdue ? AMBER : GREY }}>
                    Due {fmtDate(r.due_date)}{overdue ? " · Overdue" : ""}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
                  {TASK_LABEL[r.task_type] ?? r.task_type}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={hasPhone ? waLink(r) : undefined}
                  onClick={(e) => { if (!hasPhone) { e.preventDefault(); toast.error("No patient phone on file"); } }}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#25D366", color: "#fff", padding: "9px 14px",
                    borderRadius: 8, fontSize: 13, fontWeight: 600,
                    textDecoration: "none", opacity: hasPhone ? 1 : 0.5, cursor: hasPhone ? "pointer" : "not-allowed",
                  }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <button
                  disabled={busyId === r.id}
                  onClick={() => void onDone(r.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: NAVY, color: "#fff", border: "none",
                    padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    opacity: busyId === r.id ? 0.6 : 1,
                  }}
                >
                  <CheckCircle2 size={14} /> Done
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
