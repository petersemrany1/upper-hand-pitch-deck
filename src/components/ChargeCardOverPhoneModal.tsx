import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { getHtgStripePublishableKey, chargeCardOverPhone } from "@/utils/stripe.functions";

const COLORS = {
  text: "#111",
  muted: "#666",
  line: "#e5e5e5",
  coral: "#f4522d",
  green: "#15803d",
  greenBg: "#dcfce7",
  red: "#b91c1c",
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultAmount: number; // dollars
  patientName: string;
  leadId?: string;
  onSuccess?: (payment: { paymentIntentId: string; amount: number }) => void;
};

let _stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (_stripePromise) return _stripePromise;
  _stripePromise = (async () => {
    const { publishableKey } = await getHtgStripePublishableKey();
    if (!publishableKey) {
      console.error("Stripe publishable key missing");
      return null;
    }
    return loadStripe(publishableKey);
  })();
  return _stripePromise;
}

export function ChargeCardOverPhoneModal(props: Props) {
  const stripePromise = useMemo(() => (props.open ? getStripePromise() : null), [props.open]);
  if (!props.open) return null;
  return (
    <div
      onClick={() => props.onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(17,17,17,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: 16, backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, maxWidth: 460, width: "100%",
          overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          border: `0.5px solid ${COLORS.line}`,
        }}
      >
        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <ChargeForm {...props} />
          </Elements>
        ) : (
          <div style={{ padding: 24 }}>Loading…</div>
        )}
      </div>
    </div>
  );
}

function ChargeForm({ onClose, defaultAmount, patientName, leadId, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholder, setCardholder] = useState(patientName || "");
  const [amount, setAmount] = useState<string>(String(defaultAmount || 75));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ amount: number } | null>(null);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(t);
  }, [success, onClose]);

  const elementStyle = {
    base: {
      fontSize: "15px",
      color: "#111",
      fontFamily: "system-ui, -apple-system, sans-serif",
      "::placeholder": { color: "#999" },
    },
    invalid: { color: "#b91c1c" },
  };

  const fieldBoxStyle: React.CSSProperties = {
    border: `0.5px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: "11px 12px",
    background: "#fff",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !stripe || !elements) return;
    setError(null);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0.5) {
      setError("Enter a valid amount (min $0.50).");
      return;
    }
    if (!cardholder.trim()) {
      setError("Enter the cardholder name.");
      return;
    }
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setError("Card form not ready — try again.");
      return;
    }

    setSubmitting(true);
    const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
      type: "card",
      card: cardNumber,
      billing_details: { name: cardholder.trim() },
    });

    if (pmErr || !paymentMethod) {
      setSubmitting(false);
      setError(pmErr?.message || "Could not validate card.");
      return;
    }

    const r = await chargeCardOverPhone({
      data: {
        paymentMethodId: paymentMethod.id,
        amountCents: Math.round(amt * 100),
        patientName,
        leadId,
      },
    });

    setSubmitting(false);

    if (r.success) {
      setSuccess({ amount: amt });
      toast.success("Deposit collected successfully");
      onSuccess?.({ paymentIntentId: r.paymentIntentId, amount: r.amountCents / 100 });
    } else {
      setError(r.error || "Payment failed");
    }
  };

  if (success) {
    return (
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", background: COLORS.greenBg,
          color: COLORS.green, display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px", fontSize: 28, fontWeight: 700,
        }}>✓</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
          Payment successful
        </div>
        <div style={{ fontSize: 14, color: COLORS.muted }}>
          ${success.amount.toFixed(2)} charged to {cardholder}.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ padding: "22px 22px 4px" }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: COLORS.text, letterSpacing: -0.2 }}>
          Enter card details
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>
          Patient is reading their card details over the phone. Details are sent
          directly to Stripe — never stored on our servers.
        </div>
      </div>

      <div style={{ padding: "16px 22px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Cardholder name">
          <input
            type="text"
            value={cardholder}
            onChange={(e) => setCardholder(e.target.value)}
            placeholder="Name on card"
            style={{
              width: "100%", border: `0.5px solid ${COLORS.line}`, borderRadius: 8,
              padding: "10px 12px", fontSize: 15, outline: "none",
            }}
          />
        </Field>

        <Field label="Card number">
          <div style={fieldBoxStyle}>
            <CardNumberElement options={{ style: elementStyle, showIcon: true }} />
          </div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Expiry">
            <div style={fieldBoxStyle}>
              <CardExpiryElement options={{ style: elementStyle }} />
            </div>
          </Field>
          <Field label="CVC">
            <div style={fieldBoxStyle}>
              <CardCvcElement options={{ style: elementStyle }} />
            </div>
          </Field>
        </div>

        <Field label="Amount (AUD)">
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 15, color: COLORS.muted,
            }}>$</span>
            <input
              type="number"
              min="0.5"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: "100%", border: `0.5px solid ${COLORS.line}`, borderRadius: 8,
                padding: "10px 12px 10px 24px", fontSize: 15, outline: "none",
              }}
            />
          </div>
        </Field>

        {error && (
          <div style={{
            background: "#fef2f2", border: "0.5px solid #fecaca", color: COLORS.red,
            borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "18px 22px 20px" }}>
        <button
          type="submit"
          disabled={submitting || !stripe}
          style={{
            width: "100%", background: COLORS.coral, color: "#fff",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
            padding: "12px", cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.7 : 1,
            boxShadow: `0 4px 14px ${COLORS.coral}55`,
          }}
        >
          {submitting ? "Charging…" : `Charge $${(Number(amount) || 0).toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          style={{
            width: "100%", background: "#fff", color: "#111",
            border: `1px solid ${COLORS.line}`, borderRadius: 8,
            fontSize: 13, fontWeight: 500, padding: "10px",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.05em", color: "#777", marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
