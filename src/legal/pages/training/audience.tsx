// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/audience.tsx). Re-run the port script to refresh.

import { VideoModule } from "@/legal/components/training/video-module";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { Page as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Understanding Who You Are Talking To — Legal Group Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <VideoModule
      slug="audience"
      subtitle="Know your client: who they are, what they're carrying, and how to speak to them so they trust you."
    />
  );
}
