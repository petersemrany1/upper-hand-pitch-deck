import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache the current rep id across the whole app — it never changes during a
// session. Threaded into placeCall(...) so every call_records row written by
// the dialler is stamped with rep_id (otherwise the rep-performance analyser
// silently skips the call).
let cached: string | null = null;
let inFlight: Promise<string | null> | null = null;

async function fetchRepId(): Promise<string | null> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email?.toLowerCase();
      if (!email) return null;
      const { data } = await supabase
        .from("sales_reps")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      cached = data?.id ?? null;
      return cached;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useCurrentRepId(): string | null {
  const [repId, setRepId] = useState<string | null>(cached);
  useEffect(() => {
    if (cached) { setRepId(cached); return; }
    let alive = true;
    fetchRepId().then((id) => { if (alive) setRepId(id); });
    return () => { alive = false; };
  }, []);
  return repId;
}
