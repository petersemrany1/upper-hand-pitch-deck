// Ported from the Legal app (family-law-floater/src/lib/training/sales-framework.ts). Re-run the port script to refresh.
// Module 5 — Sales Framework: The Hill → The Beats → The Drill.
// The coaching (job, key moves, move on when, never, the tell) lives here. "Say it like this"
// lines are read from src/lib/sales-script.ts, which is tested against the live call screen.
// Lines quoted in this file are only (a) approved lines from the final Module 1 and 2 videos
// (docs/training/scripts/module-1*.md, module-2*.md), word for word; (b) coaching examples and
// the objection loop, which must teach what those videos teach; and (c) the held lines
// (HELD_LINES), which training leaves out of a live line until Peter decides. Where one differs
// from the call screen, that's deliberate, not drift — check the videos before changing it.

import {
  COMMITMENT,
  EDUCATION,
  ELIGIBILITY_QUESTIONS,
  MUST_DOS,
  neverLine,
  OPENING,
  PRICE_JOURNEY,
  STEP_ORDER,
  STEP_TITLES,
  type StepKey,
} from "@/legal/lib/sales-script";

export type Band = "mind" | "climb" | "peak" | "paper";

export type SalesBeat = {
  id: StepKey;
  /** Full name used on beat and drill cards. */
  name: string;
  band: Band;
  tag: string;
  job: string;
  moves: string[];
  moveOn: string;
  never: string;
  tell: string;
  notes?: string[];
};

/** Who qualifies — Peter, 10 Oct 2026 (Bold Marketing agreement cl. 5.1). Wording from plan fix L28: video 2c beat 10's rule, plus "in either name" and "to pay for it". */
export const QUALIFYING_RULE =
  "Book only if the Asset Pool — everything the two of them own, super included and in either name, minus everything they owe — is at least $750,000, or it's a parenting-only matter and they have at least $50,000 of their own savings to pay for it.";

// ---- Held lines ----------------------------------------------------------------------
// Live call-screen wording that training leaves out until Peter decides. Each one is a
// no-op once the live line changes, so nothing here goes stale.

export const HELD_LINES = {
  /** Linking play 13 ("Scared ex finds out"): held (C13); Peter, 11 Oct 2026: never promise completely private. */
  privacy: {
    chip: "Scared ex finds out",
    sentence: "This call and the consult are completely private and confidential.",
    onScreen:
      'On the call screen this play still opens "This call and the consult are completely private and confidential." Never say that sentence — start at "Speaking to a lawyer…".',
    note: 'Never promise it\'s completely private or confidential. Only if they ask whether the call is recorded: "Yes, calls are recorded so we get your details right for the lawyer."',
  },
  /** PRICE_JOURNEY[0]: "what the split likely looks like" is open (Q61 / P14). */
  split: {
    phrase: "what the split likely looks like, and your exact next steps",
    say: "what your options are and your next steps",
    note: 'On the call screen this line still says "what the split likely looks like". Leave that phrase out until Peter decides — say "where you stand, what your options are and your next steps".',
  },
} as const;

/** A Linking play's "say this", without the held privacy sentence — or any reworded sentence
 *  that promises the call or consult is completely private or confidential. */
export function trainingPlayText(sayThis: string): string {
  return sayThis
    .replace(/\s*[^.!?\s][^.!?]*\bcompletely (?:private|confidential)\b[^.!?]*[.!?]/gi, "")
    .trim();
}

/** A price-journey line, without the held "split" phrase. */
export function trainingPriceText(text: string): string {
  return text.replace(HELD_LINES.split.phrase, HELD_LINES.split.say);
}

/** The live "Worried about cost" card offers litigation funding with no property-only limit
 *  (plan M17; call-screen change proposed). A no-op once the card says "for property matters". */
const COST_CARD_NOTE =
  "Say the three ways as the videos do: \"savings, family helping out, or, for property matters, litigation funding\". Litigation funding can't cover parenting-only matters, and there's a cost to it.";

/** A training note to show under an objection card, or null. */
export function objectionCardNote(c: { chip: string; say: readonly string[] }): string | null {
  return c.chip === "Worried about cost" && !c.say.some((s) => s.includes("for property matters"))
    ? COST_CARD_NOTE
    : null;
}

/** How reps describe the lawyer (ASCR r 36.2; the badge is on the lawyer card in the right panel). */
export const SPECIALIST_RULE =
  'Say "accredited family law specialist" only when the Accredited specialist badge is on their lawyer card. Otherwise: "a family lawyer who does settlements every day".';

