import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/training/sales-framework/")({
  component: SalesFrameworkPage,
  validateSearch: (s: Record<string, unknown>) => ({
    step: (s.step as string) === "drill" || s.step === "beats" || s.step === "hill" ? (s.step as "hill" | "beats" | "drill") : undefined,
  }),
  head: () => ({
    meta: [{ title: "Sales Framework" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap",
      },
    ],
  }),
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;
const DISPLAY = `"Fraunces", "DM Sans", Georgia, serif`;
const MODULE_SLUG = "sales-framework";

type Band = "mind" | "climb" | "peak" | "paper";
type Stage = {
  stage_no: number;
  slug: string;
  name: string;
  band: Band;
  tag: string;
  job: string;
  say_text: string | null;
  moves: string[];
  move_on: string | null;
  never_do: string | null;
  gun_tell: string | null;
  notes: string | null;
};

type Progress = {
  hill_done: boolean;
  beats_done: boolean;
  drill_done: boolean;
  seen_beats: number[];
  module_complete: boolean;
};

const BAND_COLOR: Record<Band, string> = {
  mind: "#6b6b6b",
  climb: "#16a34a",
  peak: "#f59e0b",
  paper: "#3b82f6",
};
const BAND_SOFT: Record<Band, string> = {
  mind: "#f1f1ef",
  climb: "#e7f6ec",
  peak: "#fef3df",
  paper: "#e8f1fd",
};
const CORAL = "#ef4444";
const CORAL_SOFT = "#fdecec";
const GREEN_SOFT = "#e7f6ec";
const ACCENT = "#f4522d";

