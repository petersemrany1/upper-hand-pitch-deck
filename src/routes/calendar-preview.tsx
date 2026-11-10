import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ClinicAvailabilityCalendar } from "@/components/ClinicAvailabilityCalendar";
import { calendarPreviewFixture } from "@/lib/calendar-preview-fixture";
import { getPreviewSchedule, resetPreviewSchedule, savePreviewSchedule, seedPreviewSchedule, subscribePreviewSchedules } from "@/lib/clinic-schedule-api";
import { isCalendarApprovalHost } from "@/lib/calendar-release";

export const Route = createFileRoute("/calendar-preview")({ component: CalendarApprovalPreview });

function CalendarApprovalPreview() {
  const [fixture] = useState(calendarPreviewFixture);
  const [message, setMessage] = useState("");
  const [approvalHost, setApprovalHost] = useState<boolean | null>(null);
  const schedule = useSyncExternalStore(subscribePreviewSchedules, () => getPreviewSchedule(fixture.clinic_id), () => undefined);
  useEffect(() => { setApprovalHost(import.meta.env.DEV && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) || isCalendarApprovalHost()); void seedPreviewSchedule(fixture).catch(error => setMessage((error as Error).message)); }, [fixture]);
  if (!approvalHost) return <div style={{ padding: 32 }}>{approvalHost === null ? "Loading calendar preview…" : "This calendar preview is available in the approval environment."}</div>;
  if (!schedule) return <p role="status" style={{ padding: 24 }}>{message || "Loading calendar preview…"}</p>;
  return <main style={{ minHeight: "100vh", background: "#f5f7fa", color: "#24364f", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
    <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "#fff", borderBottom: "1px solid #dce3ec" }}><div><strong>Calendar approval preview</strong><p style={{ fontSize: 12, color: "#617086", marginTop: 3 }}>Example data only. No real bookings, messages or payments.</p></div><button onClick={async () => { try { await resetPreviewSchedule(fixture); setMessage(""); } catch (error) { setMessage((error as Error).message); } }} style={{ padding: "8px 12px", border: "1px solid #dce3ec", borderRadius: 7, background: "#fff" }}>Reset preview</button></header>
    {message && <p role="alert" style={{ padding: "12px 24px", color: "#a03631" }}>{message}</p>}
    <ClinicAvailabilityCalendar schedule={schedule} initialDate={fixture.blocks[0].slot_date!} preview onSave={(command, version) => savePreviewSchedule(schedule.clinic_id, version, command)} />
  </main>;
}
