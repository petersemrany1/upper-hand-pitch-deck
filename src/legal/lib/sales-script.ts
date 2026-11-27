// Ported from the Legal app (family-law-floater/src/lib/sales-script.ts). Re-run the port script to refresh.
// The live Sales Call script, word for word, as data. The Training Journey reads it from
// here so training can never drift from what reps see on the call screen.
// tests/sales-script.test.ts fails the build if any line here stops matching the cockpit
// (src/components/sales-call/steps.tsx and discovery.tsx). Change the wording in the
// cockpit and here together.
//
// Placeholders in [square brackets] are filled with the client's own details on the call.

/** Cockpit step order (STEPS keys in steps.tsx). `picture` is the Audiobook step. */
export const STEP_ORDER = [
  "mindset",
  "opening",
  "discovery",
  "amplify",
  "education",
  "picture",
  "commitment",
  "price",
  "book",
  "funding",
] as const;
export type StepKey = (typeof STEP_ORDER)[number];

/** Eyebrow and heading exactly as the cockpit shows them, plus the short rail label. */
export const STEP_TITLES: Record<StepKey, { eyebrow: string; heading: string; label: string }> = {
  mindset: { eyebrow: "Step 1", heading: "Changing Lives", label: "Mindset" },
  opening: { eyebrow: "Step 2 — Opening", heading: "The Opening", label: "Opening" },
  discovery: {
    eyebrow: "Step 3 — Discovery",
    heading: "Understand Their Situation (5–10 mins)",
    label: "Discovery",
  },
  amplify: { eyebrow: "Step 4 — Amplification", heading: "Summarise Back", label: "Amplify" },
  education: {
    eyebrow: "Step 5 — Education",
    heading: "How It Actually Gets Fixed",
    label: "Education",
  },
  picture: {
    eyebrow: "Step 6 — Paint The Audiobook",
    heading: "Paint The Audiobook",
    label: "Audiobook",
  },
  commitment: { eyebrow: "Step 7 — Commitment", heading: "The Commitment", label: "Commitment" },
  price: {
    eyebrow: "Step 8 — Price & Sell the Specialist",
    heading: "Present Price",
    label: "Price",
  },
  book: { eyebrow: "Step 9 — Deposit & Book", heading: "Lock It In", label: "Book" },
  funding: {
    eyebrow: "Step 10 — Funding & Final Checks",
    heading: "How They'll Fund It",
    label: "Funding",
  },
};

export const MINDSET = {
  paragraphs: [
    "This person enquired because something snapped. Maybe the ex's lawyer letter landed. Maybe another mortgage payment went out of their account alone. Maybe they watched their kid go quiet at handover again. They didn't fill in that form by accident.",
    "My job isn't to sell them. My job is to care enough to have an honest conversation — find out what's really going on, and show them there's a way through the mess. Nobody has ever explained how this actually works to them. I get to be the first.",
    "If I do my job right, they leave this call with a plan and a date. If I don't, they hang up and go back to waiting — and a year from now they're still paying for everything, still stuck in the same limbo, and the clock is still running.",
  ],
  close: "Pick up the phone. Be curious. Be present. This call matters.",
};

export const OPENING = {
  say: "Hi [first name], it's [rep name] from Legal Group, how are you? … I saw your Facebook enquiry come through about your situation, and I wanted to make sure I called you straight away — if I don't call you now I won't be able to call you back later, it's been so busy in the firm today. So [first name], where are things up to?",
  callMeBack:
    "That's not a problem at all — I know you weren't expecting my call. Have you got just one minute now, just to see if it even makes sense for me to call you back later?",
  callMeBackCoach: "One-minute calls become ten-minute calls. Just get them talking.",
  guardedWhen: "If they're whispering or giving one-word answers, the ex may be nearby:",
  guardedSay:
    "No stress — sounds like now might not be a private moment. When's a time today you can talk freely?",
  guardedThen: "lock the callback on the spot.",
};

export type DiscoveryRow = {
  noun?: string;
  say: string;
  coach?: string;
  ifYes?: string;
  tag?: string;
};

