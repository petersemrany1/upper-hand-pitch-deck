import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { loadSquareSdk } from "@/lib/square";
import { getSquareConfig, type SquareConfig } from "@/utils/square-config.functions";
import { paySquareDeposit, startDepositPayment } from "@/utils/square-deposit.functions";

type CardInstance = {
  attach: (selector: string | HTMLElement) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message?: string }[] }>;
  configure?: (options: Record<string, unknown>) => Promise<void>;
  destroy: () => Promise<void>;
};


type Props = {
  /** Deposit token (preferred) or legacy lead uuid. */
  reference: string;
  onPaid?: (payment: { paymentId: string; amount: number }) => void;
  onConfig?: (config: SquareConfig) => void;
};

export function SquareCardForm({ reference, onPaid, onConfig }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<CardInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(75);
  const [done, setDone] = useState(false);

  const start = useServerFn(startDepositPayment);
  const pay = useServerFn(paySquareDeposit);
  const config = useServerFn(getSquareConfig);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cfg = (await config({})) as SquareConfig;
        if (cancelled) return;
        onConfig?.(cfg);

        if (!cfg.configured) {
          setError("Card payments are being set up. Please contact your consultant.");
          setLoading(false);
          return;
        }

        const begin = await start({ data: { ref: reference } });
        if (cancelled) return;
        if (!begin.ok) {
          setError(begin.error);
          setLoading(false);
          return;
        }
        setAmount(begin.amount);
        if (begin.alreadyPaid) {
          setDone(true);
          setLoading(false);
          return;
        }

        const sdk = await loadSquareSdk(cfg.environment);
        if (cancelled) return;
        const payments = sdk.payments(cfg.applicationId, cfg.locationId);
        // Supplying postalCode hides Square's postal-code input. The field was
        // asking Australian patients for a US-style ZIP and rejecting valid
        // postcodes, which the old Stripe link never did. Card number, expiry
        // and CVV only — same as before.
        const card = (await payments.card({ postalCode: "2000" })) as unknown as CardInstance;


        if (cancelled) {
          await card.destroy().catch(() => {});
          return;
        }
        if (containerRef.current) await card.attach(containerRef.current);
        cardRef.current = card;
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the card form.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      const card = cardRef.current;
      cardRef.current = null;
      card?.destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  async function handleSubmit() {
    if (!cardRef.current || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        setError(tokenResult.errors?.[0]?.message ?? "Please check the card details and try again.");
        setSubmitting(false);
        return;
      }
      const result = await pay({ data: { ref: reference, sourceId: tokenResult.token } });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      setDone(true);
      onPaid?.({ paymentId: result.paymentId, amount: result.amount });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
        Payment processed. You can close this payment window and continue the call.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Loading secure card form…
        </div>
      ) : null}

      <div ref={containerRef} className={loading ? "hidden" : "min-h-[90px]"} />

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <Button type="button" className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Processing…" : `Pay $${amount.toFixed(2)} AUD`}
        </Button>
      ) : null}
    </div>
  );
}
