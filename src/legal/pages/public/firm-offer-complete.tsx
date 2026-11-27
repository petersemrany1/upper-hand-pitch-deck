// Ported from the Legal app (family-law-floater/src/routes/firm-offer-complete.tsx). Re-run the port script to refresh.
import "@/legal/components/firm-offers/offer.css";
const LegalRoutePage = () => (
    <main className="bold-offer">
      <div className="screen" style={{ maxWidth: 660, paddingTop: 90 }}>
        <span className="brand">bold.</span>
        <section className="card" style={{ marginTop: 28 }}>
          <p className="eyebrow">Family law marketing proposal</p>
          <h1>Thanks for completing your signing session.</h1>
          <p>Bold will confirm the agreement once both signatures are complete.</p>
          <p className="muted">
            If you’re still on the call, let Peter know you’re finished. You can now close this tab.
          </p>
        </section>
      </div>
    </main>
  );

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LegalRoutePage as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Signing session complete | Bold" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: LegalRoutePage,
});
