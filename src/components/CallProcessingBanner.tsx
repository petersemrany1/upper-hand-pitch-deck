import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";

export type ProcessingStage =
  | "waiting_for_recording"
  | "transcribing"
  | "analysing"
  | "complete"
  | "failed"
  | null;

const STAGE_LABEL: Record<Exclude<ProcessingStage, null>, string> = {
  waiting_for_recording: "Call ended — waiting for recording…",
  transcribing: "Recording received — transcribing…",
  analysing: "Transcribing complete — analysing with AI…",
  complete: "Analysis complete — review your call",
  failed: "Auto-analysis failed — log this call manually",
};

type Props = {
  stage: ProcessingStage;
  startedAt: number | null;
  onDismiss: () => void;
};

export function CallProcessingBanner({ stage, startedAt, onDismiss }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!stage || stage === "complete" || stage === "failed") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [stage]);

  if (!stage) return null;

  const elapsed = startedAt ? Math.round((now - startedAt) / 1000) : 0;
  const slow = elapsed > 60 && stage !== "complete" && stage !== "failed";
  const isDone = stage === "complete";
  const isFail = stage === "failed";

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-lg backdrop-blur-md"
      style={{
        background: isFail
          ? "rgba(69, 10, 10, 0.92)"
          : isDone
            ? "rgba(6, 78, 59, 0.92)"
            : "rgba(15, 23, 42, 0.92)",
        borderColor: isFail
          ? "rgba(248, 113, 113, 0.4)"
          : isDone
            ? "rgba(52, 211, 153, 0.4)"
            : "rgba(96, 165, 250, 0.3)",
      }}
    >
      {isDone ? (
        <CheckCircle2 size={16} className="text-emerald-400" />
      ) : isFail ? (
        <AlertTriangle size={16} className="text-red-400" />
      ) : (
        <Loader2 size={16} className="animate-spin text-blue-400" />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-[#111111]">{STAGE_LABEL[stage]}</span>
        {slow && (
          <span className="text-xs text-amber-300">Processing taking longer than usual…</span>
        )}
        {!slow && !isDone && !isFail && elapsed > 0 && (
          <span className="text-xs text-[#999]">{elapsed}s elapsed</span>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="ml-2 rounded-full p-1 text-[#999] hover:bg-[#ffffff]/10 hover:text-[#111111]"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
