// Ported from the Legal app (family-law-floater/src/components/pitch/slides.tsx). Re-run the port script to refresh.
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Megaphone,
  Phone,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";

import {
  DERISK_ILLUSTRATIVE,
  conversionValue,
  formatCurrency,
  roundToThousand,
} from "./deck-utils";
import { ChapterLabel, Slide, SlideHeading, item } from "./SlideShell";

export function CoverSlide() {
  return (
    <Slide>
      <motion.h1 variants={item} className="deck-cover-title">
        Guarantee a client
        <br />
        who shows up at your firm
        <br />
        and can afford you!
      </motion.h1>
    </Slide>
  );
}

const STEPS = [
  { Icon: Megaphone, title: "We Run The Ads", copy: "Our brand, our studio, our ad spend." },
  { Icon: Phone, title: "We Call Every Enquiry", copy: "Selling them on YOUR firm." },
  {
    Icon: Wallet,
    title: "We Check They Can Fund It",
    copy: "Cash, family, payment plan or litigation lending.",
  },
  { Icon: CalendarCheck, title: "Deposit & Booked", copy: "In your diary, ready to attend." },
];

export function HowItWorksSlide() {
  return (
    <Slide>
      <ChapterLabel>How It Works</ChapterLabel>
      <SlideHeading>The Client Journey</SlideHeading>
      <motion.ol variants={item} className="deck-journey deck-section-gap">
        {STEPS.map(({ Icon, title, copy }, i) => (
          <li key={title} className="deck-step">
            <div className="deck-step-icon">
              <Icon aria-hidden="true" />
            </div>
            <div>
              <p className="deck-label text-primary">Step {i + 1}</p>
              <h3 className="deck-subheading">{title}</h3>
              <p className="deck-copy">{copy}</p>
            </div>
          </li>
        ))}
      </motion.ol>
    </Slide>
  );
}

const NOW_BULLETS = ["Not ready", "Ringing four firms", "No idea what you cost", "No asset pool"];
const WE_BULLETS = [
  "A reason to act now",
  "Pre-sold on you",
  "Knows your rate already",
  "Funding already found",
];

export function WhoWeSendSlide() {
  return (
    <Slide>
      <ChapterLabel>The Client</ChapterLabel>
      <SlideHeading>You already know who's ringing you.</SlideHeading>
      <div className="deck-comparison deck-section-gap">
        <div className="deck-comparison-card">
          <h3 className="deck-label">Who rings you now</h3>
          <ul className="deck-bullets">
            {NOW_BULLETS.map((b) => (
              <li key={b}>
                <X className="deck-negative" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="deck-card-note deck-negative">Forty minutes. Gone.</p>
        </div>
        <div className="deck-comparison-card deck-comparison-positive">
          <h3 className="deck-label text-primary">Who we send</h3>
          <ul className="deck-bullets">
            {WE_BULLETS.map((b) => (
              <li key={b}>
                <Check className="text-primary" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="deck-card-note text-primary">Deposit paid. Sat down.</p>
        </div>
      </div>
      <p className="deck-takeaway">
        We have the conversation on the left. You only ever see the right.
      </p>
    </Slide>
  );
}

const PACKS = [
  { name: "Demo", shows: 10 },
  { name: "Starter", shows: 20 },
  { name: "Scale", shows: 50 },
];

export function PackagesSlide({
  matterValue,
  pricePerShow,
  conversionLabel,
}: {
  matterValue: number;
  pricePerShow: number;
  conversionLabel: string;
}) {
  const rate = conversionValue(conversionLabel);
  return (
    <Slide>
      <div className="text-center">
        <SlideHeading>Packages</SlideHeading>
      </div>
      <motion.div variants={item} className="deck-packages deck-section-gap">
        {PACKS.map((p) => (
          <div key={p.name} className="deck-package">
            <h3 className="deck-package-name">{p.name}</h3>
            <p className="deck-copy">{p.shows} showed appointments</p>
            <p className="deck-copy">{formatCurrency(pricePerShow)} per appointment</p>
            <div className="deck-package-figures">
              <div>
                <p className="deck-label">Est. fees generated</p>
                <p className="deck-package-fees">
                  {formatCurrency(roundToThousand(p.shows * rate * matterValue))}
                </p>
              </div>
              <div>
                <p className="deck-label">Your investment</p>
                <p className="deck-package-cost">{formatCurrency(p.shows * pricePerShow)}</p>
                <p className="deck-copy">+ GST</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </Slide>
  );
}

export function DeRiskSlide({ matterValue }: { matterValue: number }) {
  const boxes = [
    { big: "10 clients", small: formatCurrency(DERISK_ILLUSTRATIVE) },
    { big: "Convert just 1", small: formatCurrency(matterValue) },
    { big: "2× your money", small: "already in front" },
  ];
  return (
    <Slide>
      <ChapterLabel>The Risk Sits With Us</ChapterLabel>
      <SlideHeading>Let's de-risk it.</SlideHeading>
      <motion.div variants={item} className="deck-risk-flow deck-section-gap">
        {boxes.map((b, i) => (
          <div key={b.big} className="deck-risk-step">
            <div className="deck-risk-card">
              <p className="deck-subheading">{b.big}</p>
              <p className="deck-copy">{b.small}</p>
            </div>
            {i < boxes.length - 1 && <ArrowRight className="deck-risk-arrow" aria-hidden="true" />}
          </div>
        ))}
      </motion.div>
      <motion.div variants={item} className="deck-guarantee deck-section-gap">
        <p className="deck-label text-primary">The Safety Net</p>
        <h3 className="deck-guarantee-title">Convert 0 of 10? We send 5 more — free.</h3>
        <p className="deck-copy">
          That's 15 deposit-paid, vetted clients for the same price. You need one to sign to be in
          front.
        </p>
        <p className="deck-guarantee-note">
          <ShieldCheck aria-hidden="true" />
          One-time offer — available on your first pack only.
        </p>
      </motion.div>
    </Slide>
  );
}

const FAQ = [
  ["What if a client doesn't show?", "You don't pay. It doesn't come off your pack."],
  [
    "Is this a referral fee?",
    "No. You're paying for an appointment, not a signed client. We take no share of your fees.",
  ],
  ["Are your team lawyers?", "No, and they never give legal advice. They qualify and hand over."],
  [
    "Whose ads are they?",
    "Ours. They run under our own brand and we carry the ad spend. Your firm's name never appears.",
  ],
  [
    "Which firms have you worked with?",
    "Confidentiality agreements prevent us naming them. The same protection applies to you.",
  ],
  [
    "Do I have to give a free consultation?",
    "For our clients, yes. We've already done the filtering you'd normally charge for.",
  ],
  ["Where's your team?", "Sydney, Australia."],
];

export function FaqSlide({ page = 0 }: { page?: 0 | 1 }) {
  return (
    <Slide>
      <ChapterLabel>Questions · {page + 1} of 2</ChapterLabel>
      <SlideHeading>Questions I Get Asked</SlideHeading>
      <motion.div variants={item} className="deck-faq deck-section-gap">
        {FAQ.slice(page * 4, page * 4 + 4).map(([q, a]) => (
          <div key={q} className="deck-faq-item">
            <h3 className="deck-subheading">{q}</h3>
            <p className="deck-copy">{a}</p>
          </div>
        ))}
      </motion.div>
    </Slide>
  );
}
