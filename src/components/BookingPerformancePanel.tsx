import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuietRefresh } from "@/hooks/useQuietRefresh";
import { getBookingPerformance } from "@/utils/booking-performance.functions";
import { sydneyTodayISO } from "@/lib/timezone";
import type { ReportingPeriod } from "@/lib/reporting-period";
import { BookingPerformanceView } from "./BookingPerformanceView";

export function BookingPerformancePanel() {
  const { ready, session, role } = useAuth();
  const [period, setPeriod] = useState<ReportingPeriod>("month");
  const [start, setStart] = useState(sydneyTodayISO());
  const [end, setEnd] = useState(sydneyTodayISO());
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible") setRefresh(n => n + 1); };
    const timer = setInterval(update, 60_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const load = useCallback(() => getBookingPerformance({ data: { period, start, end } }), [period, start, end]);
  const { data, loading, error, reload } = useQuietRefresh({
    queryKey: JSON.stringify([session?.user.id, role, period, start, end]),
    load, refreshKey: refresh, enabled: ready && !!session,
  });
  return <BookingPerformanceView report={data} loading={loading} error={error?.message} onRetry={reload}
    isAdmin={role === "admin"} period={period} onPeriod={setPeriod} start={start} end={end} onStart={setStart} onEnd={setEnd} />;
}
