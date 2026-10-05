import type { SupabaseClient } from "@supabase/supabase-js";

/** Read after payment/booking updates so completed bookings do not send alerts. */
export async function needsPaymentBookingAlert(supabase: SupabaseClient, leadId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("meta_leads")
    .select("status")
    .eq("id", leadId)
    .single();

  if (error) throw new Error(`Could not check paid lead status: ${error.message}`);
  if (!data) throw new Error("Could not find paid lead to check booking status");

  const status = (data.status ?? "").trim().toLowerCase();
  return status !== "booked_deposit_paid" && status !== "booked — deposit paid";
}
