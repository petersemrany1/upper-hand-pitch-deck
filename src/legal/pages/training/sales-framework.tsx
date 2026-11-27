// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/sales-framework.tsx). Re-run the port script to refresh.
import { Link } from "@/legal/runtime/router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { BeatScript } from "@/legal/components/training/beat-script";
import { ModuleGate, useTrainingStatus } from "@/legal/components/training/module-progress";
import { useModuleState } from "@/legal/components/training/training-video";
import { cn } from "@/legal/lib/utils";
import { STEP_ORDER, STEP_TITLES } from "@/legal/lib/sales-script";
import { moduleStateKey, TRAINING_STATUS_KEY } from "@/legal/lib/training/progress";
import { moduleNumber } from "@/legal/lib/training/registry";
import {
  beatPill,
  DRILL_CARDS,
  OBJECTION_CARDS,
  OBJECTION_LOOP,
  objectionCardNote,
  SALES_BEATS,
  shuffledDeck,
  STRICT_FINISH,
  type Band,
  type DrillCard,
  type SalesBeat,
} from "@/legal/lib/training/sales-framework";
import { queuedSave, settled, withRetry } from "@/legal/lib/training/save-queue";
import { completeTrainingModuleFn, saveModuleStateFn } from "@/legal/lib/training/training.functions";

type Step = "hill" | "beats" | "drill";

const LegalRoutePage = () => (
    <ModuleGate slug="sales-framework">
      <SalesFramework />
    </ModuleGate>
  );

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LegalRoutePage as LegalPage };
export const Route = legalRoute({
  validateSearch: z.object({ step: z.enum(["hill", "beats", "drill"]).optional() }),
  head: () => ({ meta: [{ title: "Sales Framework — Legal Group Portal" }] }),
  component: LegalRoutePage,
});

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

