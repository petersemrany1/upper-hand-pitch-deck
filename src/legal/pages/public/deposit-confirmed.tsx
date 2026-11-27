// Ported from the Legal app (family-law-floater/src/routes/deposit-confirmed.tsx). Re-run the port script to refresh.
import { CheckCircle2 } from "lucide-react";

type Search = { firm?: string | undefined; lead?: string | undefined };

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { DepositConfirmed as LegalPage };
export const Route = legalRoute({
  validateSearch: (search: Record<string, unknown>): Search => ({
    firm: typeof search["firm"] === "string" ? search["firm"] : undefined,
    lead: typeof search["lead"] === "string" ? search["lead"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "You're locked in — Legal Group" },
      {
        name: "description",
        content:
          "Your refundable $75 deposit is confirmed and your free family law consultation is locked in.",
      },
      { property: "og:title", content: "You're locked in — Legal Group" },
      {
        property: "og:description",
        content: "Your free family law consultation is confirmed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepositConfirmed,
});

function DepositConfirmed() {
  const { firm } = Route.useSearch();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-10 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">You&apos;re locked in</h1>
        <p className="mt-3 text-muted-foreground">
          {firm ? `${firm} will see you soon.` : "Your firm will see you soon."}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Your $75 deposit is fully refundable — it only confirms your spot. There&apos;s nothing to
          pay at the firm. We&apos;ll text you the confirmation details shortly.
        </p>
      </div>
    </main>
  );
}
