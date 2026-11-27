// Ported from the Legal app (family-law-floater/src/lib/training/quiz-bank.server.ts). Re-run the port script to refresh.
// Module 7 — Knowledge Quiz bank. SERVER ONLY: the answer key never reaches the browser.
// Every question has exactly 4 options and exactly 1 correct one. `sourceRef` says which
// training text it tests; `objective` says what it checks. Neither is sent to reps.

export type QuizSection = "framework" | "product" | "skills" | "process";

export type QuizQuestion = {
  id: string;
  section: QuizSection;
  question: string;
  options: { id: string; text: string; correct: boolean }[];
  objective: string;
  sourceRef: string;
};

export const QUIZ_BANK: QuizQuestion[] = [
  // ---- framework ----
  {
    id: "FW-01",
    section: "framework",
    question: "What is the one job of the Opening?",
    options: [
      { id: "a", text: "Buy time and get them talking without getting hung up on", correct: true },
      {
        id: "b",
        text: "Get the other side's full name for the conflict check first",
        correct: false,
      },
      { id: "c", text: "Qualify them on the Asset Pool before you go any further", correct: false },
      { id: "d", text: "Lock in a date and take the $75 before they hang up", correct: false },
    ],
    objective:
      "The Opening's job is to buy time and not get hung up on (neighbouring stages' jobs as distractors).",
    sourceRef: "sales-framework.ts › opening.job; sales-script.ts › OPENING.callMeBackCoach",
  },
  {
    id: "FW-02",
    section: "framework",
    question: "Michelle says, “I'm a bit busy — can you call me back later?” What do you do?",
    options: [
      {
        id: "a",
        text: "Say no worries, and try her again at some point later in the week",
        correct: false,
      },
      {
        id: "b",
        text: "Ask for one minute now, to see if a call back even makes sense",
        correct: true,
      },
      {
        id: "c",
        text: "Offer to email her some information to read in her own time",
        correct: false,
      },
      {
        id: "d",
        text: "Apologise for the bad timing and end the call straight away",
        correct: false,
      },
    ],
    objective: "“Call me back”: ask for one minute now; never accept a vague “later”.",
    sourceRef:
      "sales-script.ts › OPENING.callMeBack; sales-framework.ts › opening.moves, opening.never",
  },
  {
    id: "FW-03",
    section: "framework",
    question: "A client separated 14 months ago. Which is the script's Why Now question?",
    options: [
      {
        id: "a",
        text: "“Why have you waited 14 months — what's stopped you doing anything till now?”",
        correct: false,
      },
      {
        id: "b",
        text: "“Are you ready to book a consult today, or are you still just researching?”",
        correct: false,
      },
      {
        id: "c",
        text: "“Has your ex got a lawyer yet, and do you know which firm they're with?”",
        correct: false,
      },
      {
        id: "d",
        text: "“So you've been separated 14 months — what's made you look into it now?”",
        correct: true,
      },
    ],
    objective:
      "The Why Now question uses their exact separation number and asks what made them act now.",
    sourceRef:
      "sales-script.ts › DISCOVERY.deeper “Why now?”; sales-framework.ts › discovery.moves",
  },
  {
    id: "FW-04",
    section: "framework",
    question: "Asked why now, Michelle says, “It's just been on my mind lately.” What next?",
    options: [
      {
        id: "a",
        text: "Take that as her why-now and move on to the impact questions",
        correct: false,
      },
      {
        id: "b",
        text: "Treat it as a sign she's not serious, and start wrapping up",
        correct: false,
      },
      { id: "c", text: "Dig once more for what's made her say enough is enough", correct: true },
      {
        id: "d",
        text: "Tell her most people feel that way, and move to the summary",
        correct: false,
      },
    ],
    objective:
      "A surface answer is the start of the why-now: dig once more for the specific trigger.",
    sourceRef:
      "sales-framework.ts › discovery.moves (“A surface answer…”); sales-script.ts › DISCOVERY.deeper Why now ifYes",
  },
  {
    id: "FW-05",
    section: "framework",
    question: "Which of these is a Discovery MISTAKE?",
    options: [
      {
        id: "a",
        text: "Pushing for exact dates, like when they actually separated",
        correct: false,
      },
      { id: "b", text: "Walking the Asset Pool one item at a time, in order", correct: false },
      { id: "c", text: "Asking the three impact questions one at a time", correct: false },
      { id: "d", text: "Saying “okay, gotcha” after each answer and moving on", correct: true },
    ],
    objective:
      "Reverse item: running a checklist is a Discovery never-do; the other three are taught moves.",
    sourceRef:
      "sales-framework.ts › discovery.never, discovery.moves; sales-script.ts › DISCOVERY.history, mapCoach, deeper",
  },
  {
    id: "FW-06",
    section: "framework",
    question:
      "At the $75 step, Mark says, “I'm driving — can I just pay it tonight?” What do you do?",
    options: [
      {
        id: "a",
        text: "Book the appointment now, and trust him to pay it tonight",
        correct: false,
      },
      {
        id: "b",
        text: "Later means never — help him find a safe way to pay it now",
        correct: true,
      },
      { id: "c", text: "Say no problem, and send the link for him to do later on", correct: false },
      {
        id: "d",
        text: "Waive the holding fee this time, since he's already said yes",
        correct: false,
      },
    ],
    objective:
      "Deposit & Book: “I'm driving” — later means never; help them pay now. No booking without the $75.",
    sourceRef: "sales-framework.ts › book.moves (“I'm driving”), DRILL fixed:must-haves",
  },
  {
    id: "FW-07",
    section: "framework",
    question: "At Commitment, Michelle says, “Yeah, I just want this sorted.” What now?",
    options: [
      {
        id: "a",
        text: "Instantly name the lawyer and link them to what she told you",
        correct: true,
      },
      {
        id: "b",
        text: "Ask if she'd like a bit more time to think it all over first",
        correct: false,
      },
      {
        id: "c",
        text: "Go back over the four steps so she's sure what happens next",
        correct: false,
      },
      { id: "d", text: "Tell her about the $75 holding fee before anything else", correct: false },
    ],
    objective:
      "On a yes at Commitment, instantly name the lawyer and tie them to the client's situation.",
    sourceRef:
      "sales-framework.ts › commitment.moves, commitment.tell; sales-script.ts › COMMITMENT.onYes",
  },
  {
    id: "FW-08",
    section: "framework",
    question: "When do you get the other side's full name?",
    options: [
      { id: "a", text: "At the very end, once the $75 payment shows as confirmed", correct: false },
      { id: "b", text: "Only if the ex has a lawyer — otherwise it isn't needed", correct: false },
      {
        id: "c",
        text: "In Discovery — typed into the Ex-partner field straight away",
        correct: true,
      },
      { id: "d", text: "After the booking, by text, so it doesn't feel awkward", correct: false },
    ],
    objective:
      "The conflict check happens in Discovery: get the full name and type it in straight away.",
    sourceRef:
      "sales-framework.ts › discovery.moves (Conflict check); sales-script.ts › DISCOVERY.conflictCheck",
  },
  {
    id: "FW-09",
    section: "framework",
    question: "Amplify is best described as:",
    options: [
      {
        id: "a",
        text: "Painting a picture of life once it's sorted, then going quiet",
        correct: false,
      },
      {
        id: "b",
        text: "Feeding it all back in one sentence, then “Is that right?”",
        correct: true,
      },
      {
        id: "c",
        text: "Explaining how the four-step process works, chapter by chapter",
        correct: false,
      },
      { id: "d", text: "Asking where they're at with getting it all sorted now", correct: false },
    ],
    objective:
      "Amplify's job: one sentence of their facts, ending “Is that right?” (Audiobook, Education, Commitment as distractors).",
    sourceRef: "sales-framework.ts › amplify.job, amplify.moves; sales-script.ts › AMPLIFY",
  },
  {
    id: "FW-10",
    section: "framework",
    question: "What goes into your Amplify summary?",
    options: [
      { id: "a", text: "A rough split, so they know what they're aiming for", correct: false },
      { id: "b", text: "The pain you think they're probably feeling deep down", correct: false },
      { id: "c", text: "The lawyer's name and three selling points from the card", correct: false },
      { id: "d", text: "Only their facts, their numbers and their own words", correct: true },
    ],
    objective:
      "Amplify uses only the client's facts and words; never add a figure, a split or invented pain.",
    sourceRef: "sales-framework.ts › amplify.moves, amplify.never, amplify.notes",
  },
  {
    id: "FW-11",
    section: "framework",
    question: "When are you ready to move on from Education?",
    options: [
      {
        id: "a",
        text: "They can say back, in their words, why advice now makes sense",
        correct: true,
      },
      {
        id: "b",
        text: "You've read all four chapters out, word for word, with no break",
        correct: false,
      },
      {
        id: "c",
        text: "They've told you what share of the pool they think they'll get",
        correct: false,
      },
      {
        id: "d",
        text: "They've agreed to pay the $75 holding fee to secure a spot",
        correct: false,
      },
    ],
    objective:
      "Education's move-on test: the client can say back why proper advice now makes sense for them.",
    sourceRef: "sales-framework.ts › education.moveOn, education.never",
  },
  {
    id: "FW-12",
    section: "framework",
    question: "What makes the Audiobook picture work?",
    options: [
      {
        id: "a",
        text: "A general picture anyone could relate to, so it feels familiar",
        correct: false,
      },
      {
        id: "b",
        text: "A promise of the result, like “you'll get to keep the house”",
        correct: false,
      },
      {
        id: "c",
        text: "Their why-now in their exact words — specific, calm, then stop",
        correct: true,
      },
      {
        id: "d",
        text: "Lots of legal detail, so they can tell you know the process",
        correct: false,
      },
    ],
    objective:
      "The Audiobook uses their why-now and exact words, stays specific and calm, then stops; never abstract, never a promised result.",
    sourceRef: "sales-framework.ts › picture.moves, picture.never; sales-script.ts › AUDIOBOOK",
  },
  {
    id: "FW-13",
    section: "framework",
    question: "When does the client actually decide?",
    options: [
      { id: "a", text: "When the $75 shows as Payment confirmed", correct: false },
      { id: "b", text: "When the handover is sent to the firm", correct: false },
      { id: "c", text: "When they agree to a time for the consult", correct: false },
      { id: "d", text: "At the Audiobook, when you hear the sigh", correct: true },
    ],
    objective:
      "The client decides at the Audiobook (the sigh). The win is still a qualified client walking into the firm, so every step after it has to be done right.",
    sourceRef:
      "sales-framework.ts › picture.job, picture.moveOn, DRILL fixed:sigh; module-1 script › beat 5; content plan M13",
  },
  {
    id: "FW-14",
    section: "framework",
    question: "At Commitment, which line should you NEVER say?",
    options: [
      { id: "a", text: "“Is it something you wanna get sorted now?”", correct: false },
      { id: "b", text: "“Would you like to book a time with them?”", correct: true },
      { id: "c", text: "“Where are you at with all of this?”", correct: false },
      { id: "d", text: "“I really want to book you in with [lawyer].”", correct: false },
    ],
    objective:
      "Reverse item: “would you like to book” is banned (a yes/no exit); the other three are real Commitment lines.",
    sourceRef:
      "sales-script.ts › COMMITMENT.never, COMMITMENT.ask, COMMITMENT.onYes; sales-framework.ts › commitment.never",
  },
  {
    id: "FW-15",
    section: "framework",
    question: "Once you've framed the consult, what's the order of the price journey?",
    options: [
      {
        id: "a",
        text: "$695 → free spots → who's in it with you → agree a time → $75 → “sound fair?”",
        correct: true,
      },
      {
        id: "b",
        text: "$695 → free spots → $75 → who's in it with you → agree a time → “sound fair?”",
        correct: false,
      },
      {
        id: "c",
        text: "Free spots → $695 → who's in it with you → agree a time → $75 → “sound fair?”",
        correct: false,
      },
      {
        id: "d",
        text: "$695 → who's in it with you → free spots → agree a time → “sound fair?” → $75",
        correct: false,
      },
    ],
    objective:
      "Sequence item: the price journey in order, with the time agreed before the $75 is mentioned.",
    sourceRef:
      "sales-script.ts › PRICE_JOURNEY; sales-framework.ts › price.moves, price.never, DRILL fixed:price-journey",
  },
  {
    id: "FW-16",
    section: "framework",
    question: "Which is the right order of the call after Mindset?",
    options: [
      {
        id: "a",
        text: "Opening, Discovery, Amplify, Education, Audiobook, Commitment, Price, Funding, Book",
        correct: false,
      },
      {
        id: "b",
        text: "Opening, Discovery, Education, Amplify, Audiobook, Commitment, Price, Book, Funding",
        correct: false,
      },
      {
        id: "c",
        text: "Opening, Discovery, Amplify, Education, Audiobook, Commitment, Price, Book, Funding",
        correct: true,
      },
      {
        id: "d",
        text: "Opening, Discovery, Amplify, Education, Commitment, Audiobook, Price, Book, Funding",
        correct: false,
      },
    ],
    objective:
      "Sequence item: the nine steps after Mindset in order — Book (Step 9) comes before Funding (Step 10).",
    sourceRef: "sales-script.ts › STEP_ORDER, STEP_TITLES; sales-framework.ts › SALES_BEATS",
  },
  // ---- product ----
  {
    id: "PR-01",
    section: "product",
    question: "Michelle says, “It's 50/50 anyway, isn't it?” What's the honest answer?",
    options: [
      {
        id: "a",
        text: "Yes — the law starts at 50/50, and the lawyers adjust it from there",
        correct: false,
      },
      {
        id: "b",
        text: "No — there's no automatic 50/50; a set legal process decides it",
        correct: true,
      },
      {
        id: "c",
        text: "It mostly comes down to whose name is on the title of the house",
        correct: false,
      },
      {
        id: "d",
        text: "Only if you both earned about the same while you were together",
        correct: false,
      },
    ],
    objective:
      "There's no automatic 50/50; a set legal process decides how property is divided. Title doesn't decide it.",
    sourceRef: "module-1 script › beat 13; read-along §3 “One process”",
  },
  {
    id: "PR-02",
    section: "product",
    question: "What are the four steps the law sets out for dividing property?",
    options: [
      {
        id: "a",
        text: "What each put in → all on the table → what each needs → is it fair?",
        correct: false,
      },
      {
        id: "b",
        text: "All on the table → split it 50/50 → what each needs → is it fair?",
        correct: false,
      },
      {
        id: "c",
        text: "All on the table → whose name it's in → what each needs → is it fair?",
        correct: false,
      },
      {
        id: "d",
        text: "All on the table → what each put in → what each needs → is it fair?",
        correct: true,
      },
    ],
    objective:
      "The four steps in order: everything on the table, contributions, future needs, is the overall result fair.",
    sourceRef: "module-1 script › beat 13; read-along §3 “One process” and How to say it",
  },
  {
    id: "PR-03",
    section: "product",
    question: "Michelle says, “I don't even know what my ex has got.” What do you tell her?",
    options: [
      {
        id: "a",
        text: "Both sides are legally required to put everything on the table",
        correct: true,
      },
      {
        id: "b",
        text: "Your ex has probably moved money somewhere you can't see it",
        correct: false,
      },
      {
        id: "c",
        text: "You can only claim what you can prove is already in the pool",
        correct: false,
      },
      {
        id: "d",
        text: "Only your side gets looked at, unless your ex agrees to show theirs",
        correct: false,
      },
    ],
    objective:
      "The duty of disclosure: both sides must put everything on the table; never accuse the ex.",
    sourceRef: "module-1 script › beat 14; read-along §5, §11",
  },
  {
    id: "PR-04",
    section: "product",
    question: "Mark says, “We've already agreed it all between us.” What's the honest answer?",
    options: [
      {
        id: "a",
        text: "Great — a deal you've both agreed to is legally binding from the day the two of you shake on it",
        correct: false,
      },
      {
        id: "b",
        text: "Your deal is probably unfair, so you'll need a lawyer to pull it apart and start again properly",
        correct: false,
      },
      {
        id: "c",
        text: "Good position — but a handshake isn't binding; consent orders or a binding financial agreement make it final",
        correct: true,
      },
      {
        id: "d",
        text: "Good — once your divorce goes through, the divorce order makes your agreed deal legally final as well",
        correct: false,
      },
    ],
    objective:
      "An agreement is a good position, but a handshake deal isn't binding; consent orders or a BFA make it final. Never call the deal bad.",
    sourceRef:
      "module-1 script › beat 19; read-along §6 “Versus a handshake deal”; sales-framework.ts › OBJECTION_CARDS “Trying to sort it ourselves”",
  },
  {
    id: "PR-05",
    section: "product",
    question: "What's the key difference between mediation and court?",
    options: [
      {
        id: "a",
        text: "In mediation, the mediator decides; in court, they decide together",
        correct: false,
      },
      {
        id: "b",
        text: "In mediation, they decide together; in court, a judge decides",
        correct: true,
      },
      {
        id: "c",
        text: "Mediation is only for parenting; court is only for property",
        correct: false,
      },
      {
        id: "d",
        text: "Mediation is a court hearing, just without any lawyers there",
        correct: false,
      },
    ],
    objective:
      "Mediation vs court: in mediation the couple decide (the mediator is neutral); in court a judge decides.",
    sourceRef: "module-1 script › beat 16; read-along §8 “Mediation”, “Court”",
  },
  {
    id: "PR-06",
    section: "product",
    question: "What are consent orders?",
    options: [
      {
        id: "a",
        text: "Their agreed deal, approved by the court — usually with no hearing",
        correct: true,
      },
      {
        id: "b",
        text: "A judge's decision, made after both sides have argued it out at a trial",
        correct: false,
      },
      {
        id: "c",
        text: "The first offer letter that comes from the other side's lawyer",
        correct: false,
      },
      {
        id: "d",
        text: "A private deal that either of them can change later if they like",
        correct: false,
      },
    ],
    objective:
      "Consent orders: the agreed deal approved by the court, usually on the papers with no hearing.",
    sourceRef:
      "module-1 script › beat 16; read-along §8 “Consent orders”, §16 plain-language terms",
  },
  {
    id: "PR-07",
    section: "product",
    question: "Michelle asks, “Our divorce was about a year ago — am I too late?” What do you do?",
    options: [
      {
        id: "a",
        text: "Tell her she's probably just missed it, but a lawyer might still be able to help",
        correct: false,
      },
      {
        id: "b",
        text: "Reassure her she's got plenty of time, so there's no rush at all",
        correct: false,
      },
      {
        id: "c",
        text: "Work out the exact date for her from when the divorce was granted",
        correct: false,
      },
      {
        id: "d",
        text: "Never rule on it — the lawyer confirms dates; it's a reason to book sooner",
        correct: true,
      },
    ],
    objective:
      "Time limits, rep-safe: never rule on a deadline either way; the lawyer confirms dates; a calm reason to book sooner.",
    sourceRef: "module-1 script › beat 17, beat 20; read-along §3 “One clock”, §12",
  },
  {
    id: "PR-08",
    section: "product",
    question: "Where does super fit in a property settlement?",
    options: [
      {
        id: "a",
        text: "It's kept out, unless both of them agree to put it in the pool",
        correct: false,
      },
      {
        id: "b",
        text: "It only counts once one of them has reached retirement age",
        correct: false,
      },
      {
        id: "c",
        text: "It's part of the pool, with everything else they own and owe",
        correct: true,
      },
      {
        id: "d",
        text: "It's split 50/50 straight away, outside the rest of the pool",
        correct: false,
      },
    ],
    objective: "Super is part of the property pool (and people often forget it counts).",
    sourceRef:
      "module-1 script › beat 13; read-along §3 “One pool”, §11; sales-script.ts › DISCOVERY.map Super coach",
  },
  {
    id: "PR-09",
    section: "product",
    question: "Michelle says, “His lawyer's letter says I'll get nothing.” What do you tell her?",
    options: [
      {
        id: "a",
        text: "A letter is a normal step — nothing's decided just because they moved first, and the outcome isn't up to one person",
        correct: true,
      },
      {
        id: "b",
        text: "A letter from his lawyer usually shows roughly how it'll all end up, so it's best to take what it says at face value",
        correct: false,
      },
      {
        id: "c",
        text: "His lawyer is probably only bluffing to scare you into a deal, so you can safely ignore the letter until after the consult",
        correct: false,
      },
      {
        id: "d",
        text: "Reply to it yourself today, so his lawyer can see you're serious and won't be pushed around",
        correct: false,
      },
    ],
    objective:
      "The other side's first move is normal: nothing is decided just because they moved first, and the outcome isn't up to one person. Never bag the other lawyer, and never say whether or how to reply.",
    sourceRef:
      "module-1 script › beat 16; module-2b script › beat 5 (“How long will it take?”); read-along §14; content plan L37",
  },
  {
    id: "PR-10",
    section: "product",
    question: "How does litigation funding work, as the training explains it?",
    options: [
      {
        id: "a",
        text: "The government pays the lawyer's fees, means-tested like Legal Aid",
        correct: false,
      },
      {
        id: "b",
        text: "The funder gives the client cash up front to spend however they like",
        correct: false,
      },
      {
        id: "c",
        text: "It's free — the other side pays the funder back once it's all been settled",
        correct: false,
      },
      {
        id: "d",
        text: "A funder pays the lawyer as they go, and is repaid from the settlement",
        correct: true,
      },
    ],
    objective:
      "Litigation funding as taught: the funder pays the lawyer as the matter runs and is repaid from the settlement; it has a cost.",
    sourceRef: "module-1 script › beat 19a; read-along §15",
  },
  {
    id: "PR-11",
    section: "product",
    question: "Mark asks, “So the funder will definitely cover me, yeah?” What do you say?",
    options: [
      {
        id: "a",
        text: "“With a pool your size it's as good as guaranteed — funders hardly ever say no.”",
        correct: false,
      },
      {
        id: "b",
        text: "“It's their decision, not mine. I can't promise you'll be approved.”",
        correct: true,
      },
      {
        id: "c",
        text: "“Get in before your ex does — once one side's been funded, the other side can't be.”",
        correct: false,
      },
      {
        id: "d",
        text: "“Yes — funding gets arranged for you automatically as soon as you're booked.”",
        correct: false,
      },
    ],
    objective:
      "The funder decides and funding is never promised: “It's their decision, not mine. I can't promise you'll be approved.” Either side can be funded, so never say “get in first”.",
    sourceRef:
      "module-2b script › beat 5 (“Will I get funding?”); module-2c script › beat 13; module-1 script › beat 19a; sales-framework.ts › funding.never; content plan M7",
  },
  {
    id: "PR-12",
    section: "product",
    question: "Who can you book?",
    options: [
      {
        id: "a",
        text: "Net equity of $400k+ between them, or any parenting-only matter at all",
        correct: false,
      },
      {
        id: "b",
        text: "Asset Pool of $750k+ in the client's name only — the ex's assets don't count",
        correct: false,
      },
      {
        id: "c",
        text: "Asset Pool of $750k+, or parenting-only with $50k+ of their own savings",
        correct: true,
      },
      {
        id: "d",
        text: "Anyone who owns property — parenting-only matters can't be booked",
        correct: false,
      },
    ],
    objective:
      "Who qualifies: Asset Pool $750k+ or parenting-only with $50k+ own savings; $400k is the funding check, not the booking bar.",
    sourceRef: "sales-framework.ts › QUALIFYING_RULE, discovery.notes; read-along §12",
  },
  {
    id: "PR-13",
    section: "product",
    question: "Mark asks, “Will the kids be 50/50?” What's the honest answer?",
    options: [
      {
        id: "a",
        text: "“Since the law changed, equal time is the starting point — the lawyer then adjusts it to suit how your family works.”",
        correct: false,
      },
      {
        id: "b",
        text: "“Usually the kids live mainly with their mum, and their dad has them every second weekend and half the school holidays.”",
        correct: false,
      },
      {
        id: "c",
        text: "“There's no automatic 50/50 for kids either — the law looks at what's best for the children, and safety comes first.”",
        correct: true,
      },
      {
        id: "d",
        text: "“Once the kids turn twelve, they get to choose where they live, so from then on it's really up to them.”",
        correct: false,
      },
    ],
    objective:
      "Kids: no automatic 50/50 — the law looks at what's best for the children, safety first. Never predict care arrangements.",
    sourceRef: "module-1b script › beat 7; competency checklist A18, D27; content plan §4.2 PR-13",
  },
  {
    id: "PR-14",
    section: "product",
    question:
      "Michelle says they've split up, but they're both still living in the house. What do you tell her?",
    options: [
      {
        id: "a",
        text: "She isn't legally separated until one of them actually moves out — so it's too early to book",
        correct: false,
      },
      {
        id: "b",
        text: "It only counts as a separation once the two of them have agreed the relationship is over",
        correct: false,
      },
      {
        id: "c",
        text: "People can be separated even under the same roof — whether, and from when, is for the lawyer",
        correct: true,
      },
      {
        id: "d",
        text: "She can count herself as separated from today — write today's date down as her separation date",
        correct: false,
      },
    ],
    objective:
      "Separated under one roof: one person can end it, and people can be separated under the same roof. Never rule on whether or when they separated.",
    sourceRef:
      "module-1b script › beat 3; module-2c script › beat 11; competency checklist A8, D21; content plan §4.2 PR-14",
  },
  {
    id: "PR-15",
    section: "product",
    question: "Mark asks, “How much child support will I end up paying?” What do you say?",
    options: [
      {
        id: "a",
        text: "“Child support is handled by Services Australia, separately from the property settlement.”",
        correct: true,
      },
      {
        id: "b",
        text: "“The lawyer will sort the child support out for you, as part of the property settlement.”",
        correct: false,
      },
      {
        id: "c",
        text: "“Tell me both your incomes and I'll run them through a calculator to give you a rough idea.”",
        correct: false,
      },
      {
        id: "d",
        text: "“It's a fixed percentage of your income, so it ends up working out about the same for everyone.”",
        correct: false,
      },
    ],
    objective:
      "Child support is a separate Services Australia system: use the approved line; never estimate an amount or say the lawyer handles it. No phone numbers.",
    sourceRef:
      "module-1b script › beat 2; module-1 script › beat 13; competency checklist A16; content plan §4.2 PR-15",
  },
  {
    id: "PR-16",
    section: "product",
    question: "Michelle asks, “The inheritance from my dad is mine, isn't it?” What do you say?",
    options: [
      {
        id: "a",
        text: "That it isn't automatically quarantined — how it's treated depends on when it came in and how it was used",
        correct: true,
      },
      {
        id: "b",
        text: "That an inheritance always stays with the person who received it, so it's kept out of the property pool entirely",
        correct: false,
      },
      {
        id: "c",
        text: "That it goes into the pool and gets split 50/50, just the same as everything else in it",
        correct: false,
      },
      {
        id: "d",
        text: "That it only stays hers if it came in more than five years ago — anything newer gets shared",
        correct: false,
      },
    ],
    objective:
      "An inheritance or family gift isn't automatically quarantined; how it's treated depends on when it came in and how it was used. Never say which way it'll go.",
    sourceRef: "module-1b script › beat 6; competency checklist A6, D25; content plan §4.2 PR-16",
  },
  {
    id: "PR-17",
    section: "product",
    question: "Mark says, “We weren't married, so I've got no rights.” What's the right response?",
    options: [
      {
        id: "a",
        text: "“De facto couples have essentially the same property rights as married couples… Same process, same pool.”",
        correct: true,
      },
      {
        id: "b",
        text: "“De facto couples can claim too, but they generally end up with about half of what a married couple would.”",
        correct: false,
      },
      {
        id: "c",
        text: "“You'd need to have lived together for at least three years before you'd have any claim to the property.”",
        correct: false,
      },
      {
        id: "d",
        text: "“How long were you together? If it was under two years, I'm afraid you won't have a claim at all.”",
        correct: false,
      },
    ],
    objective:
      "Not married: de facto couples have essentially the same property rights — same process, same pool. Whether a relationship counts is the lawyer's call; never say “it was under two years”.",
    sourceRef:
      "module-1b script › beat 4 (corrected Linking play 10); competency checklist A10, D33; content plan §4.2 PR-17",
  },
  {
    id: "PR-18",
    section: "product",
    question:
      "Michelle asks, “Do I need to be divorced before we sort out the property?” What do you say?",
    options: [
      {
        id: "a",
        text: "“Yes — divorce comes first. The property settlement can only start once the divorce has gone through and is final.”",
        correct: false,
      },
      {
        id: "b",
        text: "“Divorce and property are two separate things… You don't need a divorce to start sorting out the property.”",
        correct: true,
      },
      {
        id: "c",
        text: "“Yes — and if you were married for under two years, you'll both need to do counselling before anything else.”",
        correct: false,
      },
      {
        id: "d",
        text: "“No — and once you're divorced there's no time limit at all, so you can sort it out whenever.”",
        correct: false,
      },
    ],
    objective:
      "Divorce and property are separate: you don't need a divorce to start on the property. The counselling-first rule was scrapped in June 2025, and a final divorce starts a 12-month property time limit.",
    sourceRef:
      "module-1b script › beat 5; module-1 script › beat 17; competency checklist A9, D39; content plan §4.2 PR-18",
  },
  {
    id: "PR-19",
    section: "product",
    question:
      "Michelle says, “He controlled all the money all through our marriage — I never even saw a bank statement.” What do you do?",
    options: [
      {
        id: "a",
        text: "Ask her exactly what he did with the money, so the lawyer gets the whole story in your notes",
        correct: false,
      },
      {
        id: "b",
        text: "Give the financial-abuse line, ending “something to tell the lawyer, privately”, and move on",
        correct: true,
      },
      {
        id: "c",
        text: "Give the financial-abuse line, then tell her that since June 2025 it means she'll get more money",
        correct: false,
      },
      {
        id: "d",
        text: "Give the financial-abuse line, then tell her it means she won't have to go to mediation with him",
        correct: false,
      },
    ],
    objective:
      "Money controlled by the ex: the approved line (corrected Linking play 6), ending “it's something to tell the lawyer, privately”. Never dig, never frame it as more money, never say they can skip mediation. Skip the line for an unmarried client in WA (1b beat 9).",
    sourceRef:
      "module-1b script › beats 8 and 9; module-2b script › beat 8; competency checklist A20, E5; content plan §4.2 PR-19",
  },
  // ---- skills ----
  {
    id: "SK-01",
    section: "skills",
    question: "On every call, you should come across as:",
    options: [
      { id: "a", text: "A friendly lawyer who can give them a quick view", correct: false },
      { id: "b", text: "A closer who books them before they cool off", correct: false },
      { id: "c", text: "A mate who's firmly on their side against the ex", correct: false },
      { id: "d", text: "An advisor — not a salesperson, and never a lawyer", correct: true },
    ],
    objective:
      "Identity: an advisor who helps, not a salesperson and never a lawyer; never pile on the ex.",
    sourceRef:
      "sales-framework.ts › mindset.moves; module-2 script › beat 7, beat 11; read-along §7",
  },
  {
    id: "SK-02",
    section: "skills",
    question: "What's your FIRST move with any objection?",
    options: [
      { id: "a", text: "Agree — never fight it, and never hand them an exit", correct: true },
      { id: "b", text: "Explain calmly but firmly why they've got it wrong", correct: false },
      { id: "c", text: "Offer to call them back once they've had a think", correct: false },
      { id: "d", text: "Offer to knock the $75 off so they keep going", correct: false },
    ],
    objective: "The Objection Loop starts with agree: never fight, never hand them an exit.",
    sourceRef:
      "sales-framework.ts › OBJECTION_LOOP.intro, steps[0]; mindset.moves (objections are reflexes)",
  },
  {
    id: "SK-03",
    section: "skills",
    question: "Michelle says, “I'll need to think about it.” What's the best response?",
    options: [
      {
        id: "a",
        text: "Agree, give her a week to think it all over, then call her back to follow up",
        correct: false,
      },
      {
        id: "b",
        text: "Remind her the time limits mean she could lose out if she waits",
        correct: false,
      },
      {
        id: "c",
        text: "Agree, re-anchor to what she said mattered, then route to the free consult",
        correct: true,
      },
      {
        id: "d",
        text: "Offer to waive the $75 holding fee if she books in with you today",
        correct: false,
      },
    ],
    objective:
      "The Objection Loop: agree → re-anchor to what they told you → route to the free consult.",
    sourceRef: "sales-framework.ts › OBJECTION_LOOP.steps",
  },
  {
    id: "SK-04",
    section: "skills",
    question: "Michelle keeps calling it “the split”. How should you refer to it?",
    options: [
      { id: "a", text: "As “the divorce”, so it sounds more official", correct: false },
      { id: "b", text: "As “the split” too — use her words back to her", correct: true },
      { id: "c", text: "By its proper legal name, so you sound expert", correct: false },
      { id: "d", text: "By not naming it at all, in case it upsets her", correct: false },
    ],
    objective: "Echo the client's own words back (“split”, not “divorce”).",
    sourceRef:
      "module-2 script › beat 11 (use her words); sales-framework.ts › discovery.moves (Echo their words)",
  },
  {
    id: "SK-05",
    section: "skills",
    question: "You've just asked, “Does that sound fair?” What do you do next?",
    options: [
      { id: "a", text: "Explain the $75 again so they're clear", correct: false },
      { id: "b", text: "Repeat that the consult is normally $695", correct: false },
      { id: "c", text: "Add “no pressure” so they feel at ease", correct: false },
      { id: "d", text: "Stop talking, and wait for their answer", correct: true },
    ],
    objective: "Silence after “Does that sound fair?”: stop and wait; never fill it.",
    sourceRef: "sales-framework.ts › price.moves (“STOP after…”), price.never",
  },
  {
    id: "SK-06",
    section: "skills",
    question: "You've painted the Audiobook picture and the client goes quiet. What do you do?",
    options: [
      { id: "a", text: "Stay silent — the silence is working for you", correct: true },
      { id: "b", text: "Fill the pause, so it doesn't feel awkward", correct: false },
      { id: "c", text: "Ask “would you like to book?” while it lands", correct: false },
      { id: "d", text: "Paint the picture again in even more detail", correct: false },
    ],
    objective: "Silence after the Audiobook: stop, don't speak into it.",
    sourceRef:
      "sales-framework.ts › picture.moves, picture.never; sales-script.ts › AUDIOBOOK.stop",
  },
  {
    id: "SK-07",
    section: "skills",
    question: "Michelle asks, “Roughly what would I end up with?” What do you say?",
    options: [
      {
        id: "a",
        text: "“Most people in your spot end up with around half, give or take a little.”",
        correct: false,
      },
      {
        id: "b",
        text: "“With the kids living with you, you'd likely end up with the bigger share.”",
        correct: false,
      },
      {
        id: "c",
        text: "“That's a great question for the lawyer — it's exactly what the consult is for.”",
        correct: true,
      },
      {
        id: "d",
        text: "“Let me put your numbers through the screen, and I'll give you a rough idea of it.”",
        correct: false,
      },
    ],
    objective: "Never give legal advice or predict an outcome; use the deferral line.",
    sourceRef:
      "module-1 script › beat 20; sales-framework.ts › education.moves; read-along §7, §16",
  },
  {
    id: "SK-08",
    section: "skills",
    question: "Mid-call, the client starts whispering and giving one-word answers. What do you do?",
    options: [
      {
        id: "a",
        text: "Ask them straight out whether their ex is in the room with them right now",
        correct: false,
      },
      {
        id: "b",
        text: "Say it might not be a private moment, and lock a callback for when they can talk",
        correct: true,
      },
      {
        id: "c",
        text: "Speed up, so you get through Discovery before anyone walks in on them",
        correct: false,
      },
      {
        id: "d",
        text: "Skip ahead to the $75, so the booking is done before the call drops out",
        correct: false,
      },
    ],
    objective:
      "Guarded voice: the ex may be nearby; use the Guarded voice line and lock a callback on the spot.",
    sourceRef:
      "sales-script.ts › OPENING.guardedSay, guardedThen; module-2 script › beat 11b; read-along §16",
  },
  {
    id: "SK-09",
    section: "skills",
    question: "Michelle says, “He's really controlling, and there's an AVO.” What do you say?",
    options: [
      {
        id: "a",
        text: "“That must have been awful. What did he actually do to you? I'll put it all in the notes for the lawyer.”",
        correct: false,
      },
      {
        id: "b",
        text: "“The AVO should really help your case, so you'll most likely get to keep the house — that's good news.”",
        correct: false,
      },
      {
        id: "c",
        text: "“That sounds really hard. That's something to tell the lawyer, privately.” Then move on gently",
        correct: true,
      },
      {
        id: "d",
        text: "“If he ever breaches the AVO, report it to the police straight away.” Then carry on with the call",
        correct: false,
      },
    ],
    objective:
      "A frightening disclosure: never dig for details; say “That sounds really hard. That's something to tell the lawyer, privately.” and move on gently. No advice on orders, police or the case.",
    sourceRef:
      "module-2 script › beat 11b; module-2b script › beat 8; module-1b script › beat 9; competency checklist E3, A20; content plan §4.2 SK-09",
  },
  {
    id: "SK-11",
    section: "skills",
    question:
      "Mark asks, “Do I have a case — is it even worth it?” Which line belongs in your answer?",
    options: [
      {
        id: "a",
        text: "“From what you've told me so far, it sounds like you've actually got a really strong case.”",
        correct: false,
      },
      {
        id: "b",
        text: "“I won't guess at your dates or your share, because a guess could steer you wrong.”",
        correct: true,
      },
      {
        id: "c",
        text: "“With a pool that size, you may as well fight it — it's definitely worth doing, so let's book you in.”",
        correct: false,
      },
      {
        id: "d",
        text: "“Well, if it's 50/50, you'd walk away with half, so it's well worth your while.”",
        correct: false,
      },
    ],
    objective:
      "“Do I have a case?”: never give a view on the case or float a split; the approved answer ends “I won't guess at your dates or your share, because a guess could steer you wrong.”",
    sourceRef:
      "module-2b script › beats 4 and 5; module-1 script › beat 20; competency checklist D5; content plan §4.2 SK-11",
  },
  {
    id: "SK-12",
    section: "skills",
    question:
      "Michelle signed up with a lawyer six months ago, but wants to switch because of the cost. What do you do?",
    options: [
      {
        id: "a",
        text: "Explain you can't book her while she's still signed up with another lawyer — she'd need to end it first",
        correct: false,
      },
      {
        id: "b",
        text: "If she's a genuine fit, book her, flag it to the firm in your notes, and never bag her lawyer",
        correct: true,
      },
      {
        id: "c",
        text: "Agree she's probably been overcharged, so she feels heard, then book her in with one of our firms",
        correct: false,
      },
      {
        id: "d",
        text: "Walk her through getting her file back from her old lawyer, so the new firm can pick it up straight away",
        correct: false,
      },
    ],
    objective:
      "Switching lawyers: book a genuine fit and flag it to the firm in the notes. Never bag their lawyer, agree they were overcharged, or advise on fees or the file.",
    sourceRef:
      "module-2b script › beat 3; module-2c script › beat 8; sales-script.ts › OBJECTION_CARDS “Already have a lawyer” (never-say only; switch rule not on the card yet — plan M23 proposal); competency checklist A23, D18; content plan §4.2 SK-12",
  },
  // ---- process ----
  {
    id: "PC-01",
    section: "process",
    question: "What are you actually booking the client into?",
    options: [
      { id: "a", text: "A free first consultation with a lawyer in our network", correct: true },
      { id: "b", text: "A paid session with the firm, charged at the hourly rate", correct: false },
      {
        id: "c",
        text: "A signed retainer, so the lawyer can start work right away",
        correct: false,
      },
      { id: "d", text: "A mediation session with their ex and a neutral mediator", correct: false },
    ],
    objective:
      "What's booked: a free first consultation with a lawyer in the network, with no obligation to go ahead.",
    sourceRef: "module-1 script › beat 4, beat 15; read-along §9, §13",
  },
  {
    id: "PC-02",
    section: "process",
    question: "Which is the right way to explain the holding fee?",
    options: [
      {
        id: "a",
        text: "“There's a $75 booking fee, which goes towards the lawyer's time at the meeting.”",
        correct: false,
      },
      {
        id: "b",
        text: "“The consult is normally $695, but I can take $75 off it if you book in today.”",
        correct: false,
      },
      {
        id: "c",
        text: "“There's a $75 fee to hold your spot, which is refunded once your matter settles.”",
        correct: false,
      },
      {
        id: "d",
        text: "“There's just a $75 holding fee to secure your spot, fully refunded when you arrive.”",
        correct: true,
      },
    ],
    objective: "The $75 holding fee secures the spot and is fully refunded on arrival.",
    sourceRef: "sales-script.ts › PRICE_JOURNEY ($75 line); read-along §9",
  },
  {
    id: "PC-03",
    section: "process",
    question: "When do you tell the client the lawyer's hourly rate?",
    options: [
      { id: "a", text: "Never — the lawyer explains their own fees later", correct: false },
      { id: "b", text: "Always, before you book — it's on the lawyer card", correct: true },
      { id: "c", text: "Only after the consult, once the firm has seen them", correct: false },
      { id: "d", text: "Only if they choose litigation funding as their path", correct: false },
    ],
    objective: "Always tell the client the lawyer's hourly rate before booking.",
    sourceRef: "sales-framework.ts › price.moves; module-1 script › beat 19a; read-along §9",
  },
  {
    id: "PC-04",
    section: "process",
    question: "Michelle won't give her ex's full name: “Why do you need that?” What do you do?",
    options: [
      {
        id: "a",
        text: "Book her in anyway, and text her after the call to get the name before the consult",
        correct: false,
      },
      {
        id: "b",
        text: "Skip it — the ex's full name is only needed later, and only if she applies for litigation funding",
        correct: false,
      },
      {
        id: "c",
        text: "Explain you run checks so there's no crossover and the firm can act for her — no name, no booking",
        correct: true,
      },
      {
        id: "d",
        text: "Take just the ex's first name for now, since that's enough to book her in and the firm can ask the rest",
        correct: false,
      },
    ],
    objective:
      "The other side's full name is required before booking, for the conflict check: give the reason (no crossover, so the firm can act for you). No full name, no booking.",
    sourceRef:
      "sales-script.ts › DISCOVERY.conflictCheck; module-2c script › beat 7; sales-framework.ts › book.never, DRILL fixed:must-haves; read-along §12; content plan L36",
  },
  {
    id: "PC-05",
    section: "process",
    question:
      "Michelle has a letter from her ex's lawyer with a reply date ten days away. What do you do?",
    options: [
      {
        id: "a",
        text: "Tell her not to reply to anything until she's been to the consult and the lawyer has read it all",
        correct: false,
      },
      {
        id: "b",
        text: "Suggest she asks his lawyer for an extension first, so she isn't rushed into replying",
        correct: false,
      },
      {
        id: "c",
        text: "Offer the soonest times, write the date in your notes, and say the lawyer will look at it first",
        correct: true,
      },
      {
        id: "d",
        text: "Book her whenever suits next week or the week after — ten days gives her plenty of time",
        correct: false,
      },
    ],
    objective:
      "Urgency (a reply date): stay calm, offer the soonest times first, write the exact date in the notes, and say the lawyer will look at it first. Never say whether or how to reply.",
    sourceRef:
      "module-2c script › beat 9; module-1 script › beat 16; competency checklist B6, D20; content plan §4.2 PC-05",
  },
  {
    id: "PC-06",
    section: "process",
    question: "Mark's lead form says “Under $1M” for assets. What does that tell you?",
    options: [
      {
        id: "a",
        text: "He's probably under the booking bar, so it's not worth making the call — move on to the next lead",
        correct: false,
      },
      {
        id: "b",
        text: "His own guess — it never qualifies or rules anyone out. The pool comes from the Map",
        correct: true,
      },
      {
        id: "c",
        text: "It's his Asset Pool, so you can use that figure for the booking bar and skip the Map",
        correct: false,
      },
      {
        id: "d",
        text: "It's the figure the funding check uses, so it decides whether he can get litigation funding",
        correct: false,
      },
    ],
    objective:
      "The form's assets band is the client's own guess, super included: it never qualifies or rules anyone out. The pool comes from the Map; the funding check has its own bar.",
    sourceRef:
      "module-2c script › beats 2 and 10; module-2 script › beat 8; competency checklist B1, C3; content plan §4.2 PC-06",
  },
  {
    id: "PC-07",
    section: "process",
    question: "Which of these is a reason NOT to book?",
    options: [
      {
        id: "a",
        text: "They've signed up with a lawyer already, but want to switch",
        correct: false,
      },
      {
        id: "b",
        text: "The funding check on the Funding step comes back saying likely denied",
        correct: false,
      },
      { id: "c", text: "They're still together, and just thinking about leaving", correct: true },
      {
        id: "d",
        text: "They're separated, but still living under one roof with the ex",
        correct: false,
      },
    ],
    objective:
      "Reverse item: it has to be over to book. Having a lawyer, a likely-denied funding check and separation under one roof are never reasons to refuse.",
    sourceRef: "module-2c script › beat 11; competency checklist C23, D21; content plan §4.2 PC-07",
  },
  {
    id: "PC-08",
    section: "process",
    question:
      "The funding check on the Funding step says Funding looks likely. What do you tell the client?",
    options: [
      {
        id: "a",
        text: "That they've been approved for funding, so the cost won't be a worry now",
        correct: false,
      },
      {
        id: "b",
        text: "That they qualify for funding, though the funder still has to sign it off",
        correct: false,
      },
      {
        id: "c",
        text: "Their net equity figure from the screen, so they know where they stand",
        correct: false,
      },
      {
        id: "d",
        text: "Nothing about what the check says — the funder decides, never you",
        correct: true,
      },
    ],
    objective:
      "The funding check is internal only: never tell the client what it says. The funder decides, never the rep.",
    sourceRef: "module-2c script › beat 13; competency checklist C21, F17; content plan §4.2 PC-08",
  },
  {
    id: "PC-09",
    section: "process",
    question:
      "Mark's matter is parenting-only, and he's asked about litigation funding. What's right?",
    options: [
      {
        id: "a",
        text: "Litigation funding can't cover parenting-only — he needs $50,000+ of his own savings to be booked",
        correct: true,
      },
      {
        id: "b",
        text: "That's fine as long as he owns a house, because the funder can secure the loan against the property",
        correct: false,
      },
      {
        id: "c",
        text: "He can still get funding, just a smaller amount, because there's no property settlement",
        correct: false,
      },
      {
        id: "d",
        text: "Ask the funder whether they'd make an exception for him this time, since he's otherwise a really good fit",
        correct: false,
      },
    ],
    objective:
      "Litigation funding can't cover parenting-only matters; a parenting-only client is booked only with at least $50,000 of their own savings.",
    sourceRef:
      "module-2c script › beats 5 and 10; module-2b script › beat 5; module-1 script › beat 19a; competency checklist C4; content plan §4.2 PC-09",
  },
  {
    id: "PC-10",
    section: "process",
    question: "Michelle asks, “Is this call recorded?” What do you say?",
    options: [
      {
        id: "a",
        text: "“No, this call isn't recorded — it's just between you and me, so you can talk freely.”",
        correct: false,
      },
      {
        id: "b",
        text: "“Yes, calls are recorded so we get your details right for the lawyer.”",
        correct: true,
      },
      {
        id: "c",
        text: "“Don't worry — this call and the consult are completely private and confidential.”",
        correct: false,
      },
      {
        id: "d",
        text: "“Good question — anyway, let's get back to your situation.”",
        correct: false,
      },
    ],
    objective:
      "Only when asked, tell the truth: “Yes, calls are recorded so we get your details right for the lawyer.” Never volunteer it, never deny it, and never promise it's completely private.",
    sourceRef:
      "module-2b script › beat 6; conflicts.md P11 (Peter, 11 Oct 2026); content plan §4.2 PC-10",
  },
];
