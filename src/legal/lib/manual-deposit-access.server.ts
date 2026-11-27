// Ported from the Legal app (family-law-floater/src/lib/manual-deposit-access.server.ts). Re-run the port script to refresh.
export async function assertManualDepositLeadAccess(
  supabase: {
    rpc: (fn: "is_admin_user" | "current_sales_rep_id") => PromiseLike<{ data: unknown }>;
  },
  leadId: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: isAdmin } = await supabase.rpc("is_admin_user");
  if (isAdmin === true) return;

  const { data: repId } = await supabase.rpc("current_sales_rep_id");
  const { data: lead } = await supabaseAdmin
    .from("client_leads")
    .select("rep_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!repId || !lead || lead.rep_id !== repId) throw new Error("You cannot act on this lead");
}
