import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ahmedAsset from "@/assets/sales-call-ahmed.mp3.asset.json";
import jonoAsset from "@/assets/sales-call-jono.mp3.asset.json";
import rajAsset from "@/assets/sales-call-raj.mp3.asset.json";
import nathanAsset from "@/assets/sales-call-nathan.mp3.asset.json";
import angusAsset from "@/assets/sales-call-angus.mp3.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { ModuleGate, CompleteModuleBar } from "@/components/ModuleProgress";

export const Route = createFileRoute("/_dashboard/training/sales-call-example")({
  component: SalesCallExample,
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;

// Darmalingum's live call from 9 Jul 2026 — streamed through the
// twilio-recording proxy so Twilio credentials stay server-side. Token
// is appended client-side once the Supabase session is available.
const DARMA_TWILIO_URL =
  "https://api.twilio.com/2010-04-01/Accounts/AC4e4b3797155ad508c8dffa4b13a1fd6e/Recordings/RE1f300baefb5966cdff137f8e01fceeb1.mp3";

type Recording = { name: string; url: string; requiresToken?: boolean };

const recordings: Recording[] = [
  { name: "Ahmed", url: ahmedAsset.url },
  { name: "Jono", url: jonoAsset.url },
  { name: "Raj", url: rajAsset.url },
  { name: "Nathan", url: nathanAsset.url },
  { name: "Angus", url: angusAsset.url },
  { name: "Darmalingum", url: DARMA_TWILIO_URL, requiresToken: true },
];

function SalesCallExample() {
  return (
    <ModuleGate slug="sales-call-example">
      <Inner />
    </ModuleGate>
  );
}

function Inner() {
  const [selected, setSelected] = useState<number | null>(null);
  const [endedAny, setEndedAny] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionToken(data.session?.access_token ?? "");
    });
  }, []);

  const resolveSrc = (r: Recording): string => {
    if (!r.requiresToken) return r.url;
    if (!sessionToken) return "";
    const base = import.meta.env.VITE_SUPABASE_URL;
    return `${base}/functions/v1/twilio-recording?url=${encodeURIComponent(r.url)}&token=${encodeURIComponent(sessionToken)}`;
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const a = e.currentTarget;
    if (a.duration > 0 && a.currentTime / a.duration >= 0.95) setEndedAny(true);
  };

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      <div style={{ padding: "32px 28px", maxWidth: 880, margin: "0 auto" }}>
        <Link to="/training" style={{ textDecoration: "none" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b6b6b", marginBottom: 10, cursor: "pointer", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f4522d"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b6b6b"; }}
          >
            <span style={{ fontSize: 16 }}>‹</span>
            <span>Back to Training</span>
          </div>
        </Link>
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
                    <audio
                      controls
                      autoPlay
                      src={r.url}
                      onEnded={() => setEndedAny(true)}
                      onTimeUpdate={handleTimeUpdate}
                      style={{ width: "100%" }}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <CompleteModuleBar
          slug="sales-call-example"
          canComplete={endedAny}
          notReadyHint="Listen to at least one recording all the way through to enable this."
        />
      </div>
    </div>
  );
}
