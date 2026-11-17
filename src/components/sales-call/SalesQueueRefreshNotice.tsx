type Status = "ready" | "checking" | "error";
export function SalesQueueRefreshNotice({ capacity, history, leads = "ready", settings = "ready", retryCapacity, retryHistory, retryLeads, retrySettings }: {
  capacity: Status; history: Status; leads?: Status; settings?: Status;
  retryCapacity: () => void; retryHistory: () => void; retryLeads?: () => void; retrySettings?: () => void;
}) {
  const checks = [
    { name: "clinic availability", status: capacity, retry: retryCapacity },
    { name: "call history", status: history, retry: retryHistory },
    { name: "the lead list", status: leads, retry: retryLeads },
    { name: "paused locations", status: settings, retry: retrySettings },
  ];
  const waiting = checks.find(check => check.status !== "ready");
  if (!waiting) return null;
  const failed = checks.filter(check => check.status === "error");
  return <div role={failed.length ? "alert" : "status"} style={{ padding: "10px 16px", background: "#fff7ed", color: "#9a3412", fontSize: 13 }}>
    {failed.length ? <>
      Could not refresh {new Intl.ListFormat("en").format(failed.map(check => check.name))}. New calls are paused while we retry. Your current call can continue.
      <button type="button" onClick={() => failed.forEach(check => check.retry?.())} style={{ marginLeft: 12, textDecoration: "underline", fontWeight: 600 }}>Retry now</button>
    </> : `Checking ${waiting.name} before the next call…`}
  </div>;
}