/** Education chapter 1 on the call screen still calls every lawyer "a specialist" (cockpit change proposed). */
const CHAPTER_ONE_SAYS_SPECIALIST =
  EDUCATION.chapters[0]?.say.some((s) => s.includes("a specialist")) ?? false;

const BEATS: Record<StepKey, Omit<SalesBeat, "id">> = {
  mindset: {
    name: "Mindset",
    band: "mind",
    tag: "Always on",
    job: "Get your head right before you dial.",
    moves: [
      "I'm here to help, not to sell — they enquired, I'm following up.",
      "Nobody has ever explained how this works to them — I get to be the first.",
      "Leaving them waiting is the failure — a year from now they're still paying for everything.",
      "Most objections are reflexes — I don't take them personally and I don't accept the first one. But \"I can't talk freely\", real distress, or a genuine not-a-fit isn't a reflex — that's a reason to stop.",
      "I'm the calm one — slow, warm, certain. An advisor, not a lawyer.",
    ],
    moveOn:
      "You're calm and certain — press Start. Then carry it into every call (the call screen only shows it for the first lead).",
    never: "Dial scared. Treat an easy brush-off callback as a win.",
    tell: "Calm, certain, unbothered by the brush-off.",
  },
  opening: {
    name: "Opening",
    band: "climb",
    tag: "Act 1 · beat 1",
    job: "Buy time. Don't get hung up on.",
    moves: [
      "Name → who you are → how are you? (pause) → their enquiry → why you're calling now → open question.",
      'The pause after "how are you?" earns an automatic "good" and proves you\'re not spam.',
      '"Where are things up to?" — then stop and let them talk.',
      '"Call me back"? Ask for one minute now. One-minute calls become ten-minute calls.',
      "Whispering or one-word answers means the ex may be nearby: use the Guarded voice line and lock a callback on the spot. It isn't an objection — don't push on.",
    ],
    moveOn: "They engage, or confirm the enquiry — and they can talk freely.",
    never:
      "Bulldoze it as one robotic sentence; accept a vague \"call me later\"; push on when they can't talk freely, or ask if the ex is in the room; say you're a lawyer.",
    tell: "Talking within 20 seconds, no sell-feel.",
  },
  discovery: {
    name: "Discovery",
    band: "climb",
    tag: "Act 1 · beat 2",
    job: "Get them talking. Facts → feelings. Get the WHY NOW.",
    moves: [
      'History first: how long together, and when they actually separated. "Separated 14 months" is gold.',
      "Then ask four more: married or de facto? Divorced, and when did it become final? Still under one roof? Which state? Write the dates down — never rule on any of it.",
      "Conflict check — required: get the other side's full name and type it into the Ex-partner field straight away. Never book both sides with the same firm, or with the firm where the ex's lawyer works.",
      "The other side: have they got a lawyer (if yes, which firm — note it), is anything signed or filed, can they still talk?",
      "Walk through the house, other property and super. Ask how much the caller can access in personal savings and record it separately. Then cover other savings, investments, vehicles, business, debts and kids. Rough numbers are fine.",
      "Write the matter type in the notes: property, property + parenting, or parenting-only. There's no box for it, and it decides which booking rule applies.",
      "Go deeper, in order: what's keeping them up at night → the dream outcome (note their exact words) → what's holding it up → lawyers before → WHY NOW → the impact, as three separate questions.",
      "Tie the why-now to their timeline: \"You've been separated 14 months — what's made you look into it now?\"",
      "A surface answer is the start of the why-now, not the why-now. Dig once more for the specific trigger (unless they've just told you something frightening or painful — then don't).",
      "Echo their words back and dig in — never a checklist.",
    ],
    moveOn:
      "You've got the timeline, the other side's full name, the Map and the matter type, the why-now, the impact, and their dream outcome in their own words.",
    never:
      'Run a checklist ("okay, gotcha"); ask yes/no questions; give the price; offer any view on what they\'ll get; work out a deadline, or say whether they count as separated, de facto or out of time; dig for abuse details; say "hiding"; press the why-now after a safety or distress cue — acknowledge it and move on gently.',
    tell: "Client talks 70%+ and you've captured a specific why-now in their words.",
    notes: [
      `The Map is also your qualifying check. ${QUALIFYING_RULE} Add it up quietly from your Map notes — the screen won't do it for you. Never do it out loud, never ask them to do the sum, and never tell them a pool figure. Near the booking bar, or no rule fits? Flag it to Peter before you book.`,
      "Urgent? Anything filed or a court date, a reply date on a letter or offer, property about to be sold or refinanced, money being moved or debts run up, a child about to be taken overseas, a time limit that might be near. Stay calm: offer two times, soonest first (too far off? + Choose another time), write the exact date in your notes, and tell them the lawyer will look at it first. Could it happen before the firm's next slot? Tell Peter straight away. Never tell them what to do about it, and never use a date to scare them.",
      'Something frightening or painful? Never dig for the details. Say: "That sounds really hard. That\'s something to tell the lawyer, privately." Then move on gently, and don\'t press the why-now. Use their words — "controlling" stays "controlling". Never coach them to hide or move money or assets.',
    ],
  },
  amplify: {
    name: "Amplify",
    band: "climb",
    tag: "Act 1 · beat 3",
    job: "Feed it all back in ONE sentence.",
    moves: [
      "One concentrated sentence, not a paragraph.",
      "Only their facts, their numbers, their words.",
      "If the call screen drafts a summary from your notes, read it and fix it to their words.",
      'End on "Is that right?" and wait for the yes.',
    ],
    moveOn: 'A clear "yes, that\'s right."',
    never:
      'Invent pain they didn\'t give you; add a figure or a split they never said; ramble; rush past "Is that right?"',
    tell: 'They go quiet or say "yeah… exactly" — they feel heard, not pitched.',
    notes: [
      'Why "never add a figure": in October 2026 a rep floated a hypothetical "50% split" and the handover told the firm it was what the client wanted.',
    ],
  },
  education: {
    name: "Education",
    band: "climb",
    tag: "Act 1 · beat 4",
    job: "Show them how it actually gets fixed. Link it to what they told you. Never advise.",
    moves: [
      "Four chapters, in order: the strategy session → full disclosure → how the split actually gets worked out → funding.",
      ...(CHAPTER_ONE_SAYS_SPECIALIST
        ? [`Chapter 1 on the call screen still says "a specialist". ${SPECIALIST_RULE}`]
        : []),
      "Chapter 4: say the trap, pause and let them sit in it, then the reveal.",
      'Linking Education: tap what they told you, open with their words, say the play, obey its "Never say".',
      "Everything here is general — the lawyer applies it to their case: \"That's a great question for the lawyer — it's exactly what the consult is for.\"",
    ],
    moveOn:
      "They can say back, in their own words, why getting proper advice now makes sense for them.",
    never:
      "Lecture; estimate their share, percentage or dollar outcome; float a split or a figure, even as an example; tell them whether a deadline has passed or whether they count as separated or de facto; value an asset or business; say an offer is good or bad; guarantee court either way, or say they will or won't have to mediate; promise funding; estimate the total cost; leak the price.",
    tell: '"So it\'s not automatically 50/50" or "so I could actually afford a proper lawyer" — the penny dropped, in their words.',
  },
  picture: {
    name: "Audiobook",
    band: "peak",
    tag: "The peak · the sigh",
    job: "Make them SEE life after this in one sentence — then STOP. This is the turning point of the call.",
    moves: [
      "Pivot off the legal talk: the picture lands because it's a turn away from the technical stuff.",
      "Use their why-now and their exact words — they wrote this script in Discovery.",
      'Use their timeframe and their words, as "imagine", never as a prediction.',
      "Specific and calm, never cheesy — and never a promised result.",
      "Then STOP. The silence is working for you.",
    ],
    moveOn:
      "You hear it — the exhale, the quiet \"yeah\", the voice change. That's the turning point: they've decided. Now do everything after it right.",
    never:
      'Speak into the silence; go abstract; promise an outcome ("you\'ll keep the house"); make the timeframe sound like a promise ("it\'ll all be done in twelve months").',
    tell: "The sigh.",
    notes: ["If they get emotional, sit with it. Silence is respect here, not a tactic."],
  },
  commitment: {
    name: "Commitment",
    band: "paper",
    tag: "Act 2 · beat 5",
    job: "Lock the yes with an open question — then presume the booking.",
    moves: [
      "Open question — let them tell you where they're at.",
      "On yes, instantly name the lawyer and link it to their situation.",
      "Take the 3 selling points from the lawyer card in the right panel.",
      SPECIALIST_RULE,
    ],
    moveOn: "They say they want it sorted.",
    never: COMMITMENT.never.map(neverLine).join(" · "),
    tell: "Treats the yes as done and rolls straight into the lawyer with no hesitation.",
    notes: [
      "The no-exit rule is for ordinary calls. Never push someone who is falling apart — if they can't talk freely, lock a callback at a time they choose.",
    ],
  },
  price: {
    name: "Price & Sell the Specialist",
    band: "paper",
    tag: "Act 2 · beat 6",
    job: "Frame the value, name the lawyer in THEIR words, walk the price journey, then stop.",
    moves: [
      "Exact order — do not skip.",
      "Agree the time before you mention the $75.",
      'Give two time options — never "when are you free?"',
      '"Who\'s making this call with you?" — someone like a parent or a new partner can come. Never the ex, and never steer anyone controlling into the consult.',
      'Always tell them the hourly rate before you book — it\'s on the lawyer card: "[name] charges $[rate] an hour plus GST, and the firm puts its costs in writing for you." Never a total.',
      'STOP after "Does that sound fair?"',
    ],
    moveOn: 'They accept ("yeah, that\'s fair").',
    never:
      'Fill the silence after "Does that sound fair?"; mention the $75 before a time is agreed; quote what the whole matter will cost; make up scarcity ("only one spot left"); say "specialist" unless the Accredited specialist badge is on their lawyer card.',
    tell: "The lawyer reason quotes their own words back; the rep goes silent and waits.",
  },
  book: {
    name: "Deposit & Book",
    band: "paper",
    tag: "Act 2 · beat 7",
    job: "Lock the date and take the $75 before they hang up.",
    moves: [
      "Fill Firm, Lawyer, Funding path, Other side's full name, In person or Zoom, Date and Time — the $75 link stays locked until they're all in.",
      'Before you send the $75 link, run "Only book if you have" — all five true, or don\'t book.',
      "In person or Zoom: some firms only see clients in person, some offer both. Check the firm card before you offer Zoom.",
      'Funding path: name all three ways people fund this — "savings, family helping out, or, for property matters, litigation funding" — then ask which fits them. Their form may already have set a path, so the link can unlock with no chip lit. Confirm it out loud, and tap the right chip.',
      'Take the $75 the way the screen says: send the link — or, if they sound older, take their card details. The screen checks Square every 10 seconds — wait for ✅ Payment confirmed, never "I\'ve paid".',
      "\"I'm driving\" or \"I don't have my card\"? Later means never — help them do it now (phone banking, pull over safely). Never ask anyone to pay while they're driving. Worried about who'll see the $75 payment? Don't push. Lock a callback at a time they choose, note it, and tell Peter.",
      "While they pay, go to Step 10: if it's litigation funding, run the eligibility questions.",
      "Payment confirmed → Book appointment → Review confirmation text → Send handover to firm.",
      'Before you press Send handover to firm, read every bullet. Only what they said, in their words — nothing you suggested (no figure or split you floated), nothing from the funding check, and "approx." on estimates. Fix anything that puts words in their mouth.',
    ],
    moveOn:
      "Payment confirmed, appointment booked, confirmation text sent, handover reviewed and sent.",
    never:
      "Let them off without a date — if you can't get one, book the follow-up call before they go · Book without the other side's full name (the system blocks it anyway).",
    tell: "Deposit taken and date confirmed in one breath, no wobble.",
    notes: [
      QUALIFYING_RULE,
      "Logging the call: Didn't Qualify — knocked back is only for people under the booking bar — it takes them out of the queue for good. Anyone else who isn't a fit? Ask Peter which outcome to log. Callbacks go in at an exact time. And bookings are only made on the Book step — never from the outcome menu, or the firm won't see it.",
    ],
  },
  funding: {
    name: "Funding & Final Checks",
    band: "paper",
    tag: "Act 2 · beat 8",
    job: "If it's litigation funding, run the eligibility check while they pay — internal only.",
    moves: [
      "You locked the path at Step 9. If it's litigation funding, run the questions on screen, in order.",
      "The screen adds up the funding pool from Q7 and Q8. Q7 needs one net figure: take worth, owing and other debts from the Map, and never ask the client to do the sum. The $750k booking pool isn't totalled on screen: add it from your Map notes, quietly, never out loud.",
      "Use the caller’s earlier answers where you have them. Check what they signed and what money they expect to receive.",
      "For every result below likely eligible, tell them they’ll need cash for any fees funding doesn’t cover. Record how much they could put towards fees separately from their accessible savings.",
      '"Likely denied" doesn\'t stop the booking.',
      "Parenting-only? Litigation funding can't cover parenting-only matters.",
      "Never tell them what the check says — the funder decides, never you. If they ask whether they'll be approved: \"It's their decision, not mine. I can't promise you'll be approved.\"",
      "Internal only — nothing from this check goes to the firm or the handover.",
    ],
    moveOn:
      "Record the funding result and, if it falls below likely eligible, ask about the cash backup.",
    never:
      'Promise funding or present a verdict as an approval — the funder decides; ask them to do maths; ask legal questions in legal language; call funding "approved", "free" or "no interest", or tell anyone to "get in first"; quote any funder\'s rate, cap or fee; help fill in an application.',
    tell: "Funding sounds normal and matter-of-fact — \"that's really common\" — and the client relaxes. You never sound like it's a done deal.",
    notes: [
      "$400k is the funding check's own bar, not the booking bar. Super, overseas property, cars and savings don't count in it.",
    ],
  },
};

