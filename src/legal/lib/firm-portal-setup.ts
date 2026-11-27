// Ported from the Legal app (family-law-floater/src/lib/firm-portal-setup.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";

export async function fetchFirmPortalLink(applicationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("firm_pipeline_portals")
    .select("firm_id")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.firm_id ?? null;
}

export async function setUpFirmPortal(applicationId: string) {
  const { data, error } = await supabase.rpc("set_up_firm_portal", {
    p_application_id: applicationId,
  });
  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new Error("Could not confirm portal setup. Please try again.");
  return data[0];
}
