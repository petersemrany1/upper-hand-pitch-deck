import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "Payment Received — Hair Transplant Group" },
      { name: "description", content: "Your consultation deposit payment has been received by Hair Transplant Group." },
      { property: "og:title", content: "Payment Received — Hair Transplant Group" },
      { property: "og:description", content: "Your consultation deposit payment has been received by Hair Transplant Group." },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
          ✓
        </div>
        <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
          Payment received
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Thanks — your refundable consultation deposit has gone through. Your consultant can now lock in the appointment.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          You can safely close this page.
        </p>
      </section>
    </main>
  );
}