export const DISCOVERY = {
  opener: "So tell me what's going on — where are things at with you and your ex?",
  openerCoach: "Let them talk. Don't interrupt. Don't fill silence.",
  history: {
    noun: "Timeline",
    say: '"How long were you together?" then "And when did you actually separate?"',
    coach:
      'push for exact dates and numbers — you\'ll reuse them at Why Now and in the summary. "Separated 14 months" is gold.',
  },
  conflictCheck: {
    label: "required, do not book without it",
    say: "And [ex first name]'s full name? I run checks on our end before I place you with a firm — makes sure there's no crossover and the firm can act for you.",
    action: "→ type it into the Ex-partner field on the right NOW.",
  },
  otherSide: [
    {
      say: "Has [ex first name] got a lawyer yet, or spoken to one?",
      ifYes: "which firm, note it",
    },
    { say: "Is anything already signed or filed, or is it all still up in the air?" },
    { say: "Are you two still able to talk, or has it turned hostile?" },
  ] as DiscoveryRow[],
  mapCoach: "walk the whole asset pool in order, one item at a time:",
  map: [
    {
      noun: "The house",
      say: "Who's living in it now? Whose name is it in? Roughly what's it worth, and what's owing on it?",
    },
    { noun: "Other property", say: "Any investment properties, land, anything else?" },
    {
      noun: "Super",
      say: "Rough super balances — yours and theirs?",
      coach: "most people forget super counts — note if they're surprised",
    },
    {
      noun: "Personal savings",
      say: "Roughly how much do you personally have in savings that you can access today?",
      coach: "Enter the amount under Personal savings in the asset calculator.",
    },
    {
      noun: "Other assets",
      say: "Apart from those savings, what else do either of you have in savings, shares or vehicles?",
    },
    { noun: "Business", say: "Either of you own a business or work for yourselves?" },
    { noun: "Debts", say: "And what's owing — mortgage, cards, loans?" },
    {
      noun: "Kids",
      say: "How old are the kids? What's the arrangement at the moment — is that working?",
    },
  ] as DiscoveryRow[],
  deeperCoach: "Then six deeper questions, in this order:",
  deeper: [
    {
      say: "Of everything you've told me — what's the bit that's actually keeping you up at night?",
    },
    {
      say: "And what's the dream outcome of this for you — what are you hoping to achieve?",
      coach: "note their exact words — you'll reuse them word for word in the Audiobook step",
    },
    {
      say: "What do you reckon is holding it up — is it them dragging their feet, or have you just not had the right help yet?",
    },
    {
      say: "Have you spoken to any lawyers about this before? What did they say?",
      ifYes: '"What stopped you going ahead with them?"',
    },
    {
      noun: "Why now?",
      say: "So you've been separated [use their exact number] months — what's made you look into it now? Why now do you think?",
      ifYes:
        "\"That makes sense. I speak to people in this exact spot every day and everyone's different — but what is it specifically about YOUR situation that's made you say enough is enough?\"",
    },
    {
      noun: "Impact — ask these as three SEPARATE questions, not one",
      say: "Day to day, how much headspace is this taking up?",
      tag: "Wait for answer",
    },
    {
      say: "Money-wise right now — who's covering the mortgage and bills while this sits unresolved?",
      tag: "Wait for answer",
    },
    { say: "And the kids — how much of this are they picking up on?", tag: "Wait for answer" },
  ] as DiscoveryRow[],
};

export const AMPLIFY = {
  say: "So let me make sure I've got this right... You separated [their number] months ago, there's the house at [suburb], super, [other assets], the kids are [ages], and nothing's moved because [their reason]. Meanwhile you're covering [what they're paying] and lying awake over [their words]. Is that right?",
  coach: "Get them to say yes. That yes is your bridge to education.",
};

export type EducationChapter = {
  title: string;
  say: string[];
  wow?: string;
  steps?: { title: string; detail: string }[];
  outcomes?: { title: string; detail: string }[];
  labelled?: { label: string; say: string }[];
  pause?: string;
};

