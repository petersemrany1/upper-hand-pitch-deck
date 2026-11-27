// Ported from the Legal app (family-law-floater/src/components/training/video-module.tsx). Re-run the port script to refresh.
import type { ReactNode } from "react";

import { CompleteModuleBar, ModuleGate, ModulePage } from "@/legal/components/training/module-progress";
import { useModuleVideos } from "@/legal/components/training/training-video";
import type { VideoModuleSlug } from "@/legal/lib/training/media";

/** A module whose completion is "watch every video to the end" (Modules 1, 2, 3, 8, 9). */
export function VideoModule({
  slug,
  subtitle,
  intro,
  after,
}: {
  slug: VideoModuleSlug;
  subtitle: string;
  intro?: ReactNode;
  /** Content under the video(s), e.g. a transcript. Never counts towards completion. */
  after?: ReactNode;
}) {
  return (
    <ModuleGate slug={slug}>
      <Inner slug={slug} subtitle={subtitle} intro={intro} after={after} />
    </ModuleGate>
  );
}

function Inner({
  slug,
  subtitle,
  intro,
  after,
}: {
  slug: VideoModuleSlug;
  subtitle: string;
  intro?: ReactNode;
  after?: ReactNode;
}) {
  const { videos, allWatched, render } = useModuleVideos(slug);
  const hint =
    videos.length > 1
      ? `Watch all ${videos.length} videos to the end to enable this.`
      : "Watch the video to the end to enable this.";
  return (
    <ModulePage slug={slug} subtitle={subtitle}>
      {intro ? (
        <div className="mb-6 text-sm leading-relaxed text-muted-foreground">{intro}</div>
      ) : null}
      {render()}
      {after ? <div className="mt-8">{after}</div> : null}
      <CompleteModuleBar slug={slug} canComplete={allWatched} notReadyHint={hint} />
    </ModulePage>
  );
}
