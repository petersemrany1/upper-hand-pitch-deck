import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { resolveSmsSender } from '../../supabase/functions/_shared/sms-sender';

export const getSmsSender = (preferred: string | null = null, mms = false) => resolveSmsSender(supabaseAdmin, preferred, mms);
