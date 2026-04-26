import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, CheckCircle2, XCircle, MessageSquareWarning, Lightbulb, ArrowRight, Sparkles } from "lucide-react";

export type CallAnalysis = {
  score: number;
  summary: string;
  went_well: string[];
  missed_opportunities: string[];
  objections_unhandled: string[];
  suggested_responses: string[];
  next_action: string;
  call_verdict: "Hot" | "Warm" | "Cold" | "Dead" | string;
};

type Props = {
  recordId: string;
  recordingUrl: string;
  existingAnalysis: CallAnalysis | null;
  onClose: () => void;
  onAnalysisSaved: (analysis: CallAnalysis) => void;
};

const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  Hot: { bg: "#dc2626", text: "#fff" },
  Warm: { bg: "#f59e0b", text: "#fff" },
  Cold: { bg: "#3b82f6", text: "#fff" },
  Dead: { bg: "#6b7280", text: "#fff" },
};

function scoreColor(score: number) {
  if (score >= 8) return { bg: "#16a34a", text: "#fff" }; // green
  if (score >= 5) return { bg: "#f59e0b", text: "#fff" }; // amber
  return { bg: "#dc2626", text: "#fff" }; // red
}

export function CallAnalysisPanel({ recordId, recordingUrl, existingAnalysis, onClose, onAnalysisSaved }: Props) {
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(existingAnalysis);
  const [loading, setLoading] = useState(!existingAnalysis);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("analyse-call", {
        body: { recordingUrl, recordSid: recordId },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const result = data?.analysis as CallAnalysis;
      if (!result) throw new Error("No analysis returned");
      setAnalysis(result);
      onAnalysisSaved(result);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError((err as Error).message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on open if no existing analysis
  if (!existingAnalysis && !analysis && !loading && !error) {
    runAnalysis();
  }

  const verdictStyle = analysis ? (VERDICT_COLORS[analysis.call_verdict] || VERDICT_COLORS.Cold) : null;
  const scoreStyle = analysis ? scoreColor(analysis.score) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto border-l shadow-2xl"
        style={{ background: "#ffffff", borderColor: "#f9f9f9" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ background: "#ffffff", borderColor: "#f9f9f9" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <h2 className="text-sm font-bold tracking-wide" style={{ color: "#fafafa" }}>CALL ANALYSIS</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#f9f9f9] transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" style={{ color: "#111111" }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#a78bfa" }} />
              <p className="text-sm" style={{ color: "#111111" }}>Analysing call…</p>
              <p className="text-xs" style={{ color: "#111111" }}>Transcribing audio and reviewing with AI. Takes 20–60 seconds.</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg p-4 space-y-3" style={{ background: "#fef2f2", border: "1px solid #7f1d1d" }}>
              <p className="text-sm font-medium" style={{ color: "#fca5a5" }}>Analysis failed</p>
              <p className="text-xs break-words" style={{ color: "#fecaca" }}>{error}</p>
              <button
                onClick={runAnalysis}
                className="text-xs px-3 py-1.5 rounded-md font-medium"
                style={{ background: "#dc2626", color: "#111111" }}
              >
                Try again
              </button>
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Score + Verdict */}
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: scoreStyle!.bg, color: scoreStyle!.text }}
                >
                  <span className="text-3xl font-black leading-none">{analysis.score}</span>
                  <span className="text-[10px] font-medium opacity-90 mt-0.5">/10</span>
                </div>
                <div className="flex-1 space-y-2">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: verdictStyle!.bg, color: verdictStyle!.text }}
                  >
                    {analysis.call_verdict}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: "#ebebeb" }}>{analysis.summary}</p>
                </div>
              </div>

              {/* Went Well */}
              <Section
                title="Went Well"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                color="#22c55e"
                items={analysis.went_well}
              />

              {/* Missed Opportunities */}
              <Section
                title="Missed Opportunities"
                icon={<XCircle className="w-3.5 h-3.5" />}
                color="#f97316"
                items={analysis.missed_opportunities}
              />

              {/* Unhandled Objections */}
              <Section
                title="Unhandled Objections"
                icon={<MessageSquareWarning className="w-3.5 h-3.5" />}
                color="#dc2626"
                items={analysis.objections_unhandled}
              />

              {/* Suggested Responses */}
              <Section
                title="Suggested Responses"
                icon={<Lightbulb className="w-3.5 h-3.5" />}
                color="#a78bfa"
                items={analysis.suggested_responses}
              />

              {/* Next Action */}
              <div
                className="rounded-lg p-4 space-y-2"
                style={{ background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.4)" }}
              >
                <div className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                  <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "#60a5fa" }}>Next Action</span>
                </div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "#dbeafe" }}>{analysis.next_action}</p>
              </div>

              <button
                onClick={runAnalysis}
                className="w-full text-xs py-2 rounded-md hover:bg-[#f9f9f9] transition"
                style={{ color: "#111111", border: "1px solid #ebebeb" }}
              >
                Re-analyse call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, color, items }: { title: string; icon: React.ReactNode; color: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] font-bold tracking-wider uppercase">{title}</span>
      </div>
      <ul className="space-y-1.5 pl-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: "#ebebeb" }}>
            <span style={{ color }}>•</span>
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
