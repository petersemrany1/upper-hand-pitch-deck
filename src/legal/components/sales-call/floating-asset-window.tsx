// Ported from the Legal app (family-law-floater/src/components/sales-call/floating-asset-window.tsx). Re-run the port script to refresh.
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Calculator, X } from "lucide-react";

type Rect = { x: number; y: number; width: number; height: number };
const EDGE = 8;
const viewport = () => ({
  width: window.visualViewport?.width || window.innerWidth,
  height: window.visualViewport?.height || window.innerHeight,
});
function fit(rect: Rect): Rect {
  const bounds = viewport();
  const width = Math.min(700, bounds.width - EDGE * 2);
  const height = Math.min(rect.height, bounds.height - EDGE * 2);
  return {
    width,
    height,
    x: Math.max(EDGE, Math.min(rect.x, bounds.width - width - EDGE)),
    y: Math.max(EDGE, Math.min(rect.y, bounds.height - height - EDGE)),
  };
}
function start(anchor: HTMLElement | null): Rect {
  const bounds = viewport();
  const notes = document.querySelector('[aria-label="Call notes"]')?.getBoundingClientRect();
  const bottom = notes && notes.top > 300 ? notes.top - 12 : bounds.height - EDGE;
  const height = Math.min(502, bottom - EDGE);
  const width = Math.min(700, bounds.width - EDGE * 2);
  return fit({
    width,
    height,
    x: (bounds.width - width) / 2,
    y: Math.min(anchor?.parentElement?.getBoundingClientRect().top || 72, bottom - height),
  });
}

/** No backdrop or focus trap: notes remain usable beside the draggable calculator. */
export function FloatingAssetWindow({
  title,
  clientName,
  onClose,
  children,
}: {
  title: string;
  clientName: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const titleId = useId(),
    helpId = useId();
  const [rect, setRect] = useState<Rect | null>(null);
  const current = useRef<Rect | null>(null);
  const gesture = useRef<{ x: number; y: number; rect: Rect } | null>(null);
  const [moving, setMoving] = useState(false);
  const change = (next: Rect) => {
    current.current = next;
    setRect(next);
  };
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    change(start(anchor.current));
    const resize = () => {
      if (current.current) {
        const sized = start(anchor.current);
        change(
          fit({
            ...current.current,
            y: Math.min(current.current.y, sized.y),
            width: sized.width,
            height: sized.height,
          }),
        );
      }
    };
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      if (
        trigger?.isConnected &&
        (document.activeElement === document.body ||
          document.activeElement?.closest(".asset-window"))
      )
        trigger.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (rect) handle.current?.focus({ preventScroll: true });
  }, [rect !== null]);
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const from = gesture.current;
    if (from)
      change(
        fit({
          ...from.rect,
          x: from.rect.x + event.clientX - from.x,
          y: from.rect.y + event.clientY - from.y,
        }),
      );
  };
  const end = () => {
    gesture.current = null;
    setMoving(false);
  };
  return (
    <>
      <span ref={anchor} hidden />
      {rect &&
        createPortal(
          <section
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            className="asset-window"
            data-moving={moving || undefined}
            data-compact={rect.height < 480 || undefined}
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                onClose();
              }
            }}
          >
            <header className="asset-window-titlebar">
              <button
                ref={handle}
                type="button"
                className="asset-window-drag"
                aria-label="Move calculator"
                aria-describedby={helpId}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.focus({ preventScroll: true });
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  gesture.current = { x: event.clientX, y: event.clientY, rect };
                  setMoving(true);
                }}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                onLostPointerCapture={end}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
                    return;
                  event.preventDefault();
                  const step = event.shiftKey ? 40 : 10;
                  change(
                    fit({
                      ...rect,
                      x:
                        rect.x +
                        (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
                      y:
                        rect.y +
                        (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
                    }),
                  );
                }}
              >
                <Calculator size={17} />
                <span id={titleId}>{title}</span>
                <span className="asset-window-client">{clientName}</span>
              </button>
              <span id={helpId} className="sr-only">
                Drag the title to move this window, or use the arrow keys.
              </span>
              <button
                type="button"
                className="asset-window-close"
                aria-label="Close net assets calculator"
                title="Close"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </header>
            <div className="asset-window-body">{children}</div>
          </section>,
          document.body,
        )}
    </>
  );
}
