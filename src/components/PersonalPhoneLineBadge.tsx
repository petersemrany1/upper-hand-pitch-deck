import { Phone } from 'lucide-react';
import { usePersonalPhoneLine } from '@/hooks/usePersonalPhoneLine';

export function PersonalPhoneLineBadge() {
  const { line } = usePersonalPhoneLine();
  if (!line) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-white px-4 py-2 text-xs text-slate-600">
      <Phone className="h-3.5 w-3.5" />
      <span>Your number: <strong className="text-slate-900">{line.number}</strong></span>
      <span>{line.enabled ? 'Calls and texts · Alerts for conversations you’re involved in' : 'Currently unavailable'}</span>
    </div>
  );
}
