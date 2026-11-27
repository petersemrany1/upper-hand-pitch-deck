// Ported from the Legal app (family-law-floater/src/lib/handover-recipients.server.ts). Re-run the port script to refresh.
import { parseHandoverCc } from "./handover-recipients";

// Included on every firm handover, independently of firm defaults or rep edits.
export const HANDOVER_OWNER_EMAIL = "peter@gobold.com.au";

export async function getHandoverCc(firmId: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", `firm_handover_cc:${firmId}`)
    .maybeSingle();
  if (error) throw new Error("Could not load the firm's handover recipients. Please retry.");
  if (!data) return [];
  if (!Array.isArray(data.value) || !data.value.every((v) => typeof v === "string")) {
    throw new Error("The firm's CC list needs to be corrected in its profile.");
  }
  return parseHandoverCc(data.value as string[]);
}

export async function saveHandoverCc(firmId: string, input: string): Promise<string[]> {
  const cc = parseHandoverCc(input);
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: firm, error: firmError } = await supabaseAdmin
    .from("firms")
    .select("id")
    .eq("id", firmId)
    .maybeSingle();
  if (firmError || !firm) throw new Error("Firm not found.");
  const { error } = await supabaseAdmin
    .from("app_settings")
    .upsert({ key: `firm_handover_cc:${firmId}`, value: cc }, { onConflict: "key" });
  if (error) throw new Error("Could not save the CC recipients. Please retry.");
  return cc;
}
