// Ported from the Legal app (family-law-floater/src/components/sales-call/discovery.tsx). Re-run the port script to refresh.
import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, Lock } from "lucide-react";

/**
 * Discovery (Step 3) — readability rebuild.
 * Wording is unchanged from the original script; only structure/typography differ.
 */

type RowCtx = {
  currentId: string | null;
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="sticky top-0 z-10 -mx-2 bg-card/95 px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
      {children}
    </p>
  );
}

function CoachRow({ children }: { children: ReactNode }) {
  return <p className="pl-3 text-[13px] italic leading-relaxed text-muted-foreground">{children}</p>;
}

function Coach({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{children}</p>;
}

function Reveal({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
      >
        {label}
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? (
        <div className="mt-1 border-l border-border pl-3 text-[15px] font-medium leading-relaxed">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Row({
  id,
  ctx,
  noun,
  chip,
  tag,
  children,
}: {
  id: string;
  ctx: RowCtx;
  noun?: string;
  chip?: number;
  tag?: string;
  children: ReactNode;
}) {
  const here = ctx.currentId === id;
  return (
    <div
      className={`w-full rounded-r-md border-l-[3px] border-transparent py-2.5 pl-3 pr-2 text-left ${
        here ? "bg-muted/30" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {chip ? (
          <span
            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: "var(--coral)" }}
          >
            {chip}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {noun ? <p className="text-[13px] font-bold uppercase tracking-wide">{noun}</p> : null}
          <div className="text-[17px] font-semibold leading-snug">{children}</div>
          {tag ? (
            <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {tag}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const ROW_IDS = [
  "opener",
  "timeline",
  "map-house",
  "map-other",
  "map-super",
  "map-savings",
  "map-investments",
  "map-business",
  "map-debts",
  "map-kids",
  "other-lawyer",
  "other-filed",
  "other-hostile",
  "deep-1",
  "deep-dream",
  "deep-2",
  "deep-3",
  "deep-4",
  "deep-5a",
  "deep-5b",
  "deep-5c",
];

export function Discovery({
  leadId,
  exPartner,
}: {
  leadId: string;
  exPartner: string;
}) {
  const ctx: RowCtx = useMemo(
    () => ({
      currentId: ROW_IDS[0] ?? null,
    }),
    [leadId],
  );

  const exFilled = Boolean(exPartner.trim());

  return (
    <div className="space-y-6 text-left">
      <div className="space-y-1">
        <Row id="opener" ctx={ctx}>
          "So tell me what's going on — where are things at with you and your ex?"
        </Row>
        <CoachRow>Let them talk. Don't interrupt. Don't fill silence.</CoachRow>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <SectionLabel>History</SectionLabel>
        <Row id="timeline" ctx={ctx} noun="Timeline">
          "How long were you together?" then "And when did you actually separate?"
          <Coach>
            push for exact dates and numbers — you'll reuse them at Why Now and in the summary.
            "Separated 14 months" is gold.
          </Coach>
        </Row>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <SectionLabel>Conflict Check</SectionLabel>
        <div
          className={`rounded-lg border px-3 py-3 ${
            exFilled ? "border-emerald-500/40 bg-emerald-500/[0.06]" : "border-red-500/40 bg-red-500/[0.07]"
          }`}
        >
          <div className="flex items-start gap-2">
            {exFilled ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                required, do not book without it
              </p>
              <p className="mt-1 text-[17px] font-semibold leading-snug">
                "And [ex first name]'s full name? I run checks on our end before I place you with a
                firm — makes sure there's no crossover and the firm can act for you."
              </p>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("ex-partner") as HTMLInputElement | null;
                  el?.focus();
                  el?.scrollIntoView({ block: "center", behavior: "smooth" });
                }}
                className={`mt-2 text-[13px] font-medium underline decoration-dotted ${
                  exFilled ? "text-emerald-500" : "text-red-500"
                }`}
              >
                → type it into the Ex-partner field on the right NOW.
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <SectionLabel>The Other Side</SectionLabel>
        <Row id="other-lawyer" ctx={ctx}>
          "Has [ex first name] got a lawyer yet, or spoken to one?"
          <Reveal label="if yes">which firm, note it</Reveal>
        </Row>
        <Row id="other-filed" ctx={ctx}>
          "Is anything already signed or filed, or is it all still up in the air?"
        </Row>
        <Row id="other-hostile" ctx={ctx}>
          "Are you two still able to talk, or has it turned hostile?"
        </Row>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <SectionLabel>The Map</SectionLabel>
        <CoachRow>walk the whole asset pool in order, one item at a time:</CoachRow>
        <Row id="map-house" ctx={ctx} noun="The house">
          "Who's living in it now? Whose name is it in? Roughly what's it worth, and what's owing on
          it?"
        </Row>
        <Row id="map-other" ctx={ctx} noun="Other property">
          "Any investment properties, land, anything else?"
        </Row>
        <Row id="map-super" ctx={ctx} noun="Super">
          "Rough super balances — yours and theirs?"
          <Coach>most people forget super counts — note if they're surprised</Coach>
        </Row>
        <Row id="map-savings" ctx={ctx} noun="Personal savings">
          "Roughly how much do you personally have in savings that you can access today?"
          <Coach>Enter the amount under Personal savings in the asset calculator.</Coach>
        </Row>
        <Row id="map-investments" ctx={ctx} noun="Other assets">
          "Apart from those savings, what else do either of you have in savings, shares or vehicles?"
        </Row>
        <Row id="map-business" ctx={ctx} noun="Business">
          "Either of you own a business or work for yourselves?"
        </Row>
        <Row id="map-debts" ctx={ctx} noun="Debts">
          "And what's owing — mortgage, cards, loans?"
        </Row>
        <Row id="map-kids" ctx={ctx} noun="Kids">
          "How old are the kids? What's the arrangement at the moment — is that working?"
        </Row>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <SectionLabel>Go Deeper</SectionLabel>
        <CoachRow>Then six deeper questions, in this order:</CoachRow>
        <Row id="deep-1" ctx={ctx} chip={1}>
          "Of everything you've told me — what's the bit that's actually keeping you up at night?"
        </Row>
        <Row id="deep-dream" ctx={ctx} chip={2}>
          "And what's the dream outcome of this for you — what are you hoping to achieve?"
          <Coach>note their exact words — you'll reuse them word for word in the Audiobook step</Coach>
        </Row>
        <Row id="deep-2" ctx={ctx} chip={3}>
          "What do you reckon is holding it up — is it them dragging their feet, or have you just not
          had the right help yet?"
        </Row>
        <Row id="deep-3" ctx={ctx} chip={4}>
          "Have you spoken to any lawyers about this before? What did they say?"
          <Reveal label="if yes">"What stopped you going ahead with them?"</Reveal>
        </Row>
        <Row id="deep-4" ctx={ctx} chip={5} noun="Why now?">
          "So you've been separated [use their exact number] months — what's made you look into it
          now? Why now do you think?"
          <Reveal label="if surface answer">
            "That makes sense. I speak to people in this exact spot every day and everyone's different
            — but what is it specifically about YOUR situation that's made you say enough is enough?"
          </Reveal>
        </Row>
        <Row id="deep-5a" ctx={ctx} chip={6} noun="Impact — ask these as three SEPARATE questions, not one" tag="Wait for answer">
          "Day to day, how much headspace is this taking up?"
        </Row>
        <Row id="deep-5b" ctx={ctx} tag="Wait for answer">
          "Money-wise right now — who's covering the mortgage and bills while this sits unresolved?"
        </Row>
        <Row id="deep-5c" ctx={ctx} tag="Wait for answer">
          "And the kids — how much of this are they picking up on?"
        </Row>
      </div>
    </div>
  );
}