export const EDUCATION: { chapters: EducationChapter[] } = {
  chapters: [
    {
      title: "Week One — The Strategy Session",
      say: [
        "First thing that happens: you sit down with a specialist — not a suburban generalist who does wills on Monday and traffic fines on Tuesday, a family lawyer who does settlements every day. They map your whole pool and tell you where you actually stand before you've spent a cent.",
      ],
    },
    {
      title: "The Cards Go On The Table — Full Disclosure",
      say: [
        "Then both sides are legally forced to show everything — bank statements, super, business books, the lot. It's called the duty of disclosure.",
      ],
      wow: "Hiding assets breaks the law, and the court has real consequences for it — and good firms know exactly where to look.",
    },
    {
      title: "How the split actually gets worked out",
      say: [
        "Here's the thing almost nobody knows — there's no automatic 50/50 in Australia. That's a myth. The law sets out four steps, and the lawyers use the same steps when they negotiate:",
        "Then there's how it actually gets sorted: both sides swap their financial documents, the lawyers negotiate and make offers, and very often there's a mediation — a neutral person helping you both land a deal. If you agree, the lawyer turns it into consent orders or a binding financial agreement, so it's final. Only if you can't agree does a judge decide — and that's slower and more expensive, which is why most people settle first.",
      ],
      steps: [
        {
          title: "Put everything on the table",
          detail: "Everything you both own and owe, even things in only one name, even the super.",
        },
        {
          title: "What each of you put in",
          detail:
            "The money, yes — but raising the kids and running the home count as contributions too.",
        },
        {
          title: "What each of you needs from here",
          detail: "Age, health, earning capacity, who's looking after the kids.",
        },
        {
          title: "Is the overall result fair?",
          detail: 'The law\'s last check: the outcome has to be "just and equitable".',
        },
      ],
      outcomes: [
        {
          title: "They agree → Consent orders",
          detail:
            "The deal is written up as consent orders and approved by the court — usually on the papers, with no one in a courtroom. It has the same force as an order made after a hearing. And transfers done under consent orders or a binding financial agreement can get stamp duty relief — the lawyer confirms how that works for you.",
        },
        {
          title: "They can't agree → Court",
          detail:
            "If they won't engage, drag their feet, or it turns hostile, it can end up in court, where a judge decides. That's slower and more expensive — which is exactly why the funding conversation comes next.",
        },
      ],
    },
    {
      title: "Then — Funding",
      labelled: [
        {
          label: "The trap",
          say: "So here's what happens to most people. They've got a house, they've got super, maybe a business. On paper they're worth a couple of million. But there's no cash. And often one person has had more control of the money. So they either don't get a lawyer, or they get a cheap one, or they take the first offer put in front of them just to make it stop.",
        },
        {
          label: "Beat 2 — The reveal",
          say: "Which is why there's a whole industry most people have never heard of. There are lenders in Australia who specialise in funding family law legal fees. They pay your lawyer's bills as you go, and you pay them back out of your settlement at the end. There's a cost to it — the lawyer walks you through the numbers.",
        },
      ],
      pause: "Pause. Let them sit in it.",
      say: [],
    },
  ],
};

export const AUDIOBOOK = {
  pivot:
    "Look, I could talk about the legal side all day — but what it really comes down to is this...",
  formula:
    "Imagine waking up [timeframe] from now... [use their exact words from discovery] ... the orders are stamped, [their dream outcome — the house sorted, the kids settled, their name off the mortgage]. How would that actually feel?",
  stop: "Then stop. Don't speak. The silence is working for you. Wait for them to respond.",
};

export const COMMITMENT = {
  ask: "Based on all of that, is it something you wanna get sorted now? Where are you at with all of this?",
  wait: "Wait for their answer — let them tell you where they're at.",
  onYes: [
    "Excellent, I really want to book you in with [lawyer name], because based on what you told me about [link to their specific situation] I think they would be perfect for you.",
    "They also [drop 3 key selling points] — and that's why I wouldn't want you seeing anyone else.",
  ],
  never: [
    { phrases: ["would you like to book"], why: "that gives them a yes/no exit" },
    { phrases: ["do you want to think about it"], why: "you just lost them" },
    { phrases: ["no pressure", "no rush"], why: "you're handing them the off-ramp" },
  ],
};

/** "NEVER say "x" or "y" — why", as one line. */
export function neverLine(n: { phrases: string[]; why: string }): string {
  return `NEVER say ${n.phrases.map((p) => `"${p}"`).join(" or ")} — ${n.why}`;
}

export const PRICE_JOURNEY: { type: "say" | "do"; text: string }[] = [
  {
    type: "say",
    text: "That first consultation, they do the lot, we go through your whole situation, map the full asset pool — house, super, everything — and you walk out with an actual strategy: where you stand, what the split likely looks like, and your exact next steps. All in one sit-down.",
  },
  { type: "say", text: "Normally this consult is $695..." },
  {
    type: "say",
    text: "...we do have some complimentary spots available sometimes, let me just have a look and see if I can find any free ones.",
  },
  {
    type: "say",
    text: "Who's making this call with you? If there's someone else in it, let's find a time you can both come in.",
  },
  { type: "do", text: "Agree on a time, give 2 options." },
  {
    type: "say",
    text: "...there is just a $75 holding fee to secure your spot, which is fully refunded when you arrive...",
  },
  {
    type: "say",
    text: "...we do this because we turn people away for these slots. Does that sound fair?",
  },
  {
    type: "do",
    text: "Ask for their card details if they sound older, otherwise send them a link.",
  },
];

export const FUNDING_WAYS = ["Savings/cash", "Family/friends help", "Litigation funding"] as const;

/** The "Only book if you have — Before you hang up" checklist on the Book step. */
export const MUST_DOS: { key: string; title: string; detail: string }[] = [
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
  { key: "conflict", title: "Other side's full name captured", detail: "for the conflict check." },
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
];

