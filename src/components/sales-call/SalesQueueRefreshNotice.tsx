type Status = "ready" | "checking" | "error";
export function SalesQueueRefreshNotice({ capacity, history, retryCapacity, retryHistory }: {
  capacity: Status; history: Status; retryCapacity: () => void; retryHistory: () => void;
}) {
  if (capacity === "ready" && history === "ready") return null;
  const missing = [
    ...(capacity === "error" ? ["clinic availability"] : []),
    ...(history === "error" ? ["call history"] : []),
  ].join(" and ");
  return <div role={missing ? "alert" : "status"} style={{ padding: "10px 16px", background: "#fff7ed", color: "#9a3412", fontSize: 13 }}>
    {missing ? <>
      Could not refresh {missing}. New calls are paused while we retry. Your current call can continue.
      <button type="button" onClick={() => {
        if (capacity === "error") retryCapacity();
        if (history === "error") retryHistory();
      }} style={{ marginLeft: 12, textDecoration: "underline", fontWeight: 600 }}>Retry now</button>
    </> : capacity !== "ready" ? "Checking clinic availability before the next call…" : "Checking call history before automatic calling…"}
  </div>;
}
