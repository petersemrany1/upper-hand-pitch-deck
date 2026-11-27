// Ported from the Legal app (family-law-floater/src/lib/firm-pipeline-access.ts). Re-run the port script to refresh.
/** Full workflow access is an individual grant in addition to the /firms tab. */
export async function assertFirmPipelineAccess(db: {
  rpc: (fn: "can_manage_firm_pipeline") => PromiseLike<{ data: unknown; error: unknown }>;
}): Promise<void> {
  const { data, error } = await db.rpc("can_manage_firm_pipeline");
  if (error || typeof data !== "boolean") throw new Error("Could not verify Firm Pipeline access");
  if (!data) throw new Error("You do not have access to work the Firm Pipeline");
}
