// Ported from the Legal app (family-law-floater/src/components/firm-offers/FirmOfferPanel.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { FirmApplication } from "@/legal/lib/firm-applications";
import { offerWorkspaceFn, saveOfferDraftFn, offerActionFn } from "@/legal/lib/firm-offers/functions";
import type { Offer, OfferDraft } from "@/legal/lib/firm-offers/model";
import { pdfBlobUrl } from "./pdf-url";
import { ProposalPdfViewer } from "./ProposalPdfViewer";
import { LegacyFirmOfferPanel } from "./LegacyFirmOfferPanel";
import { OfferAdminView } from "./OfferAdminView";
export function FirmOfferPanel({ app, onClose }: { app: FirmApplication; onClose: () => void }) {
  const get = useServerFn(offerWorkspaceFn),
    save = useServerFn(saveOfferDraftFn),
    action = useServerFn(offerActionFn);
  const query = useQuery({
    queryKey: ["firm-offers", app.id],
    queryFn: () => get({ data: { applicationId: app.id } }),
    refetchInterval: (q) =>
      ["pending", "awaiting_peter"].includes(q.state.data?.offers[0]?.signature ?? "")
        ? 15000
        : false,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<{ url: string; offerId: string; digest: string }>();
  const [link, setLink] = useState<{
    url: string;
    offerId: string;
    expiresAt?: string | undefined;
  }>();
  const [download, setDownload] = useState<{ url: string; name: string }>();
  const [countersign, setCountersign] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => old?.focus();
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download.url);
    },
    [download],
  );
  const run = async (o: Offer, a: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await action({
        data: {
          offerId: o.id,
          action: a,
          ...(a === "signing_link"
            ? {
                digest: o.documentDigest ?? (preview?.offerId === o.id ? preview.digest : ""),
              }
            : {}),
        },
      });
      if ("pdf" in r && typeof r.pdf === "string") {
        const url = pdfBlobUrl(r.pdf);
        if (a === "preview")
          setPreview({ url, offerId: o.id, digest: "digest" in r ? String(r.digest) : "" });
        else
          setDownload({
            url,
            name: `${o.draft.firmName} - ${a === "signed" ? "Signed agreement" : "Signing certificate"}.pdf`,
          });
      }
      if ("link" in r && typeof r.link === "string") {
        setLink({
          url: r.link,
          offerId: o.id,
          expiresAt: "expiresAt" in r ? String(r.expiresAt) : undefined,
        });
        setNotice("Signing link ready. Copy it below and share it with your client.");
      }
      if ("url" in r && typeof r.url === "string") setCountersign(r.url);
      if (a === "withdraw") {
        setLink(undefined);
        setNotice("Unsigned link withdrawn. You can now prepare a new revision.");
      }
      await query.refetch();
    } catch (e) {
      setError((e as Error).message);
      // The provider may have created the envelope before its response failed.
      // Refresh the lock/status even on error so the admin can recover the same agreement.
      await query.refetch();
    } finally {
      setBusy(false);
    }
  };
  const initial: OfferDraft = {
    applicationId: app.id,
    firmName: app.firm_name ?? "",
    contactName: [app.first_name, app.last_name].filter(Boolean).join(" "),
    email: app.email ?? "",
    mobile: app.phone?.replace(/^0/, "+61") ?? "",
    arrangement: "upfront",
    priceCents: 185000,
    workflow: "call_signing",
  };
  const latest = query.data?.offers[0];
  if (latest && latest.draft.workflow !== "call_signing" && latest.proposal !== "draft")
    return <LegacyFirmOfferPanel app={app} onClose={onClose} />;
  return (
    <div
      className="bold-offer-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Prepare proposal and signing link"
      ref={dialog}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const focusable = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, iframe",
          ) ?? [],
        ).filter((el) => el.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      {query.isLoading ? (
        <div className="bold-offer">
          <div className="screen" role="status">
            Loading proposal…
          </div>
        </div>
      ) : query.error ? (
        <div className="bold-offer">
          <div className="screen">
            <p role="alert">{query.error.message}</p>
            <button onClick={() => void query.refetch()}>Try again</button>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      ) : (
        <OfferAdminView
          key={latest?.id ?? app.id}
          initial={latest?.draft ?? initial}
          offers={query.data?.offers ?? []}
          blockers={query.data?.blockers ?? []}
          busy={busy}
          error={error}
          notice={notice}
          pdf={preview?.url}
          previewOfferId={preview?.offerId}
          signingLink={
            link &&
            link.offerId === latest?.id &&
            latest?.signature === "pending" &&
            latest.proposal === "sent"
              ? link.url
              : undefined
          }
          linkExpiresAt={link?.expiresAt}
          onClose={onClose}
          onAction={(o, a) => void run(o, a)}
          onSave={async (d) => {
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const r = await save({ data: d });
              setPreview({ url: pdfBlobUrl(r.pdf), offerId: r.offer.id, digest: r.digest });
              setLink(undefined);
              await query.refetch();
              setNotice("PDF generated and saved. Ready for your meeting.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {countersign && (
        <div className="bold-offer">
          <div className="screen">
            <section className="card">
              <h2>Your countersignature</h2>
              <p>Open Annature to sign, then return here and refresh signing status.</p>
              <div className="actions">
                <a className="button primary" href={countersign} target="_blank" rel="noreferrer">
                  Open Annature to countersign
                </a>
                <button onClick={() => setCountersign("")}>Dismiss</button>
              </div>
            </section>
          </div>
        </div>
      )}
      {download && (
        <div className="bold-offer bold-offer-modal" style={{ zIndex: 100 }}>
          <div className="screen">
            <div className="actions">
              <button onClick={() => setDownload(undefined)}>Close document</button>
              <a className="button primary" href={download.url} download={download.name}>
                Download PDF
              </a>
            </div>
            <ProposalPdfViewer url={download.url} />
          </div>
        </div>
      )}
    </div>
  );
}
