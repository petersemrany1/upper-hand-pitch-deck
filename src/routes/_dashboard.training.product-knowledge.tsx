import { createFileRoute, Link } from "@tanstack/react-router";
import videoAsset from "@/assets/module-1-product-knowledge.mp4.asset.json";

export const Route = createFileRoute("/_dashboard/training/product-knowledge")({
  component: ProductKnowledge,
});

function ProductKnowledge() {
  return (
    <div style={{ padding: 32, maxWidth: 960, fontFamily: "'DM Sans', sans-serif" }}>
      <Link to="/training" style={{ textDecoration: "none" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b6b6b", marginBottom: 10, cursor: "pointer", transition: "color 0.15s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#f4522d"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#6b6b6b"; }}
        >
          <span style={{ fontSize: 16 }}>‹</span>
          <span>Back to Training</span>
        </div>
      </Link>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: "#111", marginBottom: 8 }}>Product Knowledge</h1>
      <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
        Module 1 — Learn everything about the product, services, pricing, and clinic partnerships.
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
