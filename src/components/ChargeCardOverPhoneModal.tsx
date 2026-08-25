import { X } from "lucide-react";
import { DepositEmbeddedCheckout } from "@/components/DepositEmbeddedCheckout";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultAmount: number;
  patientName: string;
  leadId?: string;
  onSuccess?: (payment: { paymentIntentId: string; amount: number }) => void;
};

/**
 * Staff-assisted deposits use the exact same embedded Checkout flow as the
 * patient payment link. This keeps card entry and the resulting charge on the
 * same managed Stripe account and avoids creating account-bound PaymentMethods
 * in a separate Elements integration.
 */
export function ChargeCardOverPhoneModal({
  open,
  onClose,
  defaultAmount,
  patientName,
  leadId,
}: Props) {
  if (!open) return null;

  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set("deposit", "success");
  currentUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-foreground/55 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assisted-checkout-title"
    >
      <div className="my-4 w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="assisted-checkout-title" className="text-base font-semibold text-foreground">
              Take booking fee payment
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {patientName} · ${defaultAmount.toFixed(2)} AUD
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close payment window"
            title="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-3 sm:p-5">
          {leadId ? (
            <DepositEmbeddedCheckout leadId={leadId} returnUrl={currentUrl.toString()} />
          ) : (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
              This lead does not have a valid booking reference. Close this window and refresh the
              lead before taking payment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}