import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { listPartnerViewClinics } from "@/lib/partner-view.functions";
import type { PartnerViewClinic } from "@/lib/partner-view";

export function PartnerViewSection() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<PartnerViewClinic[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    void listPartnerViewClinics().then(rows => {
      if (!cancelled) setClinics(rows);
    }).catch(() => { if (!cancelled) setError("Could not load partner clinics."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);
  return <section id="partner-view" className="bg-card border border-border rounded-2xl p-6 md:p-8" aria-labelledby="partner-view-title">
    <div className="flex items-center gap-3 mb-5">
      <Eye className="w-5 h-5 text-primary" aria-hidden="true" />
      <div><h2 id="partner-view-title" className="text-lg font-bold text-foreground">View as partner</h2>
        <p className="text-xs text-muted-foreground mt-0.5">See the portal your partner sees. You stay signed in as yourself.</p></div>
    </div>
    {loading ? <p className="text-sm text-muted-foreground" role="status">Loading partner clinics…</p> : error ? <p className="text-sm text-destructive" role="alert">{error} <button className="underline underline-offset-2" onClick={() => setAttempt(n => n + 1)}>Retry</button></p> : !clinics.length ? <p className="text-sm text-muted-foreground">No partner clinics have been added yet.</p> :
      <form className="flex flex-col sm:flex-row sm:items-end gap-3" onSubmit={event => { event.preventDefault(); if (clinicId) void navigate({ to: "/clinic-portal", search: { viewClinic: clinicId } }); }}>
        <label className="flex-1 text-sm font-medium" htmlFor="partner-view-clinic">Partner clinic
          <select id="partner-view-clinic" required value={clinicId} onChange={event => setClinicId(event.target.value)} className="mt-2 w-full min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="" disabled>Choose a clinic</option>
            {clinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.clinic_name}{clinic.is_active ? "" : " (inactive)"}</option>)}
          </select>
        </label>
        <button disabled={!clinicId} className="min-h-11 rounded-md bg-[#203b5c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">View as partner</button>
      </form>}
    <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">Record training videos with fictional patients in Demo Clinic.</p>
      <a href="/demo-clinic" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline underline-offset-4">Open demo clinic</a>
    </div>
  </section>;
}
