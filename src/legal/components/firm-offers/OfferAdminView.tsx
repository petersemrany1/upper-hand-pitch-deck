// Ported from the Legal app (family-law-floater/src/components/firm-offers/OfferAdminView.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  money,
  parsePrice,
  pricing,
  offerDraftSchema,
  businessDetailsSchema,
  MAX_SHOW_COUNT,
  type OfferDraft,
  type Offer,
} from "@/legal/lib/firm-offers/model";
import "./offer.css";
import { ProposalPdfViewer } from "./ProposalPdfViewer";

type Props = {
  initial: OfferDraft;
  offers: Offer[];
  blockers: string[];
  busy: boolean;
  error?: string;
  onSave: (d: OfferDraft) => Promise<void> | void;
  onAction: (o: Offer, action: string) => void;
  onClose?: () => void;
  pdf?: string | undefined;
  previewOfferId?: string | undefined;
  signingLink?: string | undefined;
  linkExpiresAt?: string | undefined;
  notice?: string | undefined;
  delivery?: {
    offer_id: string;
    step: string;
    channel: string;
    state: string;
    updated_at: string;
  }[];
};
export function OfferAdminView({
  initial,
  offers,
  blockers,
  busy,
  error,
  onSave,
  onAction,
  onClose,
  pdf,
  previewOfferId,
  signingLink,
  linkExpiresAt,
  notice,
}: Props) {
  const latest = offers[0];
  const locked = !!latest && latest.signature !== "not_started" && latest.proposal === "sent";
  const [draft, setDraft] = useState<OfferDraft>({
    ...initial,
    workflow: "call_signing",
    reminderConsent: false,
    businessDetails: initial.businessDetails ?? {
      legalName: "",
      registration: "",
      address: "",
      billingEmail: initial.email,
    },
  });
  const [price, setPrice] = useState((initial.priceCents / 100).toFixed(2));
  const [showCount, setShowCount] = useState(String(initial.showCount ?? 10));
  const [firstBlockShows, setFirstBlockShows] = useState(
    String(initial.firstBlockShows ?? Math.ceil((initial.showCount ?? 10) / 2)),
  );
  const [step, setStep] = useState(latest ? (latest.proposal === "sent" ? 3 : 2) : 1);
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    screen.current?.scrollIntoView({ block: "start" });
  }, [step]);
  const [formError, setFormError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [signingAttempted, setSigningAttempted] = useState(false);
  const reviewCheck = useRef<HTMLInputElement>(null);
  const signingSetup = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const business = draft.businessDetails!;
  let amounts;
  try {
    amounts = pricing(
      parsePrice(price),
      draft.arrangement,
      Number(showCount),
      Number(firstBlockShows),
    );
  } catch {
    /* validated on submit */
  }
  const dirty =
    price !== (initial.priceCents / 100).toFixed(2) ||
    Number(showCount) !== (initial.showCount ?? 10) ||
    (draft.arrangement === "split" &&
      Number(firstBlockShows) !==
        (initial.firstBlockShows ?? Math.ceil((initial.showCount ?? 10) / 2))) ||
    ["firmName", "contactName", "email", "arrangement"].some(
      (k) => draft[k as keyof OfferDraft] !== initial[k as keyof OfferDraft],
    ) ||
    JSON.stringify(business) !==
      JSON.stringify(
        initial.businessDetails ?? {
          legalName: "",
          registration: "",
          address: "",
          billingEmail: initial.email,
        },
      );
  const hasCurrentPdf = !!pdf && previewOfferId === latest?.id && !dirty;
  const canSign =
    latest &&
    ["draft", "sent"].includes(latest.proposal) &&
    !latest.paused &&
    latest.signature === "not_started";
  const signingHelp = blockers.length
    ? "Annature setup is incomplete. The connection requirements below must be completed before a real signing link can be created."
    : !hasCurrentPdf
      ? "Open your saved PDF in step 2 first. If you changed any details, generate the PDF again."
      : !reviewed
        ? "Tick the review confirmation above to create your signing link."
        : "Ready to create your client’s signing link.";
  function requestSigningLink() {
    if (!latest || busy) return;
    setSigningAttempted(true);
    if (blockers.length) {
      signingSetup.current?.focus();
      return;
    }
    if (latest.signature === "not_started") {
      if (!hasCurrentPdf) {
        setStep(2);
        return;
      }
      if (!reviewed) {
        reviewCheck.current?.focus();
        return;
      }
    }
    onAction(latest, "signing_link");
  }
  const status = !latest
    ? "Ready to prepare"
    : latest.proposal === "draft"
      ? "PDF ready"
      : latest.proposal !== "sent"
        ? "On hold"
        : latest.signature === "executed"
          ? "Signed by both parties"
          : latest.signature === "awaiting_peter"
            ? "Client signed · your turn"
            : latest.signature === "pending"
              ? "Waiting for client signature"
              : "Ready for signing";
  const input = (key: "firmName" | "contactName" | "email", label: string, help?: string) => (
    <label>
      {label}
      <input
        required
        maxLength={key === "firmName" ? 150 : key === "email" ? 180 : 100}
        value={draft[key]}
        type={key === "email" ? "email" : "text"}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
      {help && <small>{help}</small>}
    </label>
  );
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    try {
      const validBusiness = businessDetailsSchema.parse(business);
      const value = offerDraftSchema.parse({
        ...draft,
        businessDetails: validBusiness,
        priceCents: parsePrice(price),
        showCount: Number(showCount),
        firstBlockShows: draft.arrangement === "split" ? Number(firstBlockShows) : undefined,
        workflow: "call_signing",
        reminderConsent: false,
      });
      await onSave(value);
      setReviewed(false);
      setStep(2);
    } catch (e) {
      setFormError(
        e instanceof Error && "issues" in e
          ? ((e as { issues: { message: string }[] }).issues[0]?.message ??
              "Check the firm details")
          : (e as Error).message,
      );
    }
  }
  return (
    <div className="bold-offer proposal-studio">
      <div className="screen" ref={screen}>
        <header className="topbar">
          <div className="studio-brand">
            <span className="brand">bold.</span>
            <span className="muted">
              Firm Applications <span aria-hidden="true">/</span> Proposals
            </span>
          </div>
          {onClose && (
            <button disabled={busy} onClick={() => (dirty ? setConfirmClose(true) : onClose())}>
              Close
            </button>
          )}
        </header>
        <div className="studio-heading">
          <div>
            <p className="eyebrow">{draft.firmName || "New firm proposal"}</p>
            <h1>Prepare. Present. Sign.</h1>
            <p className="muted">
              Your meeting, in one place. Prepare the PDF now and share a signing link when they’re
              ready.
            </p>
          </div>
          <span className="pill">{status}</span>
        </div>
        <nav className="studio-steps" aria-label="Proposal steps">
          {["Prepare proposal", "Preview PDF", "Get it signed"].map((label, i) => (
            <button
              key={label}
              aria-current={step === i + 1 ? "step" : undefined}
              disabled={busy || (i > 0 && (!latest || dirty))}
              onClick={() => setStep(i + 1)}
            >
              <b>{i + 1}</b>
              <span>{label}</span>
              {i < 2 && <ArrowRight size={16} />}
            </button>
          ))}
        </nav>
        {(error || formError) && (
          <div className="notice error" role="alert">
            {error || formError}
          </div>
        )}
        {notice && (
          <div className="studio-success" role="status">
            {notice}
          </div>
        )}
        {confirmClose && (
          <section className="notice" role="alert">
            <b>You have unsaved changes.</b>
            <p>Generate the PDF to save them, or discard these edits.</p>
            <div className="actions">
              <button onClick={() => setConfirmClose(false)}>Keep editing</button>
              <button onClick={onClose}>Discard edits and close</button>
            </div>
          </section>
        )}
        <div className="layout">
          <main>
            {step === 1 && (
              <form className="card" onSubmit={generate}>
                <div className="section-heading">
                  <span className="step-number">1</span>
                  <div>
                    <h2>Prepare the firm’s proposal</h2>
                    <p className="muted">
                      You fill this in. The client only signs, enters their full name and position,
                      and has the signing date recorded.
                    </p>
                  </div>
                </div>
                {locked && (
                  <div className="notice">
                    Signing has started. These details are locked. If nobody has signed, withdraw
                    the link under Agreement options before preparing a revision.
                  </div>
                )}
                <fieldset disabled={busy || locked}>
                  <h3>Firm details</h3>
                  <div className="grid">
                    {input("firmName", "Firm / trading name", "Shown on the proposal cover.")}
                    <label>
                      Firm legal name
                      <input
                        required
                        maxLength={180}
                        value={business.legalName}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            businessDetails: { ...business, legalName: e.target.value },
                          })
                        }
                      />
                      <small>The legal entity entering the agreement.</small>
                    </label>
                    <label>
                      ABN or ACN
                      <input
                        required
                        maxLength={20}
                        inputMode="numeric"
                        value={business.registration}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            businessDetails: { ...business, registration: e.target.value },
                          })
                        }
                      />
                      <small>11-digit ABN or 9-digit ACN.</small>
                    </label>
                    <label>
                      Billing email
                      <input
                        required
                        maxLength={180}
                        type="email"
                        value={business.billingEmail}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            businessDetails: { ...business, billingEmail: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label className="wide">
                      Registered business address
                      <textarea
                        required
                        minLength={8}
                        maxLength={240}
                        rows={2}
                        value={business.address}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            businessDetails: { ...business, address: e.target.value },
                          })
                        }
                      />
                    </label>
                  </div>
                  <h3 className="form-section">Who will sign?</h3>
                  <div className="grid">
                    {input(
                      "contactName",
                      "Client contact name",
                      "Identifies the recipient. They enter their full name when signing.",
                    )}
                    {input(
                      "email",
                      "Signer’s email",
                      "The person authorised to sign for the firm.",
                    )}
                  </div>
                  <h3 className="form-section">Price and payment terms</h3>
                  <div className="grid">
                    <label>
                      Number of Qualified Shows
                      <input
                        required
                        type="number"
                        min={1}
                        max={MAX_SHOW_COUNT}
                        step={1}
                        value={showCount}
                        onChange={(e) => {
                          setShowCount(e.target.value);
                          setFirstBlockShows(String(Math.ceil(Number(e.target.value) / 2)));
                        }}
                      />
                      <small>Set the agreed pack size, for example 5 shows.</small>
                    </label>
                    <label>
                      Price per Qualified Show, excluding GST (AUD)
                      <input
                        className="price-input"
                        required
                        inputMode="decimal"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                      <small>The pack total is calculated from the show count and price.</small>
                    </label>
                  </div>
                  <div className="price-options">
                    {(["upfront", "split"] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={draft.arrangement === a}
                        className={draft.arrangement === a ? "selected" : ""}
                        onClick={() => setDraft({ ...draft, arrangement: a })}
                      >
                        {a === "upfront" ? "Pay upfront" : "Split into two payments"}
                        <small>
                          {a === "upfront"
                            ? "One payment for the full pack"
                            : "Choose the shows covered by each payment"}
                        </small>
                      </button>
                    ))}
                  </div>
                  {draft.arrangement === "split" && (
                    <label>
                      Shows in the first payment
                      <input
                        required
                        type="number"
                        min={1}
                        max={Math.max(1, Number(showCount) - 1)}
                        step={1}
                        value={firstBlockShows}
                        onChange={(e) => setFirstBlockShows(e.target.value)}
                      />
                      <small>
                        {amounts
                          ? `${amounts.blockShows} shows in the first payment and ${amounts.secondBlockShows} in the second.`
                          : "Split payments need at least one show in each block."}
                      </small>
                    </label>
                  )}
                  <div className="form-footer">
                    <p className="muted">
                      Generating a PDF saves this version. Nothing is sent to the client.
                    </p>
                    <button className="primary" type="submit">
                      {busy ? "Generating…" : "Generate PDF"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
            {step === 2 && (
              <section className="card">
                <div className="section-heading">
                  <span className="step-number">2</span>
                  <div>
                    <h2>Your meeting document</h2>
                    <p className="muted">
                      Review the details and price, then present or download this PDF.
                    </p>
                  </div>
                </div>
                <div className="actions document-actions">
                  <button disabled={busy} onClick={() => setStep(1)}>
                    <ArrowLeft size={16} />
                    {locked ? "View details" : "Edit details"}
                  </button>
                  {latest && !hasCurrentPdf && (
                    <button
                      className="primary"
                      disabled={busy || dirty}
                      onClick={() => onAction(latest, "preview")}
                    >
                      <FileText size={16} />
                      {busy ? "Opening…" : "Open PDF preview"}
                    </button>
                  )}
                  {hasCurrentPdf && (
                    <>
                      <a
                        className="button"
                        href={pdf}
                        download={`${draft.firmName} - Family Law Marketing Proposal.pdf`}
                      >
                        <Download size={16} />
                        Download PDF
                      </a>
                    </>
                  )}
                </div>
                {hasCurrentPdf ? (
                  <ProposalPdfViewer url={pdf!} />
                ) : (
                  <div className="document-empty">
                    <FileText size={40} />
                    <h3>
                      {dirty
                        ? "Generate a new PDF to include your edits"
                        : "Your saved proposal is ready"}
                    </h3>
                    <p className="muted">
                      {dirty
                        ? "Return to Prepare proposal to save the updated version."
                        : "Open the PDF above to review the complete document."}
                    </p>
                  </div>
                )}
                <div className="form-footer">
                  <p className="muted">
                    Revision {latest?.revision}. You’ll share this exact version for signing.
                  </p>
                  <button
                    className="primary"
                    disabled={!hasCurrentPdf || busy}
                    onClick={() => setStep(3)}
                  >
                    Continue to signing
                    <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            )}
            {step === 3 && latest && (
              <section className="card">
                <div className="section-heading">
                  <span className="step-number">3</span>
                  <div>
                    <h2>
                      {latest.signature === "executed"
                        ? "Agreement complete"
                        : "Get it signed on the call"}
                    </h2>
                    <p className="muted">
                      The link opens directly in Annature. No client account or firm-details form.
                    </p>
                  </div>
                </div>
                <div className="recipient-summary">
                  <span className="eyebrow">Signing recipient</span>
                  <strong>{latest.draft.contactName}</strong>
                  <span>{latest.draft.email}</span>
                </div>
                <div className="signing-fields">
                  <span>
                    <Check size={15} />
                    Signature
                  </span>
                  <span>
                    <Check size={15} />
                    Full name
                  </span>
                  <span>
                    <Check size={15} />
                    Position
                  </span>
                  <span>
                    <Check size={15} />
                    Date signed
                  </span>
                </div>
                <p className="muted">Annature records the date when they finish signing.</p>
                {canSign && (
                  <>
                    <label className="review-check">
                      <input
                        ref={reviewCheck}
                        type="checkbox"
                        disabled={!hasCurrentPdf}
                        checked={reviewed && hasCurrentPdf}
                        onChange={(e) => setReviewed(e.target.checked)}
                      />
                      I have reviewed the PDF, firm details and payment terms.
                    </label>
                    {!hasCurrentPdf && (
                      <p className="muted">
                        Open the saved PDF in step 2 before creating the link.
                      </p>
                    )}
                    <div className="actions">
                      <button onClick={() => setStep(2)}>
                        <ArrowLeft size={16} />
                        Review PDF
                      </button>
                      <button
                        className="primary"
                        disabled={busy}
                        aria-describedby="signing-help"
                        onClick={requestSigningLink}
                      >
                        {busy ? "Preparing link…" : "Create signing link"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                    <p
                      id="signing-help"
                      role="status"
                      className={signingAttempted ? "notice" : "muted"}
                    >
                      {signingHelp}
                    </p>
                    <p className="muted" style={{ marginTop: 12 }}>
                      This locks the reviewed document and creates its Annature envelope. You choose
                      where to share the link.
                    </p>
                  </>
                )}
                {latest.signature === "pending" && (
                  <div className="actions">
                    <button
                      className="primary"
                      disabled={busy || latest.proposal !== "sent" || latest.paused}
                      onClick={requestSigningLink}
                    >
                      {signingLink ? "Get a fresh signing link" : "Get signing link"}
                    </button>
                  </div>
                )}
                {signingLink && (
                  <div className="link-box">
                    <label>
                      Client signing link
                      <input readOnly value={signingLink} onFocus={(e) => e.target.select()} />
                    </label>
                    <button
                      className="primary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(signingLink);
                          setCopied(true);
                        } catch {
                          setFormError("Select the link above and copy it manually.");
                        }
                      }}
                    >
                      <Copy size={16} />
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    <p className="muted">
                      Paste it into your chat, text or email while you’re on the call.
                      {linkExpiresAt &&
                        ` Expires ${new Date(linkExpiresAt).toLocaleString("en-AU")}.`}{" "}
                      Get a fresh link here if needed.
                    </p>
                  </div>
                )}
                {latest.signature !== "not_started" && (
                  <div className="signing-status" role="status">
                    <span className="pill">{status}</span>
                    <div className="actions">
                      <button disabled={busy} onClick={() => onAction(latest, "reconcile")}>
                        <RefreshCw size={16} />
                        Refresh signing status
                      </button>
                      {latest.signature === "awaiting_peter" && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => onAction(latest, "countersign")}
                        >
                          Your turn: countersign
                          <ExternalLink size={16} />
                        </button>
                      )}
                      {latest.signedPath && (
                        <button disabled={busy} onClick={() => onAction(latest, "signed")}>
                          <Download size={16} />
                          Signed PDF
                        </button>
                      )}
                      {latest.certificatePath && (
                        <button disabled={busy} onClick={() => onAction(latest, "certificate")}>
                          Signing certificate
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {!!blockers.length && latest.signature !== "executed" && (
                  <div className="notice" ref={signingSetup} tabIndex={-1}>
                    <b>PDFs are ready to use. Annature setup is still needed.</b>
                    <p>
                      You can prepare, present and download now. Signing links will become available
                      once the connection is configured.
                    </p>
                    <details open={signingAttempted}>
                      <summary>View setup requirements ({blockers.length})</summary>
                      <ul>
                        {blockers.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </section>
            )}
          </main>
          <aside className="studio-aside">
            <section className="card">
              <p className="eyebrow">Proposal summary · AUD</p>
              <h2>{draft.firmName || "Your firm"}</h2>
              <div className="amount">{amounts ? money(amounts.totalCents) : "—"}</div>
              <p className="muted">Total including GST</p>
              <div className="summary-row">
                <span>{showCount || "—"} Qualified Shows</span>
                <b>{amounts ? money(amounts.exCents) : "—"}</b>
              </div>
              <div className="summary-row">
                <span>GST (10%)</span>
                <b>{amounts ? money(amounts.gstCents) : "—"}</b>
              </div>
              <div className="summary-row">
                <span>{draft.arrangement === "split" ? "First payment" : "Upfront payment"}</span>
                <b>{amounts ? money(amounts.blockCents) : "—"}</b>
              </div>
              {draft.arrangement === "split" && (
                <>
                  <div className="summary-row">
                    <span>Second payment</span>
                    <b>{amounts ? money(amounts.secondBlockCents) : "—"}</b>
                  </div>
                  <p className="muted">
                    {amounts
                      ? `Due within 14 days of Qualified Show ${amounts.blockShows} and before booking appointment ${amounts.blockShows + 1}.`
                      : "Set a valid show count and payment split to see when the second payment is due."}
                  </p>
                </>
              )}
              <div className="aside-note">
                <FileText size={18} />
                <p>
                  One proposal. One signing link.
                  <br />
                  <span className="muted">
                    Payments and reminders are not sent from this process.
                  </span>
                </p>
              </div>
            </section>
            <p className="muted aside-help">
              Before the meeting: prepare and download.
              <br />
              During the meeting: present and share the link.
              <br />
              After they sign: countersign and save the completed PDF.
            </p>
          </aside>
        </div>
        {latest && (
          <details className="agreement-options">
            <summary>Agreement options & history</summary>
            <p className="muted">
              Revision {latest.revision} · {latest.proposal.replaceAll("_", " ")}. Older PDFs remain
              tied to their original revision.
            </p>
            {latest.proposal === "sent" &&
              !["awaiting_peter", "executed"].includes(latest.signature) && (
                <button disabled={busy} onClick={() => onAction(latest, "withdraw")}>
                  Withdraw unsigned signing link
                </button>
              )}
            <ol className="activity">
              {latest.activity.map((a, i) => (
                <li key={i}>
                  <b>{a.kind}</b>
                  <div className="muted">{new Date(a.at).toLocaleString("en-AU")}</div>
                  {a.note && <p>{a.note}</p>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}
