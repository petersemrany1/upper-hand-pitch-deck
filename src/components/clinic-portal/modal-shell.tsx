import { useEffect, useRef } from "react";

export function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  // Track where the mousedown started so a text selection that ends outside
  // the modal (drag-release on backdrop) does NOT close the modal.
  const downOnBackdropRef = useRef(false);
  return (
    <div
      onMouseDown={(e) => { downOnBackdropRef.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => {
        if (downOnBackdropRef.current && e.target === e.currentTarget) onClose();
        downOnBackdropRef.current = false;
      }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {children}
      </div>
    </div>
  );
}

