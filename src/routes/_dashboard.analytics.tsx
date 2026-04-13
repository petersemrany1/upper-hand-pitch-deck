import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/analytics")({
  component: () => (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "var(--font-display)" }}>ANALYTICS</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  ),
});
