import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, ExternalLink, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveChase } from "@/utils/chase.functions";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { normalizeAUPhone } from "@/utils/phone";

export const Route = createFileRoute("/_dashboard/chase-queue")({
  head: () => ({ meta: [{ title: "Chase Queue" }] }),
  component: ChaseQueuePage,
});

type ChaseRow = {
  id: string;
  clinic_id: string;
  lead_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  deposit_amount: number | null;
  chase_status: "requested" | "rebooked" | "not_proceeding" | "no_answer" | "voicemail" | null;
  chase_note: string | null;
  chase_requested_at: string | null;
  partner_clinics?: { clinic_name: string | null } | null;
};

const RESULTS: { key: "rebooked" | "not_proceeding" | "no_answer" | "voicemail"; label: string; color: string; bg: string }[] = [
  { key: "rebooked", label: "Rebooked", color: "#1a7a4a", bg: "#e8f5ef" },
  { key: "not_proceeding", label: "Not proceeding", color: "#52525b", bg: "#f4f4f5" },
  { key: "no_answer", label: "No answer", color: "#b83232", bg: "#fdf0f0" },
  { key: "voicemail", label: "Voicemail left", color: "#2d5fa0", bg: "#edf2f9" },
];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}
function fmtStamp(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function ChaseQueuePage() {
  const [rows, setRows] = useState<ChaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);
  const resolveFn = useServerFn(resolveChase);
  const { call, dialerStatus } = useTwilioDevice();

  const handleCall = async (row: ChaseRow) => {
    if (!row.patient_phone) {
      toast.error("No phone number on file");
      return;
    }
    if (dialerStatus !== "ready") {
      toast.error("Dialler not ready yet");
      return;
    }
    const normalised = normalizeAUPhone(row.patient_phone) || row.patient_phone;
    setCallingId(row.id);
    try {
      await call(normalised, row.clinic_id ? { clinicId: row.clinic_id } : undefined);
      toast.success(`Calling ${row.patient_name}…`);
    } catch (e) {
      console.error("Chase call failed", e);
      toast.error("Could not start call");
    } finally {
      setCallingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_appointments")
      .select("id, clinic_id, lead_id, patient_name, patient_phone, appointment_date, appointment_time, deposit_amount, chase_status, chase_note, chase_requested_at, partner_clinics(clinic_name)")
      .eq("chase_status", "requested")
      .order("chase_requested_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data ?? []) as unknown) as ChaseRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const resolve = async (row: ChaseRow, result: "rebooked" | "not_proceeding" | "no_answer" | "voicemail") => {
    setBusyId(row.id);
    try {
      const r = await resolveFn({ data: { appointmentId: row.id, result } });
      if (!r.success) { toast.error(r.error || "Failed"); return; }
      toast.success("Result saved — clinic can see it");
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Bell className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-extrabold text-foreground">Chase Queue</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Patients that partner clinics have asked GoBold to follow up. Oldest first — log a result and it becomes visible to the clinic.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nothing to chase right now 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const busy = busyId === r.id;
            const clinicName = r.partner_clinics?.clinic_name ?? "—";
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{r.patient_name}</span>
                      <span className="text-xs text-muted-foreground">· {clinicName}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>Consult {fmtDate(r.appointment_date)} · {r.appointment_time}</span>
                      {r.deposit_amount != null && <><span>·</span><span>Deposit ${Number(r.deposit_amount).toLocaleString()}</span></>}
                      <span>·</span>
                      <span>Requested {fmtStamp(r.chase_requested_at)}</span>
                    </div>
                    {r.patient_phone && (
                      <div className="mt-1 text-[12px]">
                        <button
                          type="button"
                          onClick={() => handleCall(r)}
                          disabled={callingId === r.id || dialerStatus !== "ready"}
                          className="inline-flex items-center gap-1 text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          title={dialerStatus === "ready" ? "Call via dialler" : "Dialler not ready yet"}
                        >
                          <Phone className="w-3 h-3" /> {r.patient_phone}
                          {callingId === r.id && <span className="ml-1">…</span>}
                        </button>
                      </div>
                    )}
                    {r.chase_note && (
                      <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 whitespace-pre-wrap">
                        “{r.chase_note}”
                      </div>
                    )}
                    {r.lead_id && (
                      <a
                        href={`/sales-call?leadId=${r.lead_id}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Open in Sales Portal
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {RESULTS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => resolve(r, opt.key)}
                        disabled={busy}
                        className="text-xs font-semibold px-3 py-2 rounded-lg border disabled:opacity-40 transition-colors"
                        style={{ color: opt.color, borderColor: opt.color + "55", background: opt.bg }}
                      >
                        {busy ? "…" : opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
