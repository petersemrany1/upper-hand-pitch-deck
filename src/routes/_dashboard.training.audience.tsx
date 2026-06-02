import { createFileRoute } from "@tanstack/react-router";
import videoAsset from "@/assets/module-2-know-your-patient.mp4.asset.json";

export const Route = createFileRoute("/_dashboard/training/audience")({
  component: Audience,
});

function Audience() {
  return (
    <div style={{ padding: 32, maxWidth: 960, fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: "#111", marginBottom: 8 }}>Understanding Who You Are Talking To</h1>
      <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
        Module 2 — Know your patient: buyer personas, motivations, objections and how to identify lead types fast.
      </p>
      <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", aspectRatio: "16 / 9" }}>
        <video
          src={videoAsset.url}
          controls
          preload="metadata"
          playsInline
          style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