/** The 11 objection chips in the call screen's right panel (OBJECTIONS in src/lib/sales-call.ts). */
export const OBJECTION_CHIPS = [
  "Call me back",
  "Email me",
  "Not interested",
  "Already have a lawyer",
  "Trying to sort it ourselves",
  "Worried about cost",
  "Not ready yet",
  "Scared of making it worse",
  "Think about it",
  "No time",
  "Who are you",
] as const;

/** The litigation-funding eligibility questions on the Funding step, in order. */
export const ELIGIBILITY_QUESTIONS = [
  "Are you an Australian citizen or permanent resident?",
  "Are you currently bankrupt?",
  "Have you and your ex separated?",
  "Is there property in Australia?",
  "Whose names are on the title, and does anyone else own a share?",
  "If you got funding for your legal fees, where would the money to pay it back come from?",
  "What are your Australian properties worth after debts?",
  "Is there a business, or any money sitting with a lawyer?",
  "If you were married, was your divorce final over a year ago? If you were de facto, did you separate over two years ago?",
] as const;

export const ELIGIBILITY_VERDICTS = [
  "Funding looks likely",
  "A smaller loan may be possible",
  "Funding is unclear",
  "Funding looks unlikely",
  "Questions still to answer",
] as const;

export const LIKELY_DENIED_BANNER = "Funding looks unlikely. You can still book the appointment.";

/**
 * What to say when the client raises each objection button (approved by Peter, 10 Oct 2026).
 * Tapping a button on the call screen shows its card; Module 5 teaches the same cards.
 */
export const OBJECTION_CARDS: { chip: string; say: string[]; never: string }[] = [
  {
    chip: "Call me back",
    say: [OPENING.callMeBack],
    never: 'Accept a vague "later". If their voice is guarded, use the Guarded voice line instead.',
  },
  {
    chip: "Email me",
    say: [
      "Yeah absolutely — I know you weren't expecting my call. Have you got just one minute now, just to see if it even makes sense for me to send you anything at all?",
    ],
    never: "Send anything revealing to an inbox or phone the ex might see.",
  },
  {
    chip: "Not interested",
    say: [
      "Yeah that's completely fair — and I'm not here to push anything. I'm just curious, what made you look into it in the first place? Because usually when someone fills in a form there's something going on.",
    ],
    never: "Argue.",
  },
  {
    chip: "Already have a lawyer",
    say: [
      "Oh good — it's great you've got someone. Have you actually signed them up and they're working on it, or have you just had a chat with one so far?",
      'If they only had a chat: "What stopped you going ahead with them?" If they\'re signed up and happy, thank them and wish them well.',
    ],
    never: "Bag the other lawyer or firm.",
  },
  {
    chip: "Trying to sort it ourselves",
    say: [
      "You said you two have already worked it out between yourselves — that's genuinely a good position. There's just one trap in it.",
      'Then use the "We already agreed between us" play in Linking Education.',
    ],
    never: "Tell them their deal is bad; quote duty or tax figures.",
  },
  {
    chip: "Worried about cost",
    say: [
      "Totally fair — it's the number one thing people worry about.",
      "The first consult is free, you'll know the lawyer's hourly rate before you go in, and there are three ways people fund this — savings, family helping, or litigation funding, where a funder pays the lawyer now and gets paid back out of the settlement. The lawyer maps the likely cost for your matter at the consult.",
    ],
    never: "Quote what the whole matter will cost; promise funding.",
  },
  {
    chip: "Not ready yet",
    say: [
      "Totally fair — is it more that it's all still really raw, or more that you're not sure what the right next step is?",
      "If it's raw: the consult is just finding out where they stand — nothing happens that they don't decide.",
    ],
    never: "Rule on deadlines; push someone who is falling apart.",
  },
  {
    chip: "Scared of making it worse",
    say: [
      "Getting advice and starting a fight are two completely different things. The consult doesn't notify anyone, doesn't file anything, doesn't start anything — it just tells you where you stand.",
    ],
    never: "Guarantee it won't end up in court.",
  },
  {
    chip: "Think about it",
    say: [
      "Yeah of course, absolutely — what part of it do you want to think through? Is it the cost, how the process works, or something else? Because I might actually be able to help you with that right now.",
    ],
    never: 'Say "do you want to think about it" yourself.',
  },
  {
    chip: "No time",
    say: [
      "Totally get it — is it that you're flat out right now, or is it more that you're not sure this is the right move for you? Because if it's timing I can call you at an exact time that works.",
    ],
    never: 'Accept a vague "later".',
  },
  {
    chip: "Who are you",
    say: [
      "Great question — we're Legal Group, a network of family lawyers. My job is to understand where you're at and get you in front of the right lawyer for your situation. For you that's [lawyer] at [firm], because of what you told me about [their words].",
    ],
    never: "Say you're a lawyer yourself; give legal advice.",
  },
];
