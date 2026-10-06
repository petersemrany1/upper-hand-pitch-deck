import type { SupabaseClient } from "@supabase/supabase-js";

export const PAYMENT_BOOKING_GRACE_MS = 45 * 60 * 1000;

/** Re-read the payment and status when queuing and immediately before sending. */
export async function paymentBookingAlertState(supabase: SupabaseClient, leadId: string, now = Date.now()) {
  if (!leadId) throw new Error("Payment booking alert requires a lead ID");
  const { data, error } = await supabase.from("meta_leads")
    .select("status, deposit_paid_at").eq("id", leadId).single();
  if (error) throw new Error(`Could not check paid lead status: ${error.message}`);
  if (!data) throw new Error("Could not find paid lead to check booking status");
  const status = (data.status ?? "").trim().toLowerCase();
  if (status === "booked_deposit_paid" || status === "booked — deposit paid" || !data.deposit_paid_at) {
    return { action: "cancel" as const };
  }
  const paidAt = Date.parse(data.deposit_paid_at);
  if (!Number.isFinite(paidAt)) throw new Error("Invalid deposit payment timestamp");
  const notBefore = new Date(paidAt + PAYMENT_BOOKING_GRACE_MS).toISOString();
  return { action: now > paidAt + PAYMENT_BOOKING_GRACE_MS ? "send" as const : "wait" as const, notBefore };
}

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
