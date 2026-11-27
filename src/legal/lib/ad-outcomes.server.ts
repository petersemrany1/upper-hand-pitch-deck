// Ported from the Legal app (family-law-floater/src/lib/ad-outcomes.server.ts). Re-run the port script to refresh.
import type { SupabaseClient } from "@supabase/supabase-js";
import { collectPages } from "./collect-pages";
import { addDays, sydneyMidnight } from "./reporting-period";
import { TEST_FIRM_ID } from "./firm-portal-credits";
import type { AdIdentity, OutcomeAppointment, OutcomeLead } from "./ad-outcomes";

export async function loadAdOutcomeSources(
  db: SupabaseClient,
  range: { from: string | null; to: string },
) {
  const [catalog, leads, appointments] = await Promise.all([
    collectPages((from, to) =>
      db
        .from("ad_spend_daily")
        .select("account_id,ad_id,ad_name,campaign_name,adset_name,location")
        .eq("source", "meta")
        .lte("date", range.to)
        .order("date")
        .order("id")
        .range(from, to),
    ),
    collectPages((from, to) => {
      let q = db
        .from("client_leads")
        .select("id,ad_name,campaign_name,ad_set_name,raw_payload,first_name,last_name,firm_id")
        .lt("created_at", sydneyMidnight(addDays(range.to, 1)));
      if (range.from) q = q.gte("created_at", sydneyMidnight(range.from));
      return q.order("id").range(from, to);
    }),
    collectPages((from, to) =>
      db
        .from("firm_appointments")
        .select("id,lead_id,status,outcome,disqualified_at,firm_id,client_name")
        .lte("created_at", new Date().toISOString())
        .order("id")
        .range(from, to),
    ),
  ]);
  return {
    catalog: catalog as AdIdentity[],
    leads: leads.filter(
      (l) =>
        l.firm_id !== TEST_FIRM_ID &&
        !/\b(test|demo)\b/i.test(`${l.first_name ?? ""} ${l.last_name ?? ""}`),
    ) as OutcomeLead[],
    appointments: appointments.filter(
      (a) => a.firm_id !== TEST_FIRM_ID && !/\b(test|demo)\b/i.test(a.client_name ?? ""),
    ) as OutcomeAppointment[],
  };
}