function SalesFramework() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const status = useTrainingStatus();
  const state = useModuleState("sales-framework");
  const save = useServerFn(saveModuleStateFn);
  const complete = useServerFn(completeTrainingModuleFn);

  const [step, setStep] = useState<Step>(search.step ?? "hill");
  const [beatIdx, setBeatIdx] = useState(0);
  const [objectionOpen, setObjectionOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (search.step) setStep(search.step);
  }, [search.step]);

  useEffect(() => {
    if (loaded.current || state.isLoading) return;
    loaded.current = true;
    setSeen(new Set(state.data?.seen_beats ?? []));
    setRevealed(new Set(state.data?.revealed_cards ?? []));
  }, [state.isLoading, state.data]);

  const isAdmin = status.data?.isAdmin ?? false;
  const done = status.data?.completed["sales-framework"] === true;
  const beat = SALES_BEATS[beatIdx]!;

  // Saves go one at a time (fast clicks would otherwise overwrite each other). If a save
  // still fails after retries, forget it locally so reopening the beat or card re-saves it.
  const persist = useCallback(
    (kind: "beat" | "card", id: string, forget: (id: string) => void) => {
      queuedSave("sales-framework", () =>
        withRetry(() => save({ data: { slug: "sales-framework", update: { kind, id } } })),
      ).catch(() => forget(id));
    },
    [save],
  );

  const markSeen = useCallback(
    (id: string) => {
      setSeen((prev) => {
        if (prev.has(id)) return prev;
        persist("beat", id, (x) =>
          setSeen((s) => {
            const n = new Set(s);
            n.delete(x);
            return n;
          }),
        );
        return new Set(prev).add(id);
      });
    },
    [persist],
  );

  const markRevealed = useCallback(
    (id: string) => {
      setRevealed((prev) => {
        if (prev.has(id)) return prev;
        persist("card", id, (x) =>
          setRevealed((s) => {
            const n = new Set(s);
            n.delete(x);
            return n;
          }),
        );
        return new Set(prev).add(id);
      });
    },
    [persist],
  );

  useEffect(() => {
    if (step === "beats" && loaded.current) markSeen(beat.id);
  }, [step, beat.id, markSeen]);

  useEffect(() => {
    if (step !== "beats") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setBeatIdx((i) => Math.min(SALES_BEATS.length - 1, i + 1));
      if (e.key === "ArrowLeft") setBeatIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const beatsLeft = SALES_BEATS.filter((b) => !seen.has(b.id)).length;
  const cardsLeft = DRILL_CARDS.filter((c) => !revealed.has(c.id)).length;
  const ready = !STRICT_FINISH || (beatsLeft === 0 && cardsLeft === 0);

  const progress = {
    hill: seen.size > 0 || step !== "hill",
    beats: beatsLeft === 0,
    drill: cardsLeft === 0,
  };
  const pct = ([progress.hill, progress.beats, progress.drill].filter(Boolean).length / 3) * 100;

  const finish = async () => {
    setFinishing(true);
    try {
      await settled("sales-framework");
      await complete({ data: { slug: "sales-framework" } });
      await queryClient.invalidateQueries({ queryKey: TRAINING_STATUS_KEY });
      await queryClient.invalidateQueries({ queryKey: moduleStateKey("sales-framework") });
      setJustFinished(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't finish the module.");
    } finally {
      setFinishing(false);
    }
  };

  if (state.isLoading) {
    return <div className="mx-auto max-w-[880px] p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-[980px] px-5 py-8 sm:px-7">
      <Link
        to="/training" search={{ biz: "legal" } as never}
        className="mb-4 inline-block text-[13px] text-muted-foreground hover:text-primary"
      >
        ‹ Back to Training
      </Link>
      <h1 className="mb-1.5 text-[34px] font-bold tracking-tight">Sales Framework</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Module {moduleNumber("sales-framework")} — Understand the call. Retain it. Run it live.
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["hill", "1 · The Hill", progress.hill],
            ["beats", "2 · The Beats", progress.beats],
            ["drill", "3 · The Drill", progress.drill],
          ] as const
        ).map(([key, label, isDone]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStep(key)}
            className={cn(
              "rounded-full border px-4 py-2.5 text-[13px] font-bold",
              isDone
                ? "border-green-600 bg-green-600 text-white"
                : step === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background",
            )}
          >
            {isDone ? "✓ " : ""}
            {label}
          </button>
        ))}
      </div>
      <div className="mb-7 mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {step === "hill" && (
        <HillView
          onJumpBeat={(i) => {
            setBeatIdx(i);
            setStep("beats");
          }}
          onNext={() => setStep("beats")}
        />
      )}

      {step === "beats" && (
        <BeatsView
          beat={beat}
          idx={beatIdx}
          total={SALES_BEATS.length}
          onPrev={() => setBeatIdx((i) => Math.max(0, i - 1))}
          onNext={() => {
            if (beatIdx < SALES_BEATS.length - 1) setBeatIdx(beatIdx + 1);
            else setStep("drill");
          }}
          onObjection={() => setObjectionOpen(true)}
        />
      )}

      {step === "drill" && (
        <DrillView
          done={done}
          justFinished={justFinished}
          ready={ready || isAdmin}
          isAdmin={isAdmin && !ready}
          hint={`See every beat and reveal every card once to finish — ${beatsLeft + cardsLeft} to go.`}
          finishing={finishing}
          onReveal={markRevealed}
          onFinish={finish}
          onRunAgain={() => setJustFinished(false)}
        />
      )}

      {objectionOpen && <ObjectionModal onClose={() => setObjectionOpen(false)} />}
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-background p-6", className)}>{children}</div>;
}

function stepNumber(id: string) {
  return STEP_ORDER.indexOf(id as (typeof STEP_ORDER)[number]) + 1;
}

