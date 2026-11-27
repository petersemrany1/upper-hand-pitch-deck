// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/call-coaching.tsx). Re-run the port script to refresh.

import { VideoModule } from "@/legal/components/training/video-module";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { Page as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Before You Practice — Call Coaching — Legal Group Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <VideoModule
      slug="call-coaching"
      subtitle="Watch this all the way through before your AI practice call. Peter explains how he vets family law leads on the phone."
    />
  );
}
