// Ported from the Legal app (family-law-floater/src/components/firm-offers/LegacyFirmOfferPanel.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { FirmApplication } from "@/legal/lib/firm-applications";
import { offerWorkspaceFn, saveOfferDraftFn, offerActionFn } from "@/legal/lib/firm-offers/functions";
import type { Offer, OfferDraft } from "@/legal/lib/firm-offers/model";
import { pdfBlobUrl } from "./pdf-url";
import { LegacyOfferAdminView } from "./LegacyOfferAdminView";
export function LegacyFirmOfferPanel({
  app,
  onClose,
}: {
  app: FirmApplication;
  onClose: () => void;
}) {
  const get = useServerFn(offerWorkspaceFn),
    save = useServerFn(saveOfferDraftFn),
    action = useServerFn(offerActionFn);
  const query = useQuery({
    queryKey: ["firm-offers", app.id],
    queryFn: () => get({ data: { applicationId: app.id } }),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [pdf, setPdf] = useState(""),
    [firmId, setFirmId] = useState(""),
    [notice, setNotice] = useState("");
  const perform = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await query.refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const run = (o: Offer, a: string) =>
    void perform(async () => {
      const r = await action({
        data: { offerId: o.id, action: a, ...(a === "activate" ? { firmId } : {}) },
      });
      if ("pdf" in r && typeof r["pdf"] === "string") {
        if (pdf) URL.revokeObjectURL(pdf);
        setPdf(pdfBlobUrl(r["pdf"]));
      }
      if ("link" in r && typeof r.link === "string") {
        await navigator.clipboard.writeText(r.link);
        setNotice("Secure link copied.");
      }
      if ("packId" in r) setNotice("Pack activated. Funded booking capacity is now available.");
      if ("url" in r && typeof r["url"] === "string") window.location.assign(r["url"]);
    });
  const initial: OfferDraft = {
    applicationId: app.id,
    firmName: app.firm_name ?? "",
    contactName: [app.first_name, app.last_name].filter(Boolean).join(" "),
    email: app.email ?? "",
    mobile: app.phone?.replace(/^0/, "+61") ?? "",
    arrangement: "upfront",
    priceCents: 185000,
  };
  return (
    <div
      className="bold-offer-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Proposal and agreement"
    >
      <LegacyOfferAdminView
        key={query.data?.offers[0]?.id ?? app.id}
        initial={query.data?.offers[0]?.draft ?? initial}
        offers={query.data?.offers ?? []}
        delivery={query.data?.delivery ?? []}
        blockers={query.data?.legacyBlockers ?? ["Loading configuration"]}
        busy={busy || query.isLoading}
        error={error || query.error?.message || ""}
        onClose={() => {
          if (pdf) URL.revokeObjectURL(pdf);
          onClose();
        }}
        onSave={(d) => void perform(() => save({ data: d }))}
        onAction={run}
      />
      {notice && (
        <div className="bold-offer">
          <div className="screen" role="status">
            {notice}
          </div>
        </div>
      )}
      {query.data?.offers[0]?.onboardingComplete && (
        <div className="bold-offer">
          <div className="screen">
            <section className="card">
              <h2>Start services</h2>
              <p className="muted">
                Link this confirmed agreement to the verified firm record. Existing active packs
                require a separate migration decision.
              </p>
              <label>
                Firm record
                <select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
                  <option value="">Select a firm</option>
                  {query.data.firms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.firm_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="actions">
                <button
                  disabled={busy || !firmId}
                  onClick={() => run(query.data!.offers[0]!, "activate")}
                >
                  Activate funded pack
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
      {pdf && (
        <div
          className="bold-offer bold-offer-modal"
          role="dialog"
          aria-label="Document preview"
          style={{ padding: 24, zIndex: 100 }}
        >
          <div className="screen">
            <button
              onClick={() => {
                URL.revokeObjectURL(pdf);
                setPdf("");
              }}
            >
              Close document preview
            </button>
            <iframe title="Generated proposal and agreement" src={pdf} />
          </div>
        </div>
      )}
    </div>
  );
}
