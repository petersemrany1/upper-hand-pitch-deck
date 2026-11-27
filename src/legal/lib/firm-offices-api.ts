// Ported from the Legal app (family-law-floater/src/lib/firm-offices-api.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";
import type { FirmOffice } from "./firm-offices";

export async function fetchFirmOffices(firmId: string): Promise<FirmOffice[]> {
  const { data, error } = await supabase
    .from("firm_locations")
    .select("*")
    .eq("firm_id", firmId)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveFirmOffice(office: Omit<FirmOffice, "id"> & { id?: string }) {
  const { id, ...values } = office;
  const payload = { ...values, name: values.name.trim(), address: values.address?.trim() || null };
  if (!payload.name || !payload.address) throw new Error("Office name and address are required");
  const query = id
    ? supabase.from("firm_locations").update(payload).eq("id", id).eq("firm_id", office.firm_id)
    : supabase.from("firm_locations").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Office was not saved. Please retry.");
  return data;
}
