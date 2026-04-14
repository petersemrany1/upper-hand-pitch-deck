import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import FeatureCard from "../components/FeatureCard";
import ROICalculator from "../components/ROICalculator";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

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

const CONVERT_RATES: Record<string, number> = {
  "1 in 4": 0.25,
  "1 in 3": 0.333,
  "1 in 2": 0.5,
};
const COST_PER_SHOW = 1100; // $1,000 + GST

/* Small accent photo in top-right corner */
function AccentPhoto({ src }: { src: string }) {
  return (
    <div className="absolute top-20 right-8 md:right-12 w-[140px] md:w-[200px] h-[140px] md:h-[200px] rounded-2xl overflow-hidden opacity-60">
      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}

/* Pre-deck settings popup */
function SettingsPopup({ onEnter }: { onEnter: (caseValue: number, convertRate: string) => void }) {
  const [caseValue, setCaseValue] = useState(12000);
  const [convertRate, setConvertRate] = useState("1 in 4");

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <h2
          className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Before We Begin
        </h2>
        <p className="text-[#CCCCCC] text-sm mb-10">
          Set your clinic's numbers so the deck is personalised to you.
        </p>

        <div className="space-y-6 mb-10">
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Average Case Value ($)
            </label>
            <input
              type="number"
              value={caseValue}
              onChange={(e) => setCaseValue(Number(e.target.value) || 0)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Conversion Rate
            </label>
            <select
              value={convertRate}
              onChange={(e) => setConvertRate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              {Object.keys(CONVERT_RATES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => onEnter(caseValue, convertRate)}
          className="w-full bg-primary text-primary-foreground font-bold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          ENTER PRESENTATION →
        </button>
      </div>
    </div>
  );
}

function PitchDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPopup, setShowPopup] = useState(true);
  const [caseValue, setCaseValue] = useState(12000);
  const [convertRate, setConvertRate] = useState("1 in 4");

  const handleEnter = (cv: number, cr: string) => {
    setCaseValue(cv);
    setConvertRate(cr);
    setShowPopup(false);
  };

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
    if (showPopup) return;
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
  }, [activeSlide, scrollToSlide, showPopup]);

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

  /* Helpers */
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2
      className="text-4xl md:text-[4rem] font-extrabold text-foreground leading-[1.08] tracking-tight"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {children}
    </h2>
  );

  const ChapterLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-primary text-lg md:text-xl font-bold tracking-[0.25em] uppercase mb-5">
      {children}
    </p>
  );

  const subClass = "text-[#CCCCCC] text-sm md:text-base leading-relaxed";

  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

  /* Dynamic pricing packs */
  const rate = CONVERT_RATES[convertRate] ?? 0.25;
  const packs = useMemo(() => [
    { name: "Demo", shows: 10, highlight: false },
    { name: "Starter", shows: 20, highlight: true },
    { name: "Scale", shows: 50, highlight: false },
  ], []);

  const faqItems = [
    { q: "What if a patient doesn't show?", a: "You don't pay. Simple as that. We credit or refund immediately." },
    { q: "What if you can't get me leads in time?", a: "That hasn't happened in this industry. But if it did, we'd refund your investment in full." },
    { q: "Where is your team?", a: "Sydney, Australia." },
    { q: "Can I see ad examples?", a: "Shared once you're onboard. All approved by you before anything goes live." },
    { q: "Whose Meta account?", a: "Ours. You give us page access. We carry the risk." },
    { q: "What about confidentiality?", a: "Everything is white label. We never share your name or results with other clinics." },
  ];

  if (showPopup) {
    return <SettingsPopup onEnter={handleEnter} />;
  }

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
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
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
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>THE OPPORTUNITY</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Your Chair Is Too Expensive To Leave Empty.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-3 max-w-xl">
              <FeatureCard title="Your Surgeon Is Sitting Idle" description="Every empty consult slot is a $15,000 procedure that didn't happen." />
              <FeatureCard title="Leads Go Cold In Minutes" description="If you're not calling within 5 minutes, someone else is. Usually Turkey." />
              <FeatureCard title="Wrong People Waste Everyone's Time" description="Price shoppers and tyre kickers burn your surgeon's day and your team's energy." />
              <FeatureCard title="No Follow Up System" description="Patients who don't book on the day disappear forever. There's no one bringing them back." />
              <FeatureCard variant="blue" title="You're Running A Clinic, Not A Sales Team" description="You shouldn't have to be. That's exactly what we are." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 3 — WE FILL YOUR CALENDAR ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>THE MODEL</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>We're Not An Agency. We're Your Sales Team.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-3 max-w-xl">
              <FeatureCard variant="blue" title="We Run The Entire Pipeline" description="Ads, calls, qualification, booking, follow-up. You do nothing until they're in your chair." />
              <FeatureCard title="Pay Per Show. Not Per Click." description="Every other agency charges you to run ads. We charge you when a qualified patient shows up." />
              <FeatureCard title="No Guesswork On Budget" description="You know exactly what each patient costs before you start. $1,000 + GST per show." />
              <FeatureCard title="Exclusive To Your City" description="We don't work with your competitors. One clinic per market, full stop." />
              <FeatureCard title="Proven Systems" description="Scripts, ad creative, follow-up sequences — all built and tested. Nothing experimental." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 4 — YOUR IDEAL PATIENT ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.confidentMan} />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn} className="mb-10">
              <H>We Only Send You People Ready To Buy.</H>
              <p className={`${subClass} mt-4 max-w-xl`}>
                Patients who know it costs between $10,000–$20,000 and want the surgery. Not a consultation about maybe.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <FeatureCard variant="blue" title="Financially Ready" description="They've done the research. They know the price. They're not shocked by the number." />
              <FeatureCard title="Pain Driven" description="They've been sitting on this for years. They're ready to stop waiting." />
              <FeatureCard title="Wants Permanent Results" description="Not interested in medications or SMP. They want the transplant and they want it done right." />
              <FeatureCard title="Not Going To Turkey" description="Pre-qualified against the overseas option. They want local, accountable, quality care." />
            </motion.div>
            <motion.p variants={fadeIn} className="text-xs text-[#999] mt-6 max-w-xl">
              Other inquiries like SMP or medication consultations? We send those through as a bonus at no charge.
            </motion.p>
          </motion.div>
        </div>

        {/* ──────── SLIDE 5 — AD CREATIVE ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.videoStudio} />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>AD CREATIVE</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Proven Creative That Converts.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-3 max-w-lg">
              <FeatureCard variant="blue" title="Built Around Your Ideal Patient" description="Every ad speaks directly to men who know they have a problem and are ready to fix it." />
              <FeatureCard title="AHPRA Compliant" description="No before and after language. No guarantee claims. Safe to run, nothing at risk." />
              <FeatureCard title="Fresh Every 3 Weeks" description="Ad fatigue kills results. We rotate creative continuously so performance stays consistent." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 6 — LEAD HANDLING ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.officePhone} />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>LEAD HANDLING</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Every Lead Handled Like It's Worth $15,000. Because It Is.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-3 max-w-xl">
              <FeatureCard variant="blue" title="5 Minute Response" description="Every inquiry called within 5 minutes. No exceptions." />
              <FeatureCard title="Qualified Before They Hit Your Calendar" description="We confirm budget, motivation, and transplant intent before a single booking is made." />
              <FeatureCard title="We Know When To Push" description="Our team knows how to move a patient forward without burning them or leaving them with a bad taste." />
              <FeatureCard title="One Person, Start To Finish" description="Same contact builds the relationship. No handoffs that lose trust." />
              <FeatureCard title="No Show Prevention" description="SMS, calls, reminders. We make sure they actually arrive." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 7 — POST CONSULT ──────── */}
        <div className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <AccentPhoto src={PHOTOS.officeReview} />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>POST CONSULT</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Not Booked On The Day? We're Not Done.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-3 max-w-xl">
              <FeatureCard variant="blue" title="We Bring Them Back" description="Undecided patients get a structured follow-up sequence. Not aggressive. Just consistent." />
              <FeatureCard title="Objection Handling" description="We know the objections before they say them. Price, timing, Turkey. All handled." />
              <FeatureCard title="We Protect Your Reputation" description="We don't push patients to the point of frustration. No one leaves angry and no one leaves a review before they've given you a fair shot." />
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 8 — ROI CALCULATOR ──────── */}
        <ROICalculator caseValue={caseValue} convertRate={convertRate} />

        {/* ──────── SLIDE 9 — CHOOSE YOUR PACK ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl w-full">
            <motion.div variants={fadeIn}>
              <ChapterLabel>PACKAGES</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-12">
              <H>Choose How Many Patients You Want.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packs.map((pack) => {
                const revenue = pack.shows * rate * caseValue;
                const cost = pack.shows * COST_PER_SHOW;
                return (
                  <div
                    key={pack.name}
                    className={`rounded-xl border p-6 ${
                      pack.highlight
                        ? "bg-primary/10 border-primary ring-1 ring-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    {pack.highlight && (
                      <p className="text-xs text-primary font-bold tracking-widest uppercase mb-3">RECOMMENDED</p>
                    )}
                    <h3 className="text-xl font-extrabold text-foreground mb-1">{pack.name}</h3>
                    <p className="text-[#CCCCCC] text-sm mb-6">{pack.shows} qualified patients</p>
                    <p className="text-xs text-[#CCCCCC] mb-1">$1,000 + GST each</p>
                    <div className="border-t border-border mt-4 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#CCCCCC]">Est. Revenue</span>
                        <span className="text-primary font-bold">{fmt(revenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#CCCCCC]">Investment</span>
                        <span className="text-foreground font-bold">{fmt(cost)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 10 — TRIAL GUARANTEE ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>THE GUARANTEE</ChapterLabel>
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
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>FAQ</ChapterLabel>
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
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
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
