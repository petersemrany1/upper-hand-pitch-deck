// Ported from the Legal app (family-law-floater/src/lib/delete-test-appointment.server.ts). Re-run the port script to refresh.
import { TEST_FIRM_ID } from "./firm-portal-credits";

export async function deleteTestAppointment(
  appointmentId: string,
  caller: { isAdmin: boolean; firmId: string | null },
) {
  if (!caller.isAdmin && caller.firmId !== TEST_FIRM_ID)
    throw new Error("Test firm access required");
  const { supabaseAdmin: db } = await import("@/legal/integrations/supabase/client.server");
  // One constrained delete: never delete another tenant's record or a real
  // lead/offer-linked appointment, even when called directly by an admin.
  const { data, error } = await db
    .from("firm_appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("firm_id", TEST_FIRM_ID)
    .is("lead_id", null)
    .is("offer_pack_id", null)
    .is("stripe_refund_id", null)
    .select("id");
  if (error) throw new Error("Could not delete this test appointment. Please try again.");
  if (!data?.length) throw new Error("Only unlinked test-firm appointments can be deleted");
  return { ok: true };
}
