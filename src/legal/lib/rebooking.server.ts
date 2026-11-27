// Ported from the Legal app (family-law-floater/src/lib/rebooking.server.ts). Re-run the port script to refresh.
import { bookingState, type BookingAppointment } from "./booking-state";
import { reminderRowsFor, type BookingInput } from "./booking.server";

export async function getLeadBookingState(leadId: string) {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("firm_appointments")
    .select(
      "id, status, outcome, appointment_date, appointment_time, disqualified_at, rebooked_from, location_id, location_name, firm_id",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not check this client's appointment. Please retry.");
  return bookingState(data as BookingAppointment | null);
}

/** Ownership is checked at the endpoint and again under the database lock. */
export async function rebookLeadAfterNoShow(
  input: BookingInput & { previousAppointmentId: string },
  actorUserId: string,
): Promise<{ appointmentId: string; alreadyBooked: boolean }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { validateSlot } = await import("./firm-portal.server");
  // A network retry must reach the atomic function even if its own saved slot
  // is now occupied. All other slots still go through normal validation.
  const { data: prior, error: priorError } = await supabaseAdmin
    .from("firm_appointments")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("rebooked_from", input.previousAppointmentId)
    .maybeSingle();
  if (priorError) throw new Error(priorError.message);
  if (!prior) {
    const valid = await validateSlot(
      input.firmId,
      input.date,
      input.time,
      undefined,
      Boolean(input.customTime),
    );
    if (!valid.ok) throw new Error(valid.error ?? "That time is not available");
  }
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc(
        name: string,
        args: Record<string, unknown>,
      ): Promise<{
        data: { appointmentId: string; alreadyBooked: boolean } | null;
        error: { message: string } | null;
      }>;
    }
  ).rpc("rebook_client_after_no_show", {
    p_lead: input.leadId,
    p_previous: input.previousAppointmentId,
    p_actor: actorUserId,
    p_firm: input.firmId,
    p_lawyer: input.lawyerId,
    p_date: input.date,
    p_time: input.time,
    p_location: input.locationId ?? null,
    p_mode: input.consultMode ?? "in_person",
    p_reminders: reminderRowsFor(input.previousAppointmentId, input.date),
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The booking could not be confirmed. Refresh before trying again.");
  return data;
}
