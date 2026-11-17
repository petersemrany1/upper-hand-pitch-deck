import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { capacityLocations, createCapacityMonitor, initialCapacityState, type CapacityRead } from "@/lib/clinic-capacity-state";
import { scrubMessage } from "@/utils/scrub-pii";

export function useClinicCapacity(db: SupabaseClient<Database>, fetchCapacity: (options: { fresh: boolean; signal: AbortSignal }) => Promise<CapacityRead>) {
  const [state, setState] = useState(initialCapacityState);
  const readyRef = useRef(false);
  const monitorRef = useRef<ReturnType<typeof createCapacityMonitor> | null>(null);
  useEffect(() => {
    const monitor = createCapacityMonitor({
      read: signal => fetchCapacity({ fresh: true, signal }),
      changed: next => { readyRef.current = next.status === "ready"; setState(next); },
      report: error => {
        const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? "Availability check failed");
        console.warn("clinic capacity refresh failed", error);
        void (async () => {
          try {
            const { error: logError } = await db.from("error_logs").insert({
              function_name: "sales-call.clinic-capacity-refresh",
              error_message: scrubMessage(message),
              context: { source: "sales-call", action: "calling_paused_until_fresh_balance" },
            });
            if (logError) console.warn("Could not record capacity refresh failure", logError);
          } catch { /* Offline: retries must not depend on the diagnostic write. */ }
        })();
      },
    });
    monitorRef.current = monitor;
    const onChanged = (event: Event) => monitor.refresh((event as CustomEvent<{ clinicId?: string }>).detail ?? {});
    const onVisible = () => { if (document.visibilityState === "visible") monitor.refresh(); };
    monitor.refresh();
    window.addEventListener("clinic-capacity-changed", onChanged);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const poll = window.setInterval(onVisible, 60_000);
    const changed = (payload: { new: unknown; old: unknown }) => {
      const row = payload.new as { clinic_id?: string }, old = payload.old as { clinic_id?: string };
      monitor.refresh({ clinicId: row.clinic_id ?? old.clinic_id });
    };
    const channel = db.channel("clinic-capacity-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_appointments" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_packs" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_trials" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_clinics" }, () => monitor.refresh({}))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "meta_leads" }, payload => {
        if (payload.new.booking_date || payload.old.booking_date) changed(payload);
      }).subscribe();
    return () => {
      monitor.stop();
      monitorRef.current = null;
      readyRef.current = false;
      window.removeEventListener("clinic-capacity-changed", onChanged);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      void db.removeChannel(channel);
    };
  }, [db, fetchCapacity]);
  return { capacity: useMemo(() => capacityLocations(state), [state]), status: state.status, readyRef,
    retry: () => monitorRef.current?.refresh() };
}
