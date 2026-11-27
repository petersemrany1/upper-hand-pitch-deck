import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { resolveSmsSender } from '../../supabase/functions/_shared/sms-sender';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const getSmsSender = (preferred: string | null = null, mms = false) => resolveSmsSender(supabaseAdmin, preferred, mms);

export async function getUserSmsSender(authenticated: SupabaseClient<Database>, preferred: string | null = null, mms = false): Promise<string> {
  const { data, error } = await authenticated.rpc('my_personal_sms_sender', { p_mms: mms });
  if (error) throw new Error(`Your sending number could not be verified: ${error.message}`);
  return data ?? getSmsSender(preferred, mms);
}

export async function ensureSmsConversation(phone: string, from: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('ensure_sms_thread', { p_phone: phone, p_local_number: from });
  if (error || !data) throw new Error(error?.message ?? 'Could not open this conversation');
  return data;
}
