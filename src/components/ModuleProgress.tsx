import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Lock } from "lucide-react";
import {
  loadModuleStatus,
  markModuleComplete,
  nextModule,
  previousModule,
  TRAINING_MODULES,
  type ModuleSlug,
} from "@/lib/training-modules";

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;
const ACCENT = "#f4522d";

type GateState = "loading" | "locked" | "unlocked";

type Props = {
  slug: ModuleSlug;
  children: React.ReactNode;
};

/**
 * Wraps a module page. Shows a locked notice if the previous module is not yet complete.
 * Otherwise renders children (the module content). Children are responsible for rendering
 * <CompleteModuleBar /> when appropriate.
 */
export function ModuleGate({ slug, children }: Props) {
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    (async () => {
      const status = await loadModuleStatus();
      if (status.isAdmin) return setState("unlocked");
      const prev = previousModule(slug);
      if (!prev || status.completed[prev.slug]) setState("unlocked");
      else setState("locked");
    })();
  }, [slug]);


  if (state === "loading") {
    return (
      <div style={{ fontFamily: FONT, padding: 40, textAlign: "center", color: "#6b6b6b" }}>
        Loading…
      </div>
    );
  }
  if (state === "locked") {
    const prev = previousModule(slug);
    return (
      <div
        style={{
          fontFamily: FONT,
          background: "#f7f7f5",
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            background: "#fff",
            border: "1px solid #ebebeb",
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
          }}
        >
          <Lock size={40} color={ACCENT} style={{ margin: "0 auto 14px" }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>
            This module is locked
          </h1>
          <p style={{ color: "#6b6b6b", margin: "0 0 20px", fontSize: 14, lineHeight: 1.55 }}>
            Finish <strong style={{ color: "#111" }}>{prev?.title}</strong> first to unlock this
            module.
          </p>
          {prev && (
            <Link to={prev.url} style={{ textDecoration: "none" }}>
              <span
                style={{
                  display: "inline-block",
                  background: ACCENT,
                  color: "#fff",
                  borderRadius: 10,
                  padding: "12px 22px",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: FONT,
                }}
              >
                Go to {prev.title} →
              </span>
            </Link>
          )}
          <div style={{ marginTop: 14 }}>
            <Link to="/training" style={{ fontSize: 13, color: "#6b6b6b" }}>
              ← Back to training
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

type BarProps = {
  slug: ModuleSlug;
  /** When false, the Mark as complete button is disabled with a tooltip explaining why. */
  canComplete: boolean;
  /** Optional message shown when canComplete is false. */
  notReadyHint?: string;
};

/**
 * Sticky bottom action bar. "Mark as complete" stays disabled until canComplete becomes true.
 * On click, persists module_complete=true and unlocks the next module.
 */
export function CompleteModuleBar({ slug, canComplete, notReadyHint }: BarProps) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const next = nextModule(slug);

  useEffect(() => {
    (async () => {
      const status = await loadModuleStatus();
      setCompleted(!!status.completed[slug]);
    })();
  }, [slug]);

  const onClick = async () => {
    if (!canComplete || busy || completed) return;
    setBusy(true);
    const ok = await markModuleComplete(slug);
    setBusy(false);
    if (ok) setCompleted(true);
  };

  const isDone = completed === true;
  const disabled = !isDone && (!canComplete || busy);

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        marginTop: 32,
        background: "#fff",
        borderTop: "1px solid #ebebeb",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        fontFamily: FONT,
        boxShadow: "0 -4px 14px rgba(0,0,0,0.04)",
        borderRadius: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b6b6b" }}>
        {isDone ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Module complete
          </span>
        ) : canComplete ? (
          <span>You're cleared to mark this module complete.</span>
        ) : (
          <span>{notReadyHint ?? "Reach the end of the content to enable this."}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {!isDone && (
          <button
            onClick={onClick}
            disabled={disabled}
            style={{
              background: disabled ? "#f3d3c8" : ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 20px",
              fontWeight: 700,
              fontSize: 14,
              cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: FONT,
            }}
          >
            {busy ? "Saving…" : "Mark as complete"}
          </button>
        )}
        {isDone && next && (
          <button
            onClick={() => navigate({ to: next.url })}
            style={{
              background: ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 20px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Next: {next.title} →
          </button>
        )}
        {isDone && !next && (
          <Link to="/training" style={{ textDecoration: "none" }}>
            <span
              style={{
                display: "inline-block",
                background: "#111",
                color: "#fff",
                borderRadius: 10,
                padding: "11px 20px",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: FONT,
              }}
            >
              Back to training
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

/** Hook into a <video> ref — returns true once the video has ended. Also fires at >=95% played. */
export function useVideoEnded(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnd = () => setEnded(true);
    const onTime = () => {
      if (v.duration > 0 && v.currentTime / v.duration >= 0.95) setEnded(true);
    };
    v.addEventListener("ended", onEnd);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [videoRef]);
  return ended;
}

export { TRAINING_MODULES };
