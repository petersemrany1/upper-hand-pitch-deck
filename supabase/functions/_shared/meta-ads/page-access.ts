import { MetaError, type Graph } from './graph.ts';
import { accountPath, type Page } from './model.ts';

const identityFields = 'id,name,instagram_business_account{id,username}';
const advertisingTasks = new Set(['ADVERTISE', 'MANAGE', 'PROFILE_PLUS_ADVERTISE', 'PROFILE_PLUS_FULL_CONTROL']);
type AssignedPage = Page & { tasks?: string[] };

// Some edges are available only to people, others only to system users. A
// missing optional edge is expected. Surface transport errors and rate limits.
async function optionalRead<T>(request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (!(error instanceof MetaError) || error.retryable) throw error;
    return fallback;
  }
}

export async function pagesForAccount(graph: Graph, accountId: string): Promise<Page[]> {
  const account = accountPath(accountId);
  const promoted = await optionalRead(graph.all<Page>(`${account}/promote_pages`, { fields: identityFields }), []);
  if (promoted.length) return promoted;

  const fields = 'id,name,tasks';
  const [personal, system] = await Promise.all([
    optionalRead(graph.all<AssignedPage>('me/accounts', { fields }), []),
    optionalRead(graph.all<AssignedPage>('me/assigned_pages', { fields }), []),
  ]);
  const usable = new Map<string, Page>();
  for (const page of [...personal, ...system]) {
    if (page.tasks?.some(task => advertisingTasks.has(task))) usable.set(page.id, { id: page.id, name: page.name });
  }
  if (!usable.size) return [];

  // A system user can administer multiple brands. Bind assigned Pages to this
  // account's business or to Page IDs in this account's existing ad sets.
  const business = await optionalRead(graph.get<{business?: {id: string}}>(account, { fields: 'business' }), {});
  const businessId = business.business?.id;
  const [adsets, owned, partners] = await Promise.all([
    optionalRead(graph.all<{promoted_object?: {page_id?: string}}>(`${account}/adsets`, { fields: 'promoted_object' }), []),
    businessId ? optionalRead(graph.all<Page>(`${businessId}/owned_pages`, { fields: 'id' }), []) : [],
    businessId ? optionalRead(graph.all<Page>(`${businessId}/client_pages`, { fields: 'id' }), []) : [],
  ]);
  const related = new Set([...owned.map(p => p.id), ...partners.map(p => p.id), ...adsets.map(a => a.promoted_object?.page_id)]);
  const selected = [...usable.values()].filter(page => related.has(page.id));
  return Promise.all(selected.map(page => optionalRead(graph.get<Page>(page.id, { fields: identityFields }), page)));
}

export async function grantedPermissions(graph: Graph): Promise<Set<string> | null> {
  const entries = await optionalRead(graph.all<{permission: string; status: string}>('me/permissions'), null);
  return entries && new Set(entries.filter(entry => entry.status === 'granted').map(entry => entry.permission));
}

export function accessMessage(pages: Page[], grants: Set<string> | null, identity?: string): string | undefined {
  const missing = grants && ['ads_management', ...(!pages.length ? ['pages_show_list', 'pages_manage_ads'] : [])].filter(scope => !grants.has(scope));
  const messages: string[] = [];
  if (!pages.length) messages.push(`Meta returned no Facebook Page available to advertise for this account. In Meta Business Settings, assign the Page's advertising task to ${identity || 'the user connected to the portal'}.`);
  if (missing?.length) messages.push(`The connected token is missing ${missing.join(', ')}. Authorize these permissions in Meta and update the portal's Meta access token.`);
  return messages.length ? messages.join(' ') : undefined;
}
