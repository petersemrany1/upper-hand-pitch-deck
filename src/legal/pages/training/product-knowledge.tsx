// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/product-knowledge.tsx). Re-run the port script to refresh.

import { VideoModule } from "@/legal/components/training/video-module";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { Page as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Product Knowledge — Legal Group Portal" }] }),
  component: Page,
});

function Page() {
  return (
    <VideoModule
      slug="product-knowledge"
      subtitle="What Legal Group does, why it matters, our values, and the core of family law: how a separation gets sorted, what it costs, how people fund it — and the one rule you never break."
    />
  );
}
