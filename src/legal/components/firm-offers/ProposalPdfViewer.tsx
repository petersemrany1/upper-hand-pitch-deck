// Ported from the Legal app (family-law-floater/src/components/firm-offers/ProposalPdfViewer.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
/** Render locally so browsers without a built-in PDF plugin can still present the proposal. */
export function ProposalPdfViewer({ url }: { url: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1),
    [width, setWidth] = useState(600);
  const [expanded, setExpanded] = useState(false),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | undefined;
    setError("");
    setDocument(undefined);
    setPage(1);
    setLoading(true);
    void import("pdfjs-dist")
      .then(async (pdfjs) => {
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const task = pdfjs.getDocument({ url, isEvalSupported: false });
        destroy = () => task.destroy();
        const loaded = await task.promise;
        if (!cancelled) setDocument(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setError("The preview couldn’t load. You can still download the PDF above.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      void destroy?.();
    };
  }, [url]);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(200, Math.floor(w)));
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    let cancel: (() => void) | undefined;
    setLoading(true);
    void document
      .getPage(page)
      .then(async (p) => {
        if (cancelled || !canvas.current) return;
        const viewport = p.getViewport({ scale: width / p.getViewport({ scale: 1 }).width });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const target = canvas.current;
        target.width = Math.floor(viewport.width * ratio);
        target.height = Math.floor(viewport.height * ratio);
        const task = p.render({
          canvasContext: target.getContext("2d")!,
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
        });
        cancel = () => task.cancel();
        await task.promise;
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("This page couldn’t render. Download the PDF to view it.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      cancel?.();
    };
  }, [document, page, width]);
  return (
    <div
      className={`proposal-pdf${expanded ? " presenting" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") setExpanded(false);
      }}
    >
      <div className="pdf-toolbar">
        <div className="pdf-pages">
          <button
            aria-label="Previous PDF page"
            disabled={!document || page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <label>
            Page
            <select
              aria-label="PDF page"
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
            >
              {Array.from({ length: document?.numPages ?? 1 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <span>of {document?.numPages ?? "…"}</span>
          <button
            aria-label="Next PDF page"
            disabled={!document || page === document.numPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {expanded ? "Exit presentation" : "Present PDF"}
        </button>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <div className="pdf-scroll">
        <div ref={container} className="pdf-page">
          {loading && (
            <p className="pdf-loading" role="status">
              Loading PDF…
            </p>
          )}
          <canvas
            ref={canvas}
            role="img"
            aria-label={`Proposal PDF, page ${page} of ${document?.numPages ?? "loading"}`}
          />
        </div>
      </div>
    </div>
  );
}
