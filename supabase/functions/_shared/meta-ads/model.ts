// Shared by the portal and the Edge Functions. No credentials or runtime imports.
export const GRAPH_VERSION = 'v26.0';
export const BUCKET = 'meta-ad-videos';
export const MAX_VIDEOS = 50;
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
export const GOALS = {
  instant_leads: { label: 'Get leads with a Facebook form', objective: 'OUTCOME_LEADS', optimization: 'LEAD_GENERATION', destination: 'ON_AD' },
  website_leads: { label: 'Get leads on your website', objective: 'OUTCOME_LEADS', optimization: 'OFFSITE_CONVERSIONS', destination: 'WEBSITE' },
  sales: { label: 'Get website sales', objective: 'OUTCOME_SALES', optimization: 'OFFSITE_CONVERSIONS', destination: 'WEBSITE' },
  traffic: { label: 'Send people to your website', objective: 'OUTCOME_TRAFFIC', optimization: 'LINK_CLICKS', destination: 'WEBSITE' },
  video_views: { label: 'Get video views', objective: 'OUTCOME_ENGAGEMENT', optimization: 'THRUPLAY', destination: 'ON_AD' },
  reach: { label: 'Reach more people', objective: 'OUTCOME_AWARENESS', optimization: 'REACH', destination: 'ON_AD' },
} as const;
export type Goal = keyof typeof GOALS;
export type Geo = { key: string; name: string; type: 'country' | 'region' | 'city' | 'zip'; country_code: string; region?: string; radius?: number; latitude?: number; longitude?: number };
export type Named = { id: string; name: string };
export type Creative = { assetId: string; name: string; text: string; headline: string; description: string; cta: string; url: string; urlTags: string };
export type WizardConfig = {
  accountId: string; pageId: string; instagramId: string;
  mode: 'new_campaign' | 'new_adset' | 'existing_adset'; goal: Goal;
  campaignId: string; campaignName: string; adsetId: string; adsetName: string;
  formId: string; pixelId: string; conversionEvent: 'LEAD' | 'PURCHASE' | 'COMPLETE_REGISTRATION';
  budgetScope: 'adset' | 'campaign'; budgetType: 'daily' | 'lifetime'; budget: number;
  startAt: string; endAt: string; locations: Geo[]; excludedLocations: Geo[];
  locationExpansion: boolean; advantageAudience: boolean; ageMin: number; ageMax: number;
  gender: 'all' | 'men' | 'women'; interests: Named[]; audiences: Named[]; excludedAudiences: Named[];
  placements: 'automatic' | 'manual'; platforms: ('facebook' | 'instagram')[];
  facebookPositions: string[]; instagramPositions: string[];
  bidStrategy: 'LOWEST_COST_WITHOUT_CAP' | 'COST_CAP'; bidAmount: number;
  specialCategories: string[]; specialCategoryCountries: string[];
  beneficiary: string; payer: string; leadDeliveryConfirmed: boolean;
  creatives: Creative[];
};
export type Asset = { id: string; draft_id: string; file_name: string; size: number; mime: string; width: number; height: number; duration: number; path: string; thumbnail_path: string; status: 'uploading' | 'ready'; previewUrl?: string; thumbnailUrl?: string };
export type AdProgress = { videoId?: string; creativeId?: string; adId?: string; effectiveStatus?: string; error?: string; activated?: boolean };
export type Inflight = { kind: 'campaign' | 'adset' | 'video' | 'creative' | 'ad'; name: string; assetId?: string; startedAt: string };
export type Progress = { campaignId?: string; adsetId?: string; items: Record<string, AdProgress>; inflight?: Inflight; message?: string; ambiguous?: boolean; pauseRequested?: boolean; pausedAdIds?: string[]; parentActivated?: boolean; activatedAt?: string; baseline?: string; checked?: boolean };
export type Draft = { id: string; owner_id: string; name: string; config: WizardConfig; revision: number; status: 'draft' | 'queued' | 'running' | 'complete' | 'needs_attention' | 'cancelled'; requested_mode: 'PAUSED' | 'ACTIVE' | null; progress: Progress; error: string | null; review_hash: string | null; updated_at: string; created_at: string; assets?: Asset[] };
export type Account = { id: string; name: string; currency: string; timezone_name: string; account_status: number; min_daily_budget?: number };
export type Campaign = Named & { objective: string; status: string; effective_status: string; daily_budget?: string; lifetime_budget?: string; special_ad_categories?: string[] };
export type AdSet = Named & { campaign_id: string; status: string; effective_status: string; targeting: Record<string, any>; daily_budget?: string; lifetime_budget?: string; start_time?: string; end_time?: string; optimization_goal: string; destination_type?: string; promoted_object?: Record<string, string>; bid_strategy?: string };
export type Page = Named & { instagram_business_account?: { id: string; username?: string } };
export type Setup = { configured: boolean; databaseReady: boolean; workerReady: boolean; message?: string; account?: Account; pages: Page[]; campaigns: Campaign[]; permissions?: string[] };
export type Review = { hash: string; expiresAt: string; warnings: string[]; summary: { account: Account; campaign: string; adset: string; budget: string; locationExpansion: boolean; locations: string[]; adCount: number; page: string }; canActivate: boolean; activationBlockers: string[] };

