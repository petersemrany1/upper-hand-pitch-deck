import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SquareCardForm } from "@/components/SquareCardForm";
import { SquareTestModeBanner } from "@/components/SquareTestModeBanner";

export const Route = createFileRoute("/pay-deposit")({
  head: () => ({
    meta: [
      { title: "Pay your refundable booking fee | Hair Transplant Group" },
      {
        name: "description",
        content:
          "Secure your hair transplant consultation with a $75 booking fee — fully refunded when you attend your appointment.",
      },
      { property: "og:title", content: "Pay your refundable booking fee" },
      {
        property: "og:description",
        content:
          "Secure your consultation with a $75 booking fee, refunded in full when you attend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { lead?: string } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
  }),
  component: PayDeposit,
});

function PayDeposit() {
  const { lead } = Route.useSearch();
  const configured = isPaymentsConfigured();

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Secure your consultation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A $75 booking fee holds your appointment. It is refunded in full when you attend your
          consultation.
        </p>

        <div className="mt-8">
          {!lead ? (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              This payment link is missing your booking reference. Please use the link sent to you
              by SMS, or contact your consultant.
            </p>
          ) : !configured ? (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              Card payments are being set up. Please contact your consultant to pay your booking
              fee.
            </p>
          ) : (
            <DepositEmbeddedCheckout leadId={lead} />
          )}
        </div>
      </main>
    </div>
  );
}
