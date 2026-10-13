import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { periodInstants } from "@/lib/reporting-period";

export type DashboardBooking = {
  id: string;
  leadId: string | null;
  name: string;
  city: string;
  cityFromClinic: boolean;
  ad: string | null;
  campaign: string | null;
  bookedAt: string | null;
};

function rawString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const direct = row[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const nested = row.raw_payload;
  if (nested && typeof nested === "object") {
    const value = (nested as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

const CITIES = ["Byron Bay", "Gold Coast", "Sunshine Coast", "Central Coast", "Melbourne", "Sydney", "Perth", "Brisbane", "Adelaide", "Canberra", "Hobart", "Darwin", "Newcastle", "Cairns", "Geelong", "Wollongong", "Townsville"];

/** The list and headline use these same booking rows, dated by when they were booked. */
export async function loadDashboardBookingsToday(
  client: SupabaseClient<Database>,
  repId: string | null,
  now = new Date(),
) {
  const range = periodInstants("day", "", "", now)!;
  const bookings: DashboardBooking[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const query = client.from("clinic_appointments")
      .select(`id, lead_id, patient_name, booked_at,
        lead:meta_leads!clinic_appointments_lead_id_fkey(campaign_name, ad_name, raw_payload),
        clinic:partner_clinics!clinic_appointments_clinic_id_fkey(city)`)
      .gte("booked_at", range.from!)
      .lt("booked_at", range.to!)
      .not("patient_name", "ilike", "%test%")
      .not("patient_name", "ilike", "%demo%")
      .order("booked_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (repId) query.eq("booking_rep_id", repId);
    const { data, error } = await query;
    if (error) return { data: null, count: null, error };
    for (const row of data ?? []) {
      const campaign = row.lead?.campaign_name?.trim() || null;
      const campaignCity = CITIES.find(city => campaign?.toLowerCase().includes(city.toLowerCase()));
      const sourceCity = campaignCity || rawString(row.lead?.raw_payload, "location");
      const clinicCity = row.clinic?.city?.trim() || null;
      bookings.push({
        id: row.id,
        leadId: row.lead_id,
        name: row.patient_name?.trim() || "Unknown patient",
        city: sourceCity || clinicCity || "Not recorded",
        cityFromClinic: !sourceCity && !!clinicCity,
        ad: row.lead?.ad_name?.trim() || rawString(row.lead?.raw_payload, "ad_name"),
        campaign,
        bookedAt: row.booked_at,
      });
    }
    if ((data?.length ?? 0) < pageSize) break;
  }
  return { data: bookings, count: bookings.length, error: null };
}
