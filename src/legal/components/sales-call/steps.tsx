// Ported from the Legal app (family-law-floater/src/components/sales-call/steps.tsx). Re-run the port script to refresh.
import { firmAllocatesLawyer, ANY_AVAILABLE_LAWYER, ANY_AVAILABLE_LAWYER_LABEL } from "@/legal/lib/firm-lawyer-allocation";
import { FirmOffices, useFirmOffices } from "@/legal/components/firm-portal/FirmOffices";
import { chosenOfficeId } from "@/legal/lib/firm-offices";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { availableSlotsFn } from "@/legal/lib/firm-portal.functions";
import type { LeadBookingState } from "@/legal/lib/booking-state";
import { RebookClient } from "./rebook-client";
import { useState, type ReactNode } from "react";
import {
  Award,
  BookOpen,
  Brain,
  CalendarCheck,
  Eye,
  HandshakeIcon,
  PhoneOutgoing,
  Search,
  Wallet,
} from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import { ChapterCard, ReminderCard, SayThis, StepShell, WowBox } from "./call-ui";
import { Discovery } from "./discovery";
import { EligibilityCheck } from "./eligibility";
import { computeEligibility, type EligibilityFlags } from "@/legal/lib/eligibility";
import { LinkingEducation } from "./linking-education";
import { DEPOSIT_AMOUNT, type CallLead } from "@/legal/lib/sales-call";
import {
  packBalanceLabel,
  type BlockedSlot,
  type Firm,
  type FirmLawyer,
  type FirmPack,
  type TradingHour,
} from "@/legal/lib/partner-firms";

export type StepContext = {
  lead: CallLead;
  isAdmin: boolean;
  /** Name of the logged-in sales rep, for scripts that say "it's [name] from Legal Group". */
  repName: string | null;
  notes: string;
  onNotesChange: (v: string) => void;
  summaryText: string;
  pictureText: string;
  onPrepNextSteps: () => void;
  firms: Firm[];
  packs: FirmPack[];
  lawyers: FirmLawyer[];
  tradingHours: TradingHour[];
  blockedSlots: BlockedSlot[];
  selectedFirmId: string | null;
  selectedLocationId?: string | null;
  onSelectLocation?: (id: string) => void;
  onSelectFirm: (id: string) => void;
  selectedLawyerId: string | null;
  onSelectLawyer: (id: string | null) => void;
  bookingDate: string;
  onBookingDate: (v: string) => void;
  bookingTime: string | null;
  /** `custom` = a time the rep typed in, outside the firm's usual slots. */
  onBookingTime: (v: string, custom?: boolean) => void;
  /** Appointments already in the diary for the selected firm. */
  bookedTimes: Array<{ appointment_date: string; appointment_time: string }>;

  consultMode: "in_person" | "zoom";
  onConsultMode: (v: "in_person" | "zoom") => void;
  onConfirmBooking: () => void;
  onMarkDepositPaid: () => void;
  onResetDeposit: () => void;
  onSendDepositLink: () => void;
  depositLinkSent: boolean;
  checkingDeposit: boolean;
  depositCheckError: string | null;
  onCheckDeposit: () => void;
  exPartner: string;
  onExPartnerChange: (v: string) => void;
  onExPartnerSave: () => void;
  onSelectFunding: (v: string) => void;
  sendingLink: boolean;
  booking: boolean;
  bookingState?: LeadBookingState | undefined;
  bookingStateLoading?: boolean;
  bookingStateError?: boolean;
  onRetryBookingState?: () => void;
  /** Remaining consultations per firm, read via the safe balance lookup. */
  packBalances: Record<string, number | null>;
  confirmationSent: boolean;
  sendingConfirmation: boolean;
  onSendConfirmation: () => void;
  handoverReady: boolean;
  handoverReason: string | null;
  handoverSentAt: string | null;
  sendingHandover: boolean;
  onSendHandover: () => void;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** Accepts "14:30", "14:30:00" or "2:30pm" and returns minutes. */
function anyTimeToMinutes(t: string): number {
  const ampm = /^\s*(\d{1,2}):?(\d{2})?\s*(am|pm)\s*$/i.exec(t);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] ?? 0);
    const suffix = ampm[3]!.toLowerCase();
    if (suffix === "pm" && h !== 12) h += 12;
    if (suffix === "am" && h === 12) h = 0;
    return h * 60 + m;
  }
  return timeToMinutes(t);
}