/** Beats in the call screen's order. Reorder the cockpit and training follows. */
export const SALES_BEATS: SalesBeat[] = STEP_ORDER.map((id) => ({ id, ...BEATS[id] }));

export function beatPill(b: SalesBeat): string {
  return `${STEP_TITLES[b.id].eyebrow} · ${b.tag}`;
}

// ---- Funding check: what each question is for -------------------------------------

/** Keyed by the call screen's own question text, so a wording change there fails the typecheck. */
const FUNDING_QUESTION_PURPOSE: Record<(typeof ELIGIBILITY_QUESTIONS)[number], string> = {
  "Are you an Australian citizen or permanent resident?":
    "The funder's residency test. No, and not on the title of Australian property → likely denied. Never a reason not to book.",
  "Are you currently bankrupt?":
    "Currently bankrupt → likely denied, on its own. Discharged is usually fine. Funding only — never a reason not to book.",
  "Have you and your ex separated?":
    "Use the separation answer from Discovery. Ask what property paperwork they signed and what remains to divide, collect or reopen. A title transfer alone doesn’t settle the whole matter.",
  "Is there property in Australia?":
    "Only Australian property counts in the funding pool; overseas property is left out. No Australian property and nothing at Q8 → likely denied.",
  "Whose names are on the title, and does anyone else own a share?":
    "Record all title holders and whether someone outside the couple owns a share. Title affects the available funding route.",
  "If you got funding for your legal fees, where would the money to pay it back come from?":
    "If there’s a house, ask whether they plan to keep or sell it. Ask what money the caller expects, when it will come through and what they could use to repay a loan. Leave legal fees for the consultation unless the caller already has a lawyer’s estimate. If it depends on refinancing, ask whether the bank approved it in writing.",
  "What are your Australian properties worth after debts?":
    "One net figure: what the place is worth, minus what's owing, minus any other debts — Australian property only. Take the numbers from your Map; never ask the client to do the sum.",
  "Is there a business, or any money sitting with a lawyer?":
    "Adds a business value and any money held with a lawyer to the funding pool. It's there to save leads, not kill them — always ask it.",
  "If you were married, was your divorce final over a year ago? If you were de facto, did you separate over two years ago?":
    "The funder's time-limit screen. Internal only — never tell anyone they're out of time. Ask whether the case was filed in time or the court allowed it to proceed.",
};

