import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { loadSquareSdk } from "@/lib/square";
import type { CardMethod, DigitalWalletMethod, TokenResult } from "@/lib/square";
import { getSquareConfig, type SquareConfig } from "@/utils/square-config.functions";
import {
  paySquareDeposit,
  startDepositPayment,
  type DepositClinicInfo,
} from "@/utils/square-deposit.functions";

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
  const applePayRef = useRef<HTMLDivElement | null>(null);
  const googlePayRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<CardMethod | null>(null);
  const walletsRef = useRef<DigitalWalletMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(75);
  const [done, setDone] = useState(false);
  const [applePayReady, setApplePayReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);

  const start = useServerFn(startDepositPayment);
  const pay = useServerFn(paySquareDeposit);
  const config = useServerFn(getSquareConfig);

  async function charge(sourceId: string, verificationToken?: string) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await pay({ data: { ref: reference, sourceId, ...(verificationToken ? { verificationToken } : {}) } });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setDone(true);
      onPaid?.({ paymentId: result.paymentId, amount: result.amount });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Production is the live default. Starting the SDK request immediately
        // overlaps its download with both server calls and removes the previous
        // serial network waterfall on payment-link opens.
        const productionSdk = loadSquareSdk("production");
        const [cfgResult, begin, prefetchedSdk] = await Promise.all([
          withCheckoutTimeout(
            config({}) as Promise<SquareConfig>,
            "The secure card form took too long to load. Please refresh and try again.",
          ),
          withCheckoutTimeout(
            start({ data: { ref: reference } }),
            "Your booking took too long to load. Please refresh and try again.",
          ),
          withCheckoutTimeout(
            productionSdk,
            "The secure card service took too long to load. Please refresh and try again.",
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

        const sdk = cfg.environment === "production"
          ? prefetchedSdk
          : await withCheckoutTimeout(
              loadSquareSdk(cfg.environment),
              "The secure card service took too long to load. Please refresh and try again.",
            );
        if (cancelled) return;
        const payments = sdk.payments(cfg.applicationId, cfg.locationId);

        const postalCode = cfg.environment === "production" ? "2000" : "94103";

        const card = await payments.card({ postalCode });

        if (cancelled) {
          await card.destroy().catch(() => {});
          return;
        }

        if (!containerRef.current) throw new Error("Could not open the secure card form. Please refresh and try again.");
        await withCheckoutTimeout(
          card.attach(containerRef.current),
          "The card fields took too long to load. Please refresh and try again.",
        );
        cardRef.current = card;

        setLoading(false);

        const activeWallets: DigitalWalletMethod[] = [];
        const walletTokenHandler = async (event: {
          detail: { tokenResult: TokenResult };
          complete?: (status: string) => void;
        }) => {
          const { tokenResult } = event.detail;
          if (tokenResult.status !== "OK" || !tokenResult.token) {
            setError(
              tokenResult.errors?.[0]?.message ??
                "That digital wallet payment didn't go through. Please pay with your card below.",
            );
            event.complete?.("failure");
            return;
          }
          const ok = await charge(tokenResult.token, tokenResult.verificationToken);
          event.complete?.(ok ? "success" : "failure");
        };

        // Apple Pay / Google Pay only work reliably on a top-level page. Inside a
        // cross-origin iframe (e.g. an embedded preview) Google's sheet fails with
        // a generic "something went wrong", so the buttons are hidden there.
        const topLevel = (() => {
          try {
            return window.self === window.top;
          } catch {
            return false;
          }
        })();

        if (topLevel) {
          const paymentRequest = payments.paymentRequest({
            countryCode: "AU",
            currencyCode: "AUD",
            total: {
              label: "Refundable booking fee",
              amount: begin.amount.toFixed(2),
              pending: false,
            },
          });

          const [applePay, googlePay] = await Promise.all([
            payments.applePay(paymentRequest).catch(() => null),
            payments.googlePay(paymentRequest).catch(() => null),
          ]);

          if (cancelled) {
            await applePay?.destroy().catch(() => {});
            await googlePay?.destroy().catch(() => {});
            return;
          }

          if (applePay && applePayRef.current) {
            try {
              await applePay.attach("#sq-apple-pay");
              applePay.addEventListener("ontokenization", walletTokenHandler);
              activeWallets.push(applePay);
              setApplePayReady(true);
            } catch {
              await applePay.destroy().catch(() => {});
            }
          }
          if (googlePay && googlePayRef.current) {
            try {
              await googlePay.attach("#sq-google-pay", {
                buttonColor: "black",
                buttonType: "pay",
                buttonSizeMode: "fill",
              });
              googlePay.addEventListener("ontokenization", walletTokenHandler);
              activeWallets.push(googlePay);
              setGooglePayReady(true);
            } catch {
              await googlePay.destroy().catch(() => {});
            }
          }
        }
        walletsRef.current = activeWallets;

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
      walletsRef.current.forEach((w) => w.destroy().catch(() => {}));
      walletsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  async function handleSubmit() {
    if (!cardRef.current || submitting) return;
    const tokenResult = await cardRef.current.tokenize();
    if (tokenResult.status !== "OK" || !tokenResult.token) {
      setError(tokenResult.errors?.[0]?.message ?? "Please check the card details and try again.");
      return;
    }
    await charge(tokenResult.token, tokenResult.verificationToken);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
        Payment processed. You can close this payment window and continue the call.
      </div>
    );
  }

  return (
    <div className="square-card-form">
      <div className="square-wallet-slot">
        <div
          id="sq-apple-pay"
          ref={applePayRef}
          className={applePayReady ? "h-10 w-full" : "hidden"}
        />
        <div
          id="sq-google-pay"
          ref={googlePayRef}
          className={googlePayReady ? "h-10 w-full" : "hidden"}
        />
        {loading ? <div className="square-loading-block h-10 w-full" aria-label="Loading secure payment options" /> : null}
      </div>

      <div className="relative flex h-7 items-center">
        <div className="flex-1 border-t border-[#e0e2e5]" />
        <span className="px-2 text-[11px] text-[#8c8c8c]">Or pay with card</span>
        <div className="flex-1 border-t border-[#e0e2e5]" />
      </div>

      <div className="relative min-h-[112px]">
        <div ref={containerRef} />
        {loading ? <div className="square-loading-card absolute inset-0" aria-label="Loading secure card form" /> : null}
      </div>


      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading ? (
        <Button
          type="button"
          className="h-11 w-full rounded-lg bg-[#1b1b1b] text-[15px] font-medium text-white hover:bg-[#333333]"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Processing…" : `Pay $${amount.toFixed(2)} AUD`}
        </Button>
      ) : (
        <div className="square-loading-block h-11 w-full" aria-hidden="true" />
      )}
    </div>
  );
}
