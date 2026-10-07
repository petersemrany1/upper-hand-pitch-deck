import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ClinicAvailabilityCalendar } from "@/components/ClinicAvailabilityCalendar";
import { ClinicScheduleSlotPicker } from "@/components/ClinicScheduleSlotPicker";
import { calendarPreviewFixture } from "@/lib/calendar-preview-fixture";
import { addPreviewAppointment, getPreviewSchedule, resetPreviewSchedule, savePreviewSchedule, seedPreviewSchedule, subscribePreviewSchedules } from "@/lib/clinic-schedule-api";
import { futureScheduleSlots } from "@/lib/clinic-schedule";
import { isCalendarApprovalHost } from "@/lib/calendar-release";

export const Route = createFileRoute("/calendar-preview")({ component: CalendarApprovalPreview });

function CalendarApprovalPreview() {
  const [fixture] = useState(calendarPreviewFixture);
  const [tab, setTab] = useState<"partner" | "sales">("partner");
  const [date, setDate] = useState(fixture.blocks[0].slot_date!);
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [approvalHost, setApprovalHost] = useState<boolean | null>(null);
  const schedule = useSyncExternalStore(subscribePreviewSchedules, () => getPreviewSchedule(fixture.clinic_id), () => undefined);
  useEffect(() => { setApprovalHost(isCalendarApprovalHost()); seedPreviewSchedule(fixture); }, [fixture]);
  if (!approvalHost) return <div style={{ padding: 32 }}>{approvalHost === null ? "Loading calendar preview…" : "This calendar preview is available in the approval environment."}</div>;
  if (!schedule) return <p style={{ padding: 24 }}>Loading calendar preview…</p>;
  const canBook = futureScheduleSlots(schedule, date).some(slot => slot.time === time);
  return <main style={{ minHeight: "100vh", background: "#f5f7fa", color: "#24364f", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
    <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "#fff", borderBottom: "1px solid #dce3ec" }}><div><strong>Calendar approval preview</strong><p style={{ fontSize: 12, color: "#617086", marginTop: 3 }}>Example data only. No real bookings, messages or payments.</p></div><button onClick={() => { resetPreviewSchedule(fixture); setTime(""); setMessage(""); }} style={{ padding: "8px 12px", border: "1px solid #dce3ec", borderRadius: 7, background: "#fff" }}>Reset preview</button></header>
    <nav aria-label="Preview portal" style={{ display: "flex", gap: 0, padding: "0 16px", background: "#fff", borderBottom: "1px solid #dce3ec" }}>{([{ key: "partner", name: "Partner portal · Availability" }, { key: "sales", name: "Sales portal · Booking" }] as const).map(item => <button key={item.key} aria-pressed={tab === item.key} onClick={() => { setTab(item.key); setMessage(""); }} style={{ border: 0, borderBottom: tab === item.key ? "3px solid #1a3a6b" : "3px solid transparent", padding: "16px 12px", background: "#fff", color: tab === item.key ? "#1a3a6b" : "#617086", fontWeight: 600, fontSize: 13 }}>{item.name}</button>)}</nav>
    {tab === "partner" ? <ClinicAvailabilityCalendar schedule={schedule} initialDate={fixture.blocks[0].slot_date!} preview onSave={(command, version) => savePreviewSchedule(schedule.clinic_id, version, command)} /> : <section style={{ padding: 24, maxWidth: 650, margin: "0 auto", background: "#fff", minHeight: "calc(100vh - 140px)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Book a consultation</h1><p style={{ color: "#617086", fontSize: 13, marginBottom: 20 }}>Boss Clinic · Deb · Example patient</p>
      <ClinicScheduleSlotPicker schedule={schedule} date={date} time={time} onDate={setDate} onTime={setTime} />
      <button disabled={!canBook} style={{ background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 7, padding: "11px 16px", marginTop: 20, opacity: canBook ? 1 : .5 }} onClick={() => { try { addPreviewAppointment(schedule.clinic_id, date, time); setMessage("Preview appointment booked. It now appears in the partner calendar."); setTime(""); } catch (error) { setMessage((error as Error).message); } }}>Book preview appointment</button>
      {message && <p role="status" style={{ padding: "12px 0", fontSize: 13 }}>{message}</p>}
    </section>}
  </main>;
}
