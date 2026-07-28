import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { STAGES } from "@/components/ClinicFlowPhotos";

const NAVY = "#1a3a6b";
const GREY = "#6b7785";

export type GalleryPhoto = {
  id: string;
  stage: string;
  caption: string | null;
  signed_url: string | null;
};

export function ClinicFlowTimelineGallery({
  photos,
  onClose,
}: {
  photos: GalleryPhoto[];
  onClose: () => void;
}) {
  const flat = photos.filter((p) => !!p.signed_url);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(flat.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat.length, onClose]);

  if (flat.length === 0) {
    return (
      <div style={backdrop} onClick={onClose}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", color: GREY, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          No timeline photos have been added yet.
        </div>
      </div>
    );
  }

  const current = flat[idx];
  const stageLabel = STAGES.find((s) => s.key === current.stage)?.label ?? current.stage;

  return (
    <div style={backdrop}>
      <button onClick={onClose} aria-label="Close" style={closeBtn}><X size={22} /></button>

      <div style={{ maxWidth: 1000, width: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          style={{ ...navBtn, left: 8, opacity: idx === 0 ? 0.3 : 1 }}
          aria-label="Previous"
        ><ChevronLeft size={28} /></button>

        <div style={{ background: "#000", borderRadius: 14, overflow: "hidden", maxHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={current.signed_url!} alt="" style={{ maxWidth: "100%", maxHeight: "80vh", display: "block", objectFit: "contain" }} />
        </div>

        <button
          onClick={() => setIdx((i) => Math.min(flat.length - 1, i + 1))}
          disabled={idx === flat.length - 1}
          style={{ ...navBtn, right: 8, opacity: idx === flat.length - 1 ? 0.3 : 1 }}
          aria-label="Next"
        ><ChevronRight size={28} /></button>
      </div>

      <div style={{ marginTop: 20, textAlign: "center", color: "#fff", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div style={{ background: NAVY, display: "inline-block", padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{stageLabel}</div>
        {current.caption && <div style={{ marginTop: 10, fontSize: 15 }}>{current.caption}</div>}
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>{idx + 1} / {flat.length}</div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
  zIndex: 200, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", padding: 24,
};
const closeBtn: React.CSSProperties = {
  position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)",
  color: "#fff", border: "none", borderRadius: 999, width: 44, height: 44,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
const navBtn: React.CSSProperties = {
  position: "absolute", top: "50%", transform: "translateY(-50%)",
  background: "rgba(255,255,255,0.2)", color: "#fff", border: "none",
  borderRadius: 999, width: 52, height: 52, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
