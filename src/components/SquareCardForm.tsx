import { createElement, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { loadSquareSdk } from "@/lib/square";
import { loadApplePaySdk } from "@/lib/apple-pay";
import { createSquarePaymentSubmitter } from "@/lib/square-payment-submission";
import type { CardMethod, DigitalWalletMethod } from "@/lib/square";
import { getSquareConfig, type SquareConfig } from "@/utils/square-config.functions";
import {
  paySquareDeposit,
  startDepositPayment,
  type DepositClinicInfo,
} from "@/utils/square-deposit.functions";

type Props = {
  /** Deposit token (preferred) or legacy lead uuid. */
  reference: string;
  clinicId?: string;
  onPaid?: (payment: { paymentId: string; amount: number }) => void;
  onConfig?: (config: SquareConfig) => void;
  onClinic?: (clinic: DepositClinicInfo | null) => void;
};

const CHECKOUT_STEP_TIMEOUT_MS = 12_000;

function withCheckoutTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), CHECKOUT_STEP_TIMEOUT_MS);
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

export function SquareCardForm({ reference, clinicId, onPaid, onConfig, onClinic }: Props) {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const applePayRef = useRef<HTMLElement | null>(null);
  const googlePayRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<CardMethod | null>(null);
  const submitRef = useRef<ReturnType<typeof createSquarePaymentSubmitter> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(75);
  const [done, setDone] = useState(false);
  const [applePayReady, setApplePayReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const start = useServerFn(startDepositPayment);
  const pay = useServerFn(paySquareDeposit);
  const config = useServerFn(getSquareConfig);

  async function charge(sourceId: string, verificationToken?: string) {
    // Keep an interrupted charge as an exception so the submission controller
    // retries the same token/idempotency key rather than creating a new charge.
    const result = await pay({ data: { ref: reference, sourceId, ...(clinicId ? { clinicId } : {}), ...(verificationToken ? { verificationToken } : {}) } });
    if (!result.ok) {
      setError(result.error);
      return result.retryable ? null : false;
    }
    setDone(true);
    onPaid?.({ paymentId: result.paymentId, amount: result.amount });
    return true;
  }

  useEffect(() => {
    let cancelled = false;
    const wallets: DigitalWalletMethod[] = [];
    const removeListeners: (() => void)[] = [];
    const submitter = createSquarePaymentSubmitter({
      charge,
      onBusy: setSubmitting,
      onError: setError,
    });
    submitRef.current = submitter;
    setLoading(true);
    setDone(false);
    setError(null);
    setSubmitting(false);
    setApplePayReady(false);
    setGooglePayReady(false);
    setCardReady(false);

    function bindWallet(button: HTMLElement, wallet: DigitalWalletMethod) {
      const onClick = (event: Event) => {
        event.preventDefault();
        void submitter.submit(wallet);
      };
      button.addEventListener("click", onClick);
      removeListeners.push(() => button.removeEventListener("click", onClick));
    }

    (async () => {
      try {
        // Production is the live default. Starting the SDK request immediately
        // overlaps its download with both server calls and removes the previous
        // serial network waterfall on payment-link opens.
        const productionSdk = loadSquareSdk("production");
        // Wallet setup is independent of the card fields and Google Pay.
        const appleSdk = loadApplePaySdk().then(() => true).catch((e) => {
          console.warn("Apple Pay SDK unavailable", e);
          return false;
        });
        const [cfgResult, begin, prefetchedSdk] = await Promise.all([
          withCheckoutTimeout(
            config({}) as Promise<SquareConfig>,
            "The secure card form took too long to load. Please refresh and try again.",
          ),
          withCheckoutTimeout(
            start({ data: { ref: reference, ...(clinicId ? { clinicId } : {}) } }),
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

        const card = await payments.card();

        if (cancelled) {
          await card.destroy().catch(() => {});
          return;
        }

        if (!containerRef.current) throw new Error("Could not open the secure card form. Please refresh and try again.");
        await withCheckoutTimeout(
          card.attach(containerRef.current),
          "The card fields took too long to load. Please refresh and try again.",
        );
        if (cancelled) {
          await card.destroy().catch(() => {});
          return;
        }
        cardRef.current = card;
        setCardReady(true);

        setLoading(false);

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
              label: begin.clinic?.clinicName ?? "Hair Transplant Group booking fee",
              amount: begin.amount.toFixed(2),
              pending: false,
            },
          });

          const [applePay, googlePay] = await Promise.all([
            appleSdk.then((loaded) => loaded ? payments.applePay(paymentRequest) : null).catch((e) => {
              console.warn("Apple Pay unavailable", e);
              return null;
            }),
            payments.googlePay(paymentRequest).catch((e) => {
              console.warn("Google Pay unavailable", e);
              return null;
            }),
          ]);

          if (cancelled) {
            await applePay?.destroy().catch(() => {});
            await googlePay?.destroy().catch(() => {});
            return;
          }

          if (applePay) {
            wallets.push(applePay);
            if (applePayRef.current) {
              bindWallet(applePayRef.current, applePay);
              setApplePayReady(true);
            }
          }
          if (googlePay) {
            wallets.push(googlePay);
            if (googlePayRef.current) {
              try {
                await googlePay.attach(googlePayRef.current, {
                  buttonColor: "black",
                  buttonType: "pay",
                  buttonSizeMode: "fill",
                });
                if (cancelled) return;
                bindWallet(googlePayRef.current, googlePay);
                setGooglePayReady(true);
              } catch {
                // Unsupported wallets must not prevent payment by card.
                await googlePay.destroy().catch(() => {});
              }
            }
          }
        }

        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the card form.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      submitter.dispose();
      submitRef.current = null;
      removeListeners.forEach((remove) => remove());
      const card = cardRef.current;
      cardRef.current = null;
      card?.destroy().catch(() => {});
      wallets.forEach((wallet) => wallet.destroy().catch(() => {}));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, clinicId]);

  function handleSubmit() {
    if (cardRef.current) void submitRef.current?.submit(cardRef.current);
  }

  if (done) {
    return (
      <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-semibold">Payment confirmed</p>
        <p className="mt-1">Your ${amount.toFixed(2)} AUD booking fee has been received. Keep this page for your records and continue with your consultant.</p>
      </div>
    );
  }

  return (
    <div className="square-card-form">
      <div className={`square-wallet-slot ${submitting ? "pointer-events-none opacity-60" : ""}`} aria-busy={submitting} inert={submitting}>
        {createElement("apple-pay-button", {
          id: "sq-apple-pay",
          ref: applePayRef,
          buttonstyle: "black",
          type: "pay",
          locale: "en-AU",
          "aria-label": "Pay with Apple Pay",
          className: applePayReady ? "square-apple-pay-button" : "hidden",
        })}
        <div
          id="sq-google-pay"
          ref={googlePayRef}
          className={googlePayReady ? "h-10 w-full" : "hidden"}
        />
        {loading ? <div className="square-loading-block h-10 w-full" aria-label="Loading secure payment options" /> : null}
      </div>

      <div className="relative flex h-7 items-center">
        <div className="flex-1 border-t border-[#e0e2e5]" />
        <span className="px-2 text-xs text-[#656565]">{applePayReady || googlePayReady ? "Or pay with card" : "Pay securely by card"}</span>
        <div className="flex-1 border-t border-[#e0e2e5]" />
      </div>

      <div className="square-card-fields relative">
        <div ref={containerRef} />
        {loading ? <div className="square-loading-card absolute inset-0" aria-label="Loading secure card form" /> : null}
      </div>


      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && cardReady ? (
        <Button
          type="button"
          className="h-11 w-full rounded-lg bg-[#1b1b1b] text-[15px] font-medium text-white hover:bg-[#333333]"
          onClick={handleSubmit}
          disabled={submitting || !cardReady}
        >
          {submitting ? "Processing…" : `Pay $${amount.toFixed(2)} AUD`}
        </Button>
      ) : loading ? (
        <div className="square-loading-block h-11 w-full" aria-hidden="true" />
      ) : null}
    </div>
  );
}
