import type { TokenResult } from "./square";

type PaymentMethod = { tokenize: () => Promise<TokenResult> };

/** All payment buttons share one lock, including while the wallet sheet is open. */
export function createSquarePaymentSubmitter(options: {
  charge: (token: string, verificationToken?: string) => Promise<boolean>;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
}) {
  let busy = false;
  let paid = false;
  let disposed = false;

  return {
    async submit(method: PaymentMethod) {
      if (busy || paid || disposed) return;
      busy = true;
      options.onBusy(true);
      options.onError(null);
      try {
        // Must run in the click's user activation, before any async work.
        const result = await method.tokenize();
        if (disposed || result.status === "Cancel") return;
        if (result.status !== "OK" || !result.token) {
          options.onError(result.errors?.[0]?.message ?? "Payment could not be started. Please try again or pay with your card.");
          return;
        }
        paid = await options.charge(result.token, result.verificationToken);
      } catch {
        if (!disposed) options.onError("Payment could not be completed. Please try again or pay with your card.");
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
