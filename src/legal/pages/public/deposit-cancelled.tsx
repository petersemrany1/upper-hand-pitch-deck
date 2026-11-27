// Ported from the Legal app (family-law-floater/src/routes/deposit-cancelled.tsx). Re-run the port script to refresh.
import { CircleSlash } from "lucide-react";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { DepositCancelled as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Deposit not completed — Legal Group" },
      {
        name: "description",
        content:
          "Your booking deposit wasn't completed. Your consultation spot is not confirmed yet — reply to our text and we'll help.",
      },
      { property: "og:title", content: "Deposit not completed — Legal Group" },
      {
        property: "og:description",
        content: "Your consultation spot isn't confirmed yet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepositCancelled,
});

function DepositCancelled() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-10 text-center shadow-sm">
        <CircleSlash className="mx-auto size-12 text-muted-foreground" aria-hidden />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Deposit not completed</h1>
        <p className="mt-3 text-muted-foreground">
          No payment was taken. Your consultation spot isn&apos;t confirmed yet — just reply to our
          text message and we&apos;ll sort it out with you.
        </p>
      </div>
    </main>
  );
}