function Step1() {
  return (
    <StepShell eyebrow="Step 1" heading="Changing Lives">
      <div className="space-y-5 text-[15px] leading-relaxed">
        <p>
          This person enquired because something snapped. Maybe the ex's lawyer letter landed. Maybe
          another mortgage payment went out of their account alone. Maybe they watched their kid go
          quiet at handover again. They didn't fill in that form by accident.
        </p>
        <p>
          My job isn't to sell them. My job is to care enough to have an honest conversation — find
          out what's really going on, and show them there's a way through the mess. Nobody has ever
          explained how this actually works to them. I get to be the first.
        </p>
        <p>
          If I do my job right, they leave this call with a plan and a date. If I don't, they hang
          up and go back to waiting — and a year from now they're still paying for everything, still
          stuck in the same limbo, and the clock is still running.
        </p>
        <p className="font-semibold text-primary">
          Pick up the phone. Be curious. Be present. This call matters.
        </p>
      </div>
    </StepShell>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[13px] font-semibold text-primary">
      {children}
    </span>
  );
}

function Step2({ ctx }: { ctx: StepContext }) {
  const firstName = ctx.lead.first_name?.trim() || "there";
  const repName = ctx.repName?.trim() || "Legal Group";
  return (
    <StepShell eyebrow="Step 2 — Opening" heading="The Opening">
      <SayThis size="xl">
        "Hi <Pill>{firstName}</Pill>, it's <Pill>{repName}</Pill> from Legal Group, how are you? … I
        saw your Facebook enquiry come through about your situation, and I wanted to make sure I
        called you straight away — if I don't call you now I won't be able to call you back later,
        it's been so busy in the firm today. So <Pill>{firstName}</Pill>, where are things up to?"
      </SayThis>

      <div className="space-y-3 text-left text-[12px] leading-relaxed text-muted-foreground/80">
        <div className="rounded-r-md border-l border-amber-500/25 bg-amber-500/[0.04] px-3 py-2">
          <span className="font-medium text-amber-600/80">“Call me back” handler:</span> “That's not
          a problem at all — I know you weren't expecting my call. Have you got just one minute now,
          just to see if it even makes sense for me to call you back later?”
        </div>
        <p>One-minute calls become ten-minute calls. Just get them talking.</p>

        <div className="rounded-r-md border-l border-amber-500/25 bg-amber-500/[0.04] px-3 py-2">
          <span className="font-medium text-amber-600/80">“Guarded voice” handler:</span> If they're
          whispering or giving one-word answers, the ex may be nearby: “No stress — sounds like now
          might not be a private moment. When's a time today you can talk freely?” — lock the
          callback on the spot.
        </div>
      </div>
    </StepShell>
  );
}

function Step3({ ctx }: { ctx: StepContext }) {
  return (
    <div className="flex h-full flex-col text-center">
      <p
        className="font-medium uppercase tracking-[0.16em]"
        style={{
          color: "var(--coral)",
          fontSize: "clamp(0.6875rem, 0.25vw + 0.6rem, 0.875rem)",
        }}
      >
        Step 3 — Discovery
      </p>
      <h2
        className="mt-3 font-semibold leading-[1.15]"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1.375rem, 1.5vw + 0.85rem, 2.25rem)",
        }}
      >
        Understand Their Situation (5–10 mins)
      </h2>
      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4 text-left">
        <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto rounded-xl border bg-card p-4 shadow-sm">
          <Discovery leadId={ctx.lead.id} exPartner={ctx.exPartner} />
        </div>
      </div>
    </div>
  );
}

function AmplifyStep({ ctx }: { ctx: StepContext }) {
  return (
    <StepShell eyebrow="Step 4 — Amplification" heading="Summarise Back">
      <SayThis>
        "So let me make sure I've got this right... You separated [their number] months ago, there's
        the house at [suburb], super, [other assets], the kids are [ages], and nothing's moved
        because [their reason]. Meanwhile you're covering [what they're paying] and lying awake over
        [their words]. Is that right?"
      </SayThis>
      {ctx.summaryText ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-[14px] leading-relaxed whitespace-pre-wrap">
          {ctx.summaryText}
        </div>
      ) : null}
      <p className="text-[13px] italic text-muted-foreground">
        Get them to say yes. That yes is your bridge to education.
      </p>
    </StepShell>
  );
}

