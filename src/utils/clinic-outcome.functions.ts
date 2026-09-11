// Clinic-portal-only attendance recording.
//
// Attendance used to be written straight to clinic_appointments from the
// portal, which meant a clinic tap could silently overwrite an outcome your
// team had already recorded (and left no trace of who said what). Every
// portal write now goes through here:
//   - the write is conditional, so it can never overwrite an existing outcome
//   - a conflict is reported back instead of winning
//   - the change is logged as an appointment note (who + when)
//
// Refund-bearing outcomes (show / proceeded / disqualified) still run through
// processConsultOutcome / disqualifyAppointment — this module only guards the
// no-show and reset paths and provides the pre-flight conflict check.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


type ApptRow = {
  id: string;
  clinic_id: string;
  outcome: string | null;
  stripe_refund_id: string | null;
  square_refund_id: string | null;
};

async function loadAppt(
  supabase: SupabaseLike,
  appointmentId: string,
): Promise<{ appt: ApptRow } | { error: string }> {
  const { data, error } = await supabase
    .from("clinic_appointments")
    .select("id, clinic_id, outcome, stripe_refund_id, square_refund_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Appointment not found" };
  return { appt: data as ApptRow };
}

// Minimal shape we need from the RLS-scoped client on context.
type SupabaseLike = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

const OUTCOME_LABEL: Record<string, string> = {
  show: "showed up",
  proceeded: "booked the procedure",
  noshow: "no show",
  disqualified: "disqualified",
};

function describe(outcome: string | null): string {
  if (!outcome) return "no outcome";
  return OUTCOME_LABEL[outcome] ?? outcome;
}

async function logNote(
  supabase: SupabaseLike,
  appt: ApptRow,
  body: string,
  authorName: string | null,
) {
  let authorType = "clinic";
  try {
    const { data } = await supabase.rpc("is_admin_user");
    if (data === true) authorType = "admin";
  } catch { /* default to clinic */ }
  // Audit trail is best effort — never block the outcome on it.
  try {
    await supabase.from("clinic_appointment_notes").insert({
      appointment_id: appt.id,
      clinic_id: appt.clinic_id,
      author_type: authorType,
      author_name: authorName,
      body,
    });
  } catch { /* ignore */ }
}

function emailFrom(claims: Record<string, unknown>): string | null {
  const e = claims["email"];
  return typeof e === "string" ? e : null;
}

/**
 * Pre-flight check before opening the "how did the consult go?" flow.
 * Returns a conflict when someone (your team or another clinic login) has
 * already recorded attendance for this appointment.
 */
export const checkOutcomeFree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const res = await loadAppt(supabase, data.appointmentId);
    if ("error" in res) return { success: false as const, error: res.error };
    if (res.appt.outcome) {
      return {
        success: false as const,
        conflict: true as const,
        currentOutcome: res.appt.outcome,
        error: `This consult was already recorded as "${describe(res.appt.outcome)}". Refresh to see the latest — contact Admin if that's wrong.`,
      };
    }
    return { success: true as const };
  });

/** Records a no-show. The booking fee is kept, so no refund runs. */
export const recordClinicNoShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const res = await loadAppt(supabase, data.appointmentId);
    if ("error" in res) return { success: false as const, error: res.error };
    const appt = res.appt;
    if (appt.outcome) {
      return {
        success: false as const,
        conflict: true as const,
        currentOutcome: appt.outcome,
        error: `This consult was already recorded as "${describe(appt.outcome)}". Refresh to see the latest — contact Admin if that's wrong.`,
      };
    }

    // Conditional write: if anyone recorded an outcome in the meantime, this
    // matches zero rows and we report the clash rather than overwriting it.
    const { data: updated, error } = await supabase
      .from("clinic_appointments")
      .update({ outcome: "noshow" })
      .eq("id", appt.id)
      .is("outcome", null)
      .select("id");
    if (error) return { success: false as const, error: (error as { message: string }).message };
    if (!updated || (updated as unknown[]).length === 0) {
      const again = await loadAppt(supabase, data.appointmentId);
      const current = "appt" in again ? again.appt.outcome : null;
      return {
        success: false as const,
        conflict: true as const,
        currentOutcome: current,
        error: `Someone just recorded this consult as "${describe(current)}". Refresh to see the latest.`,
      };
    }

    await logNote(supabase, appt, "Attendance recorded: no show.", emailFrom(context.claims as Record<string, unknown>));
    return { success: true as const };
  });

/**
 * Clears a recorded attendance so it can be entered again. Blocked once a
 * refund has been issued — that money has already moved.
 */
export const resetClinicOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const res = await loadAppt(supabase, data.appointmentId);
    if ("error" in res) return { success: false as const, error: res.error };
    const appt = res.appt;
    if (appt.stripe_refund_id || appt.square_refund_id) {
      return { success: false as const, error: "The booking fee has already been refunded, so this can't be changed here. Contact Admin." };
    }
    if (!appt.outcome) return { success: true as const };

    const previous = appt.outcome;
    const { error } = await supabase
      .from("clinic_appointments")
      .update({
        outcome: null,
        // No refund was issued (guarded above), so any stale refund state from
        // a failed attempt must clear too or the card keeps showing it.
        refund_status: null,
        consult_summary: null,
        disqualified_reason: null,
        disqualified_at: null,
        disqualified_by: null,
      })
      .eq("id", appt.id);
    if (error) return { success: false as const, error: (error as { message: string }).message };

    await logNote(
      supabase,
      appt,
      `Attendance cleared (was "${describe(previous)}") so it can be entered again.`,
      emailFrom(context.claims as Record<string, unknown>),
    );
    return { success: true as const };
  });