/* ---------- The Hill ---------- */
function HillView({
  onJumpBeat,
  onNext,
}: {
  onJumpBeat: (idx: number) => void;
  onNext: () => void;
}) {
  const w = 960;
  const h = 360;
  const padX = 95;
  const baseY = 250;
  const peakY = 90;
  const onCall = SALES_BEATS.filter((b) => b.band !== "mind");
  const peakIdx = Math.max(
    0,
    onCall.findIndex((b) => b.band === "peak"),
  );
  const peakT = peakIdx / (onCall.length - 1);
  const points = onCall.map((b, i) => {
    const t = i / Math.max(1, onCall.length - 1);
    const y = baseY - (baseY - peakY) * (1 - Math.abs(t - peakT) / Math.max(peakT, 1 - peakT));
    return { x: padX + (w - padX * 2) * t, y, b };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const peak = points[peakIdx];

  return (
    <div>
      <Card>
        <div className="mb-1 text-[22px] font-bold">The Hill</div>
        <div className="mb-4 text-sm text-muted-foreground">
          The whole call in one picture. Click any beat to jump in.
        </div>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            width="100%"
            className="block min-w-[640px]"
            role="img"
            aria-label="The Hill"
          >
            <text x={padX} y={28} fontSize="13" fill="#16a34a" fontWeight={700}>
              Earn the sigh ▲
            </text>
            <text
              x={w - padX}
              y={28}
              fontSize="13"
              fill="#3b82f6"
              fontWeight={700}
              textAnchor="end"
            >
              Paperwork ▼
            </text>
            <line
              x1={padX - 20}
              y1={baseY + 60}
              x2={w - padX + 20}
              y2={baseY + 60}
              stroke="#ebebeb"
            />
            <path d={path} fill="none" stroke="#d4d4d4" strokeWidth={2} strokeDasharray="4 4" />
            {peak && (
              <text
                x={peak.x}
                y={peakY - 22}
                fontSize="12"
                textAnchor="middle"
                fill="#f59e0b"
                fontWeight={700}
              >
                the sigh = the turning point
              </text>
            )}
            {points.map((p) => (
              <g
                key={p.b.id}
                className="cursor-pointer"
                onClick={() => onJumpBeat(SALES_BEATS.findIndex((x) => x.id === p.b.id))}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={18}
                  fill="#fff"
                  stroke={BAND_COLOR[p.b.band]}
                  strokeWidth={3}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  fontSize="12"
                  textAnchor="middle"
                  fill="#111"
                  fontWeight={700}
                >
                  {stepNumber(p.b.id)}
                </text>
                <text x={p.x} y={p.y + 38} fontSize="11" textAnchor="middle" fill="#6b6b6b">
                  {STEP_TITLES[p.b.id].label}
                </text>
              </g>
            ))}
            <g className="cursor-pointer" onClick={() => onJumpBeat(0)}>
              <circle
                cx={padX - 60}
                cy={baseY + 95}
                r={14}
                fill="#fff"
                stroke={BAND_COLOR.mind}
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              <text
                x={padX - 60}
                y={baseY + 99}
                fontSize="11"
                textAnchor="middle"
                fill="#111"
                fontWeight={700}
              >
                1
              </text>
              <text x={padX - 60} y={baseY + 122} fontSize="10" textAnchor="middle" fill="#6b6b6b">
                Mindset
              </text>
            </g>
          </svg>
        </div>
        <p className="mt-3 text-lg italic">
          The sigh is the turning point — they've decided. But the win is a qualified client walking
          into the firm, so everything after it still has to be done right.
        </p>
      </Card>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <MiniCard
          band="climb"
          title="Act 1 — Earn the sigh"
          body="Opening → Discovery → Amplify → Education → the Audiobook moment. You're a guide climbing the hill with them."
        />
        <MiniCard
          band="paper"
          title="Act 2 — Paperwork"
          body="Commitment → Price & the specialist → Deposit & booking → Funding & final checks. They've decided — now do every step right: the hourly rate, the booking bar, the other side's full name, the $75 and the handover check."
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Nobody has ever explained how this actually works to them. On this call, you're the first.
      </p>

      <div className="mt-5 flex justify-end">
        <PrimaryButton onClick={onNext}>Got the picture — learn the beats →</PrimaryButton>
      </div>
    </div>
  );
}

function MiniCard({ band, title, body }: { band: Band; title: string; body: string }) {
  return (
    <div
      className="rounded-xl border border-l-4 bg-background p-4"
      style={{ borderLeftColor: BAND_COLOR[band] }}
    >
      <div className="mb-1 font-bold">{title}</div>
      <div className="text-[13px] leading-normal text-muted-foreground">{body}</div>
    </div>
  );
}

/* ---------- The Beats ---------- */
function BeatsView({
  beat,
  idx,
  total,
  onPrev,
  onNext,
  onObjection,
}: {
  beat: SalesBeat;
  idx: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onObjection: () => void;
}) {
  const color = BAND_COLOR[beat.band];
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="h-[5px]" style={{ background: color }} />
        <div className="p-6">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ background: BAND_SOFT[beat.band], color }}
            >
              {beatPill(beat)}
            </span>
            <span className="text-xs text-muted-foreground">
              {idx + 1} of {total}
            </span>
          </div>
          <h2 className="mb-1.5 text-[30px] font-bold tracking-tight">{beat.name}</h2>
          <p className="mb-5 text-[15px] leading-relaxed text-foreground/80">{beat.job}</p>

          <Section label="Say it like this">
            <BeatScript step={beat.id} />
          </Section>

          <Section label="Key moves">
            <ul className="list-disc space-y-1 pl-[18px] text-sm leading-relaxed">
              {beat.moves.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Section>

          <Panel tone="green" label="Move on when">
            {beat.moveOn}
          </Panel>
          <Panel tone="red" label="Never">
            {beat.never}
          </Panel>
          <Panel tone="amber" label="The tell (gun rep)">
            {beat.tell}
          </Panel>
          {beat.notes?.map((n) => (
            <Panel key={n} tone="grey" label="Notes">
              {n}
            </Panel>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onObjection}
          className="rounded-lg border border-red-500 bg-background px-3.5 py-2.5 text-[13px] font-bold text-red-500"
        >
          ⚡ Handling an objection?
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={idx === 0}
            className={cn(
              "rounded-lg border bg-background px-4 py-3 text-[13px] font-bold",
              idx === 0 && "cursor-not-allowed text-muted-foreground/50",
            )}
          >
            ← Prev
          </button>
          <PrimaryButton onClick={onNext}>
            {idx === total - 1 ? "Done — drill it →" : "Got it →"}
          </PrimaryButton>
        </div>
      </div>
      <div className="mt-2 text-right text-[11px] text-muted-foreground">
        ← / → arrow keys to navigate
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      <div className="rounded-[10px] border bg-muted/20 px-3.5 py-3">{children}</div>
    </div>
  );
}

const PANEL_TONES = {
  green: { bg: "#e7f6ec", border: "#16a34a" },
  red: { bg: "#fdecec", border: "#ef4444" },
  amber: { bg: "#fffaf0", border: "#f59e0b" },
  grey: { bg: "#f5f5f4", border: "#9a9a9a" },
} as const;

function Panel({
  tone,
  label,
  children,
}: {
  tone: keyof typeof PANEL_TONES;
  label: string;
  children: ReactNode;
}) {
  const t = PANEL_TONES[tone];
  return (
    <div
      className="mb-2.5 rounded-lg border border-l-[3px] px-3.5 py-2.5"
      style={{ background: t.bg, borderColor: `${t.border}40`, borderLeftColor: t.border }}
    >
      <div
        className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]"
        style={{ color: t.border }}
      >
        {label}
      </div>
      <div className="text-sm leading-normal text-neutral-800">{children}</div>
    </div>
  );
}

/* ---------- The Drill ---------- */
function DrillView({
  done,
  justFinished,
  ready,
  isAdmin,
  hint,
  finishing,
  onReveal,
  onFinish,
  onRunAgain,
}: {
  done: boolean;
  justFinished: boolean;
  ready: boolean;
  isAdmin: boolean;
  hint: string;
  finishing: boolean;
  onReveal: (id: string) => void;
  onFinish: () => void;
  onRunAgain: () => void;
}) {
  const [deck, setDeck] = useState<DrillCard[]>(() => shuffledDeck());
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const card = deck[i]!;

  const newDeck = useMemo(
    () => () => {
      setDeck(shuffledDeck());
      setI(0);
      setShown(false);
    },
    [],
  );

  // The full "locked in" screen shows once, straight after finishing. The deck stays usable
  // forever after, so the 2-minute warm-up always lands on a live card.
  if (justFinished) {
    return (
      <div>
        <Card>
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
            ✓ Complete
          </span>
          <h2 className="mb-1.5 mt-3 text-[28px] font-bold">Framework locked in</h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            You can run the call. Warm up before every shift with the 2-minute drill.
          </p>
        </Card>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              newDeck();
              onRunAgain();
            }}
            className="rounded-lg border bg-background px-4 py-3 text-[13px] font-bold"
          >
            ↺ Run it again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {done && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2 text-[13px] font-bold text-green-800">
          ✓ Complete — Framework locked in
        </div>
      )}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[22px] font-bold">The Drill</div>
          <div className="text-xs text-muted-foreground">
            Card {i + 1} of {deck.length}
          </div>
        </div>
        <div className="min-h-40 rounded-xl border bg-muted/20 p-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Question
          </div>
          <div className="mb-4 text-[17px] leading-relaxed">{card.q}</div>
          {shown && (
            <>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-green-600">
                Answer
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-[15px] leading-relaxed text-neutral-800">
                {card.a}
              </div>
            </>
          )}
        </div>
        <div className="mt-3.5 flex flex-wrap justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Say your answer out loud, then reveal.
          </div>
          {!shown ? (
            <PrimaryButton
              onClick={() => {
                setShown(true);
                onReveal(card.id);
              }}
            >
              Reveal
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={() => {
                setShown(false);
                setI((x) => (x + 1) % deck.length);
              }}
            >
              Next →
            </PrimaryButton>
          )}
        </div>
      </Card>

      {!done && (
        <div className="mt-4 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={onFinish}
            disabled={!ready || finishing}
            className={cn(
              "rounded-lg px-[18px] py-3 text-sm font-bold text-white",
              ready && !finishing ? "bg-green-600" : "cursor-not-allowed bg-green-600/40",
            )}
          >
            {finishing ? "Saving…" : "I can run this — finish module ✓"}
          </button>
          {!ready ? (
            <span className="text-xs text-muted-foreground">{hint}</span>
          ) : isAdmin ? (
            <span className="text-xs text-muted-foreground">
              Admin override — you can mark this complete anytime.
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ---------- Objections ---------- */
function ObjectionModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"loop" | "cards">("loop");
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-[620px] overflow-y-auto rounded-2xl bg-background p-7 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex gap-2">
            {(
              [
                ["loop", "The Objection Loop"],
                ["cards", "Objection cards"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-bold",
                  tab === key ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-muted-foreground"
          >
            ×
          </button>
        </div>

        {tab === "loop" ? (
          <div>
            <p className="mb-4 text-[13px] text-muted-foreground">{OBJECTION_LOOP.intro}</p>
            {OBJECTION_LOOP.steps.map((s, n) => (
              <div key={s.title} className="mb-3">
                <div className="flex items-baseline gap-2.5">
                  <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                    {n + 1}
                  </div>
                  <div className="font-bold">{s.title}</div>
                </div>
                <div className="ml-8 mt-1 text-sm leading-normal">"{s.say}"</div>
              </div>
            ))}
            <p className="mt-3.5 text-xs italic leading-normal text-muted-foreground">
              {OBJECTION_LOOP.footnote}
            </p>
            <p className="mt-2 text-xs italic leading-normal text-muted-foreground">
              {OBJECTION_LOOP.guarded}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground">
              The objection chips in the call screen's right panel, and what to say for each.
            </p>
            {OBJECTION_CARDS.map((c) => {
              const note = objectionCardNote(c);
              return (
                <div key={c.chip} className="rounded-lg border p-3">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {c.chip}
                  </span>
                  {c.say.map((s) => (
                    <p key={s} className="mt-2 text-sm leading-normal">
                      {s}
                    </p>
                  ))}
                  {note ? <p className="mt-1.5 text-xs text-muted-foreground">{note}</p> : null}
                  <p className="mt-1.5 text-xs text-red-600">
                    <span className="font-bold uppercase">Never:</span> {c.never}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-primary px-[18px] py-3 text-sm font-bold text-primary-foreground"
    >
      {children}
    </button>
  );
}
