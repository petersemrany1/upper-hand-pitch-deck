import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalPhoneLine } from '@/hooks/usePersonalPhoneLine';
import { followSmsConversation } from '@/utils/sms.functions';

export function ConversationNotificationsButton({ threadId }: { threadId: string }) {
  const { user } = useAuth();
  const { line } = usePersonalPhoneLine();
  const follow = useServerFn(followSmsConversation);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let current = true;
    setFollowing(null);
    if (user && line) void supabase.from('sms_thread_participants').select('thread_id').eq('thread_id', threadId).eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (current && !error) setFollowing(Boolean(data));
    });
    return () => { current = false; };
  }, [threadId, user?.id, line?.id]);
  if (!line) return null;
  const Icon = following ? BellRing : Bell;
  return <button type="button" disabled={saving || following === null || following} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-slate-600 disabled:opacity-60" title={following ? 'New replies will appear in your Messages & Phone notifications' : 'Get alerts for new replies in this existing conversation'} onClick={async () => {
    setSaving(true);
    try { await follow({ data: { threadId } }); setFollowing(true); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not enable notifications'); }
    finally { setSaving(false); }
  }}><Icon className="h-3.5 w-3.5" />{following ? 'Notifications on' : 'Notify me'}</button>;
}