export function emptyConfig(accountId = ''): WizardConfig {
  return { accountId, pageId: '', instagramId: '', mode: 'new_campaign', goal: 'instant_leads', campaignId: '', campaignName: '', adsetId: '', adsetName: '', formId: '', pixelId: '', conversionEvent: 'LEAD', budgetScope: 'adset', budgetType: 'daily', budget: 30, startAt: '', endAt: '', locations: [], excludedLocations: [], locationExpansion: false, advantageAudience: false, ageMin: 18, ageMax: 65, gender: 'all', interests: [], audiences: [], excludedAudiences: [], placements: 'automatic', platforms: ['facebook', 'instagram'], facebookPositions: ['feed', 'story', 'facebook_reels'], instagramPositions: ['stream', 'story', 'reels'], bidStrategy: 'LOWEST_COST_WITHOUT_CAP', bidAmount: 0, specialCategories: [], specialCategoryCountries: [], beneficiary: '', payer: '', leadDeliveryConfirmed: false, creatives: [] };
}
export function emptyCreative(assetId: string, name: string): Creative {
  return { assetId, name: name.replace(/\.[^.]+$/, ''), text: '', headline: '', description: '', cta: 'LEARN_MORE', url: '', urlTags: '' };
}
export const isId = (v: unknown): v is string => typeof v === 'string' && /^\d+$/.test(v);
export function accountPath(id: string) { if (!/^(act_)?\d+$/.test(id)) throw new Error('Choose a valid ad account.'); return id.startsWith('act_') ? id : `act_${id}`; }
export function geoExpansion(targeting: any): boolean | null {
  const v = targeting?.targeting_automation?.individual_setting?.geo;
  return v === 0 || v === '0' ? false : v === 1 || v === '1' ? true : null;
}
export function requireGeoMatch(targeting: any, consent: boolean) {
  const actual = geoExpansion(targeting);
  if (actual === null) throw new Error('Meta did not confirm the location-expansion setting. Publishing is blocked until it can be verified.');
  if (actual !== consent) throw new Error(actual ? 'This ad set has location expansion ON. Explicitly allow it, or use a new ad set with expansion off.' : 'The saved location-expansion setting differs from your choice. Review the audience again.');
}
function geoSpec(locations: Geo[]) {
  const result: Record<string, unknown> = {};
  for (const type of ['country', 'region', 'city', 'zip'] as const) {
    const selected = locations.filter(l => l.type === type);
    if (!selected.length) continue;
    result[{ country: 'countries', region: 'regions', city: 'cities', zip: 'zips' }[type]] = selected.map(l => type === 'country' ? l.key : type === 'city' ? { key: l.key, radius: l.radius || 25, distance_unit: 'kilometer' } : { key: l.key });
  }
  return result;
}
export function buildTargeting(c: WizardConfig) {
  const t: Record<string, any> = {
    geo_locations: geoSpec(c.locations), age_min: c.ageMin, age_max: c.ageMax,
    targeting_automation: { advantage_audience: c.advantageAudience ? 1 : 0, individual_setting: { geo: c.locationExpansion === true ? 1 : 0 } },
  };
  if (c.excludedLocations.length) t.excluded_geo_locations = geoSpec(c.excludedLocations);
  if (c.gender !== 'all') t.genders = [c.gender === 'men' ? 1 : 2];
  if (c.interests.length) t.flexible_spec = [{ interests: c.interests.map(i => ({ id: i.id })) }];
  if (c.audiences.length) t.custom_audiences = c.audiences.map(a => ({ id: a.id }));
  if (c.excludedAudiences.length) t.excluded_custom_audiences = c.excludedAudiences.map(a => ({ id: a.id }));
  if (c.placements === 'manual') {
    t.publisher_platforms = c.platforms;
    if (c.platforms.includes('facebook')) t.facebook_positions = c.facebookPositions;
    if (c.platforms.includes('instagram')) t.instagram_positions = c.instagramPositions;
    t.device_platforms = ['mobile', 'desktop'];
  }
  return t;
}
export function minorUnits(amount: number, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return Math.round(amount * 10 ** digits);
}
export function money(amount: number, currency = 'AUD') { return new Intl.NumberFormat('en-AU', { style: 'currency', currency, currencyDisplay: 'code' }).format(amount); }
export function budgetLabel(c: WizardConfig, account: Account, campaign?: Campaign, adset?: AdSet) {
  const divisor = 10 ** (new Intl.NumberFormat('en', { style: 'currency', currency: account.currency }).resolvedOptions().maximumFractionDigits ?? 2);
  if (campaign?.daily_budget || campaign?.lifetime_budget) return `${money(Number(campaign.daily_budget || campaign.lifetime_budget) / divisor, account.currency)} ${campaign.daily_budget ? 'daily' : 'lifetime'} · shared across campaign`;
  if (c.mode === 'existing_adset' && adset) return `${money(Number(adset.daily_budget || adset.lifetime_budget || 0) / divisor, account.currency)} ${adset.daily_budget ? 'daily' : 'lifetime'} · shared across ad set`;
  return `${money(c.budget, account.currency)} ${c.budgetType} · shared across ${c.budgetScope === 'campaign' ? 'campaign' : 'ad set'}`;
}
export function validateConfig(c: WizardConfig, assets: Asset[], step?: number): string[] {
  const errors: string[] = [];
  const check = (n: number) => step === undefined || step === n;
  if (check(0)) {
    if (!/^(act_)?\d+$/.test(c.accountId)) errors.push('Choose an ad account.');
    if (!isId(c.pageId)) errors.push('Choose the Facebook Page your ads will appear from.');
    if (!(c.goal in GOALS)) errors.push('Choose a supported advertising goal.');
    if (c.mode === 'new_campaign' && !c.campaignName.trim()) errors.push('Name your campaign.');
    if (c.mode !== 'new_campaign' && !isId(c.campaignId)) errors.push('Choose a campaign.');
    if (c.mode === 'existing_adset' && !isId(c.adsetId)) errors.push('Choose an ad set.');
    if (c.mode !== 'existing_adset' && !c.adsetName.trim()) errors.push('Name your ad set.');
  }
  if (check(1)) {
    if (!c.creatives.length) errors.push('Upload at least one video.');
    if (c.creatives.length > MAX_VIDEOS) errors.push(`A batch can contain up to ${MAX_VIDEOS} videos.`);
    if (new Set(c.creatives.map(a => a.assetId)).size !== c.creatives.length) errors.push('Each video can appear only once in a batch.');
    for (const [i, creative] of c.creatives.entries()) {
      const asset = assets.find(a => a.id === creative.assetId);
      if (!asset || asset.status !== 'ready') errors.push(`Video ${i + 1}: finish the upload before continuing.`);
      if (!creative.name.trim() || !creative.text.trim() || !creative.headline.trim()) errors.push(`Video ${i + 1}: add an ad name, primary text and headline.`);
      if (creative.name.length > 200 || creative.headline.length > 255 || creative.text.length > 10000 || creative.description.length > 255) errors.push(`Video ${i + 1}: shorten the ad name, headline, description or text.`);
      if (!['LEARN_MORE', 'SIGN_UP', 'GET_QUOTE', 'BOOK_TRAVEL', 'CONTACT_US', 'SHOP_NOW', 'APPLY_NOW', 'SUBSCRIBE'].includes(creative.cta)) errors.push(`Video ${i + 1}: choose a supported button.`);
      try { const url = new URL(creative.url); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); } catch { errors.push(`Video ${i + 1}: enter a full website URL starting with https://.`); }
      if (creative.urlTags.startsWith('?') || /[\r\n]/.test(creative.urlTags)) errors.push(`Video ${i + 1}: tracking parameters must not start with ? or contain line breaks.`);
    }
  }
  if (check(2) && c.mode !== 'existing_adset') {
    if (!c.locations.length) errors.push('Choose at least one target location.');
    if (c.locations.length + c.excludedLocations.length > 100) errors.push('Use no more than 100 locations.');
    if (c.locations.some(l => c.excludedLocations.some(e => e.type === l.type && e.key === l.key))) errors.push('A location cannot be both included and excluded.');
    for (const l of [...c.locations, ...c.excludedLocations]) {
      if (!l.key || !l.name || !['city', 'country', 'region', 'zip'].includes(l.type) || !/^[A-Z]{2}$/.test(l.country_code)) errors.push('Select locations from the location search results.');
      if (l.type === 'city' && (!Number.isFinite(l.radius) || l.radius! < 1 || l.radius! > 80)) errors.push('City radiuses must be between 1 and 80 km.');
    }
    if (c.locationExpansion && !c.locations.some(l => l.type === 'city' || l.type === 'region')) errors.push('Location expansion is only available for city or region targeting.');
    if (!Number.isInteger(c.ageMin) || !Number.isInteger(c.ageMax) || c.ageMin < 18 || c.ageMax > 65 || c.ageMax < c.ageMin) errors.push('Choose an age range between 18 and 65+.');
    if (c.advantageAudience && (c.ageMax !== 65 || c.ageMin > 25 || c.gender !== 'all')) errors.push('Use original audience for strict age or gender limits, or use ages 18–65+ with Advantage+ audience.');
    if (c.placements === 'manual' && (!c.platforms.length || (c.platforms.includes('facebook') && !c.facebookPositions.length) || (c.platforms.includes('instagram') && !c.instagramPositions.length))) errors.push('Choose at least one placement for each selected platform.');
    if (c.placements === 'manual' && c.platforms.includes('instagram') && !c.instagramId) errors.push('Connect the Page’s Instagram identity or select Facebook placements only.');
  }
  if (check(3)) {
    if (c.goal === 'instant_leads' && !isId(c.formId)) errors.push('Choose a published Facebook lead form.');
    if (c.goal === 'instant_leads' && !c.leadDeliveryConfirmed) errors.push('Confirm that this form sends enquiries to your CRM.');
    if (['website_leads', 'sales'].includes(c.goal) && !isId(c.pixelId)) errors.push('Choose a Meta pixel for website conversions.');
    if (c.mode !== 'existing_adset') {
      if (!Number.isFinite(c.budget) || c.budget <= 0 || c.budget > 1000000) errors.push('Enter a budget greater than zero.');
      if (c.budgetType === 'lifetime' && !c.endAt) errors.push('Lifetime budgets need an end date.');
      if (c.endAt && (!Number.isFinite(Date.parse(c.endAt)) || Date.parse(c.endAt) <= Math.max(Date.now(), Date.parse(c.startAt) || 0))) errors.push('The end date must be after the start date and in the future.');
      if (c.startAt && !Number.isFinite(Date.parse(c.startAt))) errors.push('Choose a valid start date.');
      if (c.bidStrategy === 'COST_CAP' && (!Number.isFinite(c.bidAmount) || c.bidAmount <= 0)) errors.push('Enter a positive cost cap.');
      if (c.budgetScope === 'campaign' && c.mode !== 'new_campaign') errors.push('Use the existing campaign budget, or budget the new ad set.');
    }
    if (c.specialCategories.length && !c.specialCategoryCountries.length && c.mode === 'new_campaign') errors.push('Choose the countries for the special ad category.');
  }
  return [...new Set(errors)];
}
// Reject malformed input rather than treating truthy strings as consent.
export function parseConfig(value: unknown): WizardConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid draft.');
  const v = value as Record<string, any>, base = emptyConfig();
  for (const [key, sample] of Object.entries(base)) {
    if (typeof sample === 'boolean' && typeof v[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
    if (typeof sample === 'string' && (typeof v[key] !== 'string' || v[key].length > 1000)) throw new Error(`Invalid ${key}.`);
    if (typeof sample === 'number' && (typeof v[key] !== 'number' || !Number.isFinite(v[key]))) throw new Error(`Invalid ${key}.`);
    if (Array.isArray(sample) && (!Array.isArray(v[key]) || v[key].length > 100)) throw new Error(`Invalid ${key}.`);
  }
  if (!['new_campaign', 'new_adset', 'existing_adset'].includes(v.mode) || !(v.goal in GOALS) || !['daily', 'lifetime'].includes(v.budgetType) || !['adset', 'campaign'].includes(v.budgetScope) || !['all', 'men', 'women'].includes(v.gender) || !['automatic', 'manual'].includes(v.placements) || !['LOWEST_COST_WITHOUT_CAP', 'COST_CAP'].includes(v.bidStrategy) || !['LEAD', 'PURCHASE', 'COMPLETE_REGISTRATION'].includes(v.conversionEvent)) throw new Error('Invalid campaign settings.');
  for (const c of v.creatives) if (!c || ['assetId', 'name', 'text', 'headline', 'description', 'cta', 'url', 'urlTags'].some(k => typeof c[k] !== 'string' || c[k].length > 10000)) throw new Error('Invalid ad details.');
  for (const l of [...v.locations, ...v.excludedLocations]) if (!l || typeof l.key !== 'string' || typeof l.name !== 'string' || typeof l.country_code !== 'string') throw new Error('Invalid location.');
  for (const a of [...v.interests, ...v.audiences, ...v.excludedAudiences]) if (!a || !isId(a.id) || typeof a.name !== 'string') throw new Error('Invalid audience.');
  if (v.platforms.some((p: string) => !['facebook', 'instagram'].includes(p)) || v.facebookPositions.some((p: string) => !['feed', 'story', 'facebook_reels', 'video_feeds', 'marketplace'].includes(p)) || v.instagramPositions.some((p: string) => !['stream', 'story', 'reels', 'explore'].includes(p))) throw new Error('Invalid placements.');
  if (v.specialCategories.some((p: string) => !['HOUSING', 'EMPLOYMENT', 'FINANCIAL_PRODUCTS_SERVICES', 'ISSUES_ELECTIONS_POLITICS'].includes(p)) || v.specialCategoryCountries.some((p: string) => !/^[A-Z]{2}$/.test(p))) throw new Error('Invalid special ad category.');
  return Object.fromEntries(Object.keys(base).map(k => [k, v[k]])) as WizardConfig;
}
export function campaignPayload(c: WizardConfig, currency: string, name: string) {
  return { name, objective: GOALS[c.goal].objective, status: 'PAUSED', buying_type: 'AUCTION', special_ad_categories: c.specialCategories, ...(c.specialCategories.length ? { special_ad_category_country: c.specialCategoryCountries } : {}), ...(c.budgetScope === 'campaign' ? { [c.budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget']: minorUnits(c.budget, currency), bid_strategy: c.bidStrategy, is_adset_budget_sharing_enabled: false } : { is_adset_budget_sharing_enabled: false }) };
}
export function adsetPayload(c: WizardConfig, currency: string, campaignId: string, name: string, hasCampaignBudget: boolean) {
  const promoted = c.goal === 'instant_leads' ? { page_id: c.pageId } : ['website_leads', 'sales'].includes(c.goal) ? { pixel_id: c.pixelId, custom_event_type: c.conversionEvent } : undefined;
  return { name, campaign_id: campaignId, status: 'PAUSED', billing_event: 'IMPRESSIONS', optimization_goal: GOALS[c.goal].optimization, destination_type: GOALS[c.goal].destination, targeting: buildTargeting(c), ...(promoted ? { promoted_object: promoted } : {}), ...(!hasCampaignBudget ? { [c.budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget']: minorUnits(c.budget, currency), bid_strategy: c.bidStrategy } : {}), ...(c.bidStrategy === 'COST_CAP' ? { bid_amount: minorUnits(c.bidAmount, currency) } : {}), ...(c.startAt ? { start_time: c.startAt } : {}), ...(c.endAt ? { end_time: c.endAt } : {}), ...(c.beneficiary ? { dsa_beneficiary: c.beneficiary } : {}), ...(c.payer ? { dsa_payor: c.payer } : {}) };
}
export function creativePayload(c: WizardConfig, ad: Creative, videoId: string, thumbnailUrl: string, name: string) {
  return { name, object_story_spec: { page_id: c.pageId, ...(c.instagramId ? { instagram_user_id: c.instagramId } : {}), video_data: { video_id: videoId, image_url: thumbnailUrl, message: ad.text, title: ad.headline, link_description: ad.description, call_to_action: { type: ad.cta, value: { link: ad.url, ...(c.goal === 'instant_leads' ? { lead_gen_form_id: c.formId } : {}) } } } }, ...(ad.urlTags ? { url_tags: ad.urlTags } : {}), degrees_of_freedom_spec: { creative_features_spec: { standard_enhancements: { enroll_status: 'OPT_OUT' } } } };
}
