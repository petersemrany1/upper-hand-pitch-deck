import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { SquareCardForm } from "@/components/SquareCardForm";
import { SquareTestModeBanner } from "@/components/SquareTestModeBanner";
import htgLogo from "@/assets/htg-logo.png";

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
    <div className="min-h-screen bg-muted/40">
      <SquareTestModeBanner environment={environment} />

      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {/* Brand header — mirrors a hosted checkout: logo, merchant, amount */}
          <header className="bg-foreground px-6 pb-6 pt-8 text-center">
            <img
              src={htgLogo}
              alt="Hair Transplant Group"
              className="mx-auto h-14 w-auto rounded-md"
            />
            <p className="mt-4 text-sm font-medium uppercase tracking-widest text-background/60">
              Hair Transplant Group
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-background">
              $75.00
              <span className="ml-2 align-middle text-base font-normal text-background/60">AUD</span>
            </p>
            <p className="mt-1 text-sm text-background/60">Refundable booking fee</p>
          </header>

          {/* Summary */}
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground">Consultation booking fee</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Fully refunded when you attend your appointment
                </p>
              </div>
              <p className="shrink-0 font-medium text-foreground">$75.00</p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
              100% refundable on attendance
            </div>
          </div>

          {/* Card form */}
          <div className="px-6 py-6">
            {!reference ? (
              <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
                This payment link is missing your booking reference. Please use the link sent to
                you by SMS, or contact your consultant.
              </p>
            ) : (
              <SquareCardForm
                reference={reference}
                onConfig={(cfg) => setEnvironment(cfg.environment)}
              />
            )}
          </div>

          {/* Trust footer */}
          <footer className="border-t border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden="true" />
              <span>Encrypted &amp; secure — card details never touch our servers</span>
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
              <ShieldCheck className="size-3" aria-hidden="true" />
              <span>PCI-DSS compliant payment processing</span>
            </div>
          </footer>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Questions about this payment? Reply to the SMS you received or call your consultant.
        </p>
      </main>
    </div>
  );
}
