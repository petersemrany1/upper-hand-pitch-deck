import { createFileRoute, Link } from "@tanstack/react-router";
import video from "@/assets/how-to-use-sales-portal-crm.mp4.asset.json";

export const Route = createFileRoute("/_dashboard/training/platform")({
  component: PlatformTraining,
});

const ACCENT = "#f4522d";

function PlatformTraining() {
  return (
    <div style={{ fontFamily: `"DM Sans", system-ui, sans-serif`, background: "#f7f7f5", minHeight: "100%" }}>
      <div style={{ padding: "32px 28px", maxWidth: 880, margin: "0 auto" }}>
        <Link
          to="/training"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 13, color: "#6b6b6b", textDecoration: "none",
            marginBottom: 16, cursor: "pointer", transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b6b")}
        >
          ‹ Back to Training
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 6, letterSpacing: "-0.01em" }}>
          Platform Training
        </h1>
        <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
          Tour of the portal: leads, dialler, callbacks, SMS, bookings and reporting.
        </p>
        <div style={{ background: "#000", border: "1px solid #ebebeb", borderRadius: 12, overflow: "hidden" }}>
          <video
            src={video.url}
            controls
            playsInline
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}
