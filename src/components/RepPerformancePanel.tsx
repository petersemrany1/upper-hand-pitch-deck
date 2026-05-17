import { useEffect, useState } from "react";
import { X, Sparkles, Loader2, ChevronDown, ChevronRight } from "lucide-react";

type Stage = { name: string; result: "HIT" | "PARTIAL" | "MISSED" | string; note: string };

export type PerCallResult = {
  called_at: string;
  duration_seconds: number;
  call_type: "first_call" | "follow_up" | string;
  overall_score: number;
  call_verdict: string;
  coach_summary: string;
  what_worked: string[];
  what_to_fix: string[];
  biggest_mistake: string;
  stages: Stage[];
};

export type OverallReport = {
  overall_score: number;
  calls_analysed: number;
  first_calls: number;
  follow_ups: number;
  close_rate: string;
  headline: string;
  strengths: string[];
  development_areas: string[];
  recurring_objections?: string[];
  prevention_playbook?: string[];
  pattern_of_failure: string;
  pattern_of_success: string;
  coach_verdict: string;
  call_summaries: Array<{
    called_at: string;
    call_type: string;
    duration_seconds: number;
    overall_score: number;
    call_verdict: string;
    biggest_mistake: string;
    coach_summary: string;
  }>;
};

type Props = {
  open: boolean;
  loading: boolean;
  loadingCount: number;
  error: string | null;
  repName: string;
  dateFrom: string;
  dateTo: string;
  overall: OverallReport | null;
  onClose: () => void;
};

function scoreColor(score: number) {
  if (score >= 7) return "#16a34a";
  if (score >= 4) return "#f59e0b";
  return "#dc2626";
}

const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  Booked: { bg: "#16a34a", text: "#fff" },
  Hot: { bg: "#dc2626", text: "#fff" },
  Warm: { bg: "#f59e0b", text: "#fff" },
  Cold: { bg: "#3b82f6", text: "#fff" },
  Dead: { bg: "#6b7280", text: "#fff" },
};

