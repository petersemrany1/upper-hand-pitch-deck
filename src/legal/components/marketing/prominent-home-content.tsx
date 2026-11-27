// Ported from the Legal app (family-law-floater/src/components/marketing/prominent-home-content.tsx). Re-run the port script to refresh.
import { useEffect, useRef, type CSSProperties } from "react";
import prominentWordmark from "@/legal/assets/prominent-wordmark.webp";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarCheck,
  CreditCard,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  FileCheck2,
  Headphones,
  LayoutDashboard,
  Megaphone,
  Quote,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  UserRound,
} from "lucide-react";

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="ph-label">
      <span />
      {children}
    </div>
  );
}

function Waveform() {
  return (
    <div className="ph-waveform" aria-hidden="true">
      {[14, 22, 35, 20, 42, 56, 28, 18, 40, 64, 36, 24, 48, 31, 18, 43, 58, 29, 20, 38, 25, 15].map(
        (height, index) => (
          <i key={index} style={{ height, "--wave-delay": `${index * -0.19}s` } as CSSProperties} />
        ),
      )}
    </div>
  );
}

export function AcquisitionStory() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll<HTMLElement>(".ph-acquire-steps > li");
    if (!cards) return;

    // Only run the illustrations people can see; CSS handles reduced-motion preferences.
    const visibleCards = new Set<Element>();
    const syncMotion = () => {
      cards.forEach((card) => {
        card.dataset["motion"] = visibleCards.has(card) && !document.hidden ? "running" : "paused";
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) visibleCards.add(target);
          else visibleCards.delete(target);
        });
        syncMotion();
      },
      { threshold: 0.12 },
    );
    cards.forEach((card) => observer.observe(card));
    document.addEventListener("visibilitychange", syncMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, []);

  return (
    <section className="ph-acquisition" id="acquisition" ref={sectionRef}>
      <div className="prominent-container">
        <div className="ph-acquire-heading">
          <h2>
            We turn enquiries into
            <br />
            <span>vetted, booked consultations.</span>
          </h2>
        </div>
        <ol className="ph-acquire-steps">
          <li data-motion="paused">
            <div className="ph-acquire-art ph-acquire-attract" aria-hidden="true">
              <svg className="ph-attract-illustration" viewBox="0 0 330 190" fill="none">
                <g className="ph-attract-paths">
                  <path d="M148 88C185 88 178 42 238 42" />
                  <path d="M155 95H279" />
                  <path d="M148 105C185 105 178 151 238 151" />
                </g>
                <g className="ph-attract-traces">
                  <path pathLength="100" d="M148 88C185 88 178 42 238 42" />
                  <path pathLength="100" d="M155 95H279" />
                  <path pathLength="100" d="M148 105C185 105 178 151 238 151" />
                </g>
                <g transform="translate(107 96)">
                  <g className="ph-attract-speaker">
                    <rect x="-46" y="-46" width="92" height="92" rx="26" fill="#064aff" />
                    <rect x="-41" y="-41" width="82" height="82" rx="22" stroke="#ffffff26" />
                    <Megaphone
                      x="-29"
                      y="-29"
                      width="58"
                      height="58"
                      stroke="#fff9cf"
                      strokeWidth="1.6"
                    />
                  </g>
                </g>
                <g
                  className="ph-attract-broadcast"
                  stroke="#064aff"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M163 78Q177 95 163 112" />
                  <path d="M173 69Q195 95 173 121" />
                </g>
                {[
                  { x: 245, y: 42, delay: "0s" },
                  { x: 282, y: 96, delay: "-2s" },
                  { x: 245, y: 151, delay: "-4s" },
                ].map((person) => (
                  <g key={person.y} transform={`translate(${person.x} ${person.y})`}>
                    <g
                      className="ph-attract-person"
                      style={{ "--person-delay": person.delay } as CSSProperties}
                    >
                      <circle r="23" fill="white" stroke="#cbdaf7" />
                      <UserRound
                        x="-10"
                        y="-11"
                        width="20"
                        height="20"
                        stroke="#527acb"
                        strokeWidth="1.6"
                      />
                      <circle cx="16" cy="15" r="7" fill="#064aff" stroke="#fff" strokeWidth="2" />
                      <path
                        d="m13 15 2 2 4-4"
                        stroke="#fff9cf"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </g>
                ))}
              </svg>
            </div>
            <div className="ph-acquire-copy">
              <span className="ph-acquire-number">01 / OUR TEAM</span>
              <h3>We attract.</h3>
              <p>We create and fund ads that bring the right enquiries.</p>
            </div>
            <span className="ph-acquire-handoff" aria-hidden="true">
              <ArrowRight size={13} />
            </span>
          </li>
          <li data-motion="paused">
            <div className="ph-acquire-art ph-acquire-qualify" aria-hidden="true">
              <div className="ph-pulse-brand">
                <img src={prominentWordmark} alt="" width={768} height={257} />
              </div>
              <div className="ph-acquire-conversation">
                <span className="ph-acquire-headset">
                  <Headphones size={24} />
                </span>
                <Waveform />
              </div>
              <div className="ph-acquire-checks">
                <span>
                  <Check size={12} /> Needs
                </span>
                <span>
                  <Check size={12} /> Budget
                </span>
                <span>
                  <Check size={12} /> Fit
                </span>
              </div>
            </div>
            <div className="ph-acquire-copy">
              <span className="ph-acquire-number">02 / OUR TEAM</span>
              <h3>We vet.</h3>
              <p>Our Australian sales team calls and screens for needs, budget and readiness.</p>
            </div>
            <span className="ph-acquire-handoff" aria-hidden="true">
              <ArrowRight size={13} />
            </span>
          </li>
          <li data-motion="paused">
            <div className="ph-acquire-art ph-acquire-meet" aria-hidden="true">
              <div className="ph-acquire-calendar">
                <div>
                  <span>YOUR CALENDAR</span>
                  <CalendarCheck size={16} />
                </div>
                <div className="ph-acquire-calendar-grid">
                  {Array.from({ length: 15 }, (_, index) => (
                    <span key={index} className={index === 7 ? "is-confirmed" : ""}>
                      {index === 7 && <Check size={16} />}
                    </span>
                  ))}
                </div>
              </div>
              <span className="ph-acquire-confirmed">
                <CircleCheck size={14} /> Ready to meet
              </span>
            </div>
            <div className="ph-acquire-copy">
              <span className="ph-acquire-number">03 / YOUR TEAM</span>
              <h3>You meet.</h3>
              <p>Costs discussed. Deposit collected. A prepared prospect in your calendar.</p>
            </div>
          </li>
        </ol>
        <div className="ph-acquire-bottom">
          <a href="/how-it-works" className="prominent-text-link">
            See how it works <ArrowUpRight size={16} />
          </a>
          <span className="ph-home-pay">
            <ShieldCheck size={17} aria-hidden="true" /> No show. No appointment charge.
          </span>
        </div>
      </div>
    </section>
  );
}

