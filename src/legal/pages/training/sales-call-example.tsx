// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/sales-call-example.tsx). Re-run the port script to refresh.
import { CheckCircle2, Headphones } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CompleteModuleBar, ModuleGate, ModulePage } from "@/legal/components/training/module-progress";
import { useMediaGate, useModuleState } from "@/legal/components/training/training-video";
import { supabase } from "@/legal/integrations/supabase/client";
import { CALL_EXAMPLES, type CallExample } from "@/legal/lib/training/call-examples";
import { watchPasses, type WatchEntry } from "@/legal/lib/training/completion";

const LegalRoutePage = () => (
    <ModuleGate slug="sales-call-example">
      <SalesCallExample />
    </ModuleGate>
  );

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LegalRoutePage as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Sales Call Example — Legal Group Portal" }] }),
  component: LegalRoutePage,
});

function heardThrough(call: CallExample, entry: WatchEntry | undefined) {
  return watchPasses(
    { id: call.id, title: call.name, kind: "file", src: "", duration_s: call.duration_s },
    entry,
  );
}

function SalesCallExample() {
  const state = useModuleState("sales-call-example");
  const [heardNow, setHeardNow] = useState<Set<string>>(new Set());
  const onHeard = useCallback(
    (id: string) => setHeardNow((s) => (s.has(id) ? s : new Set(s).add(id))),
    [],
  );
  const heard = CALL_EXAMPLES.filter(
    (c) => heardNow.has(c.id) || heardThrough(c, state.data?.watch?.[c.id]),
  ).length;
  const total = CALL_EXAMPLES.length;

  return (
    <ModulePage slug="sales-call-example" subtitle="Listen to real Legal Group calls that booked.">
      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/40 p-10 text-center">
          <Headphones className="size-10 text-muted-foreground" />
          <p className="text-sm font-bold">Example calls coming.</p>
        </div>
      ) : state.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <>
          <p className="mb-1 text-sm font-bold">
            {heard} of {total} calls heard
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Listen to every call all the way through. Silent gaps are private details we've cut out.
          </p>
          <div className="space-y-3">
            {CALL_EXAMPLES.map((c) => (
              <CallRow key={c.id} call={c} initial={state.data?.watch?.[c.id]} onHeard={onHeard} />
            ))}
          </div>
        </>
      )}
      <CompleteModuleBar
        slug="sales-call-example"
        canComplete={total > 0 && heard >= total}
        notReadyHint={`Listen to all ${total} calls all the way through to enable this.`}
      />
    </ModulePage>
  );
}

function CallRow({
  call,
  initial,
  onHeard,
}: {
  call: CallExample;
  initial: WatchEntry | undefined;
  onHeard: (id: string) => void;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const progress = useMediaGate(ref, "sales-call-example", call.id, initial, call.duration_s);
  const heard = heardThrough(call, { ...progress, saved_at: "" });

  useEffect(() => {
    if (heard) onHeard(call.id);
  }, [heard, call.id, onHeard]);

  useEffect(() => {
    let alive = true;
    void supabase.storage
      .from("training-media")
      .createSignedUrl(call.audioPath, 6 * 3600)
      .then(({ data }) => {
        if (alive) setSrc(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [call.audioPath]);

  const pct =
    progress.duration_s > 0 ? Math.min(100, (progress.furthest_s / progress.duration_s) * 100) : 0;

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-base font-bold">{call.name}</h2>
        {heard ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
            <CheckCircle2 className="size-3" /> Heard
          </span>
        ) : null}
      </div>
      {/* Always rendered, so the listening gate attaches on mount; the link fills in later. */}
      <audio
        ref={ref}
        src={src ?? undefined}
        controls
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        className="w-full"
      />
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
