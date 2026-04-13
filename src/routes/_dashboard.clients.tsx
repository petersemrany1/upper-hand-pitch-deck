import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/clients")({
  component: () => (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "var(--font-display)" }}>CLIENTS</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  ),
});
