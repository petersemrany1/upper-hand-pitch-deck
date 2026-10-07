import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuietRefresh } from "./useQuietRefresh";
import { fetchClinicSchedule, getPreviewSchedule, loadApprovalSchedule, saveClinicSchedule, savePreviewSchedule, subscribePreviewSchedules } from "@/lib/clinic-schedule-api";
import type { ClinicSchedule, ScheduleCommand } from "@/lib/clinic-schedule";

export function useClinicSchedule(clinicId: string, preview = false) {
  const [saved, setSaved] = useState<ClinicSchedule | null>(null);
  const previewData = useSyncExternalStore(subscribePreviewSchedules, () => getPreviewSchedule(clinicId), () => undefined);
  const load = useCallback(() => preview ? loadApprovalSchedule(clinicId) : fetchClinicSchedule(clinicId), [clinicId, preview]);
  const { data, error, loading, reload } = useQuietRefresh({ queryKey: `${clinicId}:${preview}`, load, enabled: !!clinicId });
  useEffect(() => { if (data) setSaved(null); }, [data]);
  useEffect(() => {
    if (!clinicId || preview) return;
    const refresh = () => { if (document.visibilityState === "visible") reload(); };
    const channel = supabase.channel(`schedule-${clinicId}-${crypto.randomUUID()}`);
    for (const table of ["clinic_appointments", "clinic_trading_hours", "clinic_blocked_slots", "clinic_availability"]) channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `clinic_id=eq.${clinicId}` }, refresh);
    channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "partner_clinics", filter: `id=eq.${clinicId}` }, refresh).subscribe();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { void supabase.removeChannel(channel); clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [clinicId, preview, reload]);
  const save = async (command: ScheduleCommand, version: string) => {
    const updated = await (preview ? savePreviewSchedule : saveClinicSchedule)(clinicId, version, command);
    setSaved(updated); reload(); return updated;
  };
  return { schedule: preview ? previewData ?? data : saved?.clinic_id === clinicId ? saved : data, error, loading, reload, save };
}
