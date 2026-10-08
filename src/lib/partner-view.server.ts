import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { partnerViewInput, type PartnerViewClinic } from "./partner-view";

type Client = Pick<SupabaseClient<Database>, "rpc" | "from">;

async function requireAdmin(db: Client) {
  const { data, error } = await db.rpc("is_admin_user");
  if (error || data !== true) throw new Error("Only administrators can view another clinic's portal.");
}

export async function listPartnerViewClinicsForAdmin(db: Client): Promise<PartnerViewClinic[]> {
  await requireAdmin(db);
  const { data, error } = await db.from("partner_clinics").select("id,clinic_name,is_active").order("clinic_name");
  if (error) throw new Error("Could not load partner clinics. Please try again.");
  return data ?? [];
}

export async function getPartnerViewClinicForAdmin(db: Client, clinicId: string): Promise<PartnerViewClinic> {
  await requireAdmin(db);
  partnerViewInput.parse({ clinicId });
  const { data, error } = await db.from("partner_clinics").select("id,clinic_name,is_active").eq("id", clinicId).maybeSingle();
  if (error) throw new Error("Could not open this partner portal. Please try again.");
  if (!data) throw new Error("This clinic could not be found. Choose another clinic in Settings.");
  return data;
}
