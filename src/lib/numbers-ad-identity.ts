// Meta display names are editable and need not be unique, even in one campaign.
export type AdIdentity = {
  ad_id: string | null;
  ad_name: string | null;
  adset_name: string | null;
  campaign_name: string | null;
};
const norm = (v: string | null) => (v ?? "").trim().toLowerCase();
const tuple = (...fields: (string | null)[]) => JSON.stringify(fields.map(norm));
export const websiteKey = "website";

export function indexAds(history: AdIdentity[]) {
  const candidates = new Map<string, Set<string>>();
  for (const a of history) {
    if (!a.ad_id || !a.ad_name) continue;
    const scopes = [tuple(a.campaign_name, a.ad_name)];
    if (a.adset_name) scopes.push(tuple(a.campaign_name, a.ad_name, a.adset_name));
    for (const scope of scopes) {
      const ids = candidates.get(scope) ?? new Set();
      ids.add(a.ad_id);
      candidates.set(scope, ids);
    }
  }
  return (a: AdIdentity) => {
    const campaignAd = tuple(a.campaign_name, a.ad_name);
    const scope = a.adset_name ? tuple(a.campaign_name, a.ad_name, a.adset_name) : campaignAd;
    const ids = candidates.get(scope);
    const id = a.ad_id || (ids?.size === 1 ? [...ids][0] : null);
    return {
      id,
      key: id ? 'id:' + id : 'legacy:' + scope,
      ambiguous: !id && (candidates.get(campaignAd)?.size ?? 0) > 1,
    };
  };
}

export type DailyAd = AdIdentity & { date: string; location: string | null; source: string };
export function manualOverlapDays(rows: DailyAd[]): number {
  const imports = new Map<string, DailyAd[]>();
  const key = (r: DailyAd) => tuple(r.date, r.location || r.campaign_name, r.ad_name);
  for (const r of rows) {
    if (r.source === 'manual') continue;
    const k = key(r);
    const group = imports.get(k) ?? [];
    group.push(r);
    imports.set(k, group);
  }
  return new Set(rows.filter(r => r.source === 'manual' && imports.get(key(r))?.some(other =>
    (!r.ad_id || !other.ad_id || r.ad_id === other.ad_id) &&
    (!r.adset_name || !other.adset_name || norm(r.adset_name) === norm(other.adset_name))
  )).map(r => r.date)).size;
}

// Matches the database unique index on (date, COALESCE(ad_id, ad_name)).
export const dailySpendKey = (row: { date: string; ad_id: string | null; ad_name: string }) =>
  JSON.stringify([row.date, row.ad_id ?? row.ad_name]);
