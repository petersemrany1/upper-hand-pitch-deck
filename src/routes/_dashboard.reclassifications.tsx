import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/reclassifications")({
  head: () => ({ meta: [{ title: "Reclassification" }] }),
  component: ReclassificationsPage,
});

type Row = {
  id: string;
  clinic_id: string;
  clinic_name: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string | null;
  outcome_at_request: string | null;
  reason: string;
  requester_email: string;
  created_at: string;
  clinic_appointments: { outcome: string | null; disqualified_at: string | null } | null;
};

// A request is settled once the appointment has been disqualified (accepted)
// or its outcome changed since the clinic asked.
function settled(r: Row): "accepted" | "changed" | null {
  const a = r.clinic_appointments;
  if (!a) return null;
  if (a.outcome === "disqualified" || a.disqualified_at) return "accepted";
  if (a.outcome !== r.outcome_at_request) return "changed";
  return null;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

function ReclassificationsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"open" | "settled">("open");

  useEffect(() => {
    supabase
      .from("clinic_reclassification_requests")
      .select("id, clinic_id, clinic_name, patient_name, appointment_date, appointment_time, outcome_at_request, reason, requester_email, created_at, clinic_appointments(outcome, disqualified_at)")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data ?? []) as unknown as Row[]);
      });
  }, []);

  const list = (rows ?? []).filter((r) => (tab === "open" ? !settled(r) : !!settled(r)));
  const openCount = (rows ?? []).filter((r) => !settled(r)).length;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <header className="mb-2 flex flex-wrap items-center gap-3">
        <RefreshCcw className="h-6 w-6" style={{ color: "#f4522d" }} />
        <h1 className="text-2xl font-extrabold" style={{ color: "#111" }}>Reclassification</h1>
        <div className="ml-auto inline-flex rounded-full p-0.5" style={{ background: "#f1f1ef", border: "1px solid #e6e6e3" }}>
          {(["open", "settled"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: tab === t ? "#fff" : "transparent", color: tab === t ? "#111" : "#6b6b68" }}
            >
              {t === "open" ? `Waiting · ${openCount}` : "Settled"}
            </button>
          ))}
        </div>
      </header>
      <p className="mb-5 text-sm" style={{ color: "#6b6b68" }}>
        Partner clinics asking for a patient to be reclassified. Open the clinic's portal to disqualify the patient or keep the outcome.
      </p>

      {error ? (
        <p className="text-sm" style={{ color: "#b83232" }}>{error}</p>
      ) : !rows ? (
        <p className="text-sm" style={{ color: "#6b6b68" }}>Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl p-8 text-center text-sm" style={{ background: "#fff", border: "1px solid #ebebeb", color: "#6b6b68" }}>
          {tab === "open" ? "No reclassification requests waiting." : "Nothing settled yet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const s = settled(r);
            return (
              <li key={r.id} className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #ebebeb" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "#111" }}>{r.patient_name}</span>
                  <span className="text-xs" style={{ color: "#6b6b68" }}>
                    {r.clinic_name} · consult {fmt(r.appointment_date)}{r.appointment_time ? ` ${r.appointment_time}` : ""}
                  </span>
                  {s && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={s === "accepted" ? { background: "#e8f5ef", color: "#1a7a4a" } : { background: "#f4f4f5", color: "#52525b" }}
                    >
                      {s === "accepted" ? "Disqualified" : `Now ${r.clinic_appointments?.outcome ?? "updated"}`}
                    </span>
                  )}
                  <Link
                    to="/partner-clinics"
                    search={{ clinic: r.clinic_id } as never}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium"
                    style={{ color: "#f4522d" }}
                  >
                    Open portal <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "#3f3f3c" }}>{r.reason}</p>
                <div className="mt-2 text-[11px]" style={{ color: "#a3a3a0" }}>
                  Asked by {r.requester_email} on {fmt(r.created_at)} · outcome then: {r.outcome_at_request ?? "none"}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
