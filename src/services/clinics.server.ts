import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Clinics service: server-side (service-role) clinic lookups shared by
 * server functions. Client-side clinic access goes through src/data.
 */

export type ClinicSummary = {
  clinicName: string | null;
  doctorName: string | null;
  addressLine: string | null;
};

/**
 * Look up display details for a clinic id, checking the CRM `clinics` table
 * first and falling back to `partner_clinics`.
 */
export async function getClinicSummary(clinicId: string): Promise<ClinicSummary | null> {
  const { data: clinicRow } = await supabaseAdmin
    .from("clinics")
    .select("clinic_name, doctor_name, address, city, state")
    .eq("id", clinicId)
    .maybeSingle();

  let row: {
    clinic_name?: string | null;
    doctor_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  } | null = clinicRow;

  if (!row) {
    const { data: partnerRow } = await supabaseAdmin
      .from("partner_clinics")
      .select("clinic_name, address, city, state")
      .eq("id", clinicId)
      .maybeSingle();
    row = partnerRow ? { ...partnerRow, doctor_name: null } : null;
  }
  if (!row) return null;

  const addrParts = [row.address, row.city, row.state]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);

  return {
    clinicName: row.clinic_name?.trim() || null,
    doctorName: row.doctor_name?.trim() || null,
    addressLine: addrParts.length ? addrParts.join(", ") : null,
  };
}
