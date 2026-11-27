// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmAvailabilityPanel.tsx). Re-run the port script to refresh.
import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/legal/integrations/supabase/client";
import {
  getFirmSchedule,
  saveFirmSchedule,
  getFirmCalendarHistory,
} from "@/legal/lib/firm-schedule.functions";
import { FirmAvailabilityCalendar } from "@/legal/components/FirmAvailabilityCalendar";
import type { CalendarHistoryLoader } from "@/legal/lib/calendar-history";
export function FirmAvailabilityPanel({
  firmId,
  onChange,
}: {
  firmId: string;
  onChange: () => void;
}) {
  const load = useServerFn(getFirmSchedule),
    save = useServerFn(saveFirmSchedule),
    history = useServerFn(getFirmCalendarHistory),
    cache = useQueryClient();
  const key = ["firm-schedule", firmId];
  const { data, error, isPending, refetch } = useQuery({
    queryKey: key,
    queryFn: () => load({ data: { firmId } }),
    refetchInterval: 15000,
  });
  useEffect(() => {
    const refresh = () => {
      void cache.invalidateQueries({ queryKey: ["firm-schedule", firmId] });
    };
    const channel = supabase.channel(`firm-schedule-${firmId}`);
    for (const table of [
      "firm_appointments",
      "firm_trading_hours",
      "firm_blocked_slots",
      "firm_availability",
    ])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `firm_id=eq.${firmId}` },
        refresh,
      );
    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "firms", filter: `id=eq.${firmId}` },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [firmId, cache]);
  const loadHistory = useCallback<CalendarHistoryLoader>(
    (input) => history({ data: { firmId, ...input } }),
    [firmId, history],
  );
  if (!data)
    return (
      <div role={error ? "alert" : "status"} className="p-6">
        {isPending ? "Loading availability…" : error?.message}
        <button className="ml-3 underline" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  return (
    <>
      {error && (
        <p role="alert">
          Availability could not refresh. <button onClick={() => void refetch()}>Retry</button>
        </p>
      )}
      <FirmAvailabilityCalendar
        key={firmId}
        schedule={data}
        onRefresh={() => void refetch()}
        loadHistory={loadHistory}
        onSave={async (command, version) => {
          const updated = await save({ data: { firmId, version, command } });
          cache.setQueryData(key, updated);
          onChange();
          return updated;
        }}
      />
    </>
  );
}
