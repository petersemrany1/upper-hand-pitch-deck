import { supabase } from '@/integrations/supabase/client';
export type MetaAdsApi = { request<T = any>(action: string, data?: Record<string, unknown>): Promise<T> };
export const metaAdsApi: MetaAdsApi = {
  async request<T>(action: string, data = {}): Promise<T> {
    const response = await supabase.functions.invoke('meta-ads', { body: { action, data } });
    if (response.error) {
      let message = response.error.message;
      try { const body = await response.error.context?.json(); if (body?.error) message = body.error; } catch { /* Network errors have no JSON response. */ }
      if (/Failed to send|Failed to fetch|not found/i.test(message)) message = 'The Meta Ads service is not connected yet. Your administrator needs to deploy the Meta Ads backend.';
      throw new Error(message);
    }
    if (response.data?.error) throw new Error(response.data.error);
    return response.data.data;
  },
};