function EduRow({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[12px] font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug">{title}</p>
        {children ? (
          <div className="mt-0.5 text-[13.5px] leading-relaxed text-muted-foreground">
            {children}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function EducationStep() {
  return (
    <div className="flex h-full flex-col justify-center text-center">
      <p
        className="font-medium uppercase tracking-[0.16em]"
        style={{
          color: "var(--coral)",
          fontSize: "clamp(0.6875rem, 0.25vw + 0.6rem, 0.875rem)",
        }}
      >
        Step 5 — Education
      </p>
      <h2
        className="mt-3 font-semibold leading-[1.15]"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1.375rem, 1.5vw + 0.85rem, 2.25rem)",
        }}
      >
        How It Actually Gets Fixed
      </h2>
      <div className="mt-6 flex min-h-0 w-full justify-center text-left">
        <div className="mx-auto flex w-full max-w-3xl max-h-[calc(100vh-280px)] min-h-0 flex-col gap-6 overflow-y-auto rounded-xl border bg-card p-4 shadow-sm">
          <ChapterCard index={1} title="Week One — The Strategy Session">
            <SayThis>
              "First thing that happens: you sit down with a specialist — not a suburban generalist
              who does wills on Monday and traffic fines on Tuesday, a family lawyer who does
              settlements every day. They map your whole pool and tell you where you actually stand
              before you've spent a cent."
            </SayThis>
          </ChapterCard>

          <ChapterCard index={2} title="The Cards Go On The Table — Full Disclosure">
            <SayThis>
              "Then both sides are legally forced to show everything — bank statements, super,
              business books, the lot. It's called the duty of disclosure."
            </SayThis>
            <WowBox>
              Hiding assets breaks the law, and the court has real consequences for it — and good
              firms know exactly where to look.
            </WowBox>
          </ChapterCard>

          <ChapterCard index={3} title="How the split actually gets worked out">
            <SayThis>
              "Here's the thing almost nobody knows — there's no automatic 50/50 in Australia.
              That's a myth. The law sets out four steps, and the lawyers use the same steps when
              they negotiate:"
            </SayThis>
            <ol className="space-y-3.5">
              <EduRow n={1} title="Put everything on the table">
                Everything you both own and owe, even things in only one name, even the super.
              </EduRow>
              <EduRow n={2} title="What each of you put in">
                The money, yes — but raising the kids and running the home count as contributions
                too.
              </EduRow>
              <EduRow n={3} title="What each of you needs from here">
                Age, health, earning capacity, who's looking after the kids.
              </EduRow>
              <EduRow n={4} title="Is the overall result fair?">
                The law's last check: the outcome has to be "just and equitable".
              </EduRow>
            </ol>
            <SayThis>
              "Then there's how it actually gets sorted: both sides swap their financial documents,
              the lawyers negotiate and make offers, and very often there's a mediation — a neutral
              person helping you both land a deal. If you agree, the lawyer turns it into consent
              orders or a binding financial agreement, so it's final. Only if you can't agree does a
              judge decide — and that's slower and more expensive, which is why most people settle
              first."
            </SayThis>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500">
                  They agree → Consent orders
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  The deal is written up as consent orders and approved by the court — usually on
                  the papers, with no one in a courtroom. It has the same force as an order made
                  after a hearing. And transfers done under consent orders or a binding financial
                  agreement can get stamp duty relief — the lawyer confirms how that works for you.
                </p>
              </div>
              <div className="rounded-lg border border-red-500/40 bg-red-500/[0.07] p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-500">
                  They can't agree → Court
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  If they won't engage, drag their feet, or it turns hostile, it can end up in
                  court, where a judge decides. That's slower and more expensive — which is exactly
                  why the funding conversation comes next.
                </p>
              </div>
            </div>
          </ChapterCard>

          <ChapterCard index={4} title="Then — Funding">
            <SayThis label="The trap">
              "So here's what happens to most people. They've got a house, they've got super, maybe
              a business. On paper they're worth a couple of million. But there's no cash. And often
              one person has had more control of the money. So they either don't get a lawyer, or
              they get a cheap one, or they take the first offer put in front of them just to make
              it stop."
            </SayThis>
            <p className="text-[13px] italic text-muted-foreground">Pause. Let them sit in it.</p>

            <SayThis label="Beat 2 — The reveal">
              "Which is why there's a whole industry most people have never heard of. There are
              lenders in Australia who specialise in funding family law legal fees. They pay your
              lawyer's bills as you go, and you pay them back out of your settlement at the end.
              There's a cost to it — the lawyer walks you through the numbers."
            </SayThis>
          </ChapterCard>

          <LinkingEducation />
        </div>
      </div>
    </div>
  );
}

function AudiobookStep({ ctx }: { ctx: StepContext }) {
  return (
    <StepShell eyebrow="Step 6 — Paint The Audiobook" heading="Paint The Audiobook">
      <SayThis label="Say this (pivot)">
        "Look, I could talk about the legal side all day — but what it really comes down to is
        this..."
      </SayThis>
      <div className="rounded-xl border bg-card p-4 text-[15px] leading-relaxed">
        Imagine waking up [timeframe] from now... [use their exact words from discovery] ... the
        orders are stamped, [their dream outcome — the house sorted, the kids settled, their name
        off the mortgage]. How would that actually feel?
      </div>
      {ctx.pictureText ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-[14px] leading-relaxed">
          {ctx.pictureText}
        </div>
      ) : null}
      <div className="flex items-start gap-2 rounded-xl border p-4 text-[14px] leading-relaxed">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
        <span>
          Then stop. Don't speak. The silence is working for you. Wait for them to respond.
        </span>
      </div>
    </StepShell>
  );
}