export function ConnectedPipeline() {
  return (
    <section className="ph-connected" id="pipeline">
      <div className="prominent-container">
        <div className="ph-centered-heading">
          <h2>One connected pipeline.</h2>
        </div>
        <div className="ph-pipeline-diagram">
          <svg
            className="ph-pipeline-wires"
            viewBox="0 0 1200 360"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <g className="ph-wire-base">
              <path d="M240 107H300Q340 107 340 140V160Q340 180 390 180H470" />
              <path d="M240 180H470" />
              <path d="M240 253H300Q340 253 340 220V200Q340 180 390 180H470" />
              <path d="M730 180H810Q860 180 860 160V140Q860 107 900 107H960" />
              <path d="M730 180H960" />
              <path d="M730 180H810Q860 180 860 200V220Q860 253 900 253H960" />
            </g>
            <g className="ph-wire-signals">
              <path pathLength="100" d="M240 107H300Q340 107 340 140V160Q340 180 390 180H470" />
              <path pathLength="100" d="M240 180H470" />
              <path pathLength="100" d="M240 253H300Q340 253 340 220V200Q340 180 390 180H470" />
              <path pathLength="100" d="M730 180H810Q860 180 860 160V140Q860 107 900 107H960" />
              <path pathLength="100" d="M730 180H960" />
              <path pathLength="100" d="M730 180H810Q860 180 860 200V220Q860 253 900 253H960" />
            </g>
          </svg>
          <div className="ph-pipeline-column">
            <span className="ph-pipeline-label">01 / DEMAND</span>
            <div>
              <Megaphone size={19} />
              <span>Paid social</span>
              <ChevronRight size={14} />
            </div>
            <div>
              <Search size={19} />
              <span>Search & discovery</span>
              <ChevronRight size={14} />
            </div>
            <div>
              <AudioLines size={19} />
              <span>Studio creative</span>
              <ChevronRight size={14} />
            </div>
          </div>
          <div className="ph-pipeline-core">
            <span className="ph-pipeline-core-label">02 / CONVERSATION</span>
            <div className="ph-pulse-brand">
              <img src={prominentWordmark} alt="Prominent" width={768} height={257} />
            </div>
            <h3>Prominent sales floor</h3>
            <span>Australian team. Proven vetting process.</span>
            <div className="ph-core-tags">
              <span>QUALIFY</span>
              <i />
              <span>PREPARE</span>
              <i />
              <span>BOOK</span>
            </div>
          </div>
          <div className="ph-pipeline-column ph-pipeline-delivery">
            <span className="ph-pipeline-label">03 / CONSULTATION</span>
            <div>
              <CalendarCheck size={19} />
              <span>Prepared appointments</span>
              <Check size={14} />
            </div>
            <div>
              <FileCheck2 size={19} />
              <span>A complete handover</span>
              <Check size={14} />
            </div>
            <div>
              <CheckCheck size={19} />
              <span>Connected follow-up</span>
              <Check size={14} />
            </div>
          </div>
        </div>
        <div className="ph-metrics">
          <div>
            <strong>
              1,000<span>s</span>
            </strong>
            <span>Calls every month</span>
            <p>Real conversations at the heart of the operation.</p>
          </div>
          <div>
            <strong>
              30–50<span> min</span>
            </strong>
            <span>Discovery &amp; vetting calls</span>
            <p>In-depth phone conversations, guided by our proven qualification process.</p>
          </div>
          <div>
            <strong>
              80<span>%</span>
            </strong>
            <span>Show rate</span>
            <p>Attendance is the outcome we work towards.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function QualityStandard() {
  return (
    <section className="ph-quality">
      <div className="prominent-container ph-quality-layout">
        <div>
          <SectionLabel>THE STANDARD BEHIND EVERY SHOW</SectionLabel>
          <h2>
            More care before.
            <br />
            <span>A better conversation after.</span>
          </h2>
          <p>
            Your team’s time matters. The quality of the introduction is built long before anyone
            walks through the door.
          </p>
          <a href="/how-it-works" className="prominent-text-link">
            Explore the Prominent method <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="ph-quality-list">
          <article>
            <span>01</span>
            <div>
              <h3>A shared definition of qualified.</h3>
              <p>
                We agree on fit, financial readiness, location and timing with you. The same
                standard guides every call.
              </p>
            </div>
            <SlidersHorizontal size={20} />
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Daily huddles. Continuous refinement.</h3>
              <p>
                Our Australian team reviews conversations together, shares feedback and works
                through what can be better.
              </p>
            </div>
            <Users size={20} />
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Context comes with the consultation.</h3>
              <p>
                Qualification notes, commitment and next steps are handed over so your team can
                start informed.
              </p>
            </div>
            <FileCheck2 size={20} />
          </article>
        </div>
      </div>
    </section>
  );
}

type SampleStatus = "Scheduled" | "Attended" | "Reschedule";

// Fictional records for the homepage's static product overview.
const sampleConsultations = [
  {
    id: "WH-1041",
    name: "Sophie Ellis",
    initials: "SE",
    location: "Sydney, NSW",
    industry: "Family law",
    matter: "Parenting",
    time: "Mon · 9:30 am",
    duration: "38 minutes",
    brief:
      "Seeking advice on parenting arrangements following separation. Priorities, availability and the questions for the initial consultation have been recorded.",
    readiness:
      "Consultation fees and likely next steps discussed. Financial readiness confirmed before booking.",
    deposit: "Received",
    check: "Pending firm review",
  },
  {
    id: "WH-1042",
    name: "Daniel Brooks",
    initials: "DB",
    location: "Newcastle, NSW",
    industry: "Family law",
    matter: "Property settlement",
    time: "Mon · 11:00 am",
    duration: "42 minutes",
    brief:
      "Looking for advice on a property settlement after separation. Initial priorities and relevant documents discussed ahead of the appointment.",
    readiness:
      "Fee expectations discussed and accepted. Ready to meet the solicitor and understand the available next steps.",
    deposit: "Received",
    check: "Pending firm review",
  },
  {
    id: "WH-1043",
    name: "Amelia Grant",
    initials: "AG",
    location: "Wollongong, NSW",
    industry: "Family law",
    matter: "Both",
    time: "Tue · 2:00 pm",
    duration: "35 minutes",
    brief:
      "Attended an initial consultation to discuss parenting and property settlement. The firm is coordinating the next conversation and documentation.",
    readiness:
      "Fees, timing and the initial consultation process discussed. Financial readiness confirmed during qualification.",
    deposit: "Received",
    check: "Cleared by firm",
  },
  {
    id: "WH-1044",
    name: "Marcus Chen",
    initials: "MC",
    location: "Parramatta, NSW",
    industry: "Family law",
    matter: "Property settlement",
    time: "Wed · 10:30 am",
    duration: "46 minutes",
    brief:
      "Seeking guidance on a property settlement after separation. Key concerns and preferred timing were recorded before the consultation.",
    readiness:
      "Understands the firm's initial fee expectations and has confirmed readiness to proceed with legal advice.",
    deposit: "Received",
    check: "Cleared by firm",
  },
  {
    id: "WH-1045",
    name: "Olivia Hayes",
    initials: "OH",
    location: "Central Coast, NSW",
    industry: "Family law",
    matter: "Both",
    time: "New time requested",
    duration: "33 minutes",
    brief:
      "Looking for advice on parenting and property matters. A new consultation time is being coordinated around work commitments.",
    readiness:
      "Fee expectations discussed. Appointment time and deposit to be reconfirmed before the consultation.",
    deposit: "Pending",
    check: "Pending firm review",
  },
] as const;

const initialStatuses: Record<string, SampleStatus> = {
  "WH-1041": "Scheduled",
  "WH-1042": "Scheduled",
  "WH-1043": "Attended",
  "WH-1044": "Attended",
  "WH-1045": "Reschedule",
};
const expectedRevenuePerConsultation = 20000;

function PortalChart({ attended }: { attended: number }) {
  const weeklyShows = [2, 3, 3, 4, 3, 4, 4, 5, 5, 5, 6, 5 + attended];
  const points = weeklyShows
    .map((value, index) => `${8 + index * 64},${104 - value * 10}`)
    .join(" ");
  return (
    <div className="ph-portal-chart">
      <div className="ph-portal-chart-heading">
        <span>Attendance over time</span>
        <span>Last 12 weeks</span>
      </div>
      <div className="ph-portal-chart-summary">
        <strong>{21 + attended}</strong>
        <span>attended this month</span>
      </div>
      <svg
        viewBox="0 0 720 116"
        role="img"
        aria-label={`Weekly attendance: ${weeklyShows.join(", ")} consultations.`}
      >
        <defs>
          <linearGradient id="ph-portal-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#064aff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#064aff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[24, 54, 84, 114].map((y) => (
          <path key={y} d={`M0 ${y}H720`} stroke="#e7edf7" strokeWidth="1" />
        ))}
        <polygon points={`8,114 ${points} 712,114`} fill="url(#ph-portal-chart-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#064aff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="712"
          cy={104 - (5 + attended) * 10}
          r="4"
          fill="#064aff"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      <div className="ph-portal-chart-axis">
        <span>August</span>
        <span>September</span>
        <span>October</span>
      </div>
    </div>
  );
}

