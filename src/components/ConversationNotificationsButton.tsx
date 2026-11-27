import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConversationNotificationPreference } from '@/hooks/useConversationNotificationPreference';
import { followSmsConversation } from '@/utils/sms.functions';

export function ConversationNotificationsButton({ threadId, compact = false }: { threadId: string; compact?: boolean }) {
  const { user } = useAuth();
  const { involvedOnly } = useConversationNotificationPreference();
  const follow = useServerFn(followSmsConversation);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let current = true;
    setFollowing(null);
    if (user && involvedOnly) void supabase.from('sms_thread_participants').select('thread_id').eq('thread_id', threadId).eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (current && !error) setFollowing(Boolean(data));
    });
    return () => { current = false; };
  }, [threadId, user?.id, involvedOnly]);
  if (!involvedOnly) return null;
  const Icon = following ? BellRing : Bell;
  return <button type="button" disabled={saving || following === null || following} className={`inline-flex items-center justify-center gap-1.5 rounded text-xs disabled:opacity-60 ${compact ? "h-7 w-7 shrink-0 text-inherit" : "px-2 py-1.5 text-slate-600"}`} title={following ? 'New replies will appear in your Messages & Phone notifications' : 'Get alerts for new replies in this existing conversation'} onClick={async () => {
    setSaving(true);
    try { await follow({ data: { threadId } }); setFollowing(true); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not enable notifications'); }
    finally { setSaving(false); }
  }}><Icon className="h-3.5 w-3.5" /><span className={compact ? 'sr-only' : undefined}>{following ? 'Notifications on' : 'Notify me'}</span></button>;
}
