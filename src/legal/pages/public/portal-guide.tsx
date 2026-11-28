// Ported from the Legal app (family-law-floater/src/routes/portal-guide.tsx). Re-run the port script to refresh.
import { useRef, useState } from "react";
import { BoldBrand } from "@/legal/components/firm-portal/BoldBrand";
import "@/legal/components/firm-portal/firm-portal.css";

const chapters = [
  { time: 0, label: "0:00", title: "Your workspace and credits" },
  { time: 31.347, label: "0:31", title: "Review an appointment" },
  { time: 63.483, label: "1:03", title: "Record the outcome" },
  { time: 86.425, label: "1:26", title: "Availability and buffers" },
  { time: 116.332, label: "1:56", title: "Block time" },
  { time: 141.456, label: "2:21", title: "Add a pack" },
];

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { PortalGuide as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Your firm portal — video guide | Bold" },
      {
        name: "description",
        content:
          "A three-minute guide to appointments, availability, buffers and consultation credits in your Bold firm portal.",
      },
      { property: "og:title", content: "Your firm portal — video guide" },
      {
        property: "og:description",
        content: "Watch the three-minute walkthrough for Bold partner firms.",
      },
      {
        property: "og:image",
        content: "https://boldfamilylaw.com.au/media/firm-portal-guide/cover.png",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalGuide,
});

function PortalGuide() {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const jumpTo = (time: number) => {
    if (!video.current) return;
    video.current.currentTime = time;
    void video.current.play().catch(() => video.current?.focus());
  };
  return (
    <div className="bold-portal firm-portal-ui min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <BoldBrand />
          <a
            href="/firm-portal"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Open portal
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Getting started · 3 minutes
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your firm portal, explained.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          A quick walkthrough of your appointments, availability and consultation credits. Press
          play below, or jump to the part you need.
        </p>
        <video
          ref={video}
          controls
          playsInline
          preload="metadata"
          poster="/media/firm-portal-guide/cover.png"
          className="mt-8 aspect-video w-full rounded-xl border border-border bg-slate-950 shadow-sm"
          aria-label="Bold firm portal video guide"
          onError={() => setError(true)}
        >
          <source src="/media/firm-portal-guide/guide.mp4" type="video/mp4" />
          <track
            kind="captions"
            src="/media/firm-portal-guide/captions.vtt"
            srcLang="en"
            label="English"
          />
          <a href="/media/firm-portal-guide/guide.mp4">Watch the video</a>
        </video>
        {error && (
          <p role="alert" className="mt-4 text-sm">
            The video could not load.{" "}
            <a className="underline" href="/media/firm-portal-guide/guide.mp4">
              Open the video directly
            </a>{" "}
            or try refreshing this page.
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
          <span>Example clients · AI narration · English captions available</span>
          <a
            className="font-medium text-primary underline underline-offset-4"
            href="/media/firm-portal-guide/transcript.txt"
          >
            Read the written guide
          </a>
        </div>
        <h2 className="mt-9 text-lg font-bold">Jump to a topic</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <button
              key={chapter.time}
              type="button"
              onClick={() => jumpTo(chapter.time)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="font-semibold tabular-nums text-primary">{chapter.label}</span>
              <span className="font-medium">{chapter.title}</span>
            </button>
          ))}
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Adding a pack adds credits immediately at your agreed rate. Bold arranges payment
          separately; the Add Pack button does not collect payment.
        </p>
      </main>
      <footer className="mx-auto max-w-5xl border-t border-border px-5 py-6 text-sm text-muted-foreground sm:px-8">
        Bold · Partner portal
      </footer>
    </div>
  );
}
