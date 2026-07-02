import { useEffect, useState } from "react";
import { ClipboardList, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  type TradingHours, type BlockedSlot, type AvailabilityOverride,
} from "@/lib/slot-generation";
import { ListSkeleton, StatRowSkeleton } from "@/components/app/LoadingState";
import { ErrorState } from "@/components/app/ErrorState";
import { AppointmentsTab } from "@/components/clinic-portal/appointments";
import { AppointmentDetailModal } from "@/components/clinic-portal/appointment-detail";
import { AvailabilityTab } from "@/components/clinic-portal/availability";
import { NAVY } from "@/components/clinic-portal/shared";

export type ClinicAppointment = {
  id: string;
  clinic_id: string;
  lead_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string;
  intel_notes: string | null;
  outcome: "show" | "noshow" | "proceeded" | null;
  consult_summary: string | null;
  deposit_amount: number | null;
  stripe_payment_intent_id: string | null;
  refund_status: "refunded" | "refunded_manual" | "failed" | null;
  refund_processed_at: string | null;
  stripe_refund_id: string | null;
};

/**
 * Clinic partner portal. The shell renders on the design system (tokens,
 * shared loading/error states); the clinic keeps its navy accent as a
 * scoped brand colour. Feature areas live in src/components/clinic-portal.
 */
export function ClinicPortalView({
  clinicId,
  clinicName,
  isAdmin = false,
}: {
  clinicId: string;
  clinicName: string;
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<"appointments" | "availability">("appointments");
  const [appts, setAppts] = useState<ClinicAppointment[]>([]);
  const [tradingHours, setTradingHours] = useState<TradingHours[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<ClinicAppointment | null>(null);
  const [clinicDefaultDeposit, setClinicDefaultDeposit] = useState<number>(75);
  const [clinicState, setClinicState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only show the full-screen loader on the very first fetch.
      if (refresh === 0) setLoading(true);
      setLoadError(null);
      const [aRes, thRes, bsRes, ovRes, pcRes] = await Promise.all([
        supabase.from("clinic_appointments").select("*").eq("clinic_id", clinicId).not("patient_name", "ilike", "%test%").order("appointment_date"),
        supabase.from("clinic_trading_hours").select("day_of_week, open_time, close_time, is_closed, consult_duration_mins").eq("clinic_id", clinicId),
        supabase.from("clinic_blocked_slots").select("id, slot_date, slot_start, slot_end, is_recurring, recur_day_of_week, recur_pattern, recur_days_of_week, recur_day_of_month, recur_nth_week, recur_until").eq("clinic_id", clinicId),
        supabase.from("clinic_availability").select("id, override_date, override_type, start_time, end_time").eq("clinic_id", clinicId),
        supabase.from("partner_clinics").select("consult_price_deposit, state").eq("id", clinicId).maybeSingle(),
      ]);
      if (cancelled) return;
      const firstError = aRes.error ?? thRes.error ?? bsRes.error ?? ovRes.error ?? pcRes.error;
      if (firstError) {
        setLoadError(firstError.message);
        setLoading(false);
        return;
      }
      setAppts((aRes.data ?? []) as ClinicAppointment[]);
      setTradingHours((thRes.data ?? []) as TradingHours[]);
      setBlockedSlots((bsRes.data ?? []) as BlockedSlot[]);
      setOverrides((ovRes.data ?? []) as AvailabilityOverride[]);
      const pc = pcRes.data;
      if (pc?.consult_price_deposit != null) setClinicDefaultDeposit(Number(pc.consult_price_deposit));
      setClinicState((pc as { state?: string | null } | null)?.state ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId, refresh]);

  const reload = () => setRefresh((n) => n + 1);

  useEffect(() => {
    if (selected) {
      const fresh = appts.find((a) => a.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
  }, [appts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen bg-surface-page"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="bg-surface-card border-b border-line">
        <div className="flex px-6">
          <TabBtn active={tab === "appointments"} onClick={() => setTab("appointments")} icon={<ClipboardList size={16} />}>Appointments</TabBtn>
          <TabBtn active={tab === "availability"} onClick={() => setTab("availability")} icon={<CalendarDays size={16} />}>Availability</TabBtn>
        </div>
      </div>

      {loading ? (
        <div className="mx-auto max-w-4xl space-y-4 p-6">
          <StatRowSkeleton tiles={4} />
          <ListSkeleton rows={6} />
        </div>
      ) : loadError ? (
        <ErrorState
          title="Couldn't load your clinic data"
          description={loadError}
          onRetry={reload}
        />
      ) : tab === "appointments" ? (
        <div className="anim-fade-in">
          <AppointmentsTab
            appts={appts}
            tradingHours={tradingHours}
            blockedSlots={blockedSlots}
            clinicId={clinicId}
            clinicState={clinicState}
            isAdmin={isAdmin}
            onChange={reload}
            onSelect={setSelected}
          />
        </div>
      ) : (
        <div className="anim-fade-in">
          <AvailabilityTab
            tradingHours={tradingHours}
            blockedSlots={blockedSlots}
            overrides={overrides}
            appts={appts}
            clinicId={clinicId}
            clinicState={clinicState}
            onChange={reload}
          />
        </div>
      )}

      <div className="type-caption p-4 text-center">
        {clinicName} · Clinic Partner Portal
      </div>

      {selected && (
        <AppointmentDetailModal
          appt={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onChange={() => { reload(); }}
          clinicDefaultDeposit={clinicDefaultDeposit}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-4 text-sm transition-colors"
      style={{
        color: active ? NAVY : "var(--text-muted)",
        fontWeight: active ? 600 : 500,
        borderBottom: active ? `2px solid ${NAVY}` : "2px solid transparent",
      }}
    >
      {icon} {children}
    </button>
  );
}
