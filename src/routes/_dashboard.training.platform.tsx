import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training/platform")({
  component: PlatformTraining,
});

function PlatformTraining() {
  return (
    <div style={{ padding: 32, maxWidth: 880 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111", marginBottom: 8 }}>Platform Training</h1>
      <p style={{ color: "#6b6b6b", fontSize: 14 }}>
        Tour of the portal: leads, dialler, callbacks, SMS, bookings and reporting.
      </p>
      <div style={{ marginTop: 24, padding: 24, border: "1px solid #ebebeb", borderRadius: 8, background: "#fafafa", color: "#6b6b6b", fontSize: 13 }}>
        Training content coming soon.
      </div>
    </div>
  );
}
