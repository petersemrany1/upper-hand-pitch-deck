import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
export type PersonalPhoneLine = Database['public']['Tables']['personal_phone_lines']['Row'];
export function usePersonalPhoneLine() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<{ userId?: string; line: PersonalPhoneLine | null; ready: boolean; error: string | null }>({ line: null, ready: false, error: null });
  useEffect(() => {
    let current = true;
    setState({ userId, line: null, ready: false, error: null });
    if (!userId) return () => { current = false; };
    const refresh = async () => {
      const { data, error } = await supabase.from('personal_phone_lines').select('*').eq('user_id', userId).maybeSingle();
      if (current) setState({ userId, line: error ? null : data, ready: !error, error: error?.message ?? null });
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { current = false; window.removeEventListener('focus', refresh); };
  }, [userId]);
  return state.userId === userId ? state : { line: null, ready: false, error: null };
}