export function RepPerformancePanel({
  open,
  loading,
  loadingCount,
  error,
  repName,
  dateFrom,
  dateTo,
  overall,
  onClose,
}: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl h-full overflow-y-auto bg-white border-l border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f4522d]" />
            <h2 className="text-sm font-bold tracking-wide text-foreground">REP PERFORMANCE REPORT</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition" aria-label="Close">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#f4522d]" />
              <p className="text-base font-semibold text-foreground">
                Reviewing {loadingCount > 0 ? loadingCount : ""} calls… your coach is watching 👀
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                This can take a couple of minutes. We're sending each transcript to Claude and then writing the full report.
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg p-4 border border-red-200 bg-red-50">
              <p className="text-sm font-medium text-red-700">Analysis failed</p>
              <p className="text-xs text-red-600 mt-1 break-words">{error}</p>
            </div>
          )}

          {overall && !loading && (
            <>
              {/* Header */}
              <div className="flex items-start gap-4">
                <div
                  className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white"
                  style={{ background: scoreColor(overall.overall_score) }}
                >
                  <span className="text-4xl font-black leading-none">{overall.overall_score}</span>
                  <span className="text-[10px] font-medium opacity-90 mt-1">/10</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">{repName}</div>
                  <div className="text-xs text-muted-foreground">
                    {dateFrom || "Earliest"} → {dateTo || "Today"}
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground mt-2">{overall.headline}</p>
                  <div className="flex gap-3 text-[11px] text-muted-foreground pt-1">
                    <span><b className="text-foreground">{overall.calls_analysed}</b> calls</span>
                    <span><b className="text-foreground">{overall.first_calls}</b> first</span>
                    <span><b className="text-foreground">{overall.follow_ups}</b> follow up</span>
                    <span>Closes: <b className="text-foreground">{overall.close_rate}</b></span>
                  </div>
                </div>
              </div>

              {/* Coach verdict callout */}
              <div className="rounded-xl p-5 border-2 border-[#f4522d]/30 bg-[#f4522d]/5">
                <div className="text-[10px] font-bold tracking-wider uppercase text-[#f4522d] mb-2">
                  Coach Verdict
                </div>
                <p className="text-sm leading-relaxed text-foreground">{overall.coach_verdict}</p>
              </div>

              {/* Pattern cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg p-4 border border-red-200 bg-red-50">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-red-700 mb-2">
                    Pattern of Failure
                  </div>
                  <p className="text-xs leading-relaxed text-foreground">{overall.pattern_of_failure}</p>
                </div>
                <div className="rounded-lg p-4 border border-green-200 bg-green-50">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-green-700 mb-2">
                    Pattern of Success
                  </div>
                  <p className="text-xs leading-relaxed text-foreground">{overall.pattern_of_success}</p>
                </div>
              </div>

              {/* Strengths / Development */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg p-4 border border-border bg-white">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-green-700 mb-2">
                    Strengths
                  </div>
                  <ul className="space-y-1.5">
                    {overall.strengths?.map((s, i) => (
                      <li key={i} className="text-xs text-foreground flex gap-2">
                        <span className="text-green-600">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg p-4 border border-border bg-white">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-orange-700 mb-2">
                    Development Areas
                  </div>
                  <ul className="space-y-1.5">
                    {overall.development_areas?.map((s, i) => (
                      <li key={i} className="text-xs text-foreground flex gap-2">
                        <span className="text-orange-600">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Prevention focus */}
              {((overall.recurring_objections?.length ?? 0) > 0 || (overall.prevention_playbook?.length ?? 0) > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg p-4 border border-amber-200 bg-amber-50">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-amber-800 mb-2">
                      Recurring Objections (Prevention Gaps)
                    </div>
                    <ul className="space-y-1.5">
                      {overall.recurring_objections?.map((s, i) => (
                        <li key={i} className="text-xs text-foreground flex gap-2">
                          <span className="text-amber-700">▸</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg p-4 border border-indigo-200 bg-indigo-50">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-indigo-800 mb-2">
                      Prevention Playbook — Install This Week
                    </div>
                    <ul className="space-y-1.5">
                      {overall.prevention_playbook?.map((s, i) => (
                        <li key={i} className="text-xs text-foreground flex gap-2">
                          <span className="text-indigo-700">▸</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Call-by-call table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  Call by Call
                </div>
                <div>
                  {overall.call_summaries?.map((c, i) => {
                    const isOpen = expanded === i;
                    const verdictStyle = VERDICT_COLORS[c.call_verdict] || VERDICT_COLORS.Cold;
                    const isFirstCall = c.call_type === "first_call";
                    return (
                      <div key={i} className="border-t border-border first:border-t-0">
                        <button
                          onClick={() => setExpanded(isOpen ? null : i)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-[11px] text-muted-foreground w-28 shrink-0">
                            {new Date(c.called_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            {" "}
                            {new Date(c.called_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider shrink-0"
                            style={{
                              background: isFirstCall ? "#dbeafe" : "#fef3c7",
                              color: isFirstCall ? "#1e40af" : "#92400e",
                            }}
                          >
                            {isFirstCall ? "FIRST CALL" : "FOLLOW UP"}
                          </span>
                          <span className="text-[11px] text-muted-foreground w-12 shrink-0">
                            {Math.floor(c.duration_seconds / 60)}m{c.duration_seconds % 60}s
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[9px] font-bold shrink-0"
                            style={{ background: verdictStyle.bg, color: verdictStyle.text }}
                          >
                            {c.call_verdict}
                          </span>
                          <span
                            className="text-xs font-bold shrink-0 w-8 text-right"
                            style={{ color: scoreColor(c.overall_score) }}
                          >
                            {c.overall_score}
                          </span>
                          <span className="text-[11px] text-foreground flex-1 truncate">
                            {c.biggest_mistake}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-12 pb-4 pt-1 bg-muted/30">
                            <p className="text-xs leading-relaxed text-foreground">{c.coach_summary}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
