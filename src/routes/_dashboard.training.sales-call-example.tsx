import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training/sales-call-example")({
  component: SalesCallExample,
});

function SalesCallExample() {
  return (
    <div style={{ padding: 32, maxWidth: 880 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111", marginBottom: 8 }}>Sales Call Example</h1>
      <p style={{ color: "#6b6b6b", fontSize: 14 }}>
        Listen to model sales calls and study the structure step by step.
      </p>
      <div style={{ marginTop: 24, padding: 24, border: "1px solid #ebebeb", borderRadius: 8, background: "#fafafa", color: "#6b6b6b", fontSize: 13 }}>
        Training content coming soon.
      </div>
    </div>
  );
}
