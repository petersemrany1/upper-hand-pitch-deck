// Ported from the Legal app (family-law-floater/src/components/training/training-video.tsx). Re-run the port script to refresh.
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Film } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { watchPasses, type ModuleState, type WatchEntry } from "@/legal/lib/training/completion";
import {
  MAX_PLAYBACK_RATE,
  MODULE_VIDEOS,
  SEEK_TOLERANCE_S,
  VIDEO_STATUS,
  type TrainingVideo,
  type VideoModuleSlug,
} from "@/legal/lib/training/media";
import { supabase } from "@/legal/integrations/supabase/client";
import { loadModuleState, moduleStateKey } from "@/legal/lib/training/progress";
import type { ModuleSlug } from "@/legal/lib/training/registry";
import { queuedSave } from "@/legal/lib/training/save-queue";
import { saveModuleStateFn } from "@/legal/lib/training/training.functions";

const SAVE_EVERY_MS = 10_000;
const noop = () => {};

export function useModuleState(slug: ModuleSlug) {
  return useQuery({ queryKey: moduleStateKey(slug), queryFn: () => loadModuleState(slug) });
}

export type Progress = { furthest_s: number; duration_s: number; ended: boolean };

/**
 * Keeps one video's genuinely-watched position: forward seeks past the furthest point
 * snap back, speed is capped, and progress is saved to the server every ~10 seconds,
 * on pause, at the end and when the tab closes. A refresh resumes where they were.
 */
function useWatchSaver(slug: ModuleSlug, videoId: string, initial: WatchEntry | undefined) {
  const save = useServerFn(saveModuleStateFn);
  const progress = useRef<Progress>({
    furthest_s: initial?.furthest_s ?? 0,
    duration_s: initial?.duration_s ?? 0,
    ended: initial?.ended ?? false,
  });
  const lastSaved = useRef(progress.current.furthest_s);
  const savedEnded = useRef(progress.current.ended);
  const [snapshot, setSnapshot] = useState<Progress>(progress.current);

  const flush = useCallback(() => {
    const p = progress.current;
    if (!(p.duration_s > 0)) return;
    if (p.furthest_s - lastSaved.current < 1 && p.ended === savedEnded.current) return;
    lastSaved.current = p.furthest_s;
    savedEnded.current = p.ended;
    queuedSave(slug, () =>
      save({ data: { slug, update: { kind: "watch", videoId, ...p } } }),
    ).catch(() => {
      // Retry on the next tick.
      lastSaved.current = 0;
    });
  }, [save, slug, videoId]);

  useEffect(() => {
    const timer = window.setInterval(flush, SAVE_EVERY_MS);
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const update = useCallback((patch: Partial<Progress>) => {
    progress.current = { ...progress.current, ...patch };
    setSnapshot(progress.current);
  }, []);

  return { progress, update, flush, snapshot };
}

/**
 * The anti-skip rules for any <video> or <audio>: progress only counts through normal
 * playback, seeks past the furthest point snap back, speed is capped, and a refresh
 * resumes. Saves through useWatchSaver.
 */
export function useMediaGate(
  ref: React.RefObject<HTMLMediaElement | null>,
  slug: ModuleSlug,
  mediaId: string,
  initial: WatchEntry | undefined,
  knownDuration?: number,
) {
  const { progress, update, flush, snapshot } = useWatchSaver(slug, mediaId, initial);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let lastWall = performance.now();
    const onLoaded = () => {
      update({ duration_s: knownDuration ?? v.duration });
      const resumeAt = progress.current.furthest_s;
      if (resumeAt > 1 && resumeAt < v.duration - 2) v.currentTime = resumeAt;
    };
    const onTime = () => {
      const now = performance.now();
      const wall = (now - lastWall) / 1000;
      lastWall = now;
      if (v.seeking) return;
      const maxStep = wall * MAX_PLAYBACK_RATE + 1.5;
      const p = progress.current;
      if (v.currentTime > p.furthest_s && v.currentTime <= p.furthest_s + maxStep) {
        update({ furthest_s: v.currentTime });
      }
    };
    const onSeeking = () => {
      if (v.currentTime > progress.current.furthest_s + SEEK_TOLERANCE_S) {
        v.currentTime = progress.current.furthest_s;
      }
    };
    const onRate = () => {
      if (v.playbackRate > MAX_PLAYBACK_RATE) v.playbackRate = MAX_PLAYBACK_RATE;
    };
    const onPlay = () => {
      lastWall = performance.now();
    };
    const onEnded = () => {
      update({ ended: true });
      flush();
    };
    const onPause = () => flush();
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("ratechange", onRate);
    v.addEventListener("play", onPlay);
    v.addEventListener("ended", onEnded);
    v.addEventListener("pause", onPause);
    if (v.readyState >= 1) onLoaded();
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("ratechange", onRate);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("pause", onPause);
    };
  }, [ref, knownDuration, progress, update, flush]);

  return snapshot;
}

