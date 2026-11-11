import { GRAPH_VERSION, accountPath } from './model.ts';
export class MetaError extends Error {
  uncertain: boolean;
  retryable: boolean;
  constructor(message: string, uncertain = false, retryable = false) { super(message); this.uncertain = uncertain; this.retryable = retryable; }
}
export type Graph = { get: <T = any>(path: string, params?: Record<string, unknown>) => Promise<T>; post: <T = any>(path: string, params: Record<string, unknown>) => Promise<T>; all: <T = any>(path: string, params?: Record<string, unknown>) => Promise<T[]> };
export function createGraph(token: string): Graph {
  if (!token) throw new Error('Meta publishing is not connected. Configure META_ACCESS_TOKEN in the Meta Ads Edge Functions.');
  async function request<T>(method: string, path: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!/^[a-zA-Z0-9_/-]*$/.test(path)) throw new Error('Invalid Meta resource.');
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) form.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}${method === 'GET' ? `?${form}` : ''}`, { method, headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, ...(method === 'POST' ? { body: form } : {}), signal: AbortSignal.timeout(25000) });
    } catch { throw new MetaError(method === 'POST' ? 'Meta did not confirm this request. We will check for the existing object before doing anything else.' : 'Meta could not be reached. Try again shortly.', method === 'POST', method === 'GET'); }
    let result: any;
    try { result = await response.json(); } catch { throw new MetaError('Meta returned an unreadable response.', method === 'POST', method === 'GET'); }
    if (!response.ok || result.error) {
      const e = result.error || {};
      const message = [e.error_user_title, e.error_user_msg || e.message].filter(Boolean).join(': ').replace(/EA[A-Za-z0-9]{30,}/g, '[redacted]').slice(0, 800) || 'Meta rejected the request.';
      throw new MetaError(message, method === 'POST' && response.status >= 500, response.status === 429 || e.is_transient === true || [4, 17, 32, 613, 80004].includes(e.code));
    }
    return result as T;
  }
  return {
    get: (path, params) => request('GET', path, params),
    post: (path, params) => request('POST', path, params),
    async all<T>(path: string, params = {}) {
      const rows: T[] = []; let after: string | undefined;
      for (let page = 0; page < 50; page++) {
        const result: any = await request('GET', path, { ...params, limit: 100, ...(after ? { after } : {}) });
        if (!Array.isArray(result.data)) throw new Error('Meta returned an unexpected list.');
        rows.push(...result.data);
        if (!result.paging?.next) return rows;
        after = result.paging?.cursors?.after;
        if (!after) throw new Error('Meta pagination could not be continued.');
      }
      throw new Error('This account has too many results to load safely. Narrow the selection in Ads Manager.');
    },
  };
}
export const CAMPAIGN_FIELDS = 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,special_ad_categories';
export const ADSET_FIELDS = 'id,name,campaign_id,status,effective_status,targeting,daily_budget,lifetime_budget,start_time,end_time,optimization_goal,destination_type,promoted_object,bid_strategy';
export function configuredAccount(value: string | undefined) { if (!value) throw new Error('Configure META_AD_ACCOUNT_ID in the Meta Ads Edge Functions.'); return accountPath(value); }
export async function fingerprint(value: unknown) {
  function stable(v: any): any { return Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v; }
  const bytes = new TextEncoder().encode(JSON.stringify(stable(value)));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}
