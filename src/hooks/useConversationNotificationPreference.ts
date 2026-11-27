import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// This preference follows the signed-in account, regardless of the sending number.
export function useConversationNotificationPreference() {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<{ userId?: string; involvedOnly: boolean; ready: boolean }>({ involvedOnly: false, ready: false });
  useEffect(() => {
    let current = true;
    setState({ userId, involvedOnly: false, ready: false });
    if (!authReady || !userId) return () => { current = false; };
    const refresh = async () => {
      const { data, error } = await supabase.from('sms_notification_preferences').select('involved_only').eq('user_id', userId).maybeSingle();
      if (current) setState({ userId, involvedOnly: data?.involved_only === true, ready: !error });
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { current = false; window.removeEventListener('focus', refresh); };
  }, [authReady, userId]);
  return state.userId === userId ? state : { involvedOnly: false, ready: false };
}
