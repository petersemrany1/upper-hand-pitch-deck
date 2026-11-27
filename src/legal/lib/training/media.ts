// Ported from the Legal app (family-law-floater/src/lib/training/media.ts). Re-run the port script to refresh.
import type { ModuleSlug } from "./registry";

// Every training video, per module. An empty list means the video isn't made yet:
// the page shows a "Video coming" placeholder and the module can't be completed
// (admins can still mark it complete). The server reads this same list to decide
// which videos must have been watched.

export type TrainingVideo =
  | {
      id: string;
      title: string;
      kind: "file";
      src: string;
      /** A private file in the training-media bucket, played through a short-lived signed link. */
      storagePath?: string;
      /** Real length in seconds. When set, the server ignores the length the browser reports. */
      duration_s?: number;
    }
  | {
      id: string;
      title: string;
      kind: "youtube";
      youtubeId: string;
      duration_s?: number;
    };

export type VideoModuleSlug =
  "product-knowledge" | "audience" | "consultation-videos" | "platform" | "call-coaching";

export const MODULE_VIDEOS: Record<VideoModuleSlug, readonly TrainingVideo[]> = {
  // HeyGen presenter videos (scripts in docs/training/scripts/), private files in the
  // training-media bucket, uploaded with Settings → Training videos.
  "product-knowledge": [
    {
      id: "product-knowledge",
      title: "Product Knowledge",
      kind: "file",
      src: "",
      storagePath: "videos/module-1.mp4",
      duration_s: 513,
    },
    {
      id: "family-law-matters",
      title: "Family Law Matters You'll Deal With",
      kind: "file",
      src: "",
      storagePath: "videos/module-1b.mp4",
      duration_s: 485,
    },
  ],
  audience: [
    {
      id: "know-your-client",
      title: "Know Your Client",
      kind: "file",
      src: "",
      storagePath: "videos/module-2.mp4",
      duration_s: 473,
    },
    {
      id: "what-youll-hear",
      title: "What You'll Hear on the Phone",
      kind: "file",
      src: "",
      storagePath: "videos/module-2b.mp4",
      duration_s: 495,
    },
    {
      id: "triage-and-vetting",
      title: "Triage and Vetting: Who We Book",
      kind: "file",
      src: "",
      storagePath: "videos/module-2c.mp4",
      duration_s: 522,
    },
  ],
  // v1: public explainers from non-partner firms (docs/training/module-3-videos.md),
  // until a partner firm films its own series. Neutral titles; no firm named in the app.
  "consultation-videos": [
    {
      id: "meet-the-lawyer",
      title: "Meet the Lawyer",
      kind: "youtube",
      youtubeId: "DfYDvQVaKto",
      duration_s: 186,
    },
    {
      id: "how-the-process-works",
      title: "How the Process Works",
      kind: "youtube",
      youtubeId: "h1ybqbrfcDA",
      duration_s: 174,
    },
    {
      id: "your-first-meeting",
      title: "Your First Meeting",
      kind: "youtube",
      youtubeId: "1SJqv11jSw8",
      duration_s: 201,
    },
    {
      id: "costs-and-funding",
      title: "Costs and Funding",
      kind: "youtube",
      youtubeId: "WnI4glxK5GM",
      duration_s: 192,
    },
  ],
  platform: [],
  // Peter to camera, recorded 11 Oct 2026 (not the long talking-points video in
  // docs/training/scripts/module-9-call-coaching-dot-points.md).
  "call-coaching": [
    {
      id: "how-i-vet-leads",
      title: "How I Vet Family Law Client Leads",
      kind: "file",
      src: "",
      storagePath: "videos/module-9.mp4",
      duration_s: 789,
    },
  ],
};

/** What the placeholder says while a module's video is still being made. */
export const VIDEO_STATUS: Record<VideoModuleSlug, string> = {
  "product-knowledge": "Videos coming — being rendered.",
  audience: "Videos coming — being rendered.",
  "consultation-videos": "Videos coming — being sourced.",
  platform: "Video coming — recorded last, once the portal screens are final.",
  "call-coaching": "Video coming.",
};

export function isVideoModule(slug: ModuleSlug): slug is VideoModuleSlug {
  return slug in MODULE_VIDEOS;
}

// Watch rules. Self-hosted files pass at 95% genuinely watched (HTG's tolerance for
// end cards). YouTube passes at 90% watched AND the player reporting the end.
export const FILE_PASS_RATIO = 0.95;
export const YOUTUBE_PASS_RATIO = 0.9;
/** Fastest playback a rep may use. */
export const MAX_PLAYBACK_RATE = 1.5;
/** A seek this far past the furthest point watched snaps back. */
export const SEEK_TOLERANCE_S = 2;
