import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { ModuleGate } from "@/components/ModuleProgress";
import { markModuleComplete } from "@/lib/training-modules";

export const Route = createFileRoute("/_dashboard/training/knowledge-quiz")({
  component: KnowledgeQuizWrapper,
  head: () => ({
    meta: [{ title: "Knowledge Quiz" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
      },
    ],
  }),
});

function KnowledgeQuizWrapper() {
  return (
    <ModuleGate slug="knowledge-quiz">
      <KnowledgeQuizPage />
    </ModuleGate>
  );
}

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;
const ACCENT = "#f4522d";

type Option = { text: string; correct: boolean };
type Question = {
  id: string;
  question_no: number;
  section: "framework" | "product" | "skills" | "process";
  question: string;
  options: Option[];
};

const sectionLabel: Record<Question["section"], string> = {
  framework: "Framework",
  product: "Product",
  skills: "Skills",
  process: "Process",
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function KnowledgeQuizPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; wrong: number[]; passed: boolean } | null>(null);
  const [alreadyPassed, setAlreadyPassed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadAndShuffle = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    setCurrent(0);
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("id, question_no, section, question, options")
      .order("question_no");
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const shuffled: Question[] = shuffle(
      (data ?? []).map((q: any) => ({
        ...q,
        options: shuffle(q.options as Option[]),
      })),
    );
    setQuestions(shuffled);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: prog } = await supabase
          .from("rep_quiz_progress")
          .select("passed")
          .eq("user_id", uid)
          .maybeSingle();
        if (prog?.passed) setAlreadyPassed(true);
      }
      await loadAndShuffle();
    })();
  }, []);

  const total = questions.length;
  const q = questions[current];
  const selectedIdx = q ? answers[q.id] : undefined;
  const isLast = current === total - 1;
  const allAnswered = total > 0 && questions.every((qq) => answers[qq.id] !== undefined);

  const submit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    let score = 0;
    const wrong: number[] = [];
    for (const qq of questions) {
      const idx = answers[qq.id];
      const opt = qq.options[idx];
      if (opt?.correct) score += 1;
      else wrong.push(qq.question_no);
    }
    const passed = score === total;

    if (userId) {
      const { data: existing } = await supabase
        .from("rep_quiz_progress")
        .select("attempts, best_score, passed, passed_at")
        .eq("user_id", userId)
        .maybeSingle();
      const attempts = (existing?.attempts ?? 0) + 1;
      const best_score = Math.max(existing?.best_score ?? 0, score);
      const newPassed = existing?.passed || passed;
      const passed_at = existing?.passed_at ?? (passed ? new Date().toISOString() : null);
      await supabase.from("rep_quiz_progress").upsert({
        user_id: userId,
        attempts,
        best_score,
        passed: newPassed,
        passed_at,
        updated_at: new Date().toISOString(),
      });
    }
    wrong.sort((a, b) => a - b);
    setResult({ score, wrong, passed });
    if (passed) setAlreadyPassed(true);
    setSubmitting(false);
  };

  const headerBar = (
    <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ background: "#fff", borderColor: "#ebebeb" }}>
      <button
        onClick={() => navigate({ to: "/training" })}
        className="inline-flex items-center gap-1.5 text-sm font-medium"
        style={{ color: "#111", cursor: "pointer", fontFamily: FONT }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to training
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
        {headerBar}
        <div style={{ padding: 40, textAlign: "center", color: "#6b6b6b" }}>Loading quiz…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
        {headerBar}
        <div style={{ padding: 40, textAlign: "center", color: "#b91c1c" }}>Couldn't load quiz: {error}</div>
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
        {headerBar}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
          {result.passed ? (
            <div style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 14, padding: 32, textAlign: "center" }}>
              <CheckCircle2 size={56} color="#16a34a" style={{ margin: "0 auto 12px" }} />
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>Passed — practice calls unlocked</h1>
              <p style={{ color: "#6b6b6b", margin: "0 0 24px" }}>
                You scored {result.score}/{total}. You're cleared to take practice calls.
              </p>
              <button
                onClick={() => navigate({ to: "/training/practice-call" })}
                style={{
                  background: ACCENT,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 22px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                Go to practice call →
              </button>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 14, padding: 32 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>
                You got {result.score}/{total}
              </h1>
              <p style={{ color: "#6b6b6b", margin: "0 0 18px" }}>
                100% is needed to continue to practice calls. Review the questions below, then try again.
              </p>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 16, marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#9a3412", marginBottom: 10 }}>
                  Questions you got wrong:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.wrong.map((n) => {
                    const qText = questions.find((qq) => qq.question_no === n)?.question ?? "";
                    return (
                      <div key={n} style={{ fontSize: 14, color: "#7c2d12", lineHeight: 1.45 }}>
                        <span style={{ fontWeight: 600 }}>Q{n}:</span> {qText}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={loadAndShuffle}
                  style={{
                    background: ACCENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 20px",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  Try again
                </button>
                <button
                  onClick={() => navigate({ to: "/training" })}
                  style={{
                    background: "#fff",
                    color: "#111",
                    border: "1px solid #ebebeb",
                    borderRadius: 10,
                    padding: "12px 20px",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  Back to training
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!q) return null;
  const progressPct = ((current + (selectedIdx !== undefined ? 1 : 0)) / total) * 100;

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      {headerBar}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 60px" }}>
        {alreadyPassed && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 18 }}>
            You've already passed this quiz. Retaking it won't lock you out.
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "#6b6b6b", fontWeight: 500 }}>
            Question {current + 1} of {total}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: ACCENT,
              background: "#fff1ee",
              padding: "3px 10px",
              borderRadius: 999,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {sectionLabel[q.section]}
          </span>
        </div>
        <div style={{ height: 4, background: "#ebebeb", borderRadius: 999, marginBottom: 28, overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: ACCENT, transition: "width 0.2s ease" }} />
        </div>

        <h2 style={{ fontSize: 22, lineHeight: 1.35, fontWeight: 600, color: "#111", margin: "0 0 22px" }}>
          {q.question}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((opt, i) => {
            const selected = selectedIdx === i;
            return (
              <button
                key={i}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                style={{
                  textAlign: "left",
                  padding: "16px 18px",
                  border: `1.5px solid ${selected ? ACCENT : "#ebebeb"}`,
                  background: selected ? "#fff7f4" : "#fff",
                  borderRadius: 12,
                  fontSize: 15,
                  color: "#111",
                  cursor: "pointer",
                  fontFamily: FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: `2px solid ${selected ? ACCENT : "#d4d4d4"}`,
                    background: selected ? ACCENT : "#fff",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#fff" }} />}
                </span>
                <span style={{ flex: 1, lineHeight: 1.45 }}>{opt.text}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            style={{
              background: "#fff",
              color: current === 0 ? "#c4c4c4" : "#111",
              border: "1px solid #ebebeb",
              borderRadius: 10,
              padding: "12px 20px",
              fontWeight: 600,
              fontSize: 14,
              cursor: current === 0 ? "not-allowed" : "pointer",
              fontFamily: FONT,
            }}
          >
            Back
          </button>
          {isLast ? (
            <button
              onClick={submit}
              disabled={!allAnswered || submitting}
              style={{
                background: allAnswered ? ACCENT : "#f3d3c8",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: allAnswered && !submitting ? "pointer" : "not-allowed",
                fontFamily: FONT,
              }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          ) : (
            <button
              onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              disabled={selectedIdx === undefined}
              style={{
                background: selectedIdx !== undefined ? ACCENT : "#f3d3c8",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: selectedIdx !== undefined ? "pointer" : "not-allowed",
                fontFamily: FONT,
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable locked-state component for the practice call page
export function QuizLockedNotice() {
  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, background: "#fff", border: "1px solid #ebebeb", borderRadius: 14, padding: 32, textAlign: "center" }}>
        <Lock size={40} color={ACCENT} style={{ margin: "0 auto 14px" }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>
          Practice calls are locked
        </h1>
        <p style={{ color: "#6b6b6b", margin: "0 0 20px", fontSize: 14, lineHeight: 1.55 }}>
          Pass the knowledge quiz with 40/40 to unlock practice calls.
        </p>
        <Link to="/training/knowledge-quiz" style={{ textDecoration: "none" }}>
          <span
            style={{
              display: "inline-block",
              background: ACCENT,
              color: "#fff",
              borderRadius: 10,
              padding: "12px 22px",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: FONT,
            }}
          >
            Take the quiz →
          </span>
        </Link>
      </div>
    </div>
  );
}
