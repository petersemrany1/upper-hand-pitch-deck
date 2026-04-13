import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import FeatureCard from "../components/FeatureCard";
import ROICalculator from "../components/ROICalculator";
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

const TOTAL_SLIDES = 12;

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const PHOTOS = {
  emptyClinic:
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
  confidentMan:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
  videoStudio:
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&q=80&auto=format&fit=crop",
  officePhone:
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
  officeReview:
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80&auto=format&fit=crop",
};

/* Small accent photo in top-right corner */
function AccentPhoto({ src }: { src: string }) {
  return (
    <div className="absolute top-20 right-8 md:right-12 w-[140px] md:w-[200px] h-[140px] md:h-[200px] rounded-2xl overflow-hidden opacity-60">
      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}

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

  /* Large headline — minimum 64px on desktop */
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2
      className="text-4xl md:text-[4rem] font-extrabold text-foreground leading-[1.08] tracking-tight"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {children}
    </h2>
  );

  /* Bigger, more readable label — 14px, wider tracking */
  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-primary text-sm font-bold tracking-[0.25em] uppercase mb-5">
      {children}
    </p>
  );

  /* Higher-contrast subtext color */
  const subClass = "text-[#CCCCCC] text-sm md:text-base leading-relaxed";

  const faqItems = [
    { q: "Where is your team?", a: "Sydney, Australia." },
    { q: "Can I see ad examples?", a: "Shared once you're onboard. All approved by you before publishing." },
    { q: "What if a patient doesn't show?", a: "You don't pay. We credit or refund." },
    { q: "How do you book?", a: "Directly into your calendar. We prioritise mid-morning and early afternoon slots." },
    { q: "Whose Meta account?", a: "Ours. You just give us page access. We carry the risk." },
    { q: "Who have you worked with?", a: "Confidentiality agreements in place. Google reviews show our clients." },
  ];

  const valueItems = [
    { service: "Video Ad Creative", value: "$3,000 value" },
    { service: "Meta Campaign Management", value: "$2,000/month value" },
    { service: "Lead Response Team", value: "$5,000/month value" },
    { service: "Qualification Calling", value: "Included" },
    { service: "Calendar Booking", value: "Included" },
    { service: "Post-Consult Follow-Up", value: "Included" },
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
            <motion.p variants={fadeIn} className={`${subClass} mt-8 max-w-md mx-auto`}>
              A done-for-you patient acquisition system.
            </motion.p>
          </motion.div>
          <div className="absolute bottom-10 animate-pulse-bounce">
            <ChevronDown className="w-6 h-6 text-[#CCCCCC]" />
          </div>
        </div>

        {/* ──────── SLIDE 2 — THE OPPORTUNITY ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.emptyClinic} />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeIn}>
              <Label>THE OPPORTUNITY</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>More Procedures. Less Effort.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-3 max-w-lg">
              <FeatureCard title="Slow Follow-Up" description="Leads go cold before anyone calls." />
              <FeatureCard title="Wrong Patients" description="Price shoppers waste your surgeon's time." />
              <FeatureCard title="No Shows" description="Empty consult slots = lost procedure revenue." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 3 — THE SOLUTION ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <Label>THE SOLUTION</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>We Fill Your Calendar. You Just Show Up.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <FeatureCard variant="blue" title="Done For You" description="Ads, calling, booking, follow-up. All handled." />
              <FeatureCard title="Pay Per Show" description="Only pay when the patient attends." />
              <FeatureCard title="No Lock In" description="Rolling monthly. Cancel any time." />
              <FeatureCard title="Exclusive" description="One clinic per city. That clinic is yours." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 4 — WHO WE SEND YOU ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.confidentMan} />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-4xl"
          >
            <motion.div variants={fadeIn} className="mb-10">
              <H>Your Ideal Patient.<br />Ready To Start.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <FeatureCard variant="blue" title="Financially Ready" description="Strong credit or super access." />
              <FeatureCard title="Urgently Motivated" description="Ready to act now." />
              <FeatureCard title="Trust-Oriented" description="Open to expert recommendation." />
              <FeatureCard title="Permanent Solution" description="Not looking at Turkey." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 5 — AD CREATIVE ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.videoStudio} />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <Label>AD CREATIVE</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Proven Creative That Converts.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-3 max-w-lg">
              <FeatureCard variant="blue" title="Speaks To Confidence" description="Pain, identity and outcome-driven messaging." />
              <FeatureCard title="Builds Trust Early" description="Patients feel comfortable before they arrive." />
              <FeatureCard title="AHPRA Compliant" description="Safe to run. No risk to your registration." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 6 — LEAD HANDLING ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.officePhone} />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <Label>LEAD HANDLING</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Lead Handling You'll Be Proud Of.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <FeatureCard variant="blue" title="Qualified Before Booking" description="Only the right patients reach your chair." />
              <FeatureCard title="5 Minute Response" description="Every lead called within 5 minutes." />
              <FeatureCard title="Show-Up System" description="SMS, calls and reminders until they arrive." />
              <FeatureCard title="Same Person" description="One contact builds rapport start to finish." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 7 — POST CONSULT ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.officeReview} />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <Label>POST CONSULT</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>We Follow Up. You Close More.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <FeatureCard variant="blue" title="Objection Handling" description="We call undecided patients and remove roadblocks." />
              <FeatureCard title="Momentum Building" description="Warm follow-ups shorten the decision cycle." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 8 — VALUE STACK ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl w-full"
          >
            <motion.div variants={fadeIn}>
              <Label>WHAT YOU'RE GETTING</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-12">
              <H>Built Internally This Costs $10,000/Month.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-0">
              {valueItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 border-b border-border">
                  <span className="flex items-center text-sm font-semibold text-foreground">
                    <Tick />
                    {item.service}
                  </span>
                  <span className="text-xs text-[#CCCCCC] font-medium">{item.value}</span>
                </div>
              ))}
            </motion.div>
            <motion.div variants={fadeIn} className="mt-12">
              <p
                className="text-xl md:text-2xl font-extrabold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Your investment:{" "}
                <span className="text-primary">$1,300 per patient who shows up.</span>
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 9 — ROI CALCULATOR ──────── */}
        <ROICalculator />

        {/* ──────── SLIDE 10 — TRIAL GUARANTEE ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeIn}>
              <Label>THE GUARANTEE</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-8">
              <H>Start With 10 Shows. Risk Free.</H>
            </motion.div>
            <motion.p variants={fadeIn} className={`${subClass} mb-10 max-w-xl`}>
              If you don't see at least 2 procedures go ahead after your first
              10 shows, we'll give you 5 additional shows completely free. We
              qualify hard. We back ourselves.
            </motion.p>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              <FeatureCard variant="blue" title="No Show = No Charge" description="You never pay for an empty seat." />
              <FeatureCard title="Free Top-Up" description="5 free shows if 2 don't convert." />
              <FeatureCard title="No Lock In" description="Cancel any time after your trial." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 11 — FAQ ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeIn}>
              <Label>FAQ</Label>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Questions I Get Asked.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="divide-y divide-border">
              {faqItems.map((item, i) => (
                <div key={i} className="py-5">
                  <p className="text-base font-semibold text-foreground">{item.q}</p>
                  <p className="text-sm text-[#CCCCCC] mt-1.5">{item.a}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 12 — CLOSE ──────── */}
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
            <motion.p variants={fadeIn} className={`${subClass} mt-4 mb-10`}>
              One clinic per city. Spots are limited.
            </motion.p>
            <motion.a
              variants={fadeIn}
              href="mailto:hello@example.com"
              className="inline-block bg-primary text-primary-foreground font-bold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              LET'S TALK →
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Side arrows */}
      <button
        onClick={() => scrollToSlide(Math.max(activeSlide - 1, 0))}
        className="fixed left-3 top-1/2 -translate-y-1/2 z-50 text-[#CCCCCC] hover:text-foreground transition-colors opacity-30 hover:opacity-80"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>
      <button
        onClick={() => scrollToSlide(Math.min(activeSlide + 1, TOTAL_SLIDES - 1))}
        className="fixed right-3 top-1/2 -translate-y-1/2 z-50 text-[#CCCCCC] hover:text-foreground transition-colors opacity-30 hover:opacity-80"
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
                : "bg-[#CCCCCC]/30 hover:bg-[#CCCCCC]/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
