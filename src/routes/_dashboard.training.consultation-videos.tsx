import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_dashboard/training/consultation-videos")({
  component: ConsultationVideos,
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;
const ACCENT = "#f4522d";

const videos = [
  {
    id: "FyJzaI_ovzs",
    title: "Hair Transplant Explained",
  },
  {
    id: "hKn5jkV5xn4",
    title: "Consultation Overview",
  },
  {
    id: "ofqY0sveY58",
    title: "What to Expect",
  },
  {
    id: "pSnN805v8EQ",
    title: "Patient Journey",
  },
];

function ConsultationVideos() {
  const [hoveredBack, setHoveredBack] = useState(false);

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%", padding: "32px 28px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Link
          to="/training"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: hoveredBack ? ACCENT : "#6b6b6b",
            textDecoration: "none",
            cursor: "pointer",
            transition: "color 0.15s ease",
            marginBottom: 20,
          }}
          onMouseEnter={() => setHoveredBack(true)}
          onMouseLeave={() => setHoveredBack(false)}
        >
          <span>‹</span>
          <span>Back to Training</span>
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", marginBottom: 6, letterSpacing: "-0.01em" }}>
          What to Expect at the Consultation
        </h1>
        <p style={{ fontSize: 14, color: "#6b6b6b", marginBottom: 28, lineHeight: 1.5 }}>
          Watch these short videos so you know exactly what a patient experiences when they go in for their hair transplant consultation.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {videos.map((v) => (
            <div
              key={v.id}
              style={{
                background: "#fff",
                border: "1px solid #ebebeb",
                borderRadius: 12,
                padding: 20,
                overflow: "hidden",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 12, marginTop: 0 }}>
                {v.title}
              </h2>
              <div
                style={{
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#111",
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${v.id}`}
                  title={v.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
          <Link
            to="/training/read-along"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: ACCENT,
              color: "#fff",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              transition: "opacity 0.15s ease",
            }}
          >
            Next: Read Along
            <span>›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
