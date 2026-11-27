// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/platform.tsx). Re-run the port script to refresh.

import { VideoModule } from "@/legal/components/training/video-module";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { Page as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Platform Training — Legal Group Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <VideoModule
      slug="platform"
      subtitle="Tour of the portal: leads, the Sales Call cockpit, callbacks, Inbox, booking + deposit, handover and the leaderboard."
    />
  );
}
