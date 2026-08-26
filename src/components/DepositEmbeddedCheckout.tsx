import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useMemo, useState } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createDepositCheckout } from "@/utils/payments.functions";

interface DepositEmbeddedCheckoutProps {
  leadId: string;
  returnUrl?: string;
  assisted?: boolean;
  onComplete?: () => void;
}

export function DepositEmbeddedCheckout({
  leadId,
  returnUrl,
  assisted = false,
  onComplete,
}: DepositEmbeddedCheckoutProps) {
  const [completed, setCompleted] = useState(false);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createDepositCheckout({
      data: {
        leadId,
        returnUrl:
          returnUrl ||
          `${window.location.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
        assisted,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  }, [assisted, leadId, returnUrl]);

  const options = useMemo(
    () => ({
      fetchClientSecret,
      onComplete: () => {
        setCompleted(true);
        onComplete?.();
      },
    }),
    [fetchClientSecret, onComplete],
  );

  return (
    <div id="checkout">
      {completed ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
          Payment processed. You can close this payment window and continue the call.
        </div>
      ) : null}
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
