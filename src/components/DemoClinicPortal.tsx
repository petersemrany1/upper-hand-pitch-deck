import { useMemo, useState, useSyncExternalStore } from "react";
import { CalendarDays, ClipboardList, RotateCcw } from "lucide-react";
import { DemoClinicStore, DEMO_CLINIC_ID, DEMO_CLINIC_NAME } from "@/lib/demo-clinic";
import { sydneyTodayISO } from "@/lib/timezone";
import { DemoClinicContext } from "./DemoClinicContext";
import { AppointmentsTab, AppointmentDetailModal, TabBtn } from "./ClinicPortalView";
import { ClinicAvailabilityCalendar } from "./ClinicAvailabilityCalendar";
import { ClinicPackBalanceCard, type Pack } from "./ClinicPackBalanceCard";

export function DemoClinicPortal({ partnerView = false }: { partnerView?: boolean }) {
  const [store] = useState(() => new DemoClinicStore());
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [tab, setTab] = useState<"appointments" | "availability">("appointments");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const selected = state.appointments.find(a => a.id === selectedId);
  const balance = useMemo(() => {
    const today = sydneyTodayISO();
    const counted = state.appointments.filter(a => a.outcome !== "noshow" && a.outcome !== "disqualified");
    return {
      packs: [{ id: "demo-pack", clinic_id: DEMO_CLINIC_ID, pack_size: 20, purchased_at: state.startedAt, status: "active", notes: null, created_at: state.startedAt, pack_name: "Training example", amount_paid_ex_gst: null, date_paid: state.startedAt.slice(0, 10), pack_type: "paid" }] as Pack[],
      showedUp: counted.filter(a => a.outcome === "show" || a.outcome === "proceeded" || !a.outcome && a.appointment_date < today).length,
      upcoming: counted.filter(a => !a.outcome && a.appointment_date >= today).length,
    };
  }, [state.appointments, state.startedAt]);
  const reset = () => { store.reset(); setSelectedId(null); setTab("appointments"); setResetKey(key => key + 1); };
  return <DemoClinicContext.Provider value={store}>
    <main className="clinic-portal" style={{ background: "#f0f2f5", minHeight: "100vh", color: "#24364f", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ background: "#eaf1f9", borderBottom: "1px solid #ccdbee", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12 }}><strong>Training demo</strong><span style={{ marginLeft: 10 }}>Fictional patients · Changes reset on refresh · No messages or payments</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {partnerView && <a href="/settings#partner-view" style={{ color: "#1a3a6b", fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>Back to Settings</a>}
        <button onClick={reset} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #ccdbee", borderRadius: 6, padding: "7px 11px", fontSize: 12, fontWeight: 600 }}><RotateCcw size={13} />Reset demo</button>
        </div>
      </div>
      <header style={{ background: "#1a3a6b", color: "#fff", padding: "14px 24px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}><div style={{ width: 32, height: 32, display: "grid", placeItems: "center", background: "#ffffff20", borderRadius: 6, fontWeight: 700 }}>HT</div><div><strong style={{ fontSize: 14 }}>Hair Transplant Group</strong><div style={{ fontSize: 11, opacity: .75 }}>Clinic Partner Portal</div></div></div>
        <span style={{ padding: "5px 12px", borderRadius: 20, background: "#ffffff20", fontSize: 12, fontWeight: 600 }}>{DEMO_CLINIC_NAME}</span>
      </header>
      <ClinicPackBalanceCard clinicId={DEMO_CLINIC_ID} isAdmin={false} demoData={balance} />
      <div className="clinic-portal-tabs" style={{ display: "flex", padding: "0 24px", background: "#fff", borderBottom: "1px solid #e2e6ec", marginTop: 16 }}>
        <TabBtn active={tab === "appointments"} onClick={() => setTab("appointments")} icon={<ClipboardList size={16} />}>Appointments</TabBtn>
        <TabBtn active={tab === "availability"} onClick={() => setTab("availability")} icon={<CalendarDays size={16} />}>Availability</TabBtn>
      </div>
      {tab === "appointments" ? <AppointmentsTab key={resetKey} appts={state.appointments} tradingHours={state.schedule.trading} blockedSlots={state.schedule.blocks} clinicId={DEMO_CLINIC_ID} clinicState={state.schedule.state} minGapMins={state.schedule.buffer_minutes} isAdmin={false} onChange={() => {}} onSelect={a => setSelectedId(a.id)} /> : <ClinicAvailabilityCalendar key={resetKey} schedule={state.schedule} initialDate={state.firstDate} onSave={store.saveSchedule} loadHistory={store.loadHistory} />}
      {selected && <AppointmentDetailModal key={selected.id} appt={selected} isAdmin={false} onClose={() => setSelectedId(null)} onChange={() => {}} clinicDefaultDeposit={75} />}
      <footer style={{ padding: 16, textAlign: "center", color: "#9aa5b1", fontSize: 11 }}>{DEMO_CLINIC_NAME} · Clinic Partner Portal</footer>
    </main>
  </DemoClinicContext.Provider>;
}
