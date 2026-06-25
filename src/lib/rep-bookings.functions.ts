import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  repId: z.string().uuid().optional(),
});

export type RepBookingRow = {
  appointment_id: string;
  lead_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  booked_at: string | null;
  deposit_amount: number | null;
  rep_id: string | null;
  rep_name: string | null;
  recordings: Array<{
    id: string;
    recording_url: string;
    called_at: string | null;
    duration: number | null;
  }>;
};

export const listRepBookingsWithRecordings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Admin gate
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    const { data: me } = await supabaseAdmin
      .from("sales_reps")
      .select("role")
      .ilike("email", email ?? "")
      .maybeSingle();
    if (me?.role !== "admin") throw new Error("Forbidden");

    // List reps for the picker
    const { data: reps } = await supabaseAdmin
      .from("sales_reps")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    const repId = data.repId;
    if (!repId) return { reps: reps ?? [], bookings: [] as RepBookingRow[] };

    // All meta_leads owned by this rep
    const { data: leads } = await supabaseAdmin
      .from("meta_leads")
      .select("id, first_name, last_name")
      .eq("rep_id", repId);
    const leadIds = (leads ?? []).map((l) => l.id);
    if (leadIds.length === 0) return { reps: reps ?? [], bookings: [] };

    // Appointments for those leads
    const { data: appts } = await supabaseAdmin
      .from("clinic_appointments")
      .select("id, lead_id, patient_name, patient_phone, appointment_date, appointment_time, booked_at, deposit_amount, created_at")
      .in("lead_id", leadIds)
      .order("appointment_date", { ascending: false });

    // Recordings: all call_records with a recording_url for these leads
    const { data: calls } = await supabaseAdmin
      .from("call_records")
      .select("id, lead_id, recording_url, called_at, duration")
      .in("lead_id", leadIds)
      .not("recording_url", "is", null)
      .order("called_at", { ascending: false });

    const repName = (reps ?? []).find((r) => r.id === repId)?.name ?? null;
    const callsByLead = new Map<string, typeof calls>();
    for (const c of calls ?? []) {
      const arr = callsByLead.get(c.lead_id as string) ?? [];
      arr.push(c);
      callsByLead.set(c.lead_id as string, arr as typeof calls);
    }

    const bookings: RepBookingRow[] = (appts ?? []).map((a) => ({
      appointment_id: a.id,
      lead_id: a.lead_id,
      patient_name: a.patient_name ?? "(no name)",
      patient_phone: a.patient_phone ?? null,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      booked_at: a.booked_at ?? a.created_at,
      deposit_amount: a.deposit_amount as number | null,
      rep_id: repId,
      rep_name: repName,
      recordings: (callsByLead.get(a.lead_id as string) ?? []).map((c) => ({
        id: c!.id as string,
        recording_url: c!.recording_url as string,
        called_at: c!.called_at as string | null,
        duration: c!.duration as number | null,
      })),
    }));

    return { reps: reps ?? [], bookings };
  });