function CommitmentStep() {
  return (
    <StepShell eyebrow="Step 7 — Commitment" heading="The Commitment">
      <div className="space-y-6 text-left">
        <div className="space-y-3">
          <h3
            className="font-semibold"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(1.125rem, 1vw + 0.75rem, 1.625rem)",
            }}
          >
            1 — The Ask
          </h3>
          <SayThis>
            "Based on all of that, is it something you wanna get sorted now? Where are you at with
            all of this?"
          </SayThis>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            Wait for their answer — let them tell you where they're at.
          </p>
        </div>

        <div className="space-y-3">
          <h3
            className="font-semibold"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(1.125rem, 1vw + 0.75rem, 1.625rem)",
            }}
          >
            2 — When they say yes
          </h3>
          <p className="text-[14px] leading-relaxed text-muted-foreground">Instantly say:</p>
          <SayThis>
            "Excellent, I really want to book you in with <Pill>[lawyer name]</Pill>, because based
            on what you told me about <Pill>[link to their specific situation]</Pill> I think they
            would be perfect for you."
          </SayThis>
          <SayThis>
            "They also <Pill>[drop 3 key selling points]</Pill> — and that's why I wouldn't want you
            seeing anyone else."
          </SayThis>
        </div>

        <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <h3 className="text-[14px] font-semibold text-red-400">Note — never say</h3>
          <ul className="space-y-2 text-[14px] leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-red-400">❌</span>
              <span>
                NEVER say{" "}
                <span className="font-medium text-foreground">"would you like to book"</span> — that
                gives them a yes/no exit
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">❌</span>
              <span>
                NEVER say{" "}
                <span className="font-medium text-foreground">"do you want to think about it"</span>{" "}
                — you just lost them
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">❌</span>
              <span>
                NEVER say <span className="font-medium text-foreground">"no pressure"</span> or{" "}
                <span className="font-medium text-foreground">"no rush"</span> — you're handing them
                the off-ramp
              </span>
            </li>
          </ul>
        </div>
      </div>
    </StepShell>
  );
}

function PriceStep() {
  const steps = [
    {
      type: "say" as const,
      text: "That first consultation, they do the lot, we go through your whole situation, map the full asset pool — house, super, everything — and you walk out with an actual strategy: where you stand, what the split likely looks like, and your exact next steps. All in one sit-down.",
    },
    { type: "say" as const, text: "Normally this consult is $695..." },
    {
      type: "say" as const,
      text: "...we do have some complimentary spots available sometimes, let me just have a look and see if I can find any free ones.",
    },
    {
      type: "say" as const,
      text: "Who's making this call with you? If there's someone else in it, let's find a time you can both come in.",
    },
    { type: "do" as const, text: "Agree on a time, give 2 options." },
    {
      type: "say" as const,
      text: "...there is just a $75 holding fee to secure your spot, which is fully refunded when you arrive...",
    },
    {
      type: "say" as const,
      text: "...we do this because we turn people away for these slots. Does that sound fair?",
    },
    {
      type: "do" as const,
      text: "Ask for their card details if they sound older, otherwise send them a link.",
    },
  ];

  return (
    <div className="mx-auto flex w-full flex-col items-center justify-center text-center">
      <p
        className="font-medium uppercase tracking-[0.16em]"
        style={{ color: "var(--coral)", fontSize: "clamp(0.6875rem, 0.25vw + 0.6rem, 0.875rem)" }}
      >
        Step 8 — Price & Sell the Specialist
      </p>
      <h2
        className="mt-3 font-semibold leading-[1.15]"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1.375rem, 1.5vw + 0.85rem, 2.25rem)",
        }}
      >
        Present Price
      </h2>

      <div className="mt-6 w-full max-w-2xl rounded-xl border bg-card p-5 text-left shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Walk the price journey
        </p>
        <p
          className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--coral)" }}
        >
          Exact order — do not skip
        </p>

        <div className="mt-5 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "var(--coral)" }}
              >
                {i + 1}
              </span>
              {s.type === "say" ? (
                <p className="pt-0.5 text-[15px] leading-relaxed italic text-foreground">
                  "{s.text}"
                </p>
              ) : (
                <p className="pt-0.5 text-[15px] font-medium leading-relaxed text-foreground">
                  {s.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FUNDING_WAYS = ["Savings/cash", "Family/friends help", "Litigation funding"] as const;

function FundingStep({ ctx }: { ctx: StepContext }) {
  return (
    <StepShell
      eyebrow="Step 10 — Funding & Final Checks"
      heading="How They'll Fund It"
      contentClassName="mt-6 space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1"
    >
      {/* Three funding options — one compact line */}
      <div className="rounded-xl border bg-card px-4 py-3 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Three ways people fund this
        </p>
        <ol className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] font-medium">
          {FUNDING_WAYS.map((w, i) => (
            <li key={w} className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "var(--coral)" }}
              >
                {i + 1}
              </span>
              {w}
            </li>
          ))}
        </ol>
      </div>

      {/* Litigation funding eligibility checklist — keyed by lead so answers never bleed across clients */}
      <EligibilityCheck key={ctx.lead.id} lead={ctx.lead} embedded />
    </StepShell>
  );
}

