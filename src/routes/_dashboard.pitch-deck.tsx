import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import ROICalculator from "../components/ROICalculator";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronDown, Maximize, Minimize } from "lucide-react";

export const Route = createFileRoute("/_dashboard/pitch-deck")({
  component: PitchDeck,
  head: () => ({
    meta: [
      { title: "Pitch Deck" },
      { name: "description", content: "Hair transplant marketing pitch deck." },
    ],
  }),
});

const TOTAL_SLIDES = 10;

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const CONVERT_RATES: Record<string, number> = {
  "1 in 4": 0.25,
  "1 in 3": 0.333,
  "1 in 2": 0.5,
};
const COST_PER_SHOW = 1100;

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
          Set Your Presentation Numbers
        </h2>
        <p className="text-[#CCCCCC] text-sm mb-10">
          These values personalise the ROI, packages, and guarantee slides.
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
          START PRESENTATION →
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleEnter = (cv: number, cr: string) => {
    setCaseValue(cv);
    setConvertRate(cr);
    setShowPopup(false);
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      scrollToSlide(diff > 0 ? Math.min(activeSlide + 1, TOTAL_SLIDES - 1) : Math.max(activeSlide - 1, 0));
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

  const rate = CONVERT_RATES[convertRate] ?? 0.25;

  const packs = useMemo(() => [
    { name: "Demo", shows: 10, highlight: false },
    { name: "Starter", shows: 20, highlight: false },
    { name: "Scale", shows: 50, highlight: false },
  ], []);

  const faqItems = [
    { q: "What if a patient doesn't show?", a: "You don't pay. Simple as that. We credit or refund immediately." },
    { q: "What if you can't get me leads in time?", a: "That hasn't happened in this industry. But if it did, we'd refund your investment in full." },
    { q: "What dental implant clients have you worked with?", a: "We've worked with clinics all over Australia. Confidentiality agreements prevent us from naming them — the same protection applies to you." },
    { q: "Can I see ad examples?", a: "Yes. Shared once you're onboard. Everything approved by you before it goes live." },
    { q: "Where is your team?", a: "Sydney, Australia." },
    { q: "Whose Meta account do you use?", a: "Ours. You give us page access. We carry the risk." },
  ];

  /* Guarantee dynamic values */
  const guaranteeProcs = 2;
  const guaranteeRevenue = guaranteeProcs * caseValue;

  if (showPopup) {
    return <SettingsPopup onEnter={handleEnter} />;
  }

  return (
    <div className="relative group">
      {/* Fullscreen toggle — visible on hover */}
      <button
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-card/80 border border-border text-[#CCCCCC] hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Toggle fullscreen"
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

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
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>THE OPPORTUNITY</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-6">
              <H>You're Spending Money On People Who Were Never Going To Buy.</H>
            </motion.div>
            <motion.p variants={fadeIn} className={`${subClass} mb-12 max-w-2xl`}>
              Most clinics are drowning in the wrong leads. Tyre kickers, price shoppers, and people who were always going to book Turkey.
            </motion.p>
            <motion.div variants={fadeIn} className="space-y-8 max-w-2xl">
              <div>
                <p className="text-lg md:text-xl font-bold text-foreground leading-snug">Your surgeon's time is your most expensive asset.</p>
                <p className="text-[#CCCCCC] text-sm mt-1.5">Empty chairs and wrong patients are costing you $15,000 a slot.</p>
              </div>
              <div>
                <p className="text-lg md:text-xl font-bold text-foreground leading-snug">Leads go cold in minutes.</p>
                <p className="text-[#CCCCCC] text-sm mt-1.5">If you're not calling within 5 minutes someone else is.</p>
              </div>
              <div>
                <p className="text-lg md:text-xl font-bold text-foreground leading-snug">No follow-up system means patients who don't book on the day are gone forever.</p>
                <p className="text-[#CCCCCC] text-sm mt-1.5">There's no one bringing them back.</p>
              </div>
              <div>
                <p className="text-lg md:text-xl font-bold text-foreground leading-snug">You're running a clinic. You shouldn't also have to run a sales team.</p>
                <p className="text-[#CCCCCC] text-sm mt-1.5">That's exactly what we are.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 3 — OUR PROCESS ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>OUR PROCESS</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-12">
              <H>Here's How We Work.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mb-12">
              {[
                { step: 1, title: "We Run The Ads", desc: "Targeted creative built around your ideal patient. AHPRA compliant. Nothing goes live without your approval." },
                { step: 2, title: "We Call Every Lead Within 5 Minutes", desc: "Every inquiry qualified on the phone. Budget, motivation, and transplant intent confirmed before anyone touches your calendar." },
                { step: 3, title: "We Book Confirmed Appointments", desc: "Only vetted, ready-to-buy patients land in your diary. No tyre kickers. No price shoppers." },
                { step: 4, title: "We Follow Up After The Consult", desc: "Didn't book on the day? We bring them back. Structured follow-up without burning the relationship." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-lg">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-base md:text-lg font-bold text-foreground mb-1.5">{item.title}</p>
                    <p className="text-[#CCCCCC] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
            <motion.div variants={fadeIn}>
              <p
                className="text-2xl md:text-3xl font-extrabold text-foreground leading-snug"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Pay Per Show. Not Per Click.{" "}
                <span className="text-[#CCCCCC] font-normal text-lg md:text-xl">
                  You only pay when a qualified patient sits in your chair.
                </span>
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 4 — WHO WE SEND YOU ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn} className="mb-10">
              <H>Who We'll Be Sending You.</H>
              <p className={`${subClass} mt-4 max-w-xl`}>
                Patients who know it costs between $10,000–$20,000 and want the surgery. Not a consultation about maybe.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
              {[
                { title: "Financially Ready", desc: "They've done the research. They know the price. They're not shocked by the number." },
                { title: "Pain Driven", desc: "They've been sitting on this for years. They're ready to stop waiting." },
                { title: "Wants Permanent Results", desc: "Not interested in medications or SMP. They want the transplant and they want it done right." },
                { title: "Not Going To Turkey", desc: "Pre-qualified against the overseas option. They want local, accountable, quality care." },
              ].map((card) => (
                <div key={card.title} className="py-2">
                  <p className="text-base font-bold text-foreground mb-1">{card.title}</p>
                  <p className="text-[#CCCCCC] text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </motion.div>
            <motion.p variants={fadeIn} className="text-xs text-[#999] mt-8 max-w-xl">
              Other inquiries like SMP or medication consultations? We send those through as a bonus at no charge.
            </motion.p>
          </motion.div>
        </div>

        {/* ──────── SLIDE 5 — POST CONSULT ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>POST CONSULT</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-10">
              <H>Not Booked On The Day? We're Not Done.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="space-y-6 max-w-xl">
              <div>
                <p className="text-base font-bold text-foreground mb-1">We Bring Them Back</p>
                <p className="text-[#CCCCCC] text-sm leading-relaxed">Undecided patients get a structured follow-up sequence. Not aggressive. Just consistent.</p>
              </div>
              <div>
                <p className="text-base font-bold text-foreground mb-1">Objection Handling</p>
                <p className="text-[#CCCCCC] text-sm leading-relaxed">We know the objections before they say them. Price, timing, Turkey. All handled.</p>
              </div>
              <div>
                <p className="text-base font-bold text-foreground mb-1">We Protect Your Reputation</p>
                <p className="text-[#CCCCCC] text-sm leading-relaxed">We don't push patients to the point of frustration. No one leaves angry and no one leaves a review before they've given you a fair shot.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 6 — ROI CALCULATOR ──────── */}
        <ROICalculator caseValue={caseValue} convertRate={convertRate} />

        {/* ──────── SLIDE 7 — PACKAGES ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl w-full">
            <motion.div variants={fadeIn}>
              <ChapterLabel>PACKAGES</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-12">
              <H>Choose How Many Patients You Want.</H>
            </motion.div>
            <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packs.map((pack) => {
                const revenue = pack.shows * rate * caseValue;
                const cost = pack.shows * COST_PER_SHOW;
                return (
                  <div
                    key={pack.name}
                    className="rounded-xl border border-border bg-card p-8"
                  >
                    <h3 className="text-xl font-extrabold text-foreground mb-1">{pack.name}</h3>
                    <p className="text-[#CCCCCC] text-sm mb-6">{pack.shows} qualified patients</p>
                    <p className="text-xs text-[#CCCCCC] mb-4">$1,000 + GST each</p>
                    <div className="border-t border-border pt-4 space-y-3">
                      <div>
                        <p className="text-xs text-[#CCCCCC] mb-0.5">Est. Revenue</p>
                        <p className="text-2xl font-extrabold text-primary">{fmt(revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#CCCCCC] mb-0.5">Investment</p>
                        <p className="text-lg font-bold text-foreground">{fmt(cost)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 8 — THE GUARANTEE ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
          <SlideHeader />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl">
            <motion.div variants={fadeIn}>
              <ChapterLabel>THE GUARANTEE</ChapterLabel>
            </motion.div>
            <motion.div variants={fadeIn} className="mb-8">
              <H>If We Don't Deliver, You Don't Lose.</H>
            </motion.div>
            <motion.p variants={fadeIn} className={`${subClass} mb-10 max-w-2xl text-base`}>
              Start with 10 qualified shows. At {convertRate}, that's {Math.round(10 * rate)} procedures — worth{" "}
              <span className="text-primary font-bold">{fmt(Math.round(10 * rate) * caseValue)}</span> in revenue.
              If you don't get at least {guaranteeProcs} procedures go ahead, we'll give you 5 additional shows completely free.
              <br /><br />
              At <span className="text-primary font-bold">{fmt(caseValue)}</span> per procedure,{" "}
              {guaranteeProcs} conversions = <span className="text-primary font-bold">{fmt(guaranteeRevenue)}</span> — more than covers your full investment.
              We qualify hard. We back ourselves completely.
            </motion.p>
            <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
              {[
                { title: "No Show = No Charge", desc: "You never pay for an empty seat." },
                { title: "Free Top-Up", desc: "5 free shows if 2 don't convert from your first 10." },
                { title: "No Lock In", desc: "Cancel any time after your trial." },
              ].map((card) => (
                <div key={card.title} className="bg-card border border-border rounded-xl p-5">
                  <p className="text-sm font-bold text-foreground mb-1">{card.title}</p>
                  <p className="text-xs text-[#CCCCCC]">{card.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* ──────── SLIDE 9 — FAQ ──────── */}
        <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
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

        {/* ──────── SLIDE 10 — CLOSE ──────── */}
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
