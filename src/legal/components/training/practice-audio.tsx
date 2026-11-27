// Ported from the Legal app (family-law-floater/src/components/training/practice-audio.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";

import { supabase } from "@/legal/integrations/supabase/client";

/** A practice call recording, played from the private bucket with a 1-hour signed link. */
export function PracticeAudio({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void supabase.storage
      .from("practice-call-recordings")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <span className="text-xs text-muted-foreground">Loading audio…</span>;
  return <audio controls preload="none" src={url} className="h-9 w-full max-w-sm" />;
}
