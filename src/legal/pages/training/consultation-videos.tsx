// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/consultation-videos.tsx). Re-run the port script to refresh.

import { VideoModule } from "@/legal/components/training/video-module";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { Page as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "What to Expect at the Consultation — Legal Group Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <VideoModule
      slug="consultation-videos"
      subtitle="What the client experiences at their first meeting with a family lawyer."
      intro={
        <>
          <p>
            Watch these short videos so you know exactly what a client experiences when they go in
            for their first family law consultation.
          </p>
          <p className="mt-2 text-xs">
            These are general explainers from other Australian family law firms — not our partner
            firms. Each firm runs its first meeting its own way, and every consult we book is free
            for the client. A series filmed with a partner firm is coming.
          </p>
        </>
      }
    />
  );
}
