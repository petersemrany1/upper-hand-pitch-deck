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
  // `t` is the deposit token (current links). `lead` is the legacy lead uuid —
  // kept so links already sent by SMS keep working; sunset after 30 days.
  validateSearch: (search: Record<string, unknown>): { lead?: string; t?: string } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  component: PayDeposit,
});

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function PayDeposit() {
  const { lead, t } = Route.useSearch();
  const [environment, setEnvironment] = useState<string | undefined>(undefined);
  const raw = t ?? lead;
  const reference = raw && UUID_RE.test(raw) ? raw : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SquareTestModeBanner environment={environment} />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Secure your consultation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A $75 booking fee holds your appointment. It is refunded in full when you attend your
          consultation.
        </p>

        <div className="mt-8">
          {!reference ? (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              This payment link is missing your booking reference. Please use the link sent to you
              by SMS, or contact your consultant.
            </p>
          ) : (
            <SquareCardForm
              reference={reference}
              onConfig={(cfg) => setEnvironment(cfg.environment)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
