// Ported from the Legal app (family-law-floater/src/components/firm-offers/LegacyOfferAdminView.tsx). Re-run the port script to refresh.
import { useState } from "react";
import {
  money,
  parsePrice,
  pricing,
  nextReminderAt,
  nextStep,
  blockDueLabel,
  type OfferDraft,
  type Offer,
} from "@/legal/lib/firm-offers/model";
import "./offer.css";
export function LegacyOfferAdminView({
  initial,
  offers,
  blockers,
  busy,
  error,
  onSave,
  onAction,
  onClose,
  delivery = [],
}: {
  delivery?: {
    offer_id: string;
    step: string;
    channel: string;
    state: string;
    updated_at: string;
  }[];
  initial: OfferDraft;
  offers: Offer[];
  blockers: string[];
  busy: boolean;
  error?: string;
  onSave: (d: OfferDraft) => void;
  onAction: (o: Offer, action: string, note?: string) => void;
  onClose?: () => void;
}) {
  const [draft, setDraft] = useState(initial),
    [price, setPrice] = useState((initial.priceCents / 100).toFixed(2)),
    [formError, setFormError] = useState("");
  const latest = offers[0];
  const completedSteps = delivery
    .filter((d) => d.offer_id === latest?.id && d.state !== "queued")
    .map((d) => Number(d.step));
  let amounts;
  try {
    amounts = pricing(parsePrice(price), draft.arrangement);
  } catch {
    /* show validation on save */
  }
  const field = (key: "firmName" | "contactName" | "email" | "mobile", label: string) => (
    <label>
      {label}
      <input
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"}
      />
    </label>
  );
  return (
    <div className="bold-offer">
      <div className="screen">
        <header className="topbar">
          <div>
            <span className="brand">bold.</span>
            <span className="muted" style={{ marginLeft: 24 }}>
              Firm Applications / Proposal & Agreement
            </span>
          </div>
          {onClose && <button onClick={onClose}>Close</button>}
        </header>
        <div style={{ margin: "30px 0" }}>
          <p className="eyebrow">{draft.firmName || "New firm"} · initial pack</p>
          <h1>Proposal & Agreement</h1>
          <p className="muted">Prepare one agreement. Guide the firm from review to onboarding.</p>
        </div>
        {(error || formError) && (
          <div role="alert" className="notice error">
            {error || formError}
          </div>
        )}
        <div className="layout">
          <section className="card">
            <h2>Create proposal</h2>
            <div className="grid">
              {field("firmName", "Firm / trading name")}
              {field("contactName", "Contact name")}
              {field("email", "Email address")}
              {field("mobile", "Mobile number")}
            </div>
            <h3 style={{ marginTop: 28 }}>Payment arrangement</h3>
            <div className="price-options">
              <button
                className={draft.arrangement === "upfront" ? "selected" : ""}
                onClick={() => setDraft({ ...draft, arrangement: "upfront" })}
              >
                Full pack upfront<small>10 Qualified Shows · one initial payment</small>
              </button>
              <button
                className={draft.arrangement === "split" ? "selected" : ""}
                onClick={() => setDraft({ ...draft, arrangement: "split" })}
              >
                Split payment<small>One committed pack · two blocks of 5</small>
              </button>
            </div>
            <div className="grid">
              <label>
                Price per show, excluding GST
                <input
                  value={price}
                  inputMode="decimal"
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label>
                Prepared by
                <input value={latest?.company.preparedBy ?? "Peter Semrany"} readOnly />
              </label>
            </div>
            <p className="muted" style={{ marginTop: 14 }}>
              Company details come from saved Bold settings. The initial pack is fixed at 10
              Qualified Shows.
            </p>
            <label style={{ marginTop: 20 }}>
              Recipient timezone
              <select
                value={draft.timezone ?? "Australia/Sydney"}
                onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
              >
                {[
                  "Australia/Sydney",
                  "Australia/Brisbane",
                  "Australia/Melbourne",
                  "Australia/Adelaide",
                  "Australia/Perth",
                  "Australia/Darwin",
                  "Australia/Hobart",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label style={{ marginTop: 20 }}>
              <input
                type="checkbox"
                checked={draft.reminderConsent ?? false}
                onChange={(e) => setDraft({ ...draft, reminderConsent: e.target.checked })}
              />
              Permission for email and SMS offer reminders has been verified.
            </label>
            <div className="actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  try {
                    setFormError("");
                    onSave({ ...draft, priceCents: parsePrice(price) });
                  } catch (e) {
                    setFormError((e as Error).message);
                  }
                }}
              >
                {busy ? "Working…" : offers.length ? "Save new draft revision" : "Save draft"}
              </button>
              {latest && (
                <button disabled={busy} onClick={() => onAction(latest, "preview")}>
                  Preview saved revision
                </button>
              )}
            </div>
          </section>
          <aside>
            <section className="card">
              <p className="eyebrow">Initial pack · AUD</p>
              <div className="amount">{amounts ? money(amounts.totalCents) : "—"}</div>
              <p className="muted">Including 10% GST</p>
              <div className="summary-row">
                <span>10 Qualified Shows</span>
                <b>{amounts ? money(amounts.exCents) : "—"}</b>
              </div>
              <div className="summary-row">
                <span>GST</span>
                <b>{amounts ? money(amounts.gstCents) : "—"}</b>
              </div>
              {draft.arrangement === "split" && (
                <>
                  <div className="summary-row">
                    <span>Block 1 · shows 1–5</span>
                    <b>{amounts ? money(amounts.blockCents) : "—"}</b>
                  </div>
                  <div className="summary-row">
                    <span>Block 2 · shows 6–10</span>
                    <b>{amounts ? money(amounts.blockCents) : "—"}</b>
                  </div>
                  <p className="muted">
                    Block 2 is due within 14 days of the fifth Qualified Show, and before the sixth
                    appointment is booked.
                  </p>
                </>
              )}
              <p className="muted" style={{ marginTop: 18 }}>
                Annature signing
                <br />
                Square firm payments
              </p>
            </section>
            <div className="notice">
              Review mode. Sending is blocked until the required configuration and template
              approvals are complete.
            </div>
          </aside>
        </div>
        {latest && (
          <section className="card" style={{ marginTop: 24 }}>
            <div className="summary-row">
              <h2>Revision {latest.revision}</h2>
              <span className="pill">
                {latest.proposal === "draft" ? "Draft" : nextStep(latest)}
              </span>
            </div>
            <p className="muted">
              Signatures: {latest.signature.replaceAll("_", " ")} · Payment:{" "}
              {latest.payments[0]?.status.replaceAll("_", " ") ?? "Not requested"} · Onboarding:{" "}
              {latest.onboardingComplete ? "Complete" : "Due"}
            </p>
            {latest.payments
              .filter((p) => p.block === 2)
              .map((p) => (
                <div key={p.id} className="notice">
                  Block 2: {blockDueLabel(p, new Date(), latest.timezone)} · {money(p.amountCents)}{" "}
                  · due {p.dueDate}
                </div>
              ))}
            <div className="actions">
              {[
                ["send", "Approve & send"],
                ["link", "Copy secure link"],
                ["revision", "Request revision"],
                [
                  latest.paused ? "resume" : "pause",
                  latest.paused ? "Resume eligible reminders" : "Pause reminders",
                ],
                ["withdraw", "Withdraw unsigned offer"],
                ["countersign", "Countersign"],
                ["reconcile", "Refresh provider status"],
                ["onboarding", "Confirm onboarding complete"],
              ].map(([action, label]) => (
                <button
                  key={action}
                  disabled={
                    busy ||
                    (action === "send" && (blockers.length > 0 || latest.proposal !== "draft")) ||
                    (action === "countersign" && latest.signature !== "awaiting_peter")
                  }
                  onClick={() => onAction(latest, action!)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 18 }}>
              Next eligible reminder window:{" "}
              {nextReminderAt(latest, new Date(), completedSteps)
                ? new Date(nextReminderAt(latest, new Date(), completedSteps)!).toLocaleString(
                    "en-AU",
                    {
                      timeZone: latest.timezone,
                    },
                  )
                : "None"}{" "}
              ({latest.timezone}). Sent steps will not repeat.
            </p>
            <details style={{ marginTop: 18 }}>
              <summary>Message delivery</summary>
              <ul className="activity">
                {delivery
                  .filter((d) => d.offer_id === latest.id)
                  .map((d) => (
                    <li key={`${d.step}:${d.channel}`}>
                      Day / action {d.step} · {d.channel} · {d.state}
                      <div className="muted">{new Date(d.updated_at).toLocaleString("en-AU")}</div>
                    </li>
                  ))}
              </ul>
            </details>
            <details style={{ marginTop: 22 }}>
              <summary>View activity</summary>
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
          </section>
        )}
        {!!blockers.length && (
          <details style={{ marginTop: 22 }}>
            <summary className="muted">
              Configuration needed before sending ({blockers.length})
            </summary>
            <ul className="muted">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
