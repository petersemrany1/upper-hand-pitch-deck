import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createDepositCheckout } from "@/utils/payments.functions";

interface DepositEmbeddedCheckoutProps {
  leadId: string;
  returnUrl?: string;
}

export function DepositEmbeddedCheckout({ leadId, returnUrl }: DepositEmbeddedCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createDepositCheckout({
      data: {
        leadId,
        returnUrl:
          returnUrl ||
          `${window.location.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
