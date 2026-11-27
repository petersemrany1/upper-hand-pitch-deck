// Ported from the Legal app (family-law-floater/src/lib/shared-sales-queue.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";

/** The database chooses and assigns the newest eligible, unreserved client. */
export async function claimSalesLead(
  sessionId: string,
  previousLeadId: string | null = null,
  preferredLeadId: string | null = null,
): Promise<string | null> {
  const args: {
    p_session_id: string;
    p_previous_lead_id?: string;
    p_preferred_lead_id?: string;
  } = { p_session_id: sessionId };
  // Optional RPC keys must be omitted entirely — null or undefined both fail the type.
  if (previousLeadId) args.p_previous_lead_id = previousLeadId;
  if (preferredLeadId) args.p_preferred_lead_id = preferredLeadId;
  const { data, error } = await supabase.rpc("claim_sales_lead", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function renewSalesLead(sessionId: string, leadId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("renew_sales_lead", {
    p_session_id: sessionId,
    p_lead_id: leadId,
  });
  if (error) throw new Error(error.message);
  return data === true;
}