function PortalAttendance({ attended, showRate }: { attended: number; showRate: number }) {
  return (
    <div className="ph-portal-attendance-chart">
      <h4>Attendance breakdown</h4>
      <div className="ph-portal-ring">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={`${attended} attended, 4 did not attend. ${showRate}% show rate.`}
        >
          <circle cx="60" cy="60" r="48" fill="none" stroke="#e8edf6" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="#064aff"
            strokeWidth="9"
            pathLength="100"
            strokeDasharray={`${showRate} ${100 - showRate}`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div>
          <strong>{showRate}%</strong>
          <span>Show rate</span>
        </div>
      </div>
      <div className="ph-portal-ring-legend">
        <span>
          <i />
          Attended <strong>{attended}</strong>
        </span>
        <span>
          <i />
          Did not attend <strong>4</strong>
        </span>
      </div>
    </div>
  );
}

export function PartnerPortalPreview() {
  const attended = Object.values(initialStatuses).filter((status) => status === "Attended").length;
  const monthlyShows = 21 + attended;
  const showRate = Math.round((monthlyShows / (25 + attended)) * 100);
  const expectedRevenue = monthlyShows * expectedRevenuePerConsultation;
  const metrics = [
    {
      label: "Attended this month",
      value: String(monthlyShows),
      note: "Confirmed attended consultations",
    },
    { label: "This month’s show rate", value: `${showRate}%`, note: "Of completed appointments" },
    {
      label: "Expected revenue",
      value: `$${Math.round(expectedRevenue / 1000)}k`,
      note: `Projected from ${monthlyShows} attended consultations`,
    },
  ];

  return (
    <section className="ph-portal-section" id="partner-portal">
      <div className="prominent-container">
        <div className="ph-portal-intro">
          <h2>
            Your access to the
            <br /> Prominent portal.
          </h2>
          <p>
            Every booking, qualification note and attendance update. Your show rates and revenue
            forecasts, all in your portal.
          </p>
        </div>
        <div className="ph-portal">
          <div className="ph-portal-topbar">
            <div className="ph-portal-identity">
              <img src={prominentWordmark} alt="Prominent" width={768} height={257} />
              <span>
                <strong>Westhaven Family Law</strong>
                <small>Portal preview</small>
              </span>
            </div>
            <div className="ph-portal-tools" aria-hidden="true">
              <div className="ph-portal-search">
                <Search size={14} />
                <span className="ph-portal-search-text">Search bookings…</span>
              </div>
              <span className="ph-portal-account">WF</span>
            </div>
          </div>
          <div className="ph-portal-workspace">
            <aside className="ph-portal-sidebar" aria-label="Workspace views">
              <div className="ph-portal-navigation">
                {[
                  { title: "Overview", icon: LayoutDashboard },
                  { title: "Bookings", icon: CalendarCheck },
                  { title: "Deposits", icon: CreditCard },
                  { title: "Attendance", icon: CircleCheck },
                ].map((item) => (
                  <div
                    className="ph-portal-nav-item"
                    key={item.title}
                    data-active={item.title === "Overview"}
                  >
                    <item.icon size={16} aria-hidden="true" />
                    <span>{item.title}</span>
                    {item.title === "Bookings" && <small>5</small>}
                  </div>
                ))}
              </div>
            </aside>
            <div className="ph-portal-main">
              <div className="ph-portal-heading">
                <div>
                  <h3>Overview</h3>
                  <span>Your client acquisition, in focus</span>
                </div>
                <span className="ph-portal-period">
                  <CalendarCheck size={13} aria-hidden="true" /> October 2026
                </span>
              </div>
              <div className="ph-portal-stats">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={
                      metric.label === "Expected revenue" ? "ph-portal-revenue-metric" : undefined
                    }
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.note}</small>
                  </div>
                ))}
              </div>
              <div className="ph-portal-insights">
                <PortalChart attended={attended} />
                <PortalAttendance attended={monthlyShows} showRate={showRate} />
              </div>
              <div className="ph-portal-table-wrap">
                <table className="ph-portal-table" data-view="Overview" role="table">
                  <caption className="ph-portal-sr-only">
                    Recent consultations and their qualification status.
                  </caption>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Matter</th>
                      <th>Readiness</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleConsultations.slice(0, 3).map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <div className="ph-portal-person">
                            <span className="ph-portal-avatar" data-color={index % 4}>
                              {item.initials}
                            </span>
                            <span>
                              <strong>{item.name}</strong>
                              <small>{item.location}</small>
                            </span>
                          </div>
                        </td>
                        <td data-label="Matter">{item.matter}</td>
                        <td data-label="Readiness">
                          <span className="ph-portal-vetted">
                            <Check size={12} aria-hidden="true" /> Vetted
                          </span>
                        </td>
                        <td data-label="Status">
                          <span className="ph-portal-status" data-status={initialStatuses[item.id]}>
                            <i />
                            {initialStatuses[item.id] === "Scheduled"
                              ? item.time
                              : initialStatuses[item.id]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// The site owner confirmed partner approval of this review wording on 2026-10-24.
const partnerReviews = [
  {
    quote:
      "Working with Peter and Jessica has completely changed our firm. We’ve doubled our revenue, and our lawyers aren’t spending half their day chasing enquiries anymore. The people coming in understand the fees and actually want to get their matter sorted.",
    name: "Kevin",
    role: "Principal Solicitor",
    sector: "Family law",
    initials: "K",
    theme: "We’ve doubled our revenue.",
  },
  {
    quote:
      "Honestly, I wish we’d found about this agency sooner. We had plenty of leads, but hardly anyone was ready to go ahead. Now people arrive knowing the treatment costs, with a deposit paid. The difference in the conversations we’re having is huge.",
    name: "Jamie",
    role: "Founder",
    sector: "Hair transplant clinic",
    initials: "J",
    theme: "I wish we’d found about this agency sooner",
  },
  {
    quote:
      "Jessica and the team have been brilliant. I don’t have to keep checking who’s been called or who’s booked in. It’s all there in the portal, and we only pay when someone turns up. It’s taken a huge weight off.",
    name: "Andrew",
    role: "Partner",
    sector: "",
    initials: "A",
    theme: "It’s taken a huge weight off.",
  },
];

export function PartnerReviews() {
  return (
    <section className="ph-reviews" id="partners">
      <div className="prominent-container">
        <div className="ph-section-intro">
          <div>
            <h2>What partners say.</h2>
          </div>
        </div>
        <div className="ph-review-grid">
          {partnerReviews.map((review) => (
            <article className="ph-review" key={review.name}>
              <div className="ph-review-top">
                <span className="ph-review-stars" role="img" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} size={28} fill="currentColor" aria-hidden="true" />
                  ))}
                </span>
                <Quote className="ph-review-quote-mark" size={52} fill="currentColor" aria-hidden="true" />
              </div>
              <h3>{review.theme}</h3>
              <blockquote>“{review.quote}”</blockquote>
              <div className="ph-review-person">
                <span aria-hidden="true">{review.initials}</span>
                <div>
                  <strong>{review.name}</strong>
                  <small>{review.role}{review.sector && ` · ${review.sector}`}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
