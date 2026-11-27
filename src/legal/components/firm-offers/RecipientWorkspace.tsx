// Ported from the Legal app (family-law-floater/src/components/firm-offers/RecipientWorkspace.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { money, pricing, type FirmDetails } from "@/legal/lib/firm-offers/model";
import type { publicOffer } from "@/legal/lib/firm-offers/store.server";
import { pdfBlobUrl } from "./pdf-url";
import "./offer.css";
export type RecipientOffer = ReturnType<typeof publicOffer>;
export function RecipientWorkspace({
  offer,
  onAction,
  error = "",
  busy = false,
  demo = false,
}: {
  offer: RecipientOffer;
  onAction: (action: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  error?: string;
  busy?: boolean;
  demo?: boolean;
}) {
  const [tab, setTab] = useState<"review" | "details" | "sign" | "payment" | "onboarding">(
    "review",
  );
  const [details, setDetails] = useState<FirmDetails>(
    offer.details ?? {
      legalName: offer.firmName,
      tradingName: "",
      registration: "",
      address: "",
      signatoryName: offer.contactName,
      position: "",
      signatoryEmail: "",
      billingEmail: "",
    },
  );
  const [pdf, setPdf] = useState(""),
    [digest, setDigest] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [change, setChange] = useState(""),
    [showChange, setShowChange] = useState(false),
    [localError, setLocalError] = useState("");
  const amounts = pricing(offer.priceCents, offer.arrangement);
  const waiting = offer.signature === "awaiting_peter",
    signed = offer.signature === "executed",
    paid = offer.payments[0]?.status === "paid";
  useEffect(() => {
    if (signed) setTab(paid ? "onboarding" : "payment");
    else if (offer.details) setTab("sign");
  }, [signed, paid, offer.details]);
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf);
    },
    [pdf],
  );
  async function act(action: string, data?: Record<string, unknown>) {
    setLocalError("");
    try {
      const r = await onAction(action, data);
      if (typeof r["pdf"] === "string") {
        setPdf(pdfBlobUrl(r["pdf"]));
        setDigest(String(r["digest"] ?? ""));
        setReviewed(false);
      }
      if (typeof r["url"] === "string") window.location.assign(r["url"]);
      return r;
    } catch (e) {
      setLocalError((e as Error).message);
      return null;
    }
  }
  const input = (key: keyof FirmDetails, label: string, wide = false) => (
    <label className={wide ? "wide" : ""}>
      {label}
      <input
        required={key !== "tradingName"}
        value={details[key]}
        type={key.toLowerCase().includes("email") ? "email" : "text"}
        onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="bold-offer" style={{ minHeight: "100vh", background: "#f6f8fc" }}>
      <div className="screen">
        <header className="topbar">
          <span className="brand">bold.</span>
          <span className="muted">Private firm workspace {demo ? "· Local preview" : ""}</span>
        </header>
        <div style={{ marginTop: 32 }}>
          <p className="eyebrow">Prepared for {offer.firmName}</p>
          <h1>Your next chapter starts here.</h1>
          <p className="muted">Your proposal, agreement and next steps, together in one place.</p>
        </div>
        <nav className="stage-list" aria-label="Progress">
          {[
            ["review", "Review proposal"],
            ["details", "Firm details"],
            ["sign", "Sign agreement"],
            ["payment", "Payment"],
            ["onboarding", "Onboarding"],
          ].map(([key, label], i) => (
            <span key={key} className={tab === key ? "current" : ""}>
              <b>{i + 1}</b>
              {label}
            </span>
          ))}
        </nav>
        {(error || localError) && (
          <div role="alert" className="notice error">
            {error || localError}
          </div>
        )}
        {offer.paused && (
          <div className="notice">Reminders are paused while Bold reviews your request.</div>
        )}
        <div className="layout">
          <main className="card">
            {tab === "review" && (
              <>
                <span className="pill">
                  Family Law Marketing Proposal · revision {offer.revision}
                </span>
                <div className="document-cover">
                  <p className="eyebrow" style={{ color: "#c8d5ff" }}>
                    {offer.firmName}
                  </p>
                  <h2>
                    Family Law Marketing
                    <br />
                    Proposal
                  </h2>
                </div>
                <p className="muted">
                  Read your complete proposal first. Then confirm the firm’s details before
                  reviewing the final agreement for signature.
                </p>
                <div className="actions">
                  <button onClick={() => void act("preview")} disabled={busy}>
                    Read complete proposal
                  </button>
                  <button className="primary" onClick={() => setTab("details")}>
                    Confirm firm details →
                  </button>
                </div>
              </>
            )}
            {tab === "details" && (
              <>
                <p className="eyebrow">Step 2 of 5</p>
                <h2>Confirm your firm’s details</h2>
                <p className="muted" style={{ marginBottom: 24 }}>
                  These details will appear in your agreement. Your pack and agreed price stay the
                  same.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("details", { details }).then((r) => {
                      if (r) {
                        setPdf("");
                        setReviewed(false);
                        setTab("sign");
                      }
                    });
                  }}
                >
                  <div className="grid">
                    {input("legalName", "Contracting legal entity", true)}
                    {input("tradingName", "Trading name, if different")}
                    {input("registration", "ABN or ACN")}
                    {input("address", "Business address", true)}
                    {input("signatoryName", "Authorised signatory’s full name")}
                    {input("position", "Position")}
                    {input("signatoryEmail", "Signatory email")}
                    {input("billingEmail", "Billing email")}
                  </div>
                  <div className="actions">
                    <button type="button" onClick={() => setTab("review")}>
                      Back
                    </button>
                    <button className="primary" disabled={busy}>
                      Confirm & review final agreement →
                    </button>
                  </div>
                </form>
              </>
            )}
            {tab === "sign" && (
              <>
                <p className="eyebrow">Step 3 of 5</p>
                <h2>
                  {waiting
                    ? "Thank you. Your signature is complete."
                    : "Review your final agreement"}
                </h2>
                {waiting ? (
                  <p>
                    Peter will countersign the same document. We’ll show your invoice here once the
                    agreement is complete.
                  </p>
                ) : (
                  <>
                    <p className="muted">
                      Review the populated agreement below before continuing to Annature’s secure
                      signing page.
                    </p>
                    <div className="actions">
                      <button disabled={busy} onClick={() => void act("preview")}>
                        Open final agreement
                      </button>
                      {offer.signature === "not_started" && (
                        <button onClick={() => setTab("details")}>Edit firm details</button>
                      )}
                    </div>
                    {pdf && (
                      <label style={{ marginTop: 22 }}>
                        <input
                          type="checkbox"
                          checked={reviewed}
                          onChange={(e) => setReviewed(e.target.checked)}
                        />
                        I have reviewed this agreement and am authorised to sign for the firm.
                      </label>
                    )}
                    <div className="actions">
                      <button
                        className="primary"
                        disabled={busy || !reviewed || offer.paused}
                        onClick={() => void act("sign", { digest })}
                      >
                        Continue to Annature →
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {tab === "payment" && (
              <>
                <p className="eyebrow">Step 4 of 5</p>
                <h2>
                  {offer.payments[0]?.status === "processing"
                    ? "Your payment is processing"
                    : "Your agreement is complete"}
                </h2>
                <p className="muted">
                  Both parties have signed.{" "}
                  {offer.payments[0]?.status === "processing"
                    ? "Please allow Square to confirm the payment. There is no need to pay again."
                    : "Your initial payment is the next step."}
                </p>
                {offer.payments.map((p) => (
                  <section key={p.block} style={{ marginTop: 20 }}>
                    <h3>{offer.arrangement === "split" ? `Block ${p.block}` : "Initial pack"}</h3>
                    <p className="amount">{money(p.amountCents)}</p>
                    <p className="muted">
                      {p.status.replaceAll("_", " ")}
                      {p.block === 2 ? ` · Due ${p.dueDate}` : ""}
                    </p>
                    {p.url &&
                      ["awaiting_payment", "partially_paid", "failed"].includes(p.status) && (
                        <a className="button primary" href={p.url} rel="noreferrer">
                          Pay securely with Square →
                        </a>
                      )}
                  </section>
                ))}
                {!offer.payments.length && (
                  <div className="notice">Your invoice is being prepared. Refresh shortly.</div>
                )}
              </>
            )}
            {tab === "onboarding" && (
              <>
                <p className="eyebrow">Step 5 of 5</p>
                <h2>
                  {offer.onboardingComplete
                    ? "You’re ready to begin."
                    : "Let’s get your firm ready."}
                </h2>
                <p>Your initial payment and signed agreement are confirmed.</p>
                <p className="muted">
                  {offer.onboardingComplete
                    ? "Your onboarding is complete."
                    : "Bold will arrange your onboarding call to confirm your consultation process, preferred matters and diary availability. Services begin after onboarding is complete."}
                </p>
              </>
            )}
            {signed && (
              <div className="actions">
                {offer.hasSignedDocument && (
                  <button onClick={() => void act("signed")}>Executed agreement</button>
                )}
                {offer.hasCertificate && (
                  <button onClick={() => void act("certificate")}>Completion certificate</button>
                )}
              </div>
            )}
            {pdf && (
              <div style={{ marginTop: 24 }}>
                <iframe title="Your complete proposal and agreement" src={pdf} />
                <a className="button" href={pdf} target="_blank" rel="noreferrer">
                  Open PDF in a new tab
                </a>
              </div>
            )}
          </main>
          <aside>
            {offer.payments
              .filter((p) => p.block === 2)
              .map((p) => (
                <section className="card" key={p.block} style={{ marginBottom: 18 }}>
                  <p className="eyebrow">Block 2 · shows 6–10</p>
                  <h2>
                    {p.status === "paid"
                      ? "Paid"
                      : p.dueDate < new Date().toISOString().slice(0, 10)
                        ? "Overdue"
                        : "Awaiting next-block payment"}
                  </h2>
                  <p className="amount">{money(p.amountCents)}</p>
                  <p className="muted">
                    Due {p.dueDate}. Payment is required before booking the sixth appointment.
                  </p>
                  {p.url && ["awaiting_payment", "partially_paid", "failed"].includes(p.status) && (
                    <a className="button primary" href={p.url} rel="noreferrer">
                      Pay Block 2 with Square
                    </a>
                  )}
                </section>
              ))}
            <section className="card">
              <p className="eyebrow">Your initial pack</p>
              <h2 style={{ marginTop: 12 }}>10 Qualified Shows</h2>
              <p className="amount">{money(amounts.totalCents)}</p>
              <p className="muted">AUD, including GST</p>
              <div className="summary-row">
                <span>Price per show, ex GST</span>
                <b>{money(offer.priceCents)}</b>
              </div>
              <div className="summary-row">
                <span>Payment arrangement</span>
                <b>{offer.arrangement === "split" ? "Two blocks" : "Upfront"}</b>
              </div>
              {offer.arrangement === "split" && (
                <>
                  <div className="summary-row">
                    <span>Each block, inc GST</span>
                    <b>{money(amounts.blockCents)}</b>
                  </div>
                  <p className="muted">
                    One committed pack. Block 2 is payable within 14 days of the fifth Qualified
                    Show and before the sixth appointment is booked.
                  </p>
                </>
              )}
            </section>
            <section className="card" style={{ marginTop: 18 }}>
              <h3>Something needs changing?</h3>
              <p className="muted">
                Send a request to Bold. We’ll pause reminders while it’s reviewed.
              </p>
              <button onClick={() => setShowChange(!showChange)}>Request a change</button>
              {showChange && (
                <>
                  <textarea
                    aria-label="Requested change"
                    maxLength={2000}
                    value={change}
                    onChange={(e) => setChange(e.target.value)}
                  />
                  <button
                    disabled={busy || !change.trim()}
                    onClick={() =>
                      void act("change", { note: change }).then((r) => {
                        if (r) setShowChange(false);
                      })
                    }
                  >
                    Send request
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
        <footer style={{ marginTop: 32 }} className="muted">
          <p>
            {offer.company.name} · ABN {offer.company.abn}
          </p>
          <p>
            {offer.company.address} ·{" "}
            <a href={`mailto:${offer.company.email}`}>{offer.company.email}</a>
          </p>
          <button disabled={busy || offer.optedOut} onClick={() => void act("unsubscribe")}>
            {offer.optedOut ? "Reminders unsubscribed" : "Unsubscribe from offer reminders"}
          </button>
        </footer>
      </div>
    </div>
  );
}