/** The Funding step's questions in the call screen's order, each with what it's for. */
export const FUNDING_QUESTIONS = ELIGIBILITY_QUESTIONS.map((q) => ({
  q,
  purpose: FUNDING_QUESTION_PURPOSE[q],
}));

// ---- The Drill -------------------------------------------------------------------

export type DrillCard = { id: string; q: string; a: string };

/** Every drill card, with ids that stay stable across shuffles and reloads. */
export const DRILL_CARDS: DrillCard[] = (() => {
  const cards: DrillCard[] = [];
  const onCall = SALES_BEATS.filter((b) => b.band !== "mind");
  for (const b of SALES_BEATS) {
    const i = onCall.findIndex((x) => x.id === b.id);
    const next = i >= 0 ? onCall[i + 1] : undefined;
    if (next) {
      cards.push({
        id: `${b.id}:next`,
        q: `You've just finished ${b.name}. What's the next beat?`,
        a: next.name,
      });
    }
    cards.push({ id: `${b.id}:job`, q: `The one job of ${b.name}?`, a: b.job });
    cards.push({ id: `${b.id}:never`, q: `What must you never do during ${b.name}?`, a: b.never });
    cards.push({
      id: `${b.id}:moveon`,
      q: `What tells you it's time to leave ${b.name}?`,
      a: b.moveOn,
    });
  }
  cards.push({
    id: "fixed:sigh",
    q: "What is the sigh — and what is the win?",
    a: "The sigh is the turning point — they've decided. But the win is a qualified client walking into the firm, so everything after it still has to be done right: the hourly rate, the booking bar, the other side's full name, the $75, and checking the handover.",
  });
  cards.push({
    id: "fixed:must-haves",
    q: "What must be true before you book — no matter what?",
    a: `All five on "Only book if you have": ${MUST_DOS.map((m) => m.title).join("; ")}. All five, or don't book. The $75 link stays locked without the other side's full name, and Book appointment stays locked until ✅ Payment confirmed.`,
  });
  cards.push({
    id: "fixed:guarded",
    q: "They're whispering or giving one-word answers. What do you say?",
    a: `"${OPENING.guardedSay}" — ${OPENING.guardedThen}`,
  });
  cards.push({
    id: "fixed:price-journey",
    q: "Walk the price journey in order.",
    a: PRICE_JOURNEY.map((p) => trainingPriceText(p.text).replace(/^\.\.\.|\.\.\.$/g, "")).join(
      " → ",
    ),
  });
  cards.push({ id: "fixed:who-qualifies", q: "Who can you book?", a: QUALIFYING_RULE });
  cards.push({
    id: "fixed:urgency",
    q: "A letter from the other side's lawyer with a reply date — what do you do?",
    a: "Stay calm. Offer two times, soonest first (too far off? + Choose another time), write the exact date in your notes, and tell them the lawyer will look at it first. Never say whether or how to reply. Could the date come before the firm's next slot? Tell Peter straight away.",
  });
  cards.push({
    id: "fixed:form-band",
    q: "The form says Under $1M. Do you still run the Map?",
    a: "Yes. The assets band is their own guess, super included — it never qualifies anyone or rules them out, and nor do blank money answers. The Map decides.",
  });
  cards.push({
    id: "fixed:parenting-only-funding",
    q: "A parenting-only client asks about litigation funding. What's true?",
    a: "Litigation funding can't cover parenting-only matters. To be booked, a parenting-only client needs at least $50,000 of their own savings.",
  });
  cards.push({
    id: "fixed:switching",
    q: "They've signed with a lawyer but want to switch. Do you book them?",
    a: "If they're a genuine fit, yes. Book them and flag it to the firm in your notes — whether that lawyer is current or finished, and why they want to switch, in their words. Never bag their lawyer.",
  });
  cards.push({
    id: "fixed:disclosure",
    q: "She says he's controlling and there's an AVO. What do you say?",
    a: '"That sounds really hard. That\'s something to tell the lawyer, privately." Then move on gently. Never dig for the details, keep her words ("controlling" stays "controlling"), don\'t press the why-now, and never advise on the AVO.',
  });
  return cards;
})();

