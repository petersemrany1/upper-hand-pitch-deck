export function ClinicCapacityNotice({ status, retry }: { status: "checking" | "ready" | "error"; retry: () => void }) {
  if (status === "ready") return null;
  return <div role={status === "error" ? "alert" : "status"} style={{ padding: "10px 16px", background: "#fff7ed", color: "#9a3412", fontSize: 13 }}>
    {status === "error"
      ? "Clinic availability could not refresh. New calls are paused while we retry. Your current call can continue."
      : "Checking clinic availability before the next call…"}
    {status === "error" && <button type="button" onClick={retry} style={{ marginLeft: 12, textDecoration: "underline", fontWeight: 600 }}>Retry now</button>}
  </div>;
}
