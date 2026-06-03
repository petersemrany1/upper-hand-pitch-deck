import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import ahmedAsset from "@/assets/sales-call-ahmed.mp3.asset.json";
import jonoAsset from "@/assets/sales-call-jono.mp3.asset.json";
import rajAsset from "@/assets/sales-call-raj.mp3.asset.json";

export const Route = createFileRoute("/_dashboard/training/sales-call-example")({
  component: SalesCallExample,
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;

const recordings = [
  { name: "Ahmed", url: ahmedAsset.url },
  { name: "Jono", url: jonoAsset.url },
  { name: "Raj", url: rajAsset.url },
];

function SalesCallExample() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      <div style={{ padding: "32px 28px", maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 6, letterSpacing: "-0.01em" }}>
          Sales Call Example
        </h1>
        <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
          Click a name to play the recording and study the structure step by step.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {recordings.map((r, i) => {
            const isOpen = selected === i;
            return (
              <div
                key={r.name}
                style={{
                  border: `1px solid ${isOpen ? "#111" : "#ebebeb"}`,
                  borderRadius: 10,
                  background: "#ffffff",
                  overflow: "hidden",
                  transition: "border-color 0.15s ease",
                }}
              >
                <button
                  onClick={() => setSelected(isOpen ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 20px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: isOpen ? "#111" : "#f3f3f3",
                      color: isOpen ? "#fff" : "#9a9a9a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 4 }}>{r.name}</div>
                    <p style={{ fontSize: 13, color: "#6b6b6b", margin: 0 }}>Call recording</p>
                  </div>
                  <span style={{ color: "#c4c4c4", fontSize: 18, flexShrink: 0 }}>{isOpen ? "⌄" : "›"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 20px 20px 20px" }}>
                    <audio controls autoPlay src={r.url} style={{ width: "100%" }}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
