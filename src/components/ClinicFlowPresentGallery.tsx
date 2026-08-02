import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { STAGES } from "@/components/ClinicFlowPhotos";

const NAVY = "#1a3a6b";
const DARK = "#0b1220";
const SOFT = "#9aa6b6";

export type PresentPhoto = {
  id: string;
  stage: string;
  caption: string | null;
  signed_url: string | null;
  isDefault?: boolean;
};

export function ClinicFlowPresentGallery({
  photos,
  loading,
  onClose,
  mode = "timeline",
}: {
  photos: PresentPhoto[];
  loading?: boolean;
  onClose: () => void;
  mode?: "timeline" | "before_after";
}) {
  // Ordered by the canonical stage sequence so "next" walks the timeline.
  const flat = useMemo(() => {
    const usable = photos.filter((p) => !!p.signed_url);
    const order = new Map(STAGES.map((s, i) => [s.key, i]));
    return [...usable].sort(
      (a, b) => (order.get(a.stage) ?? 99) - (order.get(b.stage) ?? 99),
    );
  }, [photos]);

  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = (delta: number) =>
    setIdx((i) => Math.min(Math.max(0, i + delta), Math.max(0, flat.length - 1)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat.length, onClose]);

  const current = flat[idx];
  const activeStage = current?.stage ?? null;
  const stagesPresent = STAGES.filter((s) => flat.some((p) => p.stage === s.key));
  const inStage = flat.filter((p) => p.stage === activeStage);
  const posInStage = current ? inStage.findIndex((p) => p.id === current.id) + 1 : 0;

  const jumpToStage = (key: string) => {
    const first = flat.findIndex((p) => p.stage === key);
    if (first >= 0) setIdx(first);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: DARK, zIndex: 300,
        display: "flex", flexDirection: "column",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        touchX.current = null;
        if (start === null || end === null) return;
        const dx = end - start;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
      }}
    >
      {/* Top: stage chips + close */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <div style={{ flex: 1, display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          {stagesPresent.map((s) => {
            const active = s.key === activeStage;
            return (
              <button
                key={s.key}
                onClick={() => jumpToStage(s.key)}
                style={{
                  flex: "0 0 auto", border: `1px solid ${active ? "#fff" : "rgba(255,255,255,0.2)"}`,
                  background: active ? "#fff" : "transparent",
                  color: active ? NAVY : "rgba(255,255,255,0.8)",
                  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            flex: "0 0 auto", background: "rgba(255,255,255,0.14)", color: "#fff", border: "none",
            borderRadius: 999, width: 44, height: 44, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={22} />
        </button>
      </div>

      {/* Middle */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
        {loading ? (
          <div style={{ color: SOFT, fontSize: 14 }}>Loading photos…</div>
        ) : flat.length === 0 ? (
          <div style={{ color: SOFT, fontSize: 14, textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>
            No timeline photos yet — add them in Setup, or they'll appear once the HTG library is loaded.
          </div>
        ) : (
          <>
            <button onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous" style={{ ...navBtn, opacity: idx === 0 ? 0.25 : 1 }}>
              <ChevronLeft size={28} />
            </button>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", maxWidth: "100%", display: "flex", justifyContent: "center" }}>
                <img
                  src={current!.signed_url!}
                  alt={current!.caption ?? "Result photo"}
                  style={{ maxWidth: "100%", maxHeight: "68vh", objectFit: "contain", display: "block", borderRadius: 12 }}
                />
                {current!.isDefault && (
                  <span
                    style={{
                      position: "absolute", bottom: 10, right: 10,
                      background: "rgba(11,18,32,0.75)", color: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                    }}
                  >
                    Library
                  </span>
                )}
              </div>
              {current!.caption && (
                <div style={{ color: SOFT, fontSize: 14, textAlign: "center", maxWidth: 640 }}>{current!.caption}</div>
              )}
            </div>
            <button onClick={() => go(1)} disabled={idx === flat.length - 1} aria-label="Next" style={{ ...navBtn, opacity: idx === flat.length - 1 ? 0.25 : 1 }}>
              <ChevronRight size={28} />
            </button>
          </>
        )}
      </div>

      {/* Counter */}
      <div style={{ padding: "12px 16px 20px", textAlign: "center", color: SOFT, fontSize: 12 }}>
        {flat.length > 0 && `${posInStage} of ${inStage.length}`}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  flex: "0 0 auto", background: "rgba(255,255,255,0.16)", color: "#fff", border: "none",
  borderRadius: 999, width: 52, height: 52, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
