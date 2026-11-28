import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AdPerformanceRow } from "./ad-spend.functions";
import { indexAds, manualOverlapDays, websiteKey, type DailyAd } from "./numbers-ad-identity";
import { locationFromCampaign } from "./meta-spend.server";

type Db = SupabaseClient<Database>;
type Window = { from?: string; to?: string; start?: string; endExclusive?: string; city?: string };
type Spend = DailyAd & { spend_aud: number; impressions: number; clicks: number; updated_at?: string | null };
type Lead = {
  lead_id: string; ad_id: string | null; created_at: string; location: string | null;
  ad_name: string | null; adset_name: string | null; campaign_name: string | null;
  unattributed: boolean; status: string | null; is_booked: boolean; is_showed: boolean;
  is_noshow: boolean; is_upcoming: boolean; needs_outcome: boolean; is_disqualified: boolean;
};

async function pages<T>(fetchPage: (lo: number, hi: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let lo = 0; ; lo += 500) {
    const { data, error } = await fetchPage(lo, lo + 499);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 500) return out;
  }
}

async function readSpend(db: Db) {
  // Resolve legacy leads against all known ads, independently of the selected date window.
  return pages((lo, hi) => db.from("ad_spend_daily")
    .select("ad_id, ad_name, campaign_name, adset_name, location, date, spend_aud, impressions, clicks, source, updated_at")
    .order("date").order("id").range(lo, hi));
}
async function readLeads(db: Db, w: Window) {
  const [outcomes, sources] = await Promise.all([
    pages((lo, hi) => {
      let q = db.from("ad_lead_outcomes").select("lead_id, created_at, location, ad_name, adset_name, campaign_name, unattributed, status, is_booked, is_showed, is_noshow, is_upcoming, needs_outcome, is_disqualified")
        .order("created_at", { ascending: false }).order("lead_id").range(lo, hi);
      if (w.city) q = q.eq("location", w.city).eq("unattributed", false);
      if (w.start) q = q.gte("created_at", w.start);
      if (w.endExclusive) q = q.lt("created_at", w.endExclusive);
      return q;
    }),
    pages((lo, hi) => {
      // Most legacy leads carry no Meta ad ID. Project only existing ID fields
      // from their webhook JSON; never transfer the original patient payload.
      let q = db.from("meta_leads")
        .select("id,snake:raw_payload->>ad_id,camel:raw_payload->>adId,nested:raw_payload->raw_payload->>ad_id,nested_camel:raw_payload->raw_payload->>adId")
        .or("raw_payload->>ad_id.not.is.null,raw_payload->>adId.not.is.null,raw_payload->raw_payload->>ad_id.not.is.null,raw_payload->raw_payload->>adId.not.is.null")
        .order("created_at").order("id").range(lo, hi);
      if (w.start) q = q.gte("created_at", w.start);
      if (w.endExclusive) q = q.lt("created_at", w.endExclusive);
      return q;
    }),
  ]);
  const ids = new Map<string, string>();
  for (const r of sources) {
    const id = [r.snake, r.camel, r.nested, r.nested_camel].find(v => typeof v === "string" && v.trim());
    if (typeof id === "string") ids.set(r.id, id.trim());
  }
  return outcomes.filter(r => r.lead_id).map(r => ({ ...r, ad_id: ids.get(r.lead_id!) ?? null })) as Lead[];
}

/**
 * Spend days that are still a part-day figure. The Make push runs at 3am
 * Sydney and writes the last few days including "today", so the newest day
 * holds only the first few hours of spend until the next morning's push
 * rewrites it. A day is final once any of its rows was written after that
 * day ended (Sydney); until then its leads are whole but its spend is not.
 */
export function partialSpendDays(rows: { date: string; updated_at?: string | null }[]): string[] {
  const lastWrite = new Map<string, string>();
  for (const r of rows) {
    if (!r.updated_at) continue;
    const written = new Date(r.updated_at).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    const cur = lastWrite.get(r.date);
    if (!cur || written > cur) lastWrite.set(r.date, written);
  }
  return [...lastWrite].filter(([day, written]) => written <= day).map(([day]) => day).sort();
}

export function groupAdActivity(history: Spend[], leads: Lead[], w: Window) {
  const identify = indexAds([...history, ...leads.filter(l => !l.unattributed && l.ad_id)]);
  const rows = new Map<string, AdPerformanceRow>();
  const members = new Map<string, Lead[]>();
  const get = (a: Spend | Lead, isWebsite = false) => {
    const { key, id, ambiguous } = isWebsite ? { key: websiteKey, id: null, ambiguous: false } : identify(a);
    let r = rows.get(key);
    if (!r) {
      r = { ad_key: key, ad_id: id, adset_name: isWebsite ? null : a.adset_name,
        ad_name: isWebsite ? "Unattributed" : a.ad_name ?? "Unknown ad",
        location: isWebsite ? null : a.location, name_collision: ambiguous, unattributed: isWebsite,
        spend: 0, impressions: 0, clicks: 0, leads: 0, booked: 0, showed: 0, noshow: 0, upcoming: 0, needs_outcome: 0, disqualified: 0 };
      rows.set(key, r);
    }
    return r;
  };
  const inScope = history.filter(s => (!w.from || s.date >= w.from) && (!w.to || s.date <= w.to) &&
    (!w.city || (locationFromCampaign(s.campaign_name) ?? locationFromCampaign(s.location))?.toLowerCase() === w.city.toLowerCase()));
  for (const s of inScope) {
    const r = get(s);
    // Spend history is ordered by date: use the latest imported display names after a rename.
    if (s.ad_name) r.ad_name = s.ad_name;
    if (s.adset_name) r.adset_name = s.adset_name;
    r.location = locationFromCampaign(s.campaign_name) ?? locationFromCampaign(s.location);
    r.spend += Number(s.spend_aud); r.impressions += Number(s.impressions); r.clicks += Number(s.clicks);
  }
  for (const l of leads) {
    const r = get(l, l.unattributed);
    if (!l.unattributed) r.adset_name ??= l.adset_name;
    r.leads++; r.booked += +!!l.is_booked; r.showed += +!!l.is_showed; r.noshow += +!!l.is_noshow;
    r.upcoming += +!!l.is_upcoming; r.needs_outcome += +!!l.needs_outcome; r.disqualified += +!!l.is_disqualified;
    const list = members.get(r.ad_key!) ?? [];
    list.push(l);
    members.set(r.ad_key!, list);
  }
  return {
    ads: [...rows.values()], members, spendDuplicates: manualOverlapDays(inScope),
    spendPartialDays: partialSpendDays(inScope),
    spendCoverage: { from: history[0]?.date ?? null, to: history.at(-1)?.date ?? null },
  };
}

export async function readAdActivity(db: Db, w: Window) {
  const [history, leads] = await Promise.all([readSpend(db), readLeads(db, w)]);
  return groupAdActivity(history, leads, w);
}
