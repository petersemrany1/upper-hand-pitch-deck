import { LegalView } from "./LegalView";
import { useLegalLive, legalTrialOn } from "./runtime/trial";

// A Legal public page (firm portal, offers, deposits, guides) at the same
// address it has on boldfamilylaw.com.au. It answers only once the Legal move is
// switched over (or with ?legalData=portal while testing).
export function LegalStandalone({ path }: { path: string }) {
  const { loaded } = useLegalLive();
  if (!loaded) return null;
  if (!legalTrialOn())
    return (
      <div className="mx-auto max-w-md p-10 text-center text-sm" style={{ color: "#6b6b68" }}>
        This page is on <a className="underline" href={`https://boldfamilylaw.com.au${window.location.pathname}${window.location.search}`}>boldfamilylaw.com.au</a>.
      </div>
    );
  return <LegalView path={path} fullscreen />;
}
