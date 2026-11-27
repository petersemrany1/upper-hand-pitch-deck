// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/ai.tsx). Re-run the port script to refresh.
import { Link } from "@/legal/runtime/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, PhoneCall } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { CompleteModuleBar, ModuleGate, ModulePage } from "@/legal/components/training/module-progress";
import { PracticeAudio } from "@/legal/components/training/practice-audio";
import { supabase } from "@/legal/integrations/supabase/client";
import { formatSydney } from "@/legal/lib/timezone";
import { MIN_PRACTICE_CALL_S, PENDING_PRACTICE_CALL_KEY, PERSONAS } from "@/legal/lib/training/practice";
import { TRAINING_STATUS_KEY } from "@/legal/lib/training/progress";
import {
  savePracticeCallFn,
  submitBestCallFn,
  syncPracticeCallsFn,
} from "@/legal/lib/training/training.functions";

const LegalRoutePage = () => (
    <ModuleGate slug="ai">
      <AiTraining />
    </ModuleGate>
  );

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LegalRoutePage as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "AI Training — Legal Group Portal" }] }),
  component: LegalRoutePage,
});

type PracticeCallRow = {
  id: string;
  conversation_id: string;
  persona: string | null;
  started_at: string | null;
  duration_seconds: number;
  audio_path: string | null;
  submitted_as_best: boolean;
  review_status: string | null;
  review_note: string | null;
};

async function loadMyPracticeCalls(): Promise<PracticeCallRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("practice_call_recordings")
    .select(
      "id, conversation_id, persona, started_at, duration_seconds, audio_path, submitted_as_best, review_status, review_note",
    )
    .eq("auth_user_id", auth.user.id)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const mins = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const personaName = (id: string | null) =>
  PERSONAS.find((p) => p.id === id)?.firstName ?? "AI client";

// Opening this page never completes the module. It completes on the server once a saved
// practice call of at least the minimum length exists.
function AiTraining() {
  const queryClient = useQueryClient();
  const sync = useServerFn(syncPracticeCallsFn);
  const submitBest = useServerFn(submitBestCallFn);
  const savePending = useServerFn(savePracticeCallFn);
  const calls = useQuery({ queryKey: ["practice-calls"], queryFn: loadMyPracticeCalls });

  // Pick up any call that didn't save at the time (left mid-call, tab closed, network blip).
  // ElevenLabs takes a little while to finish a call, so keep checking for two minutes.
  useEffect(() => {
    let stopped = false;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["practice-calls"] });
      void queryClient.invalidateQueries({ queryKey: TRAINING_STATUS_KEY });
    };
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_PRACTICE_CALL_KEY);
    } catch {
      pending = null;
    }
    const tick = async () => {
      if (stopped) return;
      if (pending) {
        const r = await savePending({ data: { conversationId: pending } }).catch(() => null);
        if (r?.saved) {
          pending = null;
          try {
            sessionStorage.removeItem(PENDING_PRACTICE_CALL_KEY);
          } catch {
            // Private mode.
          }
          refresh();
        }
      }
      const s = await sync().catch(() => null);
      if (s && s.saved > 0) refresh();
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 15_000);
    const stop = window.setTimeout(() => window.clearInterval(timer), 120_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [sync, savePending, queryClient]);

  const best = useMutation({
    mutationFn: (conversationId: string) => submitBest({ data: { conversationId } }),
    onSuccess: () => {
      toast.success("Sent to Peter for review");
      void queryClient.invalidateQueries({ queryKey: ["practice-calls"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const minMinutes = Math.round(MIN_PRACTICE_CALL_S / 60);
  const qualifying = (calls.data ?? []).some((c) => c.duration_seconds >= MIN_PRACTICE_CALL_S);

  return (
    <ModulePage
      slug="ai"
      subtitle="Practise live calls against our AI clients — with the 9-stage cockpit beside you."
    >
      <div className="rounded-xl border bg-background p-6">
        <div className="flex items-start gap-4">
          <Bot className="mt-1 size-8 shrink-0 text-primary" />
          <div className="space-y-2 text-sm leading-relaxed">
            <p className="font-bold">How it works</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>You run the call in the real Sales Call screen, against an AI client.</li>
              <li>
                The client plays a real situation. A coach jumps in the moment you get a step wrong
                — fix it, and carry on.
              </li>
              <li>Every practice call is recorded so you can listen back.</li>
              <li>
                This module completes once you've finished a practice call of at least {minMinutes}{" "}
                minutes. Then send your best call to Peter for review.
              </li>
            </ul>
            <Link
              to="/training/practice-call"
              className="mt-2 inline-flex items-center gap-2 rounded-[10px] bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              <PhoneCall className="size-4" /> Start a practice call →
            </Link>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Your practice calls</h2>
      {calls.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : calls.error ? (
        <p className="text-sm text-destructive">
          Couldn't load your practice calls ({(calls.error as Error).message}).
        </p>
      ) : (calls.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No practice calls yet.</p>
      ) : (
        <div className="space-y-3">
          {(calls.data ?? []).map((c) => (
            <div key={c.id} className="rounded-xl border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{personaName(c.persona)}</span>
                <span className="text-muted-foreground">
                  {c.started_at ? formatSydney(c.started_at) : ""} · {mins(c.duration_seconds)}
                </span>
                {c.duration_seconds >= MIN_PRACTICE_CALL_S ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                    Counts
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    Under {minMinutes} min
                  </span>
                )}
                {c.review_status === "cleared" ? (
                  <span className="rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    Cleared to call
                  </span>
                ) : c.review_status === "keep_practising" ? (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    Keep practising
                  </span>
                ) : c.submitted_as_best ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    Sent for review
                  </span>
                ) : null}
                {!c.submitted_as_best && (
                  <button
                    type="button"
                    disabled={best.isPending}
                    onClick={() => best.mutate(c.conversation_id)}
                    className="ml-auto rounded-md border px-2.5 py-1 text-xs font-bold"
                  >
                    Submit as my best call
                  </button>
                )}
              </div>
              {c.review_note ? (
                <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-[13px]">
                  <span className="font-bold">Peter:</span> {c.review_note}
                </p>
              ) : null}
              <div className="mt-2">
                {c.audio_path ? (
                  <PracticeAudio path={c.audio_path} />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No audio saved for this call.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CompleteModuleBar
        slug="ai"
        canComplete={qualifying}
        notReadyHint={`Finish an AI practice call of at least ${minMinutes} minutes to complete this.`}
      />
    </ModulePage>
  );
}
