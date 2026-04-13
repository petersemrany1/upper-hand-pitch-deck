import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
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
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      scrollToSlide(diff > 0 ? Math.min(activeSlide + 1, TOTAL_SLIDES - 1) : Math.max(activeSlide - 1, 0));
    }
  };

  const Tick = () => <Check className="w-4 h-4 text-primary inline mr-2 shrink-0" />;

  const faqItems = [
    { q: "Where is your team based?", a: "Sydney, Australia. All calling and booking handled locally." },
    { q: "What hair transplant clinics have you worked with?", a: "We have confidentiality agreements in place. You can find us via Google reviews where clients have left 5 star feedback." },
    { q: "Can I see your ad examples today?", a: "We share our full ad strategy once you come on board. All ads are sent for your approval before publishing." },
    { q: "What happens if a patient doesn't attend?", a: "You don't pay. Simple. We credit or refund every no-show." },
    { q: "How do you book appointments?", a: "Directly into your calendar system. We've analysed hundreds of bookings and know mid-morning and early afternoon slots convert best — we prioritise those to maximise your show rate." },
    { q: "Do you run ads under our Meta account?", a: "No. We run under our agency account. We only need access to your Facebook page. We take on the risk of account suspensions." },
  ];

  const timelineSteps = [
    { title: "Strategy Call", desc: "We learn your clinic, capacity and target patient." },
    { title: "Ad Creative", desc: "We produce your video and static ad content." },
    { title: "Campaign Launch", desc: "Ads go live on Meta targeting your ideal patient." },
    { title: "Lead Contact", desc: "Every enquiry called within 5 minutes." },
    { title: "Qualification", desc: "We screen for intent, budget and suitability." },
    { title: "Confirmed Show", desc: "Qualified patient booked directly into your calendar." },
  ];

  const pricingFeatures = [
    "10 Guaranteed Show Appointments",
    "Full Ad Creative Produced",
    "Lead Qualification & Calling",
    "Calendar Booking Management",
    "Show-Up Reminder System",
    "Post-Consult Follow Up",
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
        {/* SLIDE 1 — COVER */}
        <div className="deck-slide flex flex-col items-center justify-center text-center px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h1 variants={fadeIn} className="text-5xl md:text-8xl lg:text-9xl font-black leading-none tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              HAIR TRANSPLANT<br />
              <span className="text-primary">MARKETING</span><br />
              THAT WORKS EVERY TIME
            </motion.h1>
            <motion.p variants={fadeIn} className="text-muted-foreground text-base md:text-lg mt-6 max-w-xl mx-auto">
              A done-for-you patient acquisition system for hair transplant clinics.
            </motion.p>
          </motion.div>
          <div className="absolute bottom-10 animate-pulse-bounce">
            <ChevronDown className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* SLIDE 2 — THE PROBLEM */}
        <div className="deck-slide flex flex-col justify-center px-6 md:px-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-6xl">
            <motion.span variants={fadeIn} className="text-primary text-sm font-bold tracking-widest uppercase mb-3 block">The Problem</motion.span>
            <motion.h2 variants={fadeIn} className="text-3xl md:text-6xl font-black text-foreground mb-10" style={{ fontFamily: "var(--font-display)" }}>
              YOUR CALENDAR ISN'T FULL. HERE'S WHY.
            </motion.h2>
            <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FeatureCard title="Leads Ghost You" description="Enquiries come in but speed to contact is slow. By the time someone calls back the patient has moved on or lost interest." />
              <FeatureCard title="Wrong Patients Showing Up" description="Price shoppers, tyre kickers, Turkey-minded patients. They waste your surgeon's time and never convert." />
              <FeatureCard title="No Show, No Revenue" description="Booked appointments that don't show cost you a consult slot, surgeon time, and lost procedure revenue." />
            </motion.div>
          </motion.div>
        </div>

        {/* SLIDE 3 — THE SOLUTION */}
        <div className="deck-slide flex flex-col items-center justify-center text-center px-6 md:px-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl">
            <motion.span variants={fadeIn} className="text-primary text-sm font-bold tracking-widest uppercase mb-3 block">The Solution</motion.span>
            <motion.h2 variants={fadeIn} className="text-3xl md:text-6xl font-black text-foreground mb-10" style={{ fontFamily: "var(--font-display)" }}>
              WE FILL YOUR CALENDAR WITH QUALIFIED PATIENTS. YOU JUST SHOW UP.
            </motion.h2>
            <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard variant="blue" title="Done For You" description="Ads, calling, qualification, booking and show-up management. All handled." />
              <FeatureCard title="Pay Per Show" description="You only pay when the patient physically attends the consultation. No show = no charge." />
              <FeatureCard title="No Lock In" description="Rolling monthly agreement. No fixed term. No retainer." />
              <FeatureCard title="One Clinic Per City" description="We work exclusively with one hair transplant clinic per niche per city." />
            </motion.div>
          </motion.div>
        </div>

        {/* SLIDE 4 — WHO WE TARGET */}
        <div className="deck-slide flex flex-col md:flex-row">
          <div className="hidden md:block md:w-1/2 h-full bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80&auto=format&fit=crop')" }} />
          <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-20 md:py-0">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-black text-foreground mb-8" style={{ fontFamily: "var(--font-display)" }}>
                YOUR IDEAL HAIR TRANSPLANT PATIENTS, READY TO START
              </motion.h2>
              <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FeatureCard variant="blue" title="Financially Ready" description="Strong credit or access to super, able to invest without hesitation." />
                <FeatureCard title="Urgently Motivated" description="Driven by confidence and identity, ready to act now." />
                <FeatureCard title="Trust-Oriented" description="Open to expert recommendation and committed to a quality result." />
                <FeatureCard title="Seeking a Permanent Solution" description="Done with temporary fixes. Looking for a lasting result." />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* SLIDE 5 — AD CREATIVE */}
        <div className="deck-slide flex flex-col md:flex-row">
          <div className="hidden md:flex md:w-1/2 h-full bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=900&q=80&auto=format&fit=crop')" }}>
            <div className="absolute bottom-8 left-8 right-8">
              <h2 className="text-3xl lg:text-4xl font-black text-foreground drop-shadow-lg" style={{ fontFamily: "var(--font-display)" }}>
                PROVEN AD CREATIVE FOR HAIR TRANSPLANTS
              </h2>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-20 md:py-0">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
              <motion.div variants={fadeIn}>
                <FeatureCard variant="blue" title="Video Content That Resonates" description="Speaks directly to confidence, identity and life-changing outcomes. Pulls in the right audience." />
              </motion.div>
              <motion.div variants={fadeIn}>
                <FeatureCard title="Trust Built Early" description="Natural video content builds comfort and credibility before they walk into the clinic." />
              </motion.div>
              <motion.div variants={fadeIn}>
                <FeatureCard title="AHPRA Compliant" description="Crafted within Facebook's strict ad policies and AHPRA guidelines. Results without the risk." />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* SLIDE 6 — LEAD HANDLING */}
        <div className="deck-slide flex flex-col md:flex-row">
          <div className="hidden md:block md:w-1/2 h-full bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=80&auto=format&fit=crop')" }} />
          <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-20 md:py-0">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-black text-foreground mb-8" style={{ fontFamily: "var(--font-display)" }}>
                LEAD & BOOKING HANDLING YOU'LL BE PROUD OF
              </motion.h2>
              <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FeatureCard variant="blue" title="Qualified Before Booking" description="Every lead screened so only the right patients land in your chair." />
                <FeatureCard title="Proven Show-Up Tactics" description="We call, text and follow up so patients feel connected and committed before they arrive." />
                <FeatureCard title="Speed To Lead" description="Every enquiry contacted within 5 minutes during business hours." />
                <FeatureCard title="Same Person Every Time" description="The same team member follows each patient from enquiry to consultation to build rapport and trust." />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* SLIDE 7 — POST CONSULT */}
        <div className="deck-slide flex flex-col md:flex-row">
          <div className="hidden md:block md:w-1/2 h-full bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1580489944761-15a19d654956?w=900&q=80&auto=format&fit=crop')" }} />
          <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-20 md:py-0">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-black text-foreground mb-8" style={{ fontFamily: "var(--font-display)" }}>
                POST APPOINTMENT FOLLOW UP — IMPROVES YOUR CONVERSION RATE
              </motion.h2>
              <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FeatureCard variant="blue" title="Objection Handling" description="We call patients after their consult to answer questions and remove roadblocks to proceeding." />
                <FeatureCard title="Momentum Building" description="Timely follow-ups keep patients warm and motivated, shortening the decision cycle." />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* SLIDE 8 — ROI CALCULATOR */}
        <ROICalculator />

        {/* SLIDE 9 — PRICING */}
        <div className="deck-slide flex flex-col items-center justify-center px-6 md:px-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl w-full text-center">
            <motion.h2 variants={fadeIn} className="text-3xl md:text-6xl font-black text-foreground mb-10" style={{ fontFamily: "var(--font-display)" }}>
              SIMPLE PRICING. PAY PER SHOW.
            </motion.h2>
            <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-foreground text-background rounded-lg p-8 text-left">
                <p className="text-sm font-bold tracking-widest uppercase mb-4">STARTER</p>
                <p className="text-3xl font-black mb-1" style={{ fontFamily: "var(--font-display)" }}>$1,300</p>
                <p className="text-sm opacity-60 mb-2">per showed consultation</p>
                <p className="text-sm opacity-60 mb-6">10 show trial package to get started</p>
                <ul className="space-y-3 text-sm">
                  {pricingFeatures.map((f) => (
                    <li key={f} className="flex items-start"><Tick />{f}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-foreground text-background rounded-lg p-8 text-left border-2 border-primary relative">
                <span className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                <p className="text-sm font-bold tracking-widest uppercase mb-4">SCALE</p>
                <p className="text-3xl font-black mb-1" style={{ fontFamily: "var(--font-display)" }}>$1,300</p>
                <p className="text-sm opacity-60 mb-2">per showed consultation</p>
                <p className="text-sm opacity-60 mb-6">20–40+ shows per month for growing clinics</p>
                <ul className="space-y-3 text-sm">
                  {pricingFeatures.map((f) => (
                    <li key={f} className="flex items-start"><Tick />{f}</li>
                  ))}
                  <li className="flex items-start"><Tick />Priority Onboarding & Dedicated Account Manager</li>
                </ul>
              </div>
            </motion.div>
            <motion.p variants={fadeIn} className="text-xs text-muted-foreground mt-6">
              *Single implant enquiries that come through organically are a bonus — not counted toward your package.
            </motion.p>
          </motion.div>
        </div>

        {/* SLIDE 10 — HOW IT WORKS */}
        <div className="deck-slide flex flex-col items-center justify-center px-6 md:px-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-6xl w-full">
            <motion.span variants={fadeIn} className="text-primary text-sm font-bold tracking-widest uppercase mb-3 block text-center">The Process</motion.span>
            <motion.h2 variants={fadeIn} className="text-3xl md:text-6xl font-black text-foreground mb-14 text-center" style={{ fontFamily: "var(--font-display)" }}>
              FROM ZERO TO FULL CALENDAR IN 7 DAYS
            </motion.h2>
            <motion.div variants={fadeIn} className="relative">
              <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-primary" />
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                {timelineSteps.map((step, i) => (
                  <div key={i} className="text-center relative">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 relative z-10">
                      <span className="text-primary-foreground font-bold text-sm">{i + 1}</span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.p variants={fadeIn} className="text-sm text-muted-foreground mt-10 text-center">
              Onboarding to first campaign live: 7 days.
            </motion.p>
          </motion.div>
        </div>

        {/* SLIDE 11 — FAQ */}
        <div className="deck-slide flex flex-col items-center justify-center px-6 md:px-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl w-full">
            <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-black text-foreground mb-10 text-center" style={{ fontFamily: "var(--font-display)" }}>
              QUESTIONS I GET ASKED EVERY TIME
            </motion.h2>
            <motion.div variants={fadeIn} className="bg-card border border-border rounded-lg divide-y divide-border">
              {faqItems.map((item, i) => (
                <div key={i} className="p-6">
                  <p className="text-base font-bold text-foreground mb-1">{item.q}</p>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* SLIDE 12 — CLOSING */}
        <div className="deck-slide flex flex-col items-center justify-center text-center px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeIn} className="text-4xl md:text-7xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              READY TO FILL YOUR CALENDAR?
            </motion.h2>
            <motion.p variants={fadeIn} className="text-muted-foreground text-lg mb-10">
              We take one clinic per niche per city. Spots are limited.
            </motion.p>
            <motion.a
              variants={fadeIn}
              href="mailto:hello@upperhand.com.au"
              className="inline-block bg-primary text-primary-foreground font-bold text-lg px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity"
              style={{ fontFamily: "var(--font-display)" }}
            >
              LET'S TALK →
            </motion.a>
            <motion.p variants={fadeIn} className="text-muted-foreground text-base mt-6">(02) 5300 8009</motion.p>
            <motion.p variants={fadeIn} className="text-xs text-muted-foreground mt-8">© 2026 All rights reserved.</motion.p>
          </motion.div>
        </div>
      </div>

      {/* Side arrows */}
      <button
        onClick={() => scrollToSlide(Math.max(activeSlide - 1, 0))}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 text-muted-foreground hover:text-foreground transition-colors opacity-40 hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        onClick={() => scrollToSlide(Math.min(activeSlide + 1, TOTAL_SLIDES - 1))}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 text-muted-foreground hover:text-foreground transition-colors opacity-40 hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Progress dots */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToSlide(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === activeSlide ? "bg-primary scale-125" : "bg-muted-foreground/40 hover:bg-muted-foreground"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
