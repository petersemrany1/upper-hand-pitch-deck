// Ported from the Legal app (family-law-floater/src/lib/cold-calling/script.ts). Re-run the port script to refresh.
// THE SCRIPT, stage by stage. Every line is Peter's wording verbatim (15 Sep
// 2026 version) — including spelling. Placeholders in [brackets] are filled in
// at render time; nothing else is changed.

export type ScriptLine =
  | { kind: "you"; text: string }
  | { kind: "them"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "line"; text: string }
  | { kind: "note"; text: string }
  | { kind: "subheading"; text: string };

export type CallStage = { id: string; title: string; lines: ScriptLine[] };

export const CALL_STAGES: CallStage[] = [
  {
    id: "gatekeeper",
    title: "Intro to gatekeeper",
    lines: [
      { kind: "you", text: "Hello, I was wondering if you do family law there? " },
      { kind: "them", text: "“Yes we do” " },
      {
        kind: "you",
        text: "Awesome - I was hoping you could help me. We have a system that works quite well",
      },
      { kind: "you", text: "we have a bunch of clients ready to act on their family law matter" },
      { kind: "you", text: "We are looking for the best firm in [STATE] to put them in." },
      {
        kind: "you",
        text: "Who looks after the business development and marketing at the firm — is that the owner directly?”",
      },
    ],
  },
  {
    id: "owner_intro",
    title: "Got through to the owner — intro",
    lines: [
      {
        kind: "you",
        text: "Hi its [Name] here,\n\nThe reason I'm calling is that we've built a model specifically for family law firms that are sick and tired of losing time and money speaking to people who can't afford you and giving free advice.\n\nOr even worse booking people in that don't show up to the firm at all after bogging your team down on the phone prior.\n\nSound familiar?\n\nRight so I just wanted to see if that's even a problem worth solving for your firm.",
      },
    ],
  },
  {
    id: "gather_info",
    title: "Gather info",
    lines: [
      {
        kind: "you",
        text: "So what we can for for you essentially is:\n\nfill your calendar with vetted clients who already know the price, have been checked they can afford you whether that's out of savings or litigation funding, and paid a deposit to show up.\n\nYou only pay when they sit on the chair at your firm.\n\nIt's called pay per show marketing and made for firms that are looking to scale:\n\nHow does that sound?\n\nExcellent!\n\nBefore we discuss further is it ok if I ask you a few quick questions?",
      },
      {
        kind: "bullet",
        text: "How many consultations for family law do you think you do per week?",
      },
      { kind: "bullet", text: "And out of them what percent actually goes ahead and signs?" },
      { kind: "bullet", text: "What are you currently doing for marketing?" },
      { kind: "bullet", text: "What's the cost per acquisition of a client?" },
      {
        kind: "bullet",
        text: "If we were to give you 100 clients ready to go this month do you have the capacity to grow, do you know other lawyers that could help you?",
      },
      {
        kind: "you",
        text: "We already working with someone in [state] but we have had a big influx of leads that they can't keep up with so we are looking to work with 1 more person and the first person that goes ahead im just going to go with.",
      },
    ],
  },
  {
    id: "pitch",
    title: "The pitch",
    lines: [
      {
        kind: "you",
        text: "We run our own ads under our white labelled brand called “Legal Group” the name is meant to be forgotten. ",
      },
      {
        kind: "you",
        text: "We cover all the spend, and we have a sales floor who spends 40 to 50 minutes on the phone with hundreds of leads vetting them and filtering through the tyre kickers. On the phones we understand the real fundamental reason as to why they want to divorce, we check what's in their pool and we only send people over to you with over 750k+ in their pool. ",
      },
      {
        kind: "you",
        text: "Then we talk about how they plan to fund it - either savings, or litigation funding (just fund) and if they want to do just fund.. we work with justfund and have an eligibility criteria so they need to fit in that criteria for us to accept them. ",
      },
      {
        kind: "you",
        text: "Once they have passed our vetting process we take a $75 booking fee to make sure they actually turn up and book them straight into your calendar.\n\nWe also tell them your hourly rate so there are no surprises. And of course we pass all this intel on to you.\n\nSo by the time they sit down with you, they already know the price, they know how they are going to fund it, they are committed, and your team knows exactly what's driving them.\n\nHow does this sound so far?",
      },
      {
        kind: "you",
        text: "Awesome! We are really looking for someone to work with long term.. We know this works really well but ill be completely honest you do need to have your sales process dialed in because if its not - its not worth me even talking about this any more..\n\nHow does it work when people come in to see you? Whats your process?",
      },
    ],
  },
  {
    id: "cost",
    title: "Cost",
    lines: [
      { kind: "you", text: "So its $1850 plus GST per client that shows up." },
      {
        kind: "you",
        text: "We typically see a 1 in 2 client go ahead and sign and the average case value is $40k.",
      },
      { kind: "note", text: "[pause]" },
      { kind: "them", text: "THEM: Do I need to pay upfront? " },
      {
        kind: "you",
        text: "Yes - If you were to come on board we have packs of 10,20, or 40 to start off. Most people start off with a 20 pack but we have introduced the 10 pack as a demo pack to make it a bit more affordable for people",
      },
      { kind: "them", text: "THEM: Can I split the pack in half?" },
      {
        kind: "you",
        text: "Yes there is an option on your first one to split a 10 pack into 2 payments 5 and 5 for cash flow",
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ's",
    lines: [
      { kind: "them", text: 'THEM: "And what if they don\'t show up?"' },
      {
        kind: "you",
        text: '"You pay nothing. We keep the deposit, you keep your time. We see around an 80% show rate because of that deposit — it filters out anyone who\'s not serious."',
      },
      { kind: "them", text: 'THEM:  How many firms do you work with?"' },
      {
        kind: "you",
        text: "Were pretty selective — we only take on 1-2 firms per city and we obviously can't work with everyone. Which is actually why I'm calling you specifically.",
      },
      { kind: "them", text: 'THEM: "Right. And how long does it take to get started?"' },
      { kind: "you", text: "We can be up and running within about 1-3 weeks. " },
      { kind: "them", text: "THEM: What happens if they don’t sign, do I still have to pay?" },
      {
        kind: "you",
        text: "Yes we run a pay per show model. It's not based on success. We already know that 30-50% of people will say no. It's about having 40k 5 to 7 times in a 10 pack and scaling on that.",
      },
      { kind: "subheading", text: "IF THEY ARE STILL STUBBURN ON PAY PER SIGN" },
      {
        kind: "you",
        text: "We’ve been offered 30% of peoples business’ before because if we take on that risk we would want to make it worth it, would you be interested in sharing part of the business with us? (This usually stops that objection asap) ",
      },
    ],
  },
  {
    id: "book",
    title: "Book the closer call",
    lines: [
      {
        kind: "you",
        text: '" I will send you a google meet link for you to sit down and go in depth with peter who is one of the partners here, whats the best email? ',
      },
      { kind: "subheading", text: "before hanging up you need to: " },
      { kind: "bullet", text: "Tell the client the price per show ($1850+gst per show)" },
      {
        kind: "bullet",
        text: "Understand who the owners/business partners are who make decisions. That's the person on the zoom call with peter.",
      },
    ],
  },
];

export type Objection = {
  id: string;
  label: string;
  them: string;
  handler: string;
  goToStage?: string;
};

/** OBJECTION SHEET — verbatim. */
export const OBJECTIONS: Objection[] = [
  {
    id: "in_court",
    label: "Principal is in court",
    them: '"Sorry, the the principal is in court right now"',
    handler:
      "\"No worries at all — when's the best time to catch them between patients? I just need two minutes, it's regarding consultation bookings for the firm.\"",
  },
  {
    id: "no_calls",
    label: "Owner doesn't take these calls",
    them: '"Sorry the owner doesn\'t take these kinds of calls"',
    handler:
      "\"I completely understand — to be fair this isn't really a sales call. We send qualified clients and I just wanted to see if they'd be the right fit before we placed them elsewhere. Is there an email I can reach them on directly?\"",
  },
  {
    id: "offer",
    label: "What is your offer?",
    them: '"What is your offer?"',
    handler: "Go into the pitch",
    goToStage: "pitch",
  },
  {
    id: "marketing",
    label: "We already do marketing",
    them: '"We already do marketing"',
    handler:
      '"Yeah thats fine most people that use us still do their own marketing.. This is another arm of marketing made for people looking to scale their business’',
  },
  {
    id: "enough",
    label: "We have enough clients",
    them: '"We already have enough clients"',
    handler: '"That’s great, so what you’re saying is you don’t want to scale your business?',
  },
];

/** Fill [Name] / [STATE] / [Their state] without touching any other word. */
export function fillPlaceholders(text: string, vars: { name: string; state: string }): string {
  return text
    .replace(/\[Name\]/g, vars.name)
    .replace(/\[STATE\]/g, vars.state)
    .replace(/\[Their state\]/g, vars.state)
    .replace(/\[state\]/g, vars.state);
}
