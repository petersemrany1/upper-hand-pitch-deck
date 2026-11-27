import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { LEGAL_APP_ORIGIN } from "@/lib/legal/client";

// Shows a Legal Group tool inside the portal. These tools (dialler, SMS inbox,
// contracts, AI coaching) run on the Legal app's own server with its own phone
// numbers and keys, so they open live from there rather than being copied.
// The first time, sign in with your Legal login inside the frame; the browser
// remembers it after that.
export function LegalFrame({ path, title }: { path: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const src = `${LEGAL_APP_ORIGIN}${path}`;
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm" style={{ color: "#6b6b68" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Opening Legal {title}…
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={`Legal — ${title}`}
        onLoad={() => setLoaded(true)}
        allow="microphone; camera; autoplay; clipboard-read; clipboard-write; fullscreen"
        className="h-full w-full flex-1 border-0"
        style={{ background: "#ffffff", opacity: loaded ? 1 : 0, transition: "opacity 150ms" }}
      />
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm"
        style={{ background: "#ffffff", border: "1px solid #e6e6e3", color: "#6b6b68" }}
        title="Open in its own tab"
      >
        <ExternalLink className="h-3 w-3" /> New tab
      </a>
    </div>
  );
}
