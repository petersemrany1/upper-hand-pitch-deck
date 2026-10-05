import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bookingActor } from "./booking-access.server";
import { clinicRemainingBalances, type CapacityPack, type CapacityAppointment } from "@/lib/clinic-capacity-balance";
import { sydneyTodayISO } from "@/lib/timezone";

/** Reps can only read their own appointment rows directly. Capacity must include
 * every rep's bookings, so calculate on the server and return only clinic totals.
 */
export const getClinicRemainingSlots = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, number>> => {
    await bookingActor(context.supabase);
    const signal = AbortSignal.timeout(6_000);
    const pageSize = 1000;
    const [packs, appts] = await Promise.all([
      (async () => {
        const rows: CapacityPack[] = [];
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await supabaseAdmin.from("clinic_packs")
            .select("clinic_id, pack_size, pack_type, date_paid, purchased_at")
            .order("id").range(offset, offset + pageSize - 1).abortSignal(signal);
          if (error) throw error;
          rows.push(...(data ?? []));
          if ((data?.length ?? 0) < pageSize) return rows;
        }
      })(),
      (async () => {
        const rows: CapacityAppointment[] = [];
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await supabaseAdmin.from("clinic_appointments")
            .select("clinic_id, outcome, disqualified_at, booked_at")
            .not("patient_name", "ilike", "%test%").not("patient_name", "ilike", "%demo%")
            .order("id").range(offset, offset + pageSize - 1).abortSignal(signal);
          if (error) throw error;
          rows.push(...(data ?? []));
          if ((data?.length ?? 0) < pageSize) return rows;
        }
      })(),
    ]);
    return clinicRemainingBalances(packs, appts, sydneyTodayISO());
  });