// {{token}} -> highlighted span
function renderSay(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) =>
    /^\{\{[^}]+\}\}$/.test(p) ? (
      <span
        key={i}
        style={{
          background: "#fff1ee",
          color: ACCENT,
          fontStyle: "italic",
          padding: "1px 6px",
          borderRadius: 4,
          fontWeight: 500,
        }}
      >
        {p.replace(/^\{\{|\}\}$/g, "")}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function SalesFrameworkPage() {
  const search = Route.useSearch();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({
    hill_done: false, beats_done: false, drill_done: false, seen_beats: [], module_complete: false,
  });
  const [step, setStep] = useState<"hill" | "beats" | "drill">(search.step ?? "hill");
  const [beatIdx, setBeatIdx] = useState(0);
  const [objectionOpen, setObjectionOpen] = useState(false);

  // Load stages + user + progress
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: stageRows } = await supabase
        .from("call_stages" as never)
        .select("*")
        .order("stage_no", { ascending: true });
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      let prog: Progress | null = null;
      if (uid) {
        const { data: pr } = await supabase
          .from("rep_module_progress" as never)
          .select("hill_done,beats_done,drill_done,seen_beats,module_complete")
          .eq("user_id", uid)
          .eq("module_slug", MODULE_SLUG)
          .maybeSingle();
        if (pr) prog = pr as unknown as Progress;
      }
      if (!alive) return;
      setStages((stageRows ?? []) as unknown as Stage[]);
      setUserId(uid);
      if (prog) setProgress({ ...prog, seen_beats: Array.isArray(prog.seen_beats) ? prog.seen_beats : [] });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Honour ?step=drill deep link
  useEffect(() => {
    if (search.step) setStep(search.step);
  }, [search.step]);

  const saveProgress = useCallback(async (patch: Partial<Progress>) => {
    setProgress((p) => ({ ...p, ...patch }));
    if (!userId) return;
    const next = { ...progress, ...patch };
    await supabase
      .from("rep_module_progress" as never)
      .upsert(
        {
          user_id: userId,
          module_slug: MODULE_SLUG,
          hill_done: next.hill_done,
          beats_done: next.beats_done,
          drill_done: next.drill_done,
          seen_beats: next.seen_beats,
          module_complete: next.module_complete,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id,module_slug" }
      );
  }, [userId, progress]);

  // Beats: only call-stages (excluding mindset stage 0) — but we'll include mindset too as a beat since spec says "10 stages"
  const beats = stages; // all rows, including mindset stage 0
  const beat = beats[beatIdx];

  // Mark seen on view
  useEffect(() => {
    if (step !== "beats" || !beat) return;
    if (!progress.seen_beats.includes(beat.stage_no)) {
      saveProgress({ seen_beats: [...progress.seen_beats, beat.stage_no] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, beat?.stage_no]);

  // Keyboard nav in beats
  useEffect(() => {
    if (step !== "beats") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setBeatIdx((i) => Math.min(beats.length - 1, i + 1));
      if (e.key === "ArrowLeft") setBeatIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, beats.length]);

  // Progress %
  const pct = useMemo(() => {
    let n = 0;
    if (progress.hill_done) n++;
    if (progress.beats_done) n++;
    if (progress.drill_done) n++;
    return (n / 3) * 100;
  }, [progress]);

  if (loading) {
    return (
      <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%", padding: 32 }}>
        <div style={{ maxWidth: 880, margin: "0 auto", color: "#6b6b6b", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      <div style={{ padding: "32px 28px", maxWidth: 980, margin: "0 auto" }}>
        <Link to="/training" style={{ fontSize: 13, color: "#6b6b6b", textDecoration: "none", marginBottom: 16, display: "inline-block" }}>
          ‹ Back to Training
        </Link>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 700, color: "#111", marginBottom: 6, letterSpacing: "-0.015em" }}>
          Sales Framework
        </h1>
        <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 20 }}>
          Understand the call. Retain it. Run it live.
        </p>

        {/* Stepper */}
        <Stepper step={step} progress={progress} onJump={(s) => setStep(s)} />
        <div style={{ height: 4, background: "#ebebeb", borderRadius: 999, margin: "16px 0 28px", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: ACCENT, transition: "width .3s" }} />
        </div>

        {step === "hill" && (
          <HillView stages={stages} onJumpBeat={(idx) => { setBeatIdx(idx); setStep("beats"); }}
            onNext={() => { saveProgress({ hill_done: true }); setStep("beats"); }} />
        )}

        {step === "beats" && beat && (
          <BeatsView
            beat={beat}
            idx={beatIdx}
            total={beats.length}
            onPrev={() => setBeatIdx((i) => Math.max(0, i - 1))}
            onNext={() => {
              if (beatIdx < beats.length - 1) setBeatIdx(beatIdx + 1);
              else { saveProgress({ beats_done: true }); setStep("drill"); }
            }}
            onObjection={() => setObjectionOpen(true)}
          />
        )}

        {step === "drill" && (
          <DrillView
            stages={stages}
            done={progress.module_complete}
            onFinish={() => saveProgress({ drill_done: true, module_complete: true })}
            onRestart={() => { setBeatIdx(0); setStep("hill"); }}
          />
        )}
      </div>

      {objectionOpen && <ObjectionModal onClose={() => setObjectionOpen(false)} />}
    </div>
  );
}

/* ---------- Stepper ---------- */
function Stepper({ step, progress, onJump }: {
  step: "hill" | "beats" | "drill";
  progress: Progress;
  onJump: (s: "hill" | "beats" | "drill") => void;
}) {
  const items: { key: "hill" | "beats" | "drill"; label: string; done: boolean }[] = [
    { key: "hill", label: "1 · The Hill", done: progress.hill_done },
    { key: "beats", label: "2 · The Beats", done: progress.beats_done },
    { key: "drill", label: "3 · The Drill", done: progress.drill_done },
  ];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((it) => {
        const active = step === it.key;
        const bg = it.done ? "#16a34a" : active ? "#111" : "#fff";
        const color = it.done || active ? "#fff" : "#111";
        const border = it.done ? "#16a34a" : active ? "#111" : "#ebebeb";
        return (
          <button
            key={it.key}
            onClick={() => onJump(it.key)}
            style={{
              padding: "10px 16px", border: `1px solid ${border}`, background: bg, color,
              borderRadius: 999, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {it.done ? "✓ " : ""}{it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- The Hill ---------- */
function HillView({ stages, onJumpBeat, onNext }: {
  stages: Stage[]; onJumpBeat: (idx: number) => void; onNext: () => void;
}) {
  // Plot: stage_no 0 is mindset (separate, far left). 1-9 climb/peak/paper across an arc.
  const w = 960, h = 360;
  const padX = 95, baseY = 250, peakY = 90;
  const nonMind = stages.filter((s) => s.band !== "mind");
  const peakStage = stages.find((s) => s.band === "peak");
  const peakIdxInNon = peakStage ? nonMind.findIndex((s) => s.stage_no === peakStage.stage_no) : 4;
  const points = nonMind.map((s, i) => {
    const t = i / Math.max(1, nonMind.length - 1);
    const peakT = peakIdxInNon / (nonMind.length - 1);
    const y = baseY - (baseY - peakY) * (1 - Math.abs(t - peakT) / Math.max(peakT, 1 - peakT));
    const x = padX + (w - padX * 2) * t;
    return { x, y, s };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div>
      <Card>
        <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>The Hill</div>
        <div style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 16 }}>
          The whole call in one picture. Click any beat to jump in.
        </div>

        <div style={{ overflowX: "auto" }}>
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w, display: "block" }} role="img" aria-label="The Hill">
            {/* top-of-chart act labels — clear of all nodes */}
            <text x={padX} y={28} fontSize="13" fill="#16a34a" fontWeight={700}>Earn the sigh ▲</text>
            <text x={w - padX} y={28} fontSize="13" fill="#3b82f6" fontWeight={700} textAnchor="end">Paperwork ▼</text>
            {/* baseline — pushed well below node labels */}
            <line x1={padX - 20} y1={baseY + 60} x2={w - padX + 20} y2={baseY + 60} stroke="#ebebeb" strokeWidth={1} />
            {/* arc */}
            <path d={pathD} fill="none" stroke="#d4d4d4" strokeWidth={2} strokeDasharray="4 4" />
            {/* peak label */}
            {peakStage && (
              <text x={points[peakIdxInNon].x} y={peakY - 22} fontSize="12" textAnchor="middle" fill="#f59e0b" fontWeight={700}>
                the sigh = the sale
              </text>
            )}
            {/* nodes */}
            {points.map((p) => {
              const idx = stages.findIndex((x) => x.stage_no === p.s.stage_no);
              return (
                <g key={p.s.stage_no} style={{ cursor: "pointer" }} onClick={() => onJumpBeat(idx)}>
                  <circle cx={p.x} cy={p.y} r={18} fill="#fff" stroke={BAND_COLOR[p.s.band]} strokeWidth={3} />
                  <text x={p.x} y={p.y + 4} fontSize="12" textAnchor="middle" fill="#111" fontWeight={700}>{p.s.stage_no}</text>
                  <text x={p.x} y={p.y + 38} fontSize="11" textAnchor="middle" fill="#6b6b6b">{p.s.name}</text>
                </g>
              );
            })}
            {/* mindset bubble — far left, below baseline, fully clear of node 1 */}
            {stages.find((s) => s.band === "mind") && (
              <g style={{ cursor: "pointer" }} onClick={() => onJumpBeat(0)}>
                <circle cx={padX - 60} cy={baseY + 95} r={14} fill="#fff" stroke={BAND_COLOR.mind} strokeWidth={2} strokeDasharray="3 3" />
                <text x={padX - 60} y={baseY + 99} fontSize="11" textAnchor="middle" fill="#111" fontWeight={700}>0</text>
                <text x={padX - 60} y={baseY + 122} fontSize="10" textAnchor="middle" fill="#6b6b6b">Mindset</text>
              </g>
            )}
          </svg>
        </div>

        <p style={{ marginTop: 12, fontFamily: DISPLAY, fontSize: 18, color: "#111", fontStyle: "italic" }}>
          The sigh of relief is the sale. Everything after is just paperwork.
        </p>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <MiniCard tone="climb" title="Act 1 — Earn the sigh"
          body="Opening → Discovery → Amplification → Education → the Audiobook moment. You're a guide climbing the hill with them." />
        <MiniCard tone="paper" title="Act 2 — Paperwork"
          body="Commitment → Price & specialist → Finance → Deposit & booking. The sale is done; you're just walking them out." />
      </div>

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onNext} style={primaryBtn()}>Got the picture — learn the beats →</button>
      </div>
    </div>
  );
}

function MiniCard({ tone, title, body }: { tone: Band; title: string; body: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 12, padding: 16, borderLeft: `4px solid ${BAND_COLOR[tone]}` }}>
      <div style={{ fontWeight: 700, color: "#111", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

/* ---------- The Beats ---------- */
function BeatsView({ beat, idx, total, onPrev, onNext, onObjection }: {
  beat: Stage; idx: number; total: number;
  onPrev: () => void; onNext: () => void; onObjection: () => void;
}) {
  const color = BAND_COLOR[beat.band];
  const soft = BAND_SOFT[beat.band];
  const isLast = idx === total - 1;
  return (
    <div>
      <div style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 0 rgba(0,0,0,.02)" }}>
        <div style={{ height: 5, background: color }} />
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ background: soft, color, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, letterSpacing: ".02em" }}>
              Stage {beat.stage_no} · {beat.tag}
            </span>
            <span style={{ fontSize: 12, color: "#9a9a9a" }}>{idx + 1} of {total}</span>
          </div>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, color: "#111", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            {beat.name}
          </h2>
          <p style={{ color: "#444", fontSize: 15, margin: "0 0 20px", lineHeight: 1.55 }}>{beat.job}</p>

          {beat.say_text && (
            <Section label="Say it like this" tone="neutral">
              <div style={{ fontSize: 15, lineHeight: 1.65, color: "#111" }}>"{renderSay(beat.say_text)}"</div>
            </Section>
          )}

          {beat.moves.length > 0 && (
            <Section label="Key moves" tone="neutral">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#222", lineHeight: 1.6 }}>
                {beat.moves.map((m, i) => <li key={i} style={{ marginBottom: 4 }}>{m}</li>)}
              </ul>
            </Section>
          )}

          {beat.move_on && (
            <Panel bg={GREEN_SOFT} border="#16a34a" label="Move on when">{beat.move_on}</Panel>
          )}
          {beat.never_do && (
            <Panel bg={CORAL_SOFT} border={CORAL} label="Never">{beat.never_do}</Panel>
          )}
          {beat.gun_tell && (
            <Panel bg="#fffaf0" border="#f59e0b" label="The tell (gun rep)">{beat.gun_tell}</Panel>
          )}
          {beat.notes && (
            <Panel bg="#f5f5f4" border="#9a9a9a" label="Notes">{beat.notes}</Panel>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onObjection} style={{
          padding: "10px 14px", border: `1px solid ${CORAL}`, background: "#fff", color: CORAL,
          fontFamily: FONT, fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer",
        }}>⚡ Handling an objection?</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onPrev} disabled={idx === 0} style={secondaryBtn(idx === 0)}>← Prev</button>
          <button onClick={onNext} style={primaryBtn()}>{isLast ? "Done — drill it →" : "Got it →"}</button>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#9a9a9a", textAlign: "right" }}>← / → arrow keys to navigate</div>
    </div>
  );
}

function Section({ label, tone, children }: { label: string; tone: "neutral"; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9a9a9a", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
      <div style={{ background: tone === "neutral" ? "#fafafa" : "#fff", border: "1px solid #ebebeb", borderRadius: 10, padding: "12px 14px" }}>
        {children}
      </div>
    </div>
  );
}

function Panel({ bg, border, label, children }: { bg: string; border: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}40`, borderLeft: `3px solid ${border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: border, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#222", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

/* ---------- The Drill ---------- */
type Card = { q: string; a: string };

function buildDeck(stages: Stage[]): Card[] {
  const deck: Card[] = [];
  const beats = stages.filter((s) => s.band !== "mind");
  for (const s of stages) {
    const nextIdx = beats.findIndex((b) => b.stage_no === s.stage_no) + 1;
    const next = beats[nextIdx];
    if (next && s.band !== "mind") {
      deck.push({ q: `You've just finished ${s.name}. What's the next beat?`, a: next.name });
    }
    deck.push({ q: `The one job of ${s.name}?`, a: s.job });
    if (s.never_do) deck.push({ q: `What must you never do during ${s.name}?`, a: s.never_do });
    if (s.move_on) deck.push({ q: `What tells you it's time to leave ${s.name}?`, a: s.move_on });
  }
  deck.push({
    q: "What is the sale, and what is everything after it?",
    a: "The sigh of relief is the sale. Everything after is just paperwork.",
  });
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function DrillView({ stages, done, onFinish, onRestart }: {
  stages: Stage[]; done: boolean; onFinish: () => void; onRestart: () => void;
}) {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(stages));
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = deck[i];

  if (done) {
    return (
      <div>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ background: GREEN_SOFT, color: "#16a34a", padding: "4px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 }}>✓ Complete</span>
          </div>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 700, margin: "4px 0 6px" }}>Framework locked in</h2>
          <p style={{ color: "#444", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            You can run the call. Warm up before every shift with the 2-minute drill.
          </p>
        </Card>

        <div style={{ marginTop: 12, opacity: .55 }}>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9a9a9a", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Locked</div>
            <div style={{ fontWeight: 700, color: "#111", marginBottom: 4 }}>Quiz</div>
            <div style={{ fontSize: 13, color: "#6b6b6b" }}>Pass it 100% to unlock roleplay. Coming soon.</div>
          </Card>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => { setDeck(buildDeck(stages)); setI(0); setRevealed(false); onRestart(); }} style={secondaryBtn(false)}>↺ Run it again</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700 }}>The Drill</div>
          <div style={{ fontSize: 12, color: "#9a9a9a" }}>Card {i + 1} of {deck.length}</div>
        </div>
        <div style={{ background: "#fafafa", border: "1px solid #ebebeb", borderRadius: 12, padding: 24, minHeight: 160 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9a9a9a", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Question</div>
          <div style={{ fontSize: 17, color: "#111", lineHeight: 1.55, marginBottom: 16 }}>{card?.q}</div>
          {revealed && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Answer</div>
              <div style={{ fontSize: 15, color: "#222", lineHeight: 1.6, background: GREEN_SOFT, padding: 12, borderRadius: 8 }}>{card?.a}</div>
            </>
          )}
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#9a9a9a" }}>Say your answer out loud, then reveal.</div>
          <div style={{ display: "flex", gap: 8 }}>
            {!revealed ? (
              <button onClick={() => setRevealed(true)} style={primaryBtn()}>Reveal</button>
            ) : (
              <button onClick={() => { setRevealed(false); setI((x) => (x + 1) % deck.length); }} style={primaryBtn()}>Next →</button>
            )}
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onFinish} style={{
          padding: "12px 18px", background: "#16a34a", color: "#fff", border: "none",
          borderRadius: 8, fontFamily: FONT, fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>I can run this — finish module ✓</button>
      </div>
    </div>
  );
}

/* ---------- Objection modal ---------- */
function ObjectionModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: 28, maxWidth: 560, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,.25)", fontFamily: FONT,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, margin: 0 }}>The Objection Loop</h3>
          <button onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: "none", fontSize: 22, color: "#9a9a9a", cursor: "pointer", padding: 0, lineHeight: 1,
          }}>×</button>
        </div>
        <p style={{ color: "#6b6b6b", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          Same moves for "think about it", "talk to my partner", "send me info". Agree, never fight, never hand them an exit.
        </p>
        <Step n={1} title="Agree.">"That's not a problem at all — I get it, it's a big decision."</Step>
        <Step n={2} title="Re-anchor to what they told you.">"But you said the thing that mattered was [their why-now]. Has that changed?"</Step>
        <Step n={3} title="Route to the free consult.">
          "The consult's free, you're not committing to any treatment — does it make sense to at least see your options, so you're not in the same spot next month, still thinking about it?"
        </Step>
        <p style={{ marginTop: 14, fontSize: 12, color: "#9a9a9a", lineHeight: 1.5, fontStyle: "italic" }}>
          Only if they're genuinely unsure: "Is this something you actually want?" — and even then, steer to the consult. Never use that line at Commitment.
        </p>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <div style={{
          width: 22, height: 22, borderRadius: 999, background: "#111", color: "#fff",
          fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>{n}</div>
        <div style={{ fontWeight: 700, color: "#111" }}>{title}</div>
      </div>
      <div style={{ marginLeft: 32, marginTop: 4, fontSize: 14, color: "#222", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

/* ---------- shared ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 12, padding: 24 }}>{children}</div>
  );
}
function primaryBtn(): React.CSSProperties {
  return {
    padding: "12px 18px", background: ACCENT, color: "#fff", border: "none",
    borderRadius: 8, fontFamily: FONT, fontWeight: 600, fontSize: 14, cursor: "pointer",
  };
}
function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 16px", background: "#fff", color: disabled ? "#c4c4c4" : "#111",
    border: `1px solid ${disabled ? "#ebebeb" : "#d4d4d4"}`, borderRadius: 8, fontFamily: FONT,
    fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
  };
}
