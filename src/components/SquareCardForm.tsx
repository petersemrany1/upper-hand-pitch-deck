import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { loadSquareSdk } from "@/lib/square";
import { getSquareConfig, type SquareConfig } from "@/utils/square-config.functions";
import {
  paySquareDeposit,
  startDepositPayment,
  type DepositClinicInfo,
} from "@/utils/square-deposit.functions";

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
  onClinic?: (clinic: DepositClinicInfo | null) => void;
};

const CHECKOUT_STEP_TIMEOUT_MS = 12_000;

function withCheckoutTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), CHECKOUT_STEP_TIMEOUT_MS);
    }),
  ]);
}

export function SquareCardForm({ reference, onPaid, onConfig, onClinic }: Props) {
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
        // Start both independent requests together. Previously the booking
        // lookup did not begin until after the config state update; on some
        // mobile browsers that left the form indefinitely on "Loading".
        const [cfgResult, begin] = await Promise.all([
          withCheckoutTimeout(
            config({}) as Promise<SquareConfig>,
            "The secure card form took too long to load. Please refresh and try again.",
          ),
          withCheckoutTimeout(
            start({ data: { ref: reference } }),
            "Your booking took too long to load. Please refresh and try again.",
          ),
        ]);
        const cfg = cfgResult as SquareConfig;
        if (cancelled) return;
        onConfig?.(cfg);

        if (!cfg.configured) {
          setError("Card payments are being set up. Please contact your consultant.");
          setLoading(false);
          return;
        }

        if (!begin.ok) {
          setError(begin.error);
          setLoading(false);
          return;
        }
        setAmount(begin.amount);
        onClinic?.(begin.clinic ?? null);
        if (begin.alreadyPaid) {
          setDone(true);
          setLoading(false);
          return;
        }

        const sdk = await withCheckoutTimeout(
          loadSquareSdk(cfg.environment),
          "The secure card service took too long to load. Please refresh and try again.",
        );
        if (cancelled) return;
        const payments = sdk.payments(cfg.applicationId, cfg.locationId);
        // Pre-fill the postal code so patients only ever type card number,
        // expiry and CVV — the old Stripe link never asked for a postcode, and
        // Square's field rejects an Australian postcode while the account is in
        // sandbox (it validates as a US ZIP there).
        const postalCode = cfg.environment === "production" ? "2000" : "94103";
        const card = (await payments.card({ postalCode })) as unknown as CardInstance;

        if (cancelled) {
          await card.destroy().catch(() => {});
          return;
        }
        if (!containerRef.current) throw new Error("Could not open the secure card form. Please refresh and try again.");
        await withCheckoutTimeout(
          card.attach(containerRef.current),
          "The card fields took too long to load. Please refresh and try again.",
        );
        await card.configure?.({ postalCode }).catch(() => {});
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
        <Button
          type="button"
          className="h-11 w-full rounded-lg bg-[#1b1b1b] text-[15px] font-medium text-white hover:bg-[#333333]"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Processing…" : `Pay $${amount.toFixed(2)} AUD`}
        </Button>
      ) : null}
    </div>
  );
}
