// Ported from the Legal app (family-law-floater/src/components/marketing/prominent-website.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheck,
  Headphones,
  Menu,
  Play,
  Megaphone,
  MonitorPlay,
  Phone,
  Search,
  Scale,
  UserRound,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  PROMINENT_INDUSTRIES,
  calculateProminentEstimate,
  type ProminentIndustry,
} from "@/legal/lib/prominent-calculator";
import { DISCOVERY_BOOKING_URL } from "@/legal/lib/marketing-tracking";
import meetingRoom from "@/legal/assets/meeting-room.jpg";
import followupAgent from "@/legal/assets/followup-agent.jpg";
import prominentWordmark from "@/legal/assets/prominent-wordmark.webp";
import prominentFavicon from "@/legal/assets/prominent-spotlight-icon.png";
import marketingCss from "@/legal/styles/prominent-website.css?url";
import homeCss from "@/legal/styles/prominent-home.css?url";
import conversionCss from "@/legal/styles/prominent-home-conversion.css?url";
import { mountHeroLightSurface } from "./hero-light-surface";
import { AcquisitionStory, PartnerPortalPreview, PartnerReviews } from "./prominent-home-content";
import {
  HomeReadiness,
  HomeBenefits,
  HomeBusinessValue,
  HomeClosing,
} from "./prominent-home-conversion";

export function prominentHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | Prominent` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | Prominent` },
      { property: "og:description", content: description },
      { name: "author", content: "Prominent" },
    ],
    links: [
      { rel: "stylesheet", href: marketingCss },
      { rel: "stylesheet", href: homeCss },
      { rel: "stylesheet", href: conversionCss },
      { rel: "icon", type: "image/png", href: prominentFavicon },
      { rel: "apple-touch-icon", href: prominentFavicon },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;450;500;550;600;650;700;750;800&display=swap",
      },
    ],
  };
}

const industryLinks = [
  {
    label: "Hair transplants",
    detail: "Prepared candidates for your clinical team",
    href: "/hair-transplants",
  },
  { label: "Family law", detail: "Qualified conversations for your firm", href: "/family-law" },
  {
    label: "Explore our industries",
    detail: "Two industries. One accountable model.",
    href: "/industries",
  },
];

function Brand() {
  return (
    <a href="/" className="prominent-brand" aria-label="Prominent home">
      <img src={prominentWordmark} alt="Prominent" width={768} height={257} />
    </a>
  );
}

