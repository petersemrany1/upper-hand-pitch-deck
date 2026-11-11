import { GOALS, accountPath, budgetLabel, requireGeoMatch, validateConfig, type Account, type AdSet, type Asset, type Campaign, type Geo, type Page, type Review, type WizardConfig } from './model.ts';
import { ADSET_FIELDS, CAMPAIGN_FIELDS, fingerprint, type Graph } from './graph.ts';
export async function pagesForAccount(graph: Graph, accountId: string): Promise<Page[]> {
  return graph.all(`${accountPath(accountId)}/promote_pages`, { fields: 'id,name,instagram_business_account{id,username}' });
}
export async function searchLocations(graph: Graph, query: string, country: string, type: string): Promise<Geo[]> {
  if (!['country','region','city','zip'].includes(type) || !/^[A-Z]{2}$/.test(country)) throw new Error('Choose a country and location type.');
  const result = await graph.get('search', { type: 'adgeolocation', q: query, country_code: country, location_types: [type], limit: 100 });
  return (result.data || []).map((l: any) => ({ key: String(l.key), name: l.name, type: l.type, country_code: l.country_code || (l.type === 'country' ? l.key : country), region: l.region, ...(l.type === 'city' ? { radius: 25 } : {}), ...(Number.isFinite(l.latitude) ? { latitude: l.latitude, longitude: l.longitude } : {}) })).filter((l: Geo) => l.type === type && l.country_code === country);
}
export function targetingLocations(adset?: AdSet): string[] {
  const g = adset?.targeting?.geo_locations || {};
  return [...(g.countries || []).map((c: string) => c), ...(g.regions || []).map((r: any) => r.name || `Region ${r.key}`), ...(g.cities || []).map((c: any) => `${c.name || `City ${c.key}`} · ${c.radius || 0} ${c.distance_unit || 'km'}`), ...(g.zips || []).map((z: any) => z.name || z.key), ...(g.custom_locations || []).map((l: any) => `${l.address || `${l.latitude}, ${l.longitude}`} · ${l.radius} ${l.distance_unit}`)];
}
export async function inspectDraft(graph: Graph, c: WizardConfig, assets: Asset[], configuredId: string, options: { verifyLocations?: boolean } = {}) {
  const errors = validateConfig(c, assets);
  if (errors.length) throw new Error(errors.join('\n'));
  if (accountPath(c.accountId) !== configuredId) throw new Error('This ad account is not connected to the portal.');
  const account = await graph.get<Account>(configuredId, { fields: 'id,name,currency,timezone_name,account_status' });
  if (account.account_status !== 1) throw new Error('This Meta ad account is not active. Resolve its account or billing issue in Ads Manager.');
  const pages = await pagesForAccount(graph, configuredId);
  const page = pages.find(p => p.id === c.pageId);
  if (!page) throw new Error('The selected Page is not available to this ad account.');
  if (c.instagramId && page.instagram_business_account?.id !== c.instagramId) throw new Error('The Instagram identity does not belong to the selected Facebook Page.');
  let campaign: Campaign | undefined, adset: AdSet | undefined;
  if (c.mode !== 'new_campaign') {
    campaign = await graph.get<Campaign & { account_id: string }>(c.campaignId, { fields: `${CAMPAIGN_FIELDS},account_id` });
    if (accountPath((campaign as any).account_id) !== configuredId) throw new Error('The campaign belongs to another ad account.');
    if (campaign.objective !== GOALS[c.goal].objective) throw new Error('This campaign uses a different goal. Choose a compatible campaign or create a new one.');
    if (['DELETED','ARCHIVED'].includes(campaign.status)) throw new Error('This campaign is archived or deleted.');
    if (campaign.special_ad_categories?.length && c.mode !== 'existing_adset') throw new Error('This campaign uses a special ad category. Create its compliant audience in Ads Manager, then choose that existing ad set.');
  }
  if (c.mode === 'existing_adset') {
    adset = await graph.get<AdSet>(c.adsetId, { fields: ADSET_FIELDS });
    if (adset.campaign_id !== c.campaignId) throw new Error('This ad set does not belong to the selected campaign.');
    if (['DELETED','ARCHIVED'].includes(adset.status)) throw new Error('This ad set is archived or deleted.');
    requireGeoMatch(adset.targeting, c.locationExpansion);
    if (adset.optimization_goal !== GOALS[c.goal].optimization || (adset.destination_type && adset.destination_type !== GOALS[c.goal].destination)) throw new Error('This ad set uses a different optimization or destination. Create a new ad set for this goal.');
    if (adset.promoted_object?.page_id && adset.promoted_object.page_id !== c.pageId) throw new Error('This ad set uses a different Facebook Page.');
    if (['website_leads','sales'].includes(c.goal) && (adset.promoted_object?.pixel_id !== c.pixelId || adset.promoted_object?.custom_event_type !== c.conversionEvent)) throw new Error('The pixel or conversion event differs from the existing ad set.');
    if (adset.end_time && Date.parse(adset.end_time) <= Date.now()) throw new Error('This ad set has ended. Choose another or create a new ad set.');
  }
  if (c.specialCategories.length && c.mode === 'new_campaign') throw new Error('For special ad categories, set up the campaign and compliant audience in Ads Manager, then select its existing ad set here.');
  if (c.goal === 'instant_leads') {
    const forms = await graph.all(`${c.pageId}/leadgen_forms`, { fields: 'id,name,status' });
    if (!forms.some((f: any) => f.id === c.formId && f.status === 'ACTIVE')) throw new Error('Choose an active lead form belonging to this Page.');
  }
  if (['website_leads','sales'].includes(c.goal)) {
    const pixels = await graph.all(`${configuredId}/adspixels`, { fields: 'id,name' });
    if (!pixels.some((p: any) => p.id === c.pixelId)) throw new Error('This pixel is not available to the ad account.');
  }
  if (options.verifyLocations && c.mode !== 'existing_adset') {
    for (const location of [...c.locations, ...c.excludedLocations]) {
      const matches = await searchLocations(graph, location.name, location.country_code, location.type);
      if (!matches.some(l => l.key === location.key)) throw new Error(`Meta could not verify ${location.name} in ${location.country_code}. Remove it and search again.`);
    }
  }
  const warnings = ['A daily budget is an average, not a strict daily spending limit. Meta controls delivery and reviews every ad.'];
  if (!c.instagramId && c.placements === 'automatic') warnings.push('No connected Instagram identity was selected. Meta may use your Facebook Page identity on supported Instagram placements.');
  if (c.locationExpansion) warnings.push('You explicitly allowed Meta to reach people interested in your selected cities or regions, including people outside them.');
  if (c.advantageAudience) warnings.push('Advantage+ may expand audience suggestions. The separate location-expansion choice is still checked.');
  if (c.mode === 'existing_adset') warnings.push('These ads share the existing ad set’s audience, schedule and budget. Adding ads can redistribute its delivery.');
  if (campaign?.daily_budget || campaign?.lifetime_budget) warnings.push('Meta shares this campaign budget across its ad sets. The new videos do not each receive this amount.');
  const activationBlockers: string[] = [];
  if (campaign && campaign.status !== 'ACTIVE') activationBlockers.push('The existing campaign is paused. Activate it in Ads Manager or create this batch paused.');
  if (adset && adset.status !== 'ACTIVE') activationBlockers.push('The existing ad set is paused. Activate it in Ads Manager or create this batch paused.');
  const snapshot = { account, page, campaign: campaign || null, adset: adset || null };
  return { account, campaign, adset, snapshot, warnings, activationBlockers, summary: { account, campaign: campaign?.name || c.campaignName, adset: adset?.name || c.adsetName, budget: budgetLabel(c, account, campaign, adset), locationExpansion: c.locationExpansion, locations: adset ? targetingLocations(adset) : c.locations.map(l => `${l.name}${l.region ? `, ${l.region}` : ''}, ${l.country_code}${l.type === 'city' ? ` · ${l.radius} km` : ''}`), adCount: c.creatives.length, page: page.name } };
}
export async function makeReview(graph: Graph, c: WizardConfig, assets: Asset[], account: string, revision: number) {
  const inspected = await inspectDraft(graph, c, assets, account, { verifyLocations: true });
  const snapshotHash = await fingerprint(inspected.snapshot);
  const hash = await fingerprint({ config: c, revision, assets: assets.filter(a => c.creatives.some(x => x.assetId === a.id)).map(a => ({ id: a.id, path: a.path, size: a.size, status: a.status })), snapshotHash });
  const review: Review = { hash, expiresAt: new Date(Date.now() + 15 * 60000).toISOString(), warnings: inspected.warnings, summary: inspected.summary, canActivate: !inspected.activationBlockers.length, activationBlockers: inspected.activationBlockers };
  return { ...review, snapshotHash };
}
