import { createLazyFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { MetaAdsWizard } from '@/components/meta-ads/MetaAdsWizard';
export const Route = createLazyFileRoute('/_dashboard/meta-ads')({ component: MetaAdsPage });
function MetaAdsPage() {
  const { user, role, ready, userType } = useAuth();
  if (!ready || userType === 'unknown') return <div className="ma-no-access">Loading your workspace…</div>;
  if (!user || role !== 'admin') return <div className="ma-no-access"><h2>Administrator access required</h2><p>Only administrators can create and publish Meta ads.</p></div>;
  return <MetaAdsWizard ownerKey={user.id} />;
}