export function shuffledDeck(): DrillCard[] {
  const deck = [...DRILL_CARDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

/**
 * When true, "I can run this — finish module ✓" stays off until every beat has been opened
 * and every Drill card revealed once. False puts back HTG's instant, self-attested finish.
 */
export const STRICT_FINISH = true;

// ---- Objections --------------------------------------------------------------------

export const OBJECTION_LOOP = {
  intro:
    'Same moves for "I\'ll think about it", "I need to talk to someone first", "send me something". Agree, never fight, never hand them an exit.',
  steps: [
    { title: "Agree.", say: "That's not a problem at all — I get it, it's a big decision." },
    {
      title: "Re-anchor to what they told you.",
      say: "But you said the thing that mattered was [their words]. Has that changed?",
    },
    {
      title: "Route to the free consult.",
      say: "The consult's free and you're not committing to anything — you're not signing up with the firm, and nothing gets filed or started. Does it make sense to at least find out where you stand, so you're not in the same spot next month, still wondering?",
    },
  ],
  footnote:
    "Only if they're genuinely unsure: \"Is this something you actually want?\" — and even then, steer to the consult. Never use that line at Commitment. If the answer is still no, don't book: lock an exact callback, or tell them honestly and kindly that it isn't the right fit. And never push someone who is falling apart.",
  guarded:
    "If they can't talk freely, it isn't an objection — use the Guarded voice line and lock a callback.",
};

/** What to say for each objection button — lives with the call script (shown on the call screen too). */
export { OBJECTION_CARDS } from "@/legal/lib/sales-script";
