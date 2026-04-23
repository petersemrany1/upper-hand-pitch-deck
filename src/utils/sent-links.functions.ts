import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// Logs every send (payment link or contract) so it can be resent later
// from the Sent Links page. Uses service role to bypass RLS for trusted writes.

function getAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export const recordSentLink = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      kind: "payment_link" | "contract";
      clinicName: string;
      contactName: string;
      email: string | null;
      phone: string | null;
      packageName: string;
      shows: number;
      perShowFee: number;
      totalExcGst: number;
      gst: number;
      totalIncGst: number;
      stripeUrl: string | null;
      sendMethod: "email" | "sms" | "both";
    }) => data
  )
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    const { data: row, error } = await supabase
      .from("sent_links")
      .insert({
        kind: data.kind,
        clinic_name: data.clinicName,
        contact_name: data.contactName,
        email: data.email,
        phone: data.phone,
        package_name: data.packageName,
        shows: data.shows,
        per_show_fee: data.perShowFee,
        total_exc_gst: data.totalExcGst,
        gst: data.gst,
        total_inc_gst: data.totalIncGst,
        stripe_url: data.stripeUrl,
        send_method: data.sendMethod,
      })
      .select()
      .single();

    if (error) {
      console.error("recordSentLink error:", error);
      return { success: false as const, error: error.message };
    }
    return { success: true as const, id: row.id as string };
  });

export const updateSentLinkMethod = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; method: "email" | "sms" | "both" }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from("sent_links")
      .update({ send_method: data.method })
      .eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

export const deleteSentLink = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    const { error } = await supabase.from("sent_links").delete().eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

export const updateSentLinkNotes = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from("sent_links")
      .update({ notes: data.notes })
      .eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });
