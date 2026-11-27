// Ported from the Legal app (family-law-floater/src/components/training/beat-script.tsx). Re-run the port script to refresh.
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";

import { fetchActiveLinkingPlays } from "@/legal/lib/linking-education";
import {
  FUNDING_QUESTIONS,
  HELD_LINES,
  SPECIALIST_RULE,
  trainingPlayText,
  trainingPriceText,
} from "@/legal/lib/training/sales-framework";
import {
  AMPLIFY,
  AUDIOBOOK,
  COMMITMENT,
  DISCOVERY,
  EDUCATION,
  ELIGIBILITY_VERDICTS,
  FUNDING_WAYS,
  LIKELY_DENIED_BANNER,
  MINDSET,
  MUST_DOS,
  neverLine,
  OPENING,
  PRICE_JOURNEY,
  type DiscoveryRow,
  type StepKey,
} from "@/legal/lib/sales-script";

/** "[their words]" placeholders → chips: fill these with THEIR detail. */
export function Fill({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[^\]]+\]$/.test(p) ? (
          <span
            key={i}
            className="rounded bg-primary/10 px-1.5 py-px font-medium italic text-primary"
          >
            {p.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function Say({ children, label }: { children: ReactNode; label?: string | undefined }) {
  return (
    <div className="rounded-r-lg border-l-[3px] border-primary bg-muted/40 px-4 py-3">
      {label ? (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="text-[15px] leading-[1.65] text-foreground">{children}</div>
    </div>
  );
}

function Quote({ text, label }: { text: string; label?: string }) {
  return (
    <Say label={label}>
      "<Fill text={text} />"
    </Say>
  );
}

function Coach({ children }: { children: ReactNode }) {
  return <p className="text-[13px] italic leading-relaxed text-muted-foreground">{children}</p>;
}

function Handler({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-r-md border-l-2 border-amber-500/40 bg-amber-500/[0.05] px-3 py-2 text-[13px] leading-relaxed">
      <span className="font-bold text-amber-700">{title}</span> {children}
    </div>
  );
}

function Toggle({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        {label}
      </button>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}

function DiscoveryRows({
  title,
  rows,
  coach,
}: {
  title: string;
  rows: DiscoveryRow[];
  coach?: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {coach ? <Coach>{coach}</Coach> : null}
      {rows.map((r, i) => (
        <div key={i} className="text-[14px] leading-snug">
          {r.noun ? (
            <p className="text-[12px] font-bold uppercase tracking-wide">{r.noun}</p>
          ) : null}
          <p className="font-medium">
            "<Fill text={r.say} />"
          </p>
          {r.coach ? <p className="text-[12px] text-muted-foreground">{r.coach}</p> : null}
          {r.ifYes ? (
            <p className="text-[12px] text-muted-foreground">If yes / if needed: {r.ifYes}</p>
          ) : null}
          {r.tag ? (
            <span className="mt-0.5 inline-block rounded bg-muted px-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {r.tag}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function LinkingPlays() {
  const plays = useQuery({
    queryKey: ["linking-education-plays"],
    queryFn: fetchActiveLinkingPlays,
  });
  if (plays.isLoading) return <p className="text-[13px] text-muted-foreground">Loading plays…</p>;
  if (!plays.data?.length) return null;
  return (
    <div className="space-y-2">
      {plays.data.map((p) => {
        // Peter (C13, 11 Oct 2026): never promise the call or consult is completely private.
        const say = trainingPlayText(p.say_this);
        const held = say !== p.say_this || p.chip_label === HELD_LINES.privacy.chip;
        return (
          <div
            key={p.id}
            className="rounded-lg border bg-background p-3 text-[13px] leading-relaxed"
          >
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
              {p.chip_label}
            </span>
            <p className="mt-1.5 font-bold">{p.prompt_title}</p>
            <p className="mt-1 italic">Open with: “{p.callback_opener}”</p>
            <p className="mt-1">{say}</p>
            {p.never_say ? (
              <p className="mt-1 text-destructive">
                <span className="font-bold uppercase">Never say:</span> {p.never_say}
              </p>
            ) : null}
            {held ? (
              <p className="mt-1 text-destructive">
                <span className="font-bold uppercase">Privacy:</span>{" "}
                {p.say_this.includes(HELD_LINES.privacy.sentence)
                  ? `${HELD_LINES.privacy.onScreen} `
                  : null}
                {HELD_LINES.privacy.note}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The call screen's own words for a step, read from the shared script. */
export function BeatScript({ step }: { step: StepKey }) {
  switch (step) {
    case "mindset":
      return (
        <Say>
          <div className="space-y-3">
            {MINDSET.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="font-bold text-primary">{MINDSET.close}</p>
          </div>
        </Say>
      );
    case "opening":
      return (
        <div className="space-y-3">
          <Quote text={OPENING.say} />
          <Handler title="“Call me back” handler:">
            “{OPENING.callMeBack}”{" "}
            <span className="text-muted-foreground">{OPENING.callMeBackCoach}</span>
          </Handler>
          <Handler title="“Guarded voice” handler:">
            {OPENING.guardedWhen} “{OPENING.guardedSay}” — {OPENING.guardedThen}
          </Handler>
        </div>
      );
    case "discovery":
      return (
        <div className="space-y-3">
          <Quote text={DISCOVERY.opener} />
          <Coach>{DISCOVERY.openerCoach}</Coach>
          <Toggle label="See the full Discovery script">
            <DiscoveryRows
              title="History"
              rows={[
                {
                  noun: DISCOVERY.history.noun,
                  say: DISCOVERY.history.say.replaceAll('"', ""),
                  coach: DISCOVERY.history.coach,
                },
              ]}
            />
            <div className="space-y-1 rounded-lg border border-red-500/40 bg-red-500/[0.06] p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">
                Conflict check — {DISCOVERY.conflictCheck.label}
              </p>
              <p className="text-[14px] font-medium">
                "<Fill text={DISCOVERY.conflictCheck.say} />"
              </p>
              <p className="text-[12px] font-bold text-red-600">{DISCOVERY.conflictCheck.action}</p>
            </div>
            <DiscoveryRows title="The Other Side" rows={DISCOVERY.otherSide} />
            <DiscoveryRows title="The Map" rows={DISCOVERY.map} coach={DISCOVERY.mapCoach} />
            <DiscoveryRows
              title="Go Deeper"
              rows={DISCOVERY.deeper}
              coach={DISCOVERY.deeperCoach}
            />
          </Toggle>
        </div>
      );
    case "amplify":
      return (
        <div className="space-y-2">
          <Quote text={AMPLIFY.say} />
          <Coach>{AMPLIFY.coach}</Coach>
        </div>
      );
    case "education":
      return (
        <div className="space-y-4">
          {EDUCATION.chapters.map((ch, i) => (
            <div key={ch.title} className="space-y-2 rounded-lg border p-3">
              <p className="text-[12px] font-bold uppercase tracking-wide">
                {i + 1} — {ch.title}
              </p>
              {ch.say.map((s) => (
                <Quote key={s} text={s} />
              ))}
              {ch.say.some((s) => s.includes("a specialist")) ? (
                <Coach>{`On the call screen this line still says "a specialist". ${SPECIALIST_RULE}`}</Coach>
              ) : null}
              {ch.wow ? (
                <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[13px] font-medium">
                  {ch.wow}
                </p>
              ) : null}
              {ch.steps ? (
                <ol className="space-y-1.5 text-[13px]">
                  {ch.steps.map((s, n) => (
                    <li key={s.title}>
                      <span className="font-bold">
                        {n + 1}. {s.title}
                      </span>{" "}
                      — {s.detail}
                    </li>
                  ))}
                </ol>
              ) : null}
              {ch.outcomes ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {ch.outcomes.map((o) => (
                    <div
                      key={o.title}
                      className="rounded-md border p-2.5 text-[12.5px] leading-relaxed"
                    >
                      <p className="font-bold uppercase tracking-wide">{o.title}</p>
                      <p className="mt-1 text-muted-foreground">{o.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {ch.labelled?.map((l, n) => (
                <Fragment key={l.label}>
                  <Quote label={l.label} text={l.say} />
                  {n === 0 && ch.pause ? <Coach>{ch.pause}</Coach> : null}
                </Fragment>
              ))}
            </div>
          ))}
          <Toggle label="Linking Education — the plays on the call screen">
            <LinkingPlays />
          </Toggle>
        </div>
      );
    case "picture":
      return (
        <div className="space-y-3">
          <Quote label="Say this (pivot)" text={AUDIOBOOK.pivot} />
          <div className="rounded-lg border bg-background p-3 text-[15px] leading-relaxed">
            <Fill text={AUDIOBOOK.formula} />
          </div>
          <p className="flex items-start gap-2 text-[14px] font-medium">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-red-500" />
            {AUDIOBOOK.stop}
          </p>
        </div>
      );
    case "commitment":
      return (
        <div className="space-y-3">
          <Quote label="1 — The Ask" text={COMMITMENT.ask} />
          <Coach>{COMMITMENT.wait}</Coach>
          <p className="text-[13px] font-bold">2 — When they say yes, instantly say:</p>
          {COMMITMENT.onYes.map((s) => (
            <Quote key={s} text={s} />
          ))}
          <ul className="space-y-1 rounded-lg border border-red-500/30 bg-red-500/[0.05] p-3 text-[13px]">
            {COMMITMENT.never.map((n) => (
              <li key={n.why}>❌ {neverLine(n)}</li>
            ))}
          </ul>
        </div>
      );
    case "price":
      return (
        <div className="rounded-lg border p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Walk the price journey
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Exact order — do not skip
          </p>
          <ol className="mt-3 space-y-2.5">
            {PRICE_JOURNEY.map((p, i) => {
              // Q61 / P14 open: training leaves "what the split likely looks like" out.
              const text = trainingPriceText(p.text);
              return (
                <li key={p.text} className="flex items-start gap-2.5 text-[14px] leading-relaxed">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    {p.type === "say" ? (
                      <span className="italic">"{text}"</span>
                    ) : (
                      <span className="font-bold">{text}</span>
                    )}
                    {text !== p.text ? <Coach>{HELD_LINES.split.note}</Coach> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      );
    case "book":
      return (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-[13px] leading-relaxed">
            No script on this step — it's the booking form: Firm, Lawyer, Funding path, Other side's
            full name, In person or Zoom, Date, Time → <strong>💳 Send $75 link</strong> →{" "}
            <strong>✅ Payment confirmed</strong> → <strong>Book appointment</strong> →{" "}
            <strong>Review confirmation text</strong> → <strong>Send handover to firm</strong>.
          </p>
          <p className="pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">
            Only book if you have — before you hang up
          </p>
          <Coach>Run it before you send the $75 link — all five true, or don't book.</Coach>
          <ul className="space-y-1 text-[13px]">
            {MUST_DOS.map((m) => (
              <li key={m.key}>
                ☐ <span className="font-bold">{m.title}</span>{" "}
                <span className="text-muted-foreground">— {m.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "funding":
      return (
        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Three ways people fund this
            </p>
            <ol className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px] font-medium">
              {FUNDING_WAYS.map((w, i) => (
                <li key={w}>
                  {i + 1}. {w}
                </li>
              ))}
            </ol>
          </div>
          <Toggle label="The litigation-funding questions on screen — and what each one is for">
            <ol className="list-decimal space-y-2 pl-5 text-[13px]">
              {FUNDING_QUESTIONS.map(({ q, purpose }) => (
                <li key={q}>
                  <p className="font-medium">{q}</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">{purpose}</p>
                </li>
              ))}
            </ol>
            <p className="text-[13px]">
              Verdicts: {ELIGIBILITY_VERDICTS.join(" · ")}. "{LIKELY_DENIED_BANNER}"
            </p>
          </Toggle>
        </div>
      );
  }
}