const FUNDING_CHIPS = [
  { label: "Savings", value: "savings" },
  { label: "Family helping", value: "family_helping" },
  { label: "Litigation funding", value: "litigation_funding" },
] as const;

function sameFunding(a: string | null | undefined, b: string): boolean {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z]+/g, "_");
  return Boolean(a) && norm(a!) === norm(b);
}

const MUST_DOS = [
  {
    key: "rate",
    title: "Told them the hourly rate",
    detail: "no surprises later — they know what the firm charges.",
  },
  {
    key: "funding",
    title: "Funding path locked in",
    detail: "if litigation funding: the firm walks them through the funder's costs, no surprises.",
  },
  {
    key: "conflict",
    title: "Other side's full name captured",
    detail: "for the conflict check.",
  },
  {
    key: "assets",
    title: "Asset Pool $750k+, or parenting-only with $50k+ of their own savings",
    detail: "pool minus debts, from the Map in discovery.",
  },
  {
    key: "serious",
    title: "They're serious about taking the step",
    detail:
      "not just curious — they've told you they want this sorted and they're ready to move now.",
  },
] as const;

function BookStep({ ctx }: { ctx: StepContext }) {
  if (ctx.bookingStateLoading || ctx.bookingStateError)
    return (
      <StepShell eyebrow="Booking" heading="Client appointment">
        <p role="status">
          {ctx.bookingStateError
            ? "Could not check the current appointment."
            : "Checking the current appointment…"}
        </p>
        {ctx.bookingStateError && <Button onClick={ctx.onRetryBookingState}>Retry</Button>}
      </StepShell>
    );
  if (ctx.bookingState?.kind === "no_show")
    return <RebookClient key={ctx.bookingState.appointment?.id} ctx={ctx} />;
  if (ctx.bookingState?.kind === "closed")
    return (
      <StepShell eyebrow="Booking" heading="Appointment closed">
        <p>
          This appointment has been completed, cancelled or disqualified. Ask an administrator to
          check it before making another booking.
        </p>
      </StepShell>
    );
  return <StandardBookStep ctx={ctx} />;
}