function CallButton({
  children = "Book a discovery call",
  light = false,
}: {
  children?: ReactNode;
  light?: boolean;
}) {
  return (
    <a
      className={`prominent-button${light ? " prominent-button-white" : ""}`}
      href={DISCOVERY_BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
}

function NavDropdown({
  label,
  links,
  active,
}: {
  label: string;
  links: typeof industryLinks;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div
      ref={root}
      className="prominent-nav-dropdown"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          root.current?.querySelector("button")?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className={active ? "is-active" : ""}
        aria-expanded={open}
        aria-controls={`prominent-nav-${label}`}
        onClick={() => setOpen(!open)}
      >
        {label}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      <div className="prominent-dropdown-panel" id={`prominent-nav-${label}`} hidden={!open}>
        {links.map((link) => (
          <a key={link.href} href={link.href}>
            <strong>{link.label}</strong>
            <span>{link.detail}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Header({ active }: { active: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [menuOpen]);
  return (
    <header className="prominent-header">
      <div className="prominent-nav-wrap">
        <Brand />
        <nav className="prominent-desktop-nav" aria-label="Main navigation">
          <a href="/" aria-current={active === "home" ? "page" : undefined}>
            Home
          </a>
          <a href="/how-it-works" aria-current={active === "how" ? "page" : undefined}>
            How it works
          </a>
          <NavDropdown label="Industries" links={industryLinks} active={active === "industries"} />
          <a href="/about" aria-current={active === "about" ? "page" : undefined}>
            About
          </a>
          <a href="/calculator" aria-current={active === "calculator" ? "page" : undefined}>
            Calculator
          </a>
        </nav>
        <div className="prominent-nav-actions">
          <CallButton>
            <span className="prominent-call-desktop">Book a discovery call</span>
            <span className="prominent-call-mobile">Book a call</span>
          </CallButton>
          <button
            ref={menuButton}
            className="prominent-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="prominent-mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <nav
        id="prominent-mobile-nav"
        className="prominent-mobile-nav"
        aria-label="Mobile navigation"
        hidden={!menuOpen}
      >
        {[
          ["Home", "/"],
          ["How it works", "/how-it-works"],
          ["Industries", "/industries"],
          ["Hair transplants", "/hair-transplants"],
          ["Family law", "/family-law"],
          ["About", "/about"],
          ["Calculator", "/calculator"],
        ].map(([label, href]) => (
          <a key={href} href={href}>
            {label}
            <ArrowUpRight size={16} />
          </a>
        ))}
        <CallButton />
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="prominent-footer">
      <div className="prominent-container">
        <div className="prominent-footer-grid">
          <div className="prominent-footer-brand">
            <Brand />
            <p>
              More than an enquiry.
              <br />A person ready to meet you.
            </p>
            <p className="prominent-small">
              Pay-per-show growth for hair transplant clinics and family law firms.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="/">Home</a>
            <a href="/how-it-works">How it works</a>
            <a href="/about">About Prominent</a>
            <a href="/calculator">Calculator</a>
          </div>
          <div>
            <h3>Industries</h3>
            <a href="/hair-transplants">Hair transplants</a>
            <a href="/family-law">Family law</a>
            <h3 className="prominent-footer-subheading">The model</h3>
            <a href="/services">Our services</a>
          </div>
          <div>
            <h3>Let’s talk</h3>
            <a href={DISCOVERY_BOOKING_URL} target="_blank" rel="noopener noreferrer">
              Book a discovery call <ArrowUpRight size={14} />
            </a>
            <span className="prominent-footer-location">
              Australia · Pay per show
              <br />
              From the first enquiry to the first meeting.
            </span>
          </div>
        </div>
        <div className="prominent-footer-bottom">
          <span>© {new Date().getFullYear()} PROMINENT. All rights reserved.</span>
          <span>Hair transplants. Family law. Real conversations.</span>
        </div>
      </div>
    </footer>
  );
}

function Layout({ children, active }: { children: ReactNode; active: string }) {
  return (
    <div className={`prominent-site${active === "home" ? " ph-home-conversion" : ""}`}>
      <a href="#prominent-main" className="prominent-skip">
        Skip to content
      </a>
      <Header active={active} />
      <main id="prominent-main">{children}</main>
      <Footer />
    </div>
  );
}

function ArchitecturalGrid() {
  return (
    <>
      <div className="prominent-architectural-grid" aria-hidden="true">
        <div className="prominent-grid-plane" />
        <div className="prominent-signal prominent-signal-one" />
        <div className="prominent-signal prominent-signal-two" />
        <div className="prominent-signal prominent-signal-three" />
        <svg
          className="prominent-orbit-lines"
          viewBox="0 0 1440 800"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path d="M-180 130C180 130 140 690 720 690S1260 130 1620 130" />
          <path d="M-180 225C220 225 180 740 720 740S1220 225 1620 225" />
          <path d="M-180 320C260 320 220 790 720 790S1180 320 1620 320" />
          <path
            className="prominent-flow-trace"
            d="M-180 130C180 130 140 690 720 690S1260 130 1620 130"
          />
          <path
            className="prominent-flow-trace prominent-flow-trace-second"
            d="M-180 225C220 225 180 740 720 740S1220 225 1620 225"
          />
        </svg>
        <div className="prominent-ambient prominent-ambient-one" />
        <div className="prominent-ambient prominent-ambient-two" />
      </div>
    </>
  );
}

function HeroAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) return mountHeroLightSurface(canvasRef.current);
    return undefined;
  }, []);

  return (
    <div className="ph-hero-atmosphere" aria-hidden="true">
      <div className="ph-hero-light-field">
        <svg className="ph-hero-light-fallback" viewBox="0 0 1440 380" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ph-light-fallback" x1="0" y1="0" x2="0.3" y2="1">
              <stop stopColor="#fff" />
              <stop offset="0.5" stopColor="#edf3ff" />
              <stop offset="0.85" stopColor="#b9cefa" />
              <stop offset="1" stopColor="#fff" />
            </linearGradient>
          </defs>
          <path
            d="M-80 300C300 350 650 170 1000 170S1350 240 1520 130L1520 250C1250 380 1100 230 850 300S240 450-80 370Z"
            fill="url(#ph-light-fallback)"
          />
        </svg>
        <canvas ref={canvasRef} className="ph-hero-light-canvas" />
      </div>
    </div>
  );
}

function Eyebrow({ children, dot = false }: { children: ReactNode; dot?: boolean }) {
  return (
    <div className="prominent-eyebrow">
      {dot && <span className="prominent-status-dot" />}
      {children}
    </div>
  );
}
function SectionHeading({
  label,
  title,
  muted,
  children,
}: {
  label?: string;
  title: string;
  muted?: string;
  children?: ReactNode;
}) {
  return (
    <div className="prominent-section-heading">
      {label && <Eyebrow>{label}</Eyebrow>}
      <h2>
        {title} {muted && <span>{muted}</span>}
      </h2>
      {children && <p>{children}</p>}
    </div>
  );
}

function PageHero({
  label,
  title,
  accent,
  children,
}: {
  label: string;
  title: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section className="prominent-page-hero">
      <ArchitecturalGrid />
      <div className="prominent-container">
        <Eyebrow dot>{label}</Eyebrow>
        <h1>
          {title}
          {accent && (
            <>
              <br />
              <span className="prominent-gradient-text">{accent}</span>
            </>
          )}
        </h1>
        <p>{children}</p>
      </div>
    </section>
  );
}

function FinalCTA({
  title = "Let’s build your next stage of growth.",
  children = "Tell us about your clinic or firm. We’ll talk through capacity, qualification criteria and what pay per show could look like for you.",
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <section className="prominent-final-cta">
      <div className="prominent-container">
        <div className="prominent-cta-copy">
          <Eyebrow>LET’S TALK ABOUT YOUR BUSINESS</Eyebrow>
          <h2>{title}</h2>
          <p>{children}</p>
        </div>
        <div className="prominent-cta-action">
          <CallButton light />
          <span className="prominent-cta-caption">
            Review your capacity. Discuss your criteria. Explore the fit.
          </span>
        </div>
      </div>
      <div className="prominent-cta-orbit" aria-hidden="true" />
    </section>
  );
}

const steps = [
  {
    icon: Megaphone,
    title: "We create demand.",
    text: "Creative and campaigns built around the people you want to meet. We manage the advertising and cover the media spend.",
    short: "Ads & creative",
  },
  {
    icon: Phone,
    title: "We have the conversation.",
    text: "Our Australian sales team spends 30–50 minutes understanding each person’s situation, financial readiness and fit. Calls are reviewed in daily huddles.",
    short: "Call & qualify",
  },
  {
    icon: CalendarCheck,
    title: "We get them ready.",
    text: "We coordinate deposits, arrange credit checks where applicable with consent, and manage bookings, reminders and follow-up.",
    short: "Book & prepare",
  },
  {
    icon: CheckCheck,
    title: "They attend. You pay.",
    text: "Your team takes over at the consultation. Your appointment charge is tied to attendance, not the enquiry or booking alone.",
    short: "Attend & meet",
  },
];

function Pipeline({ full = false }: { full?: boolean }) {
  return (
    <section
      className={`prominent-pipeline${full ? " prominent-pipeline-full" : ""}`}
      id="pipeline"
    >
      <div className="prominent-container">
        <div className="prominent-pipeline-header">
          <SectionHeading
            label="How it works"
            title="One partner."
            muted="From first click to first meeting."
          />
          <a href="/how-it-works" className="prominent-text-link">
            See the process <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="prominent-steps">
          {steps.map((step, index) => (
            <div className="prominent-step" key={step.title}>
              <div className="prominent-step-top">
                <span>0{index + 1}</span>
                <step.icon size={23} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
        <div className="prominent-pipeline-note">
          <ShieldCheck size={19} />
          <span>
            One clear outcome: an attended consultation with someone who has been screened and
            prepared.
          </span>
        </div>
      </div>
    </section>
  );
}

function CallPreview({ industry = "legal" }: { industry?: ProminentIndustry }) {
  const checks =
    industry === "hair"
      ? [
          "Goals & expectations understood",
          "Budget & timing discussed",
          "Clinic consultation confirmed",
        ]
      : [
          "Situation & priorities understood",
          "Funding expectations discussed",
          "Firm consultation confirmed",
        ];
  return (
    <div className="prominent-call-preview">
      <div className="prominent-demo-top">
        <span>
          <span className="prominent-status-dot" />
          Qualification call
        </span>
      </div>
      <div className="prominent-call-person">
        <span className="prominent-avatar">
          <Headphones size={21} />
        </span>
        <div>
          <strong>A real conversation.</strong>
          <span>A prepared introduction.</span>
        </div>
        <div className="prominent-audio-bars" aria-hidden="true">
          {[10, 22, 15, 29, 19, 12, 24, 17, 9].map((height, i) => (
            <i key={i} style={{ height }} />
          ))}
        </div>
      </div>
      <div className="prominent-call-checks">
        {checks.map((check) => (
          <div key={check}>
            <span>{check}</span>
            <Check size={15} />
          </div>
        ))}
      </div>
      <div className="prominent-demo-footer">
        <CircleCheck size={15} />
        Ready for your team
      </div>
    </div>
  );
}

function IndustryCards() {
  return (
    <div className="prominent-industry-grid">
      <a href="/hair-transplants" className="prominent-industry-card prominent-hair-card">
        <div className="prominent-industry-card-top">
          <span>01 / HAIR RESTORATION</span>
          <ArrowUpRight size={25} />
        </div>
        <div className="prominent-industry-symbol" aria-hidden="true">
          <Users strokeWidth={1} />
        </div>
        <h3>Hair transplants.</h3>
        <p>
          Conversations with people considering hair restoration, ready to meet your clinical team
          and explore their options.
        </p>
        <div className="prominent-industry-card-bottom">
          <span className="prominent-industry-fit">For specialist clinics</span>
          <span>
            Explore hair transplants <ArrowRight size={16} />
          </span>
        </div>
      </a>
      <a href="/family-law" className="prominent-industry-card prominent-legal-card">
        <div className="prominent-industry-card-top">
          <span>02 / LEGAL</span>
          <ArrowUpRight size={25} />
        </div>
        <div className="prominent-industry-symbol" aria-hidden="true">
          <ShieldCheck strokeWidth={1} />
        </div>
        <h3>Family law.</h3>
        <p>
          People navigating separation, parenting or property matters, prepared for a meaningful
          first meeting with your firm.
        </p>
        <div className="prominent-industry-card-bottom">
          <span className="prominent-industry-fit">For family law firms</span>
          <span>
            Explore family law <ArrowRight size={16} />
          </span>
        </div>
      </a>
    </div>
  );
}

const faqs = [
  [
    "What does pay per show actually mean?",
    "Your appointment charge is based on the person attending the agreed consultation. An enquiry, a form submission or a booking alone is not a show. We agree the qualification and attendance criteria with you before a campaign starts.",
  ],
  [
    "What if someone doesn’t attend?",
    "An unattended appointment does not count as a show. We coordinate follow-up and rebooking where appropriate, and the appointment is counted when the person attends.",
  ],
  [
    "What does Prominent take care of?",
    "The acquisition journey: campaign creative, media spend, enquiry handling, qualification, appointment coordination and reminders. Your proposal sets out the campaign scope and the criteria for a counted appointment.",
  ],
  [
    "Do you guarantee a new client or a procedure?",
    "No. We deliver an attended consultation with a screened prospect. Your team determines suitability and handles advice, treatment recommendations and engagement. The calculator shows scenarios, not guaranteed revenue.",
  ],
  [
    "How do you qualify people for different industries?",
    "We agree an intake brief with you. Hair restoration conversations cover goals, timing, location and budget expectations. Family law conversations cover the situation, priorities, funding expectations and the details your firm needs for its conflict process.",
  ],
  [
    "How do we get started?",
    "Book a discovery call. We’ll discuss your location, capacity, services and qualification requirements, then outline the campaign and commercial terms for your clinic or firm.",
  ],
];
function FAQs() {
  return (
    <section className="prominent-section">
      <div className="prominent-container prominent-faq-layout">
        <SectionHeading
          label="A few good questions"
          title="Clear answers."
          muted="Before we begin."
        />
        <div className="prominent-faqs">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProminentHomePage() {
  return (
    <Layout active="home">
      <section className="ph-hero">
        <HeroAtmosphere />
        <div className="prominent-container ph-hero-content">
          <h1>
            <span>Qualified consultations.</span>
            <span>
              Pay only when
              <br className="ph-mobile-break" /> they show up.
            </span>
          </h1>
          <p>Less time chasing enquiries.</p>
          <CallButton />
        </div>
        <a
          href="#acquisition"
          className="ph-hero-scroll"
          aria-label="Explore the acquisition process"
        >
          <ArrowDown size={16} />
        </a>
      </section>
      <HomeBenefits />
      <AcquisitionStory />
      <PartnerReviews />
      <HomeBusinessValue />
      <HomeReadiness />
      <PartnerPortalPreview />
      <HomeClosing />
    </Layout>
  );
}

const acquisitionStages = [
  {
    title: "We create your ads.",
    text: "Our studio builds creative around your service and the clients you want to meet.",
  },
  {
    title: "We run and fund the campaigns.",
    text: "We manage the advertising, cover the media spend and optimise for consultations.",
  },
  {
    title: "We filter for fit and financial readiness.",
    text: "We check needs, location, timing and ability to pay against your agreed criteria.",
  },
  {
    title: "Our Australian team vets each enquiry.",
    text: "A 30–50 minute call establishes fit and readiness. Calls are reviewed in daily team huddles.",
  },
  {
    title: "We confirm commitment and book them in.",
    text: "We coordinate deposits and credit checks where applicable, with consent, then confirm the booking and send reminders.",
  },
  {
    title: "They attend. You pay.",
    text: "You get the qualification notes before you meet. You’re only charged when the consultation is attended.",
  },
  {
    title: "We keep the follow-up moving.",
    text: "We follow up after the consultation, arrange rebookings when needed and keep your team informed.",
  },
];

export function ProminentHowPage() {
  return (
    <Layout active="how">
      <section className="pm-method" aria-labelledby="pm-method-title">
        <div className="prominent-container pm-method-container">
          <header className="pm-method-intro">
            <div className="pm-method-heading">
              <Eyebrow>HOW IT WORKS</Eyebrow>
              <h1 id="pm-method-title">
                Seven steps.
                <br />
                <span>One qualified consultation.</span>
              </h1>
            </div>
          </header>
          <ol className="pm-method-steps" aria-label="The seven steps to a qualified consultation">
            {acquisitionStages.map((step, index) => (
              <li
                key={step.title}
                id={index === 5 ? "when-you-pay" : undefined}
                className={`pm-method-step${index === 5 ? " pm-method-step-attended" : ""}`}
              >
                <span className="pm-method-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="pm-method-step-copy">
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                </div>
                {index === 5 && (
                  <div className="pm-method-payment">
                    <CalendarCheck size={24} strokeWidth={1.7} aria-hidden="true" />
                    <strong>PAY ONLY ON ATTENDANCE</strong>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="pm-method-finish">
            <h2>Ready to put it to work for your business?</h2>
            <CallButton />
          </div>
        </div>
      </section>
    </Layout>
  );
}

export function ProminentIndustriesPage() {
  return (
    <Layout active="industries">
      <PageHero label="Our industries" title="Two industries." accent="Every conversation matters.">
        A hair restoration decision and a family law matter are different journeys. Both deserve
        careful qualification and a clear path to the right consultation.
      </PageHero>
      <section className="prominent-section prominent-section-after-hero">
        <div className="prominent-container">
          <IndustryCards />
          <p className="prominent-pricing-note">
            Qualification criteria, campaign scope and commercial terms are agreed before launch.
          </p>
        </div>
      </section>
      <section className="prominent-section prominent-soft-section">
        <div className="prominent-container prominent-split">
          <SectionHeading
            label="Specialist by design"
            title="One model."
            muted="Built around your business."
          />
          <div className="prominent-editorial-list">
            <div>
              <span>01</span>
              <div>
                <h3>Your language.</h3>
                <p>
                  Creative and conversations shaped around the decisions your prospective patients
                  or clients are making.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Your criteria.</h3>
                <p>
                  A qualification brief that reflects your services, geography, costs and capacity.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Your next consultation.</h3>
                <p>
                  A prepared handover, so your team can start with the person rather than repeat the
                  intake.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <FinalCTA />
    </Layout>
  );
}

const industryContent = {
  hair: {
    eyebrow: "Prominent for hair transplant clinics",
    title: "People ready to talk",
    accent: "about hair restoration.",
    intro:
      "We turn interest in hair restoration into screened, attended consultations. Your clinical team makes the assessment. You only pay when the person attends the agreed consultation.",
    heading: "The right conversation before the clinical conversation.",
    questions: [
      "What they want to change and why it matters",
      "How long they have been considering treatment",
      "Budget expectations and intended timing",
      "Location, travel and consultation availability",
    ],
    note: "Clinical suitability, treatment advice and outcomes are always assessed by your qualified clinical team.",
    next: "A candidate who understands the next step.",
    nextText:
      "Give your team the context behind the enquiry: the person’s goals, expectations and practical readiness for a consultation. The clinical decision stays with you.",
    cta: "More conversations for your clinical team.",
  },
  legal: {
    eyebrow: "Prominent for family law firms",
    title: "A first meeting.",
    accent: "A clearer way forward.",
    intro:
      "We connect your firm with people looking for help with separation, parenting and property matters. Screened, prepared and booked. You only pay when they attend the agreed consultation.",
    heading: "Understand the situation before the first meeting.",
    questions: [
      "Their circumstances, priorities and timing",
      "Whether they already have representation",
      "Details required for your firm’s conflict process",
      "Funding expectations and readiness to meet",
    ],
    note: "Prominent handles marketing and intake. We do not provide legal advice. Your firm performs conflict checks and decides whether to accept a matter.",
    next: "A person, with context. Not just a name and number.",
    nextText:
      "Your lawyers begin with a useful handover: what prompted the enquiry, what the person wants to discuss and what has already been covered. Your firm leads the advice and engagement conversation.",
    cta: "Make room for your next client conversation.",
  },
};

export function ProminentIndustryPage({ industry }: { industry: ProminentIndustry }) {
  const content = industryContent[industry];
  return (
    <Layout active="industries">
      <PageHero label={content.eyebrow} title={content.title} accent={content.accent}>
        {content.intro}
      </PageHero>
      <section className="prominent-industry-intro">
        <div className="prominent-container">
          <div className="prominent-industry-rate">
            <div>
              <span>ONE ATTENDED CONSULTATION</span>
              <strong>They show. You pay.</strong>
              <a href={`/calculator?industry=${industry}`} className="prominent-text-link">
                Explore the calculator <ArrowUpRight size={15} />
              </a>
            </div>
            <div>
              <span>
                <Check size={16} />
                Creative & media spend
              </span>
              <span>
                <Check size={16} />
                Qualification & booking
              </span>
              <span>
                <Check size={16} />
                Confirmation & reminders
              </span>
            </div>
            <CallButton />
          </div>
        </div>
      </section>
      <section className="prominent-section">
        <div className="prominent-container prominent-split">
          <div>
            <SectionHeading label="Qualification with purpose" title={content.heading} />
            <ul className="prominent-check-list">
              {content.questions.map((question) => (
                <li key={question}>
                  <Check />
                  {question}
                </li>
              ))}
            </ul>
            <p className="prominent-small">{content.note}</p>
          </div>
          <CallPreview industry={industry} />
        </div>
      </section>
      <Pipeline />
      <section className="prominent-section">
        <div className="prominent-container prominent-split">
          <div className="prominent-editorial-photo">
            <img
              src={industry === "legal" ? meetingRoom : followupAgent}
              alt={
                industry === "legal"
                  ? "A calm consultation space"
                  : "A phone conversation ahead of a consultation"
              }
              loading="lazy"
            />
          </div>
          <div>
            <SectionHeading label="Ready for your team" title={content.next} />
            <p className="prominent-body-copy">{content.nextText}</p>
            <a href={`/calculator?industry=${industry}`} className="prominent-text-link">
              Calculate your appointment spend <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>
      <FinalCTA title={content.cta} />
    </Layout>
  );
}

const services = [
  {
    id: "paid-social",
    icon: MonitorPlay,
    number: "01",
    title: "Facebook & Instagram campaigns.",
    channels: "Creative · Meta · Campaign management",
    text: "Meet people where they spend time, with creative that speaks to the decision in front of them. We plan the message, manage campaigns and connect enquiries to the qualification team.",
    points: [
      "Messages and video concepts that speak to the person’s goals",
      "Creative testing across Facebook and Instagram placements",
      "Campaign decisions informed by qualified enquiries and attendance",
    ],
    demo: "The right message.\nA meaningful next step.",
  },
  {
    id: "search",
    icon: Search,
    number: "02",
    title: "Google Ads & search.",
    channels: "Google Ads · Search strategy · Landing pages",
    text: "Reach people actively looking for a hair restoration consultation or help with a family law matter. Relevant search campaigns and clear landing pages make the next step easy.",
    points: [
      "Search campaigns aligned to your location and services",
      "Landing pages built around consultation enquiries",
      "Search-term review to focus on relevant local enquiries",
    ],
    demo: "Help them find\nthe next conversation.",
  },
  {
    id: "tiktok",
    icon: Play,
    number: "03",
    title: "TikTok, made for the feed.",
    channels: "Vertical video · Hooks · Paid distribution",
    text: "Short-form video needs a clear opening and a natural pace. We shape the message for the format, with a direct next step for people considering a consultation.",
    points: [
      "Vertical creative with readable captions",
      "Opening messages tested around the person’s decision",
      "Enquiries routed into the same qualification process",
    ],
    demo: "Earn the attention.\nMake the next step clear.",
  },
  {
    id: "seo",
    icon: Search,
    number: "04",
    title: "Be found in your market.",
    channels: "Local search · Content · Technical foundations",
    text: "A clear local search presence supports the moments when someone starts researching. We review service pages, local visibility and the route from a search result to an enquiry.",
    points: [
      "Google Business Profile and local search opportunities",
      "Useful service content that answers real questions",
      "Site structure, performance and enquiry paths reviewed",
    ],
    demo: "When they start searching,\nmake your business visible.",
  },
  {
    id: "qualification",
    icon: Headphones,
    number: "05",
    title: "People-first qualification.",
    channels: "Enquiry handling · Intake · Handover",
    text: "A form cannot tell the whole story. Our conversations explore the person’s situation, expectations and readiness, using criteria agreed with your team.",
    points: [
      "Direct enquiry follow-up and qualification calls",
      "Cost, timing and practical expectations discussed",
      "Useful context shared with your clinic or firm",
    ],
    demo: "Listen first.\nUnderstand what matters.",
  },
  {
    id: "appointments",
    icon: CalendarCheck,
    number: "06",
    title: "Bookings that become meetings.",
    channels: "Scheduling · Confirmations · Reminders",
    text: "We coordinate the details between an interested person and your team, helping them understand where to be, when to attend and what happens next.",
    points: [
      "Consultations coordinated with your availability",
      "Appointment confirmations and reminders",
      "Attendance tracked against the agreed criteria",
    ],
    demo: "In the diary.\nReady for the conversation.",
  },
];

export function ProminentServicesPage() {
  return (
    <Layout active="services">
      <PageHero label="Our services" title="The whole journey." accent="One accountable team.">
        Creative, media, qualification and appointments work together. Every part of the process
        leads towards an attended consultation.
      </PageHero>
      <section className="prominent-service-index">
        <div className="prominent-container">
          {services.map((service) => (
            <a key={service.id} href={`#${service.id}`}>
              <service.icon size={19} />
              <span>{service.title}</span>
              <ArrowDown size={15} />
            </a>
          ))}
        </div>
      </section>
      {services.map((service, index) => (
        <section
          key={service.id}
          id={service.id}
          className={`prominent-section prominent-service-section${index % 2 ? " prominent-soft-section" : ""}`}
        >
          <div className="prominent-container prominent-split">
            <div>
              <Eyebrow>
                {service.number} / {service.channels}
              </Eyebrow>
              <h2>{service.title}</h2>
              <p className="prominent-body-copy">{service.text}</p>
              <ul className="prominent-check-list">
                {service.points.map((point) => (
                  <li key={point}>
                    <Check />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`prominent-service-art prominent-service-art-${index}`}>
              <service.icon size={39} strokeWidth={1.2} />
              <h3>{service.demo}</h3>
              <span>
                PROMINENT · FROM ENQUIRY TO APPOINTMENT
                <ArrowUpRight size={22} />
              </span>
            </div>
          </div>
        </section>
      ))}
      <div className="prominent-container">
        <p className="prominent-pricing-note">
          Your proposal sets out the channels and services in scope, including any SEO work. The
          plan is tailored to your industry, location and capacity.
        </p>
      </div>
      <FinalCTA />
    </Layout>
  );
}

export function ProminentAboutPage() {
  return (
    <Layout active="about">
      <section className="pm-about-conviction" aria-labelledby="prominent-conviction-title">
        <div className="prominent-container">
          <Eyebrow>A MESSAGE FROM OUR FOUNDER</Eyebrow>
          <div className="pm-about-conviction-grid">
            <figure className="pm-founder-message">
              <blockquote className="pm-founder-bubble">
                <h1 id="prominent-conviction-title">
                  “A tonne of leads are no good <span>if they are not converting!”</span>
                </h1>
              </blockquote>
              <figcaption className="pm-about-founder-signoff">
                <strong>Peter</strong>
                <span>Founder, Prominent</span>
              </figcaption>
            </figure>
            <div className="pm-about-conviction-copy">
              <p>
                We built Prominent because we saw a gap in traditional marketing: an agency could
                celebrate generating hundreds of leads, while the business paying for them struggled
                to turn those enquiries into clients.
              </p>
              <p>
                Lawyers and clinicians are experts at what they do. Yet valuable, billable hours
                were going into unanswered calls, people who couldn’t afford to proceed or weren’t
                ready, and appointments where no one showed up.
              </p>
              <p>
                Our model takes care of the work in between. We contact, screen and vet each
                enquiry, understanding their needs, financial readiness and commitment before a
                consultation reaches your calendar. Your time goes to people who are ready for the
                next step.
              </p>
              <p className="pm-about-conviction-promise">
                Qualified. Vetted. Prepared to meet you.
                <strong>You only pay when they show up.</strong>
              </p>
            </div>
          </div>
          <dl className="pm-about-proof">
            <div>
              <dt>Calls every month</dt>
              <dd>
                1,000<span>s</span>
              </dd>
            </div>
            <div>
              <dt>Discovery &amp; vetting calls</dt>
              <dd>
                30–50<span> min</span>
              </dd>
            </div>
            <div>
              <dt>Show rate</dt>
              <dd>
                80<span>%</span>
              </dd>
            </div>
          </dl>
          <a href="/how-it-works" className="prominent-text-link pm-about-conviction-link">
            See how we qualify every consultation <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section className="prominent-section prominent-soft-section">
        <div className="prominent-container">
          <SectionHeading
            label="What we stand for"
            title="A straightforward model."
            muted="A considered approach."
          />
          <div className="prominent-three-columns">
            {[
              {
                icon: Target,
                title: "Accountability",
                text: "An attended appointment is the outcome we work towards, with clear criteria agreed from the beginning.",
              },
              {
                icon: Headphones,
                title: "Real understanding",
                text: "We make room for the conversation. The person’s priorities and expectations guide the handover.",
              },
              {
                icon: ShieldCheck,
                title: "Respect for your expertise",
                text: "We handle acquisition and coordination. Your professionals handle assessment, advice and the decision to engage.",
              },
            ].map((item) => (
              <article key={item.title}>
                <item.icon size={28} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="prominent-section">
        <div className="prominent-container">
          <SectionHeading
            label="Our focus"
            title="Specialist industries."
            muted="Shared commitment."
          />
          <IndustryCards />
        </div>
      </section>
      <FinalCTA title="Let’s talk about your next chapter." />
    </Layout>
  );
}

const money = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);

function CalculatorInput({
  id,
  label,
  value,
  min,
  max,
  step,
  prefix,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const normalise = (raw: string) => onChange(Math.max(min, Math.min(max, Number(raw) || 0)));
  return (
    <div className="prominent-calculator-input">
      <div>
        <label htmlFor={id}>{label}</label>
        <div className="prominent-number-input">
          {prefix && <span>{prefix}</span>}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => normalise(event.target.value)}
          />
          {suffix && <span>{suffix}</span>}
        </div>
      </div>
      <input
        aria-label={`${label} slider`}
        className="prominent-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => normalise(event.target.value)}
        style={{ "--range-progress": `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      />
      <div className="prominent-range-limits">
        <span>
          {prefix}
          {min.toLocaleString("en-AU")}
          {suffix}
        </span>
        <span>
          {prefix}
          {max.toLocaleString("en-AU")}
          {suffix}
        </span>
      </div>
    </div>
  );
}

export function ProminentCalculatorPage() {
  const [industry, setIndustry] = useState<ProminentIndustry | null>(null);
  const [inputs, setInputs] = useState({
    legal: { shows: 20, conversion: 50, value: PROMINENT_INDUSTRIES.legal.defaultValue as number },
    hair: { shows: 20, conversion: 50, value: PROMINENT_INDUSTRIES.hair.defaultValue as number },
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasIndustry = industry !== null;
  useEffect(() => {
    if (hasIndustry) headingRef.current?.focus({ preventScroll: true });
  }, [hasIndustry]);

  function changeIndustry(next: ProminentIndustry) {
    setIndustry(next);
    const url = new URL(window.location.href);
    url.searchParams.set("industry", next);
    window.history.replaceState(window.history.state, "", url);
  }
  function updateInput(key: "shows" | "conversion" | "value", value: number) {
    if (!industry) return;
    setInputs((previous) => ({
      ...previous,
      [industry]: { ...previous[industry], [key]: key === "shows" ? Math.floor(value) : value },
    }));
  }
  const selected = industry ? PROMINENT_INDUSTRIES[industry] : null;
  const current = industry ? inputs[industry] : null;
  const result =
    industry && current
      ? calculateProminentEstimate(industry, current.shows, current.conversion, current.value)
      : null;

  return (
    <Layout active="calculator">
      <section
        className={`pc-page${industry ? " pc-page-selected" : ""}`}
        aria-labelledby="pc-title"
      >
        <div className="prominent-container">
          <header className="pc-heading">
            <div>
              <Eyebrow>THE PAY-PER-SHOW CALCULATOR</Eyebrow>
              <h1 id="pc-title" ref={headingRef} tabIndex={-1}>
                Run your numbers.
              </h1>
              <p>
                {industry
                  ? `See what a month with Prominent could look like for your ${industry === "legal" ? "firm" : "clinic"}.`
                  : "Choose your industry to get started."}
              </p>
            </div>
          </header>

          {!industry ? (
            <div className="pc-choices" role="group" aria-label="Choose your industry">
              {(
                [
                  { key: "legal", icon: Scale, description: "For family law firms" },
                  { key: "hair", icon: UserRound, description: "For hair restoration clinics" },
                ] as const
              ).map(({ key, icon: Icon, description }) => (
                <button
                  type="button"
                  className="pc-choice"
                  key={key}
                  aria-label={PROMINENT_INDUSTRIES[key].name}
                  onClick={() => changeIndustry(key)}
                >
                  <span className={`pc-choice-icon pc-choice-icon-${key}`}>
                    <Icon size={30} strokeWidth={1.4} aria-hidden="true" />
                  </span>
                  <strong>{PROMINENT_INDUSTRIES[key].name}</strong>
                  <span className="pc-choice-description">{description}</span>
                  <span className="pc-choice-action">
                    Run my numbers <ArrowRight size={18} aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          ) : selected && current && result ? (
            <div className="pc-calculation">
              <div className="pc-workspace">
                <div className="pc-input-panel">
                  <Eyebrow>YOUR INPUTS · AUD INCL. GST</Eyebrow>
                  <CalculatorInput
                    id="prominent-shows"
                    label="Attended consultations per month"
                    value={current.shows}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) => updateInput("shows", value)}
                  />
                  <CalculatorInput
                    id="prominent-conversion"
                    label={
                      industry === "legal"
                        ? "Consultation-to-client rate"
                        : "Consultation-to-treatment rate"
                    }
                    value={current.conversion}
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(value) => updateInput("conversion", value)}
                  />
                  <CalculatorInput
                    id="prominent-client-value"
                    label={`Average ${industry === "legal" ? "matter" : "treatment"} value`}
                    value={current.value}
                    min={0}
                    max={100000}
                    step={500}
                    prefix="$"
                    onChange={(value) => updateInput("value", value)}
                  />
                  <p className="pc-input-hint">Drag the sliders or enter your figures.</p>
                </div>

                <div
                  className="pc-results"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label="Your monthly estimate"
                >
                  <div className="pc-result pc-result-revenue">
                    <span>Potential monthly revenue</span>
                    <strong data-testid="prominent-revenue">{money(result.revenue)}</strong>
                    <small>
                      From your {industry === "legal" ? "new matters" : "new procedures"}
                    </small>
                  </div>
                  <div className="pc-result">
                    <span>
                      {industry === "legal" ? "Estimated new matters" : "Estimated procedures"}
                    </span>
                    <strong data-testid="prominent-clients">
                      {result.clients.toLocaleString("en-AU", { maximumFractionDigits: 1 })}
                    </strong>
                    <small>At your {current.conversion}% conversion rate</small>
                  </div>
                  <div className="pc-result">
                    <span>Revenue / investment</span>
                    <strong data-testid="prominent-multiple">
                      {result.investment > 0 ? `${result.revenueMultiple.toFixed(1)}×` : "—"}
                    </strong>
                    <small>Before service delivery costs</small>
                  </div>
                  <div className="pc-result pc-result-investment">
                    <span>Monthly investment</span>
                    <strong data-testid="prominent-investment">{money(result.investment)}</strong>
                    <small>
                      {current.shows} attended × {money(selected.price)}
                    </small>
                  </div>
                </div>
              </div>

              <div className="pc-next-step">
                <div>
                  <span className="pc-payment-note">
                    <CircleCheck size={17} aria-hidden="true" /> You only pay when they show up.
                  </span>
                  <p>Creative, media spend, qualification and booking included.</p>
                </div>
                <CallButton>Talk through your numbers</CallButton>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
