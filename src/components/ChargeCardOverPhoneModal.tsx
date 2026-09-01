import { X } from "lucide-react";
import { SquareCardForm } from "@/components/SquareCardForm";
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
 * Staff-assisted deposits use the same Square card form as the patient payment
 * link. Card entry is tokenised in the browser, the charge happens server-side
 * and nothing navigates on completion, so an active Twilio call is never
 * interrupted.
 */
export function ChargeCardOverPhoneModal({
  open,
  onClose,
  defaultAmount,
  patientName,
  leadId,
  onSuccess,
}: Props) {
  if (!open) return null;

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
          {!paymentsConfigured ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Payments are not configured for this build. Complete payment go-live and republish
              before taking a card payment.
            </p>
          ) : leadId ? (
            <DepositEmbeddedCheckout
              leadId={leadId}
              returnUrl={currentUrl.toString()}
              assisted
            />
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