function FileVideo({
  slug,
  video,
  initial,
  onProgress,
}: {
  slug: ModuleSlug;
  video: Extract<TrainingVideo, { kind: "file" }>;
  initial: WatchEntry | undefined;
  onProgress: (p: Progress) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const snapshot = useMediaGate(ref, slug, video.id, initial, video.duration_s);
  const [signedSrc, setSignedSrc] = useState<string | null>(null);

  useEffect(() => onProgress(snapshot), [snapshot, onProgress]);

  // Private videos play through a signed link that outlasts a long, paused watch.
  useEffect(() => {
    if (!video.storagePath) return;
    let alive = true;
    void supabase.storage
      .from("training-media")
      .createSignedUrl(video.storagePath, 6 * 3600)
      .then(({ data }) => {
        if (alive) setSignedSrc(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [video.storagePath]);

  // The element is always rendered (even before a signed link arrives) so the watch gate
  // can attach to it on mount.
  const src = video.storagePath ? (signedSrc ?? undefined) : video.src;

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
      <video
        ref={ref}
        src={src}
        controls
        preload="metadata"
        playsInline
        controlsList="nodownload noplaybackrate"
        className="block h-full w-full object-contain"
      />
    </div>
  );
}

// ---- YouTube ---------------------------------------------------------------

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (r: number) => void;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

let ytApi: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!ytApi) {
    ytApi = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(w.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytApi;
}

function YouTubeVideo({
  slug,
  video,
  initial,
  onProgress,
}: {
  slug: ModuleSlug;
  video: Extract<TrainingVideo, { kind: "youtube" }>;
  initial: WatchEntry | undefined;
  onProgress: (p: Progress) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const { progress, update, flush, snapshot } = useWatchSaver(slug, video.id, initial);

  useEffect(() => onProgress(snapshot), [snapshot, onProgress]);

  useEffect(() => {
    let player: YTPlayer | null = null;
    let poll: number | undefined;
    let cancelled = false;
    let last = progress.current.furthest_s;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return;
      const el = document.createElement("div");
      host.current.appendChild(el);
      player = new YT.Player(el, {
        videoId: video.youtubeId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(last) },
        events: {
          onReady: () => {
            update({ duration_s: video.duration_s ?? player!.getDuration() });
            poll = window.setInterval(() => {
              if (!player || player.getPlayerState() !== YT.PlayerState.PLAYING) return;
              if (player.getPlaybackRate() > MAX_PLAYBACK_RATE) {
                player.setPlaybackRate(MAX_PLAYBACK_RATE);
              }
              const t = player.getCurrentTime();
              const p = progress.current;
              if (t > p.furthest_s + MAX_PLAYBACK_RATE + SEEK_TOLERANCE_S) {
                // Dragged past what they've watched: send them back.
                player.seekTo(p.furthest_s, true);
              } else if (t > p.furthest_s) {
                update({ furthest_s: t });
              }
              last = t;
            }, 1000);
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
              const p = progress.current;
              // Scrubbing to the end also fires ENDED, so it only counts once genuinely near the end.
              if (p.duration_s > 0 && p.furthest_s >= p.duration_s * 0.9) update({ ended: true });
              flush();
            } else if (e.data === YT.PlayerState.PAUSED) {
              flush();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      player?.destroy();
    };
  }, [video, progress, update, flush]);

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-[0_4px_14px_rgba(0,0,0,0.08)] [&_iframe]:h-full [&_iframe]:w-full">
      <div ref={host} className="h-full w-full" />
    </div>
  );
}

// ---- Module videos -----------------------------------------------------------

export function VideoComingSoon({ message }: { message: string }) {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40 p-6 text-center">
      <Film className="size-10 text-muted-foreground" />
      <p className="text-sm font-bold text-foreground">{message}</p>
      <p className="max-w-md text-xs text-muted-foreground">
        This module unlocks for completion once the video is published.
      </p>
    </div>
  );
}

/**
 * Every video for a module, each with its own watch gate. Returns whether all of them
 * have been genuinely watched (same rule the server checks).
 */
export function useModuleVideos(slug: VideoModuleSlug) {
  const videos = MODULE_VIDEOS[slug];
  const state = useModuleState(slug);
  const queryClient = useQueryClient();
  const [live, setLive] = useState<Record<string, Progress>>({});

  const onProgressFor = useMemo(() => {
    const map: Record<string, (p: Progress) => void> = {};
    for (const v of videos) {
      map[v.id] = (p) =>
        setLive((prev) =>
          prev[v.id]?.furthest_s === p.furthest_s &&
          prev[v.id]?.ended === p.ended &&
          prev[v.id]?.duration_s === p.duration_s
            ? prev
            : { ...prev, [v.id]: p },
        );
    }
    return map;
  }, [videos]);

  const passed = (v: TrainingVideo) => {
    const p = live[v.id] ?? state.data?.watch?.[v.id];
    return p ? watchPasses(v, { ...p, saved_at: "" }) : false;
  };
  const allWatched = videos.length > 0 && videos.every(passed);

  useEffect(() => {
    // Keep the cached state fresh for the next visit.
    return () => {
      queryClient.invalidateQueries({ queryKey: ["training-state", slug] });
    };
  }, [queryClient, slug]);

  const render = () => {
    if (videos.length === 0) return <VideoComingSoon message={VIDEO_STATUS[slug]} />;
    if (state.isLoading) {
      return <div className="aspect-video animate-pulse rounded-xl bg-muted" />;
    }
    const saved: ModuleState["watch"] = state.data?.watch ?? {};
    return (
      <div className="space-y-8">
        {videos.map((v) => (
          <div key={v.id}>
            {videos.length > 1 && (
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-foreground">{v.title}</h2>
                {passed(v) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                    <CheckCircle2 className="size-3" /> Watched
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    Not watched yet
                  </span>
                )}
              </div>
            )}
            {v.kind === "file" ? (
              <FileVideo
                slug={slug}
                video={v}
                initial={saved[v.id]}
                onProgress={onProgressFor[v.id] ?? noop}
              />
            ) : (
              <YouTubeVideo
                slug={slug}
                video={v}
                initial={saved[v.id]}
                onProgress={onProgressFor[v.id] ?? noop}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return { videos, allWatched, render };
}
