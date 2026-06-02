import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training/audience")({
  component: Audience,
});

function Audience() {
  return (
    <div style={{ padding: 32, maxWidth: 880 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111", marginBottom: 8 }}>Understanding Who You Are Talking To</h1>
      <p style={{ color: "#6b6b6b", fontSize: 14 }}>
        Buyer personas, motivations, objections and how to identify lead types fast.
      </p>
      <div style={{ marginTop: 24, padding: 24, border: "1px solid #ebebeb", borderRadius: 8, background: "#fafafa", color: "#6b6b6b", fontSize: 13 }}>
        Training content coming soon.
      </div>
    </div>
  );
}
