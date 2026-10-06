import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateClinicRemainingSlots } from "@/lib/clinic-capacity";
import type { ClinicTrial } from "@/lib/clinic-booking-window";

// Mounted only in the admin clinic view; no rep-facing trial UI or progress.
export function ClinicTrialSettings({ clinicId, onChange }: { clinicId: string; onChange: () => void }) {
  const [trial, setTrial] = useState<ClinicTrial | null>(null);
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void supabase.from("clinic_trials").select("*").eq("clinic_id", clinicId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) { toast.error("Could not load trial settings"); return; }
      setTrial(data); setEnd(data?.appointment_end ?? "");
    });
    return () => { cancelled = true; };
  }, [clinicId]);
  if (!trial) return null;

  const save = async (startPaid: boolean) => {
    setBusy(true);
    try {
      const { error } = startPaid
        ? await supabase.rpc("start_clinic_paid_pack", { p_clinic: clinicId })
        : await supabase.from("clinic_trials").update({ appointment_end: end }).eq("clinic_id", clinicId);
      if (error) throw error;
      const { data, error: readError } = await supabase.from("clinic_trials").select("*").eq("clinic_id", clinicId).single();
      if (readError) throw readError;
      setTrial(data); setEnd(data.appointment_end);
      invalidateClinicRemainingSlots(); onChange();
      toast.success(startPaid ? "Paid bookings enabled. Existing trial bookings stay free." : "Trial dates updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : String((error as { message?: string }).message ?? error)); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ margin: "16px 24px 0", padding: 16, border: "1px solid #e2e6ec", borderRadius: 10, background: "#fff" }}>
      <strong>Trial settings · Admin only</strong>
      <p style={{ fontSize: 13, color: "#666" }}>Bookings open {trial.booking_opens}. Trial appointments: {trial.appointment_start}–{trial.appointment_end}. Reps see normal bookings.</p>
      {trial.paid_started_at ? <p style={{ fontSize: 13 }}>Paid bookings enabled. Previous trial appointments remain free.</p> : (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 13 }}>Trial end <input aria-label="Trial end date" type="date" min={trial.appointment_start} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          <button disabled={busy || !end || end < trial.appointment_start} onClick={() => void save(false)}>Save dates</button>
          <button disabled={busy} onClick={() => void save(true)}>Start paid pack</button>
          <span style={{ fontSize: 12, color: "#666" }}>Add the paid pack first. New bookings pause after the trial ends.</span>
        </div>
      )}
    </div>
  );
}