function StandardBookStep({ ctx }: { ctx: StepContext }) {
  const offices = useFirmOffices(ctx.selectedFirmId);
  const locationId = chosenOfficeId(offices.data ?? [], ctx.selectedLocationId);
  const needsOffice = ctx.consultMode === "in_person" && (!locationId || offices.isPending || offices.isError);

  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const loadSlots = useServerFn(availableSlotsFn);
  const slotQuery = useQuery({
    queryKey: ["shared-firm-slots", ctx.selectedFirmId, ctx.bookingDate, ctx.lead.id],
    enabled: Boolean(ctx.selectedFirmId && ctx.bookingDate),
    queryFn: () =>
      loadSlots({
        data: { firmId: ctx.selectedFirmId!, date: ctx.bookingDate, ignoreLeadId: ctx.lead.id },
      }),
    refetchInterval: 15000,
  });
  const slots = slotQuery.isError
    ? []
    : (slotQuery.data ?? []).filter((s) => s.available).map((s) => s.label);
  const depositPaid = Boolean(ctx.lead.deposit_paid_at);
  const scheduleChanged =
    Boolean(ctx.lead.booking_date) &&
    ((ctx.consultMode === "in_person" && ctx.bookingState?.appointment && locationId !== (ctx.bookingState.appointment.location_id ?? null)) ||
      ctx.bookingDate !== ctx.lead.booking_date ||
      !ctx.bookingTime ||
      !ctx.lead.booking_time ||
      anyTimeToMinutes(ctx.bookingTime) !== anyTimeToMinutes(ctx.lead.booking_time));

  const storedCheck = ctx.lead.eligibility_data as {
    answers?: EligibilityFlags;
    reason?: string | null;
  } | null;
  const fundingCheck = storedCheck?.answers ? computeEligibility(storedCheck.answers) : null;
  const fundingLooksUnlikely = fundingCheck
    ? fundingCheck.verdict === "denied" && fundingCheck.code !== "no_loan_needed"
    : ctx.lead.eligibility_verdict === "denied";
  const fundingReason = fundingCheck ? fundingCheck.reason : storedCheck?.reason;

  const firmHasLawyers = ctx.lawyers.length > 0;
  const firmAllocates = firmAllocatesLawyer(ctx.selectedFirmId);

  const missing: string[] = [];
  if (!ctx.selectedFirmId) missing.push("firm");
  if (ctx.selectedFirmId && needsOffice) missing.push("office");
  if (firmHasLawyers && !firmAllocates && !ctx.selectedLawyerId) missing.push("lawyer");
  if (!ctx.lead.funding_preference) missing.push("funding");
  if (!ctx.exPartner.trim()) missing.push("other side's name");
  if (!ctx.bookingDate) missing.push("date");
  if (!ctx.bookingTime) missing.push("time");

  const missingLabel = missing.join(", ");
  const canSend = missing.length === 0;
  const waiting = ctx.depositLinkSent && !depositPaid;

  return (
    <StepShell
      eyebrow="Step 9 — Deposit & Book"
      heading="Lock It In"
      contentClassName="mt-4 space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1"
    >
      {fundingLooksUnlikely ? (
        <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-3">
          <p className="text-[13px] font-semibold text-amber-600">
            Funding looks unlikely. You can still book the appointment.
          </p>
          {fundingReason ? (
            <p className="mt-1 text-[12px] text-amber-600/80">{fundingReason}</p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        {/* Firm */}
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor="step10-firm">
            Firm
          </label>
          <Select value={ctx.selectedFirmId ?? ""} onValueChange={ctx.onSelectFirm} disabled={ctx.bookingState?.kind === "active"}>
            <SelectTrigger id="step10-firm" className="mt-1">
              <SelectValue placeholder="Choose a firm" />
            </SelectTrigger>
            <SelectContent>
              {ctx.firms.map((f) => {
                const balance = ctx.packBalances[f.id];
                return (
                  <SelectItem key={f.id} value={f.id}>
                    {f.firm_name}
                    {f.city ? ` — ${f.city}` : ""}
                    {typeof balance === "number" ? ` · ${balance} shows left` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Lawyer — only when the firm has lawyers */}
        {firmHasLawyers || firmAllocates ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="step10-lawyer">
              Lawyer
            </label>
            <Select
              value={ctx.selectedLawyerId ?? (firmAllocates ? ANY_AVAILABLE_LAWYER : "")}
              onValueChange={(id) => ctx.onSelectLawyer(id === ANY_AVAILABLE_LAWYER ? null : id)}
            >
              <SelectTrigger id="step10-lawyer" className="mt-1">
                <SelectValue placeholder="Choose a lawyer" />
              </SelectTrigger>
              <SelectContent>
                {firmAllocates && <SelectItem value={ANY_AVAILABLE_LAWYER}>{ANY_AVAILABLE_LAWYER_LABEL}</SelectItem>}
                {ctx.lawyers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                    {l.title ? ` — ${l.title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {firmAllocates && <p className="mt-1 text-xs text-muted-foreground">Trilogy will allocate the lawyer. Only select a name if they have confirmed it.</p>}
          </div>
        ) : null}

        {/* Funding chips */}
        <div>
          <p className="text-xs font-medium text-muted-foreground">Funding path</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {FUNDING_CHIPS.map((f) => {
              const active = sameFunding(ctx.lead.funding_preference, f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => ctx.onSelectFunding(f.value)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ex partner — two-way with the right panel */}
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor="step10-ex">
            Other side's full name (required for conflict check)
          </label>
          <Input
            id="step10-ex"
            value={ctx.exPartner}
            onChange={(e) => ctx.onExPartnerChange(e.target.value)}
            onBlur={ctx.onExPartnerSave}
            className="mt-1"
            placeholder="e.g. Sarah Jane Miller"
          />
        </div>

        {/* In person or Zoom */}
        <div>
          <p className="text-xs font-medium text-muted-foreground">How is the consult happening?</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(
              [
                { value: "in_person", label: "🏢 In person" },
                { value: "zoom", label: "💻 Zoom" },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => ctx.onConsultMode(m.value)}
                aria-pressed={ctx.consultMode === m.value}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  ctx.consultMode === m.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {ctx.consultMode === "zoom" ? (
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              The firm will be asked to email the client a Zoom link before the appointment.
            </p>
          ) : null}
        </div>

        {ctx.selectedFirmId && <FirmOffices key={ctx.selectedFirmId} firmId={ctx.selectedFirmId} selectedId={locationId} onSelect={ctx.onSelectLocation} disabled={ctx.booking} />}
        {ctx.selectedFirmId && (offices.data?.length ?? 0) > 1 && <p className="text-sm text-muted-foreground">Both offices use the firm's shared consultation calendar. Confirm the chosen office suits the client and lawyer.</p>}
        {/* Date + slots */}
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor="step10-date">
            Date
          </label>
          <Input
            id="step10-date"
            type="date"
            value={ctx.bookingDate}
            onChange={(e) => ctx.onBookingDate(e.target.value)}
            disabled={!ctx.selectedFirmId || needsOffice || ctx.booking}
            className="mt-1"
          />
          {!ctx.selectedFirmId ? (
            <p className="mt-1.5 text-[13px] text-muted-foreground">Pick a firm first</p>
          ) : !ctx.bookingDate ? null : (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground">Time</p>
              {slotQuery.isError && (
                <button type="button" onClick={() => void slotQuery.refetch()}>
                  Retry availability
                </button>
              )}
              {slots.length ? (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={ctx.booking}
                      onClick={() => {
                        setCustomOpen(false);
                        ctx.onBookingTime(s);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        ctx.bookingTime === s ? "border-primary bg-primary/10 text-primary" : ""
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {slotQuery.isPending
                    ? "Checking the firm’s calendar…"
                    : slotQuery.isError
                      ? "Could not load availability. Please retry before booking."
                      : "No free times — the firm is closed, blocked or fully booked that day."}
                </p>
              )}

              {/* Escape hatch: any other time the client asked for (e.g. 2:30pm). */}
              {customOpen ? (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="time"
                    value={customValue}
                    disabled={ctx.booking}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="h-9 w-[130px]"
                    aria-label="Choose any other time"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!customValue || ctx.booking}
                    onClick={() => {
                      ctx.onBookingTime(minutesToLabel(timeToMinutes(customValue)), true);
                      setCustomOpen(false);
                    }}
                  >
                    Use this time
                  </Button>
                  <button
                    type="button"
                    onClick={() => setCustomOpen(false)}
                    className="text-xs text-muted-foreground underline underline-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomOpen(true)}
                  disabled={ctx.booking}
                  className="mt-2 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  + Choose another time
                </button>
              )}
              {ctx.bookingTime && !slots.includes(ctx.bookingTime) ? (
                <p className="mt-1.5 text-[12px] font-medium text-primary">
                  Booking at {ctx.bookingTime} (outside the firm's usual times)
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Send link / waiting / confirmed */}
        <div className="space-y-2 border-t pt-4">
          {depositPaid ? (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-2 text-[13px] font-semibold text-green-700">
              ✅ Payment confirmed
            </div>
          ) : waiting ? (
            <div className="space-y-1.5">
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[13px] font-semibold text-amber-700">
                ⏳ Checking Square for payment…
              </div>
              <p className="text-xs text-muted-foreground" role="status">
                {ctx.depositCheckError ??
                  "Automatically checked every 10 seconds. No need to refresh."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={ctx.onCheckDeposit}
                disabled={ctx.checkingDeposit}
              >
                {ctx.checkingDeposit ? "Checking…" : "Check payment now"}
              </Button>
              <button
                type="button"
                onClick={ctx.onSendDepositLink}
                disabled={ctx.sendingLink}
                className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {ctx.sendingLink ? "Resending…" : "Resend payment link"}
              </button>
            </div>
          ) : (
            <Button
              onClick={ctx.onSendDepositLink}
              disabled={!canSend || ctx.sendingLink || !ctx.lead.phone}
              title={canSend ? undefined : `Complete ${missingLabel} first`}
              className="w-full"
              aria-label={`Text the $${DEPOSIT_AMOUNT} refundable deposit link to this lead`}
            >
              {ctx.sendingLink
                ? "Sending…"
                : canSend
                  ? `💳 Send $${DEPOSIT_AMOUNT} link`
                  : `🔒 Complete ${missingLabel} first`}
            </Button>
          )}

          {/* One button that walks the chain: book → confirmation text → handover */}
          {scheduleChanged ? (
            <div className="space-y-2">
              <p className="text-[13px] text-amber-700" role="status">
                Appointment details changed — update the appointment to save them.
              </p>
              <Button
                onClick={ctx.onConfirmBooking}
                disabled={ctx.booking || needsOffice || !ctx.bookingDate || !ctx.bookingTime}
                className="w-full bg-green-600 text-white hover:bg-green-700"
              >
                {ctx.booking
                  ? "Updating…"
                  : ctx.confirmationSent
                    ? "Update appointment"
                    : "Update appointment & review text"}
              </Button>
            </div>
          ) : !ctx.lead.booking_date ? (
            <Button
              onClick={ctx.onConfirmBooking}
              disabled={!depositPaid || !canSend || ctx.booking}
              title={
                !canSend
                  ? `Complete ${missingLabel} first`
                  : !depositPaid
                    ? "Payment required"
                    : undefined
              }
              className={`w-full ${depositPaid && canSend ? "bg-green-600 text-white hover:bg-green-700" : ""}`}
            >
              {ctx.booking
                ? "Booking…"
                : !canSend
                  ? `🔒 Book appointment — complete ${missingLabel}`
                  : depositPaid
                    ? "Book appointment"
                    : "🔒 Book appointment (payment required)"}
            </Button>
          ) : !ctx.confirmationSent ? (
            <Button
              onClick={ctx.onSendConfirmation}
              disabled={ctx.sendingConfirmation || ctx.booking}
              className="w-full bg-green-600 text-white hover:bg-green-700"
              aria-label="Review the confirmation text before it goes to the client"
            >
              {ctx.sendingConfirmation ? "Sending…" : "Review confirmation text"}
            </Button>
          ) : ctx.handoverSentAt ? (
            // Already sent: keep the record visible but let the rep reopen the
            // exact handover to review it or send it to another address.
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted-foreground">Handover sent ✓</p>
              <Button
                variant="outline"
                onClick={ctx.onSendHandover}
                disabled={ctx.sendingHandover}
                className="w-full"
                aria-label="View the handover that went out and resend it to another email"
              >
                {ctx.sendingHandover ? "Sending…" : "View / resend handover"}
              </Button>
            </div>
          ) : (
            <Button
              onClick={ctx.onSendHandover}
              disabled={!ctx.handoverReady || ctx.sendingHandover}
              className="w-full bg-green-600 text-white hover:bg-green-700"
              aria-label="Review and email the client handover to the firm"
              title={
                !ctx.handoverReady ? (ctx.handoverReason ?? "Notes still processing…") : undefined
              }
            >
              {ctx.sendingHandover
                ? "Sending…"
                : ctx.handoverReady
                  ? "Send handover to firm"
                  : `🔒 ${ctx.handoverReason ?? "Notes still processing…"}`}
            </Button>
          )}

          {ctx.lead.booking_date ? (
            <p className="text-[13px] text-muted-foreground">
              Booked: {ctx.lead.booking_date} at {ctx.lead.booking_time}
              {ctx.confirmationSent ? " · confirmation text sent ✓" : ""}
            </p>
          ) : null}
        </div>
      </div>

      {/* MUST DO'S */}
      <div className="rounded-xl border bg-card p-3 text-left">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            Only book if you have
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wide">Before you hang up</h3>
        </div>
        <div className="mt-2 space-y-1.5">
          {MUST_DOS.map((m) => (
            <label key={m.key} className="flex cursor-pointer items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={Boolean(ticked[m.key])}
                onChange={(e) =>
                  setTicked((prev: Record<string, boolean>) => ({
                    ...prev,
                    [m.key]: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                <span className="font-medium">{m.title}</span>{" "}
                <span className="text-muted-foreground">— {m.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {ctx.isAdmin ? (
        <div className="rounded-xl border border-dashed p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Admin testing
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={ctx.onResetDeposit}
              aria-label="Reset the Square payment and handover for this lead"
            >
              Reset payment & handover
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={ctx.onMarkDepositPaid}
              aria-label="Force this lead to payment confirmed"
            >
              Force payment confirmed
            </Button>
          </div>
        </div>
      ) : null}
    </StepShell>
  );
}

export const STEPS = [
  { key: "mindset", label: "Mindset", icon: Brain, render: () => <Step1 /> },
  {
    key: "opening",
    label: "Opening",
    icon: PhoneOutgoing,
    render: (ctx: StepContext) => <Step2 ctx={ctx} />,
  },
  {
    key: "discovery",
    label: "Discovery",
    icon: Search,
    render: (ctx: StepContext) => <Step3 ctx={ctx} />,
  },
  {
    key: "amplify",
    label: "Amplify",
    icon: Eye,
    render: (ctx: StepContext) => <AmplifyStep ctx={ctx} />,
  },
  { key: "education", label: "Education", icon: BookOpen, render: () => <EducationStep /> },
  {
    key: "picture",
    label: "Audiobook",
    icon: Eye,
    render: (ctx: StepContext) => <AudiobookStep ctx={ctx} />,
  },
  { key: "commitment", label: "Commitment", icon: HandshakeIcon, render: () => <CommitmentStep /> },
  { key: "price", label: "Price", icon: Award, render: () => <PriceStep /> },
  {
    key: "book",
    label: "Book",
    icon: CalendarCheck,
    render: (ctx: StepContext) => <BookStep ctx={ctx} />,
  },
  {
    key: "funding",
    label: "Funding",
    icon: Wallet,
    render: (ctx: StepContext) => <FundingStep ctx={ctx} />,
  },
] as const;
