import type { TokenResult } from "./square";

type PaymentMethod = { tokenize: () => Promise<TokenResult> };

/** All payment buttons share one lock, including while the wallet sheet is open. */
export function createSquarePaymentSubmitter(options: {
  charge: (token: string, verificationToken?: string) => Promise<boolean | null>;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
}) {
  let busy = false;
  let paid = false;
  let disposed = false;
  let pendingToken: TokenResult | null = null;

  return {
    async submit(method: PaymentMethod) {
      if (busy || paid || disposed) return;
      busy = true;
      options.onBusy(true);
      options.onError(null);
      try {
        // Must run in the click's user activation, before any async work.
        const result = pendingToken ?? await method.tokenize();
        if (disposed || result.status === "Cancel") return;
        if (result.status !== "OK" || !result.token) {
          options.onError(result.errors?.[0]?.message ?? "Payment could not be started. Please try again or pay with your card.");
          return;
        }
        pendingToken = result;
        const outcome = await options.charge(result.token, result.verificationToken);
        paid = outcome === true;
        if (outcome !== null) pendingToken = null;
      } catch {
        if (!disposed) options.onError(pendingToken
          ? "We couldn't confirm your payment yet. Please try again here to check the same payment safely."
          : "Payment could not be started. Please try again or pay with your card.");
      } finally {
        busy = false;
        if (!disposed) options.onBusy(false);
      }
    },
    dispose() {
      disposed = true;
    },
  };
}
