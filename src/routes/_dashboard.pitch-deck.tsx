import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import FeatureCard from "../components/FeatureCard";
import ROICalculator from "../components/ROICalculator";
import Logo from "../components/Logo";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";

export const Route = createFileRoute("/_dashboard/pitch-deck")({
  component: PitchDeck,
  head: () => ({
    meta: [
      { title: "Pitch Deck" },
      { name: "description", content: "Hair transplant marketing pitch deck." },
    ],
  }),
});

const TOTAL_SLIDES = 13;

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

/* Unsplash photos — curated for hair clinic / premium professional context */
const PHOTOS = {
  emptyClinic:
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&q=80&auto=format&fit=crop",
  confidentMan:
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&q=80&auto=format&fit=crop",
  videoStudio:
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&q=80&auto=format&fit=crop",
  officePhone:
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop",
  officeReview:
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80&auto=format&fit=crop",
};

function PitchDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const scrollToSlide = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.children[index] as HTMLElement;
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(el.children).indexOf(entry.target as HTMLElement);
            if (idx >= 0) setActiveSlide(idx);
          }
        });
      },
      { root: el, threshold: 0.6 }
    );
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        scrollToSlide(Math.min(activeSlide + 1, TOTAL_SLIDES - 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToSlide(Math.max(activeSlide - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSlide, scrollToSlide]);

  const touchStart = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      scrollToSlide(
        diff > 0
          ? Math.min(activeSlide + 1, TOTAL_SLIDES - 1)
          : Math.max(activeSlide - 1, 0)
      );
    }
  };

  const Tick = () => (
    <Check className="w-4 h-4 text-primary inline mr-3 shrink-0 mt-0.5" />
  );

  const H = ({ children }: { children: React.ReactNode }) => (
    <h2
      className="text-3xl md:text-[2.75rem] font-extrabold text-foreground leading-[1.1] tracking-tight"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {children}
    </h2>
  );

  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">
      {children}
    </p>
  );

  const PhotoHalf = ({
    src,
    children,
  }: {
    src: string;
    children?: React.ReactNode;
  }) => (
    <div
      className="hidden md:flex md:w-1/2 h-full bg-cover bg-center relative"
      style={{ backgroundImage: `url('${src}')` }}
    >
      {children}
    </div>
  );

  const faqItems = [
    { q: "Where is your team?", a: "Sydney, Australia." },
    {
      q: "Can I see ad examples?",
      a: "Shared once you're onboard. All approved by you before publishing.",
    },
    {
      q: "What if a patient doesn't show?",
      a: "You don't pay. We credit or refund.",
    },
    {
      q: "How do you book?",
      a: "Directly into your calendar. We prioritise mid-morning and early afternoon slots.",
    },
    {
      q: "Whose Meta account?",
      a: "Ours. You just give us page access. We carry the risk.",
    },
    {
      q: "Who have you worked with?",
      a: "Confidentiality agreements in place. Google reviews show our clients.",
    },
  ];

  const valueItems = [
    { service: "Video Ad Creative", value: "$3,000 value" },
    { service: "Meta Campaign Management", value: "$2,000/month value" },
    { service: "Lead Response Team", value: "$5,000/month value" },
    { service: "Qualification Calling", value: "Included" },
    { service: "Calendar Booking", value: "Included" },
    { service: "Post-Consult Follow-Up", value: "Included" },
  ];

  const pricingFeatures = [
    "10 Guaranteed Shows",
    "Full Ad Creative",
    "Lead Qualification & Calling",
    "Calendar Booking",
    "Show-Up Reminders",
    "Post-Consult Follow-Up",
    "No Show = No Charge",
    "No Fixed Term",
  ];

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="deck-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ──────── SLIDE 1 — COVER ──────── */}
        <div className="deck-slide flex flex-col items-center justify-center text-center px-6">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h1
              variants={fadeIn}
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              HAIR TRANSPLANT
              <br />
              <span className="text-primary">MARKETING</span>
              <br />
              THAT WORKS
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="text-muted-foreground text-sm md:text-base mt-8 max-w-md mx-auto"
            >
              A done-for-you patient acquisition system.
            </motion.p>
          </motion.div>
          <div className="absolute bottom-10 animate-pulse-bounce">
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>

        {/* ──────── SLIDE 2 — THE PROBLEM ──────── */}
        <div className="deck-slide flex flex-col md:flex-row">
          <SlideHeader />
          <PhotoHalf src={PHOTOS.emptyClinic} />
          <div className="flex-1 flex flex-col justify-center px-8 md:px-14 py-20 md:py-0">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeIn}>
                <Label>THE PROBLEM</Label>
              </motion.div>
              <motion.div variants={fadeIn} className="mb-10">
                <H>Your Calendar Isn't Full.</H>
              </motion.div>
              <motion.div variants={fadeIn} className="space-y-3">
                <FeatureCard
                  title="Slow Follow-Up"
                  description="Leads go cold before anyone calls."
                />
                <FeatureCard
                  title="Wrong Patients"
                  description="Price shoppers waste your surgeon's time."
                />
                <FeatureCard
                  title="No Shows"
                  description="Empty consult slots = lost procedure revenue."
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ──────── SLIDE 3 — THE SOLUTION ──────── */}
        <div className="deck-slide flex flex-col items-center justify-center text-center px-6 md:px-16">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeIn}>
              <Label>THE SOLUTION</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>We Fill Your Calendar. You Just Show Up.</H>
            </motion.div>
            <motion.div
              variants={fadeIn}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <FeatureCard
                variant="blue"
                title="Done For You"
                description="Ads, calling, booking, follow-up. All handled."
              />
              <FeatureCard
                title="Pay Per Show"
                description="Only pay when the patient attends."
              />
              <FeatureCard
                title="No Lock In"
                description="Rolling monthly. Cancel any time."
              />
              <FeatureCard
                title="Exclusive"
                description="One clinic per city. That clinic is yours."
              />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 4 — WHO WE SEND YOU ──────── */}
        <div className="deck-slide flex flex-col md:flex-row">
          <SlideHeader />
          <PhotoHalf src={PHOTOS.confidentMan} />
          <div className="flex-1 flex flex-col justify-center px-8 md:px-14 py-20 md:py-0">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeIn} className="mb-10">
                <H>
                  Your Ideal Patient.
                  <br />
                  Ready To Start.
                </H>
              </motion.div>
              <motion.div
                variants={fadeIn}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <FeatureCard
                  variant="blue"
                  title="Financially Ready"
                  description="Strong credit or super access."
                />
                <FeatureCard
                  title="Urgently Motivated"
                  description="Ready to act now."
                />
                <FeatureCard
                  title="Trust-Oriented"
                  description="Open to expert recommendation."
                />
                <FeatureCard
                  title="Permanent Solution"
                  description="Not looking at Turkey."
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ──────── SLIDE 5 — AD CREATIVE ──────── */}
        <div className="deck-slide flex flex-col md:flex-row">
          <SlideHeader />
          <PhotoHalf src={PHOTOS.videoStudio}>
            <div className="absolute bottom-10 left-10 right-10">
              <h2
                className="text-2xl lg:text-3xl font-extrabold text-foreground drop-shadow-lg leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                PROVEN AD
                <br />
                CREATIVE
              </h2>
            </div>
          </PhotoHalf>
          <div className="flex-1 flex flex-col justify-center px-8 md:px-14 py-20 md:py-0">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="space-y-3"
            >
              <motion.div variants={fadeIn}>
                <FeatureCard
                  variant="blue"
                  title="Speaks To Confidence"
                  description="Pain, identity and outcome-driven messaging."
                />
              </motion.div>
              <motion.div variants={fadeIn}>
                <FeatureCard
                  title="Builds Trust Early"
                  description="Patients feel comfortable before they arrive."
                />
              </motion.div>
              <motion.div variants={fadeIn}>
                <FeatureCard
                  title="AHPRA Compliant"
                  description="Safe to run. No risk to your registration."
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ──────── SLIDE 6 — LEAD HANDLING ──────── */}
        <div className="deck-slide flex flex-col md:flex-row">
          <SlideHeader />
          <PhotoHalf src={PHOTOS.officePhone} />
          <div className="flex-1 flex flex-col justify-center px-8 md:px-14 py-20 md:py-0">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeIn} className="mb-10">
                <H>Lead Handling You'll Be Proud Of.</H>
              </motion.div>
              <motion.div
                variants={fadeIn}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <FeatureCard
                  variant="blue"
                  title="Qualified Before Booking"
                  description="Only the right patients reach your chair."
                />
                <FeatureCard
                  title="5 Minute Response"
                  description="Every lead called within 5 minutes."
                />
                <FeatureCard
                  title="Show-Up System"
                  description="SMS, calls and reminders until they arrive."
                />
                <FeatureCard
                  title="Same Person"
                  description="One contact builds rapport start to finish."
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ──────── SLIDE 7 — POST CONSULT ──────── */}
        <div className="deck-slide flex flex-col md:flex-row">
          <SlideHeader />
          <PhotoHalf src={PHOTOS.officeReview} />
          <div className="flex-1 flex flex-col justify-center px-8 md:px-14 py-20 md:py-0">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeIn} className="mb-10">
                <H>We Follow Up. You Close More.</H>
              </motion.div>
              <motion.div
                variants={fadeIn}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <FeatureCard
                  variant="blue"
                  title="Objection Handling"
                  description="We call undecided patients and remove roadblocks."
                />
                <FeatureCard
                  title="Momentum Building"
                  description="Warm follow-ups shorten the decision cycle."
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ──────── SLIDE 8 — VALUE STACK ──────── */}
        <div className="deck-slide flex flex-col items-center justify-center px-6 md:px-16">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-2xl w-full"
          >
            <motion.div variants={fadeIn}>
              <Label>WHAT YOU'RE GETTING</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-12">
              <H>Built Internally This Costs $10,000/Month.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-0">
              {valueItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3.5 border-b border-border"
                >
                  <span className="flex items-center text-sm font-semibold text-foreground">
                    <Tick />
                    {item.service}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {item.value}
                  </span>
                </div>
              ))}
            </motion.div>
            <motion.div variants={fadeIn} className="mt-12">
              <p
                className="text-xl md:text-2xl font-extrabold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Your investment:{" "}
                <span className="text-primary">
                  $1,300 per patient who shows up.
                </span>
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 9 — ROI CALCULATOR ──────── */}
        <SlideHeader />
        <ROICalculator />

        {/* ──────── SLIDE 10 — TRIAL GUARANTEE ──────── */}
        <div className="deck-slide flex flex-col items-center justify-center text-center px-6 md:px-16">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-2xl"
          >
            <motion.div variants={fadeIn}>
              <Label>THE GUARANTEE</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-8">
              <H>Start With 10 Shows. Risk Free.</H>
            </motion.div>
            <motion.p
              variants={fadeIn}
              className="text-muted-foreground text-sm md:text-base leading-relaxed mb-10 max-w-xl mx-auto"
            >
              If you don't see at least 2 procedures go ahead after your first
              10 shows, we'll give you 5 additional shows completely free. We
              qualify hard. We back ourselves.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <FeatureCard
                variant="blue"
                title="No Show = No Charge"
                description="You never pay for an empty seat."
              />
              <FeatureCard
                title="Free Top-Up"
                description="5 free shows if 2 don't convert."
              />
              <FeatureCard
                title="No Lock In"
                description="Cancel any time after your trial."
              />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 11 — PRICING ──────── */}
        <div className="deck-slide flex flex-col items-center justify-center px-6 md:px-16">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-4xl w-full text-center"
          >
            <motion.div variants={fadeIn} className="mb-10">
              <H>Simple Pricing.</H>
            </motion.div>
            <motion.div
              variants={fadeIn}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Starter */}
              <div className="bg-foreground text-background rounded-xl p-8 text-left">
                <p
                  className="text-xs font-bold tracking-[0.15em] uppercase mb-5 opacity-60"
                >
                  STARTER
                </p>
                <p
                  className="text-3xl font-extrabold mb-1"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  $1,300
                </p>
                <p className="text-xs opacity-50 mb-1">per showed consultation</p>
                <p className="text-xs opacity-50 mb-6">
                  10 show trial package
                </p>
                <ul className="space-y-2.5 text-sm">
                  {pricingFeatures.map((f) => (
                    <li key={f} className="flex items-start">
                      <Tick />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Scale */}
              <div className="bg-foreground text-background rounded-xl p-8 text-left border-2 border-primary relative">
                <span className="absolute top-4 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
                <p
                  className="text-xs font-bold tracking-[0.15em] uppercase mb-5 opacity-60"
                >
                  SCALE
                </p>
                <p
                  className="text-3xl font-extrabold mb-1"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  $1,300
                </p>
                <p className="text-xs opacity-50 mb-1">per showed consultation</p>
                <p className="text-xs opacity-50 mb-6">
                  20–40 shows per month
                </p>
                <ul className="space-y-2.5 text-sm">
                  {pricingFeatures.map((f) => (
                    <li key={f} className="flex items-start">
                      <Tick />
                      {f}
                    </li>
                  ))}
                  <li className="flex items-start">
                    <Tick />
                    Priority Onboarding
                  </li>
                </ul>
              </div>
            </motion.div>
            <motion.p
              variants={fadeIn}
              className="text-[11px] text-muted-foreground mt-6"
            >
              *Single implant enquiries that come through are a bonus — not
              counted toward your package.
            </motion.p>
          </motion.div>
        </div>

        {/* ──────── SLIDE 12 — FAQ ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeIn} className="mb-10">
              <H>Questions I Get Asked.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="divide-y divide-border">
              {faqItems.map((item, i) => (
                <div key={i} className="py-5">
                  <p className="text-sm font-semibold text-foreground">
                    {item.q}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {item.a}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 13 — CLOSE ──────── */}
        <div className="deck-slide flex flex-col items-center justify-center text-center px-6">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeIn}>
              <H>Ready To Fill Your Calendar?</H>
            </motion.div>
            <motion.p
              variants={fadeIn}
              className="text-muted-foreground text-sm mt-4 mb-10"
            >
              One clinic per city. Spots are limited.
            </motion.p>
            <motion.a
              variants={fadeIn}
              href="mailto:hello@upperhand.com.au"
              className="inline-block bg-primary text-primary-foreground font-bold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              LET'S TALK →
            </motion.a>
            <motion.p
              variants={fadeIn}
              className="text-muted-foreground text-sm mt-6"
            >
              (02) 5300 8009
            </motion.p>
            <motion.div variants={fadeIn} className="mt-8">
              <Logo />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Side arrows */}
      <button
        onClick={() => scrollToSlide(Math.max(activeSlide - 1, 0))}
        className="fixed left-3 top-1/2 -translate-y-1/2 z-50 text-muted-foreground hover:text-foreground transition-colors opacity-30 hover:opacity-80"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>
      <button
        onClick={() =>
          scrollToSlide(Math.min(activeSlide + 1, TOTAL_SLIDES - 1))
        }
        className="fixed right-3 top-1/2 -translate-y-1/2 z-50 text-muted-foreground hover:text-foreground transition-colors opacity-30 hover:opacity-80"
        aria-label="Next slide"
      >
        <ChevronRight className="w-7 h-7" />
      </button>

      {/* Progress dots */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToSlide(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === activeSlide
                ? "bg-primary scale-125"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
