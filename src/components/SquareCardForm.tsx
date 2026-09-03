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

/**
 * Apple Pay on the Web only runs inside Safari/WebKit on Apple hardware.
 * On Chrome (and any other browser) we still show the Apple Pay option, but
 * clicking it hands the same checkout URL off to the customer's iPhone via a
 * QR code — the same pattern Apple itself uses for third-party browsers.
 */
function ApplePayHandoff() {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href;

  useEffect(() => {
    if (!open || qr || !url) return;
    let cancelled = false;
    void (async () => {
      try {
        const { default: QRCode } = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
        if (!cancelled) setQr(dataUrl);
      } catch {
        /* QR is optional — the link fallback below still works. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, qr, url]);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-black text-[15px] font-medium text-white transition-opacity hover:opacity-90"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
          <path d="M16.4 12.9c0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7.9 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.5-2 .5-.7.7-1.1 1-1.9-2.4-.9-2.6-3.9-1.6-4.4zM14.6 6.6c.6-.7 1-1.7.9-2.6-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.8 2.5 1 .1 2-.5 2.4-1.2z" />
        </svg>
        Pay with Apple&nbsp;Pay
      </button>

      {open ? (
        <div className="mt-2 rounded-lg border border-[#e0e2e5] bg-[#f7f8f9] p-3 text-center">
          <p className="text-[12px] leading-snug text-[#4a4a4a]">
            Apple Pay only runs in Safari on an Apple device. Scan this with your iPhone camera to
            finish with Apple Pay.
          </p>
          {qr ? (
            <img
              src={qr}
              alt="QR code to open this checkout on your iPhone"
              className="mx-auto mt-2 h-36 w-36 rounded bg-white p-1"
            />
          ) : (
            <div className="mx-auto mt-2 h-36 w-36 animate-pulse rounded bg-white" />
          )}
          <button
            type="button"
            className="mt-2 text-[12px] font-medium text-[#006aff] underline"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? "Link copied" : "Copy payment link instead"}
          </button>
        </div>
      ) : null}
    </div>
  );
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
        await card.configure?.({ postalCode }).catch(() => {});
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
    <div className="space-y-3">
      {loading ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Loading secure card form…
        </div>
      ) : null}

      <div className="grid gap-2">
        <div
          id="sq-apple-pay"
          ref={applePayRef}
          className={applePayReady ? "min-h-[40px] w-full" : "h-0 w-full overflow-hidden"}
        />
        {!loading && !applePayReady ? <ApplePayHandoff /> : null}
        <div
          id="sq-google-pay"
          ref={googlePayRef}
          className={googlePayReady ? "min-h-[40px] w-full" : "h-0 w-full overflow-hidden"}
        />
      </div>


      {true ? (
        <div className="relative flex items-center py-1">
          <div className="flex-1 border-t border-[#e0e2e5]" />
          <span className="px-2 text-[11px] text-[#8c8c8c]">Or pay with card</span>
          <div className="flex-1 border-t border-[#e0e2e5]" />
        </div>
      ) : null}


      <div ref={containerRef} className={loading ? "hidden" : "min-h-[80px]"} />

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
      ) : null}
    </div>
  );
}
