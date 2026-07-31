import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ModuleGate, CompleteModuleBar } from "@/components/ModuleProgress";

export const Route = createFileRoute("/_dashboard/training/call-coaching")({
  component: CallCoaching,
});

const ACCENT = "#f4522d";
const VIDEO_ID = "rOGHA_SCXKw";

function CallCoaching() {
  return (
    <ModuleGate slug="call-coaching">
      <Inner />
    </ModuleGate>
  );
}

function loadYouTubeApi(): Promise<void> {
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (!w.__ytApiPromise) {
    w.__ytApiPromise = new Promise<void>((resolve) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    });
  }
  return w.__ytApiPromise;
}

function Inner() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let player: any = null;
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return;
      const w = window as any;
      player = new w.YT.Player(hostRef.current, {
        videoId: VIDEO_ID,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (event: any) => {
            if (event.data === w.YT.PlayerState.ENDED) setEnded(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        player?.destroy?.();
      } catch {}
    };
  }, []);

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
          Before You Practice — Call Coaching
        </h1>
        <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
          Watch this all the way through before your AI practice call. It walks a real call start to
          finish — discovery, education, the audiobook moment and the close.
        </p>
        <div style={{ background: "#000", border: "1px solid #ebebeb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
            <div
              ref={hostRef}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
          </div>
        </div>
        <CompleteModuleBar
          slug="call-coaching"
          canComplete={ended}
          notReadyHint="Watch the video to the end to enable this."
        />
      </div>
    </div>
  );
}
