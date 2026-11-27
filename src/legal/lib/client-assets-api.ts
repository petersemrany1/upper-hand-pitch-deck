// Ported from the Legal app (family-law-floater/src/lib/client-assets-api.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";
import {
  assetCalculationSchema,
  AssetSaveConflict,
  calculateClientAssets,
  type AssetCalculation,
  type SavedAssetCalculation,
} from "./client-assets";

function readRecord(data: {
  calculation: unknown;
  revision: number;
  updated_at: string;
}): SavedAssetCalculation {
  return {
    calculation: assetCalculationSchema.parse(data.calculation),
    revision: data.revision,
    updatedAt: data.updated_at,
  };
}

export async function fetchClientAssets(leadId: string): Promise<SavedAssetCalculation | null> {
  const { data, error } = await supabase
    .from("client_asset_calculations")
    .select("calculation, revision, updated_at")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) throw error;
  return data ? readRecord(data) : null;
}

/** Compare-and-swap: another device's edits cannot be silently overwritten. */
export async function saveClientAssets(
  leadId: string,
  calculation: AssetCalculation,
  revision: number,
): Promise<SavedAssetCalculation> {
  const validated = assetCalculationSchema.parse(calculation);
  if (calculateClientAssets(validated).invalid) throw new Error("Check the highlighted amounts.");
  const table = supabase.from("client_asset_calculations");
  const request =
    revision === 0
      ? table.insert({ lead_id: leadId, calculation: validated, revision: 1 })
      : table
          .update({ calculation: validated, revision: revision + 1 })
          .eq("lead_id", leadId)
          .eq("revision", revision);
  const { data, error } = await request.select("calculation, revision, updated_at").maybeSingle();
  if (error?.code === "23505" || (!error && !data)) {
    const latest = await fetchClientAssets(leadId);
    // A lost response may leave our exact write on the server. A retry can
    // acknowledge that write without issuing another update.
    if (latest && JSON.stringify(latest.calculation) === JSON.stringify(validated)) return latest;
    if (latest?.revision === revision)
      throw new Error("You no longer have permission to edit this client.");
    throw new AssetSaveConflict();
  }
  if (error) throw error;
  if (!data) throw new Error("Couldn’t save to this client.");
  return readRecord(data);
}
