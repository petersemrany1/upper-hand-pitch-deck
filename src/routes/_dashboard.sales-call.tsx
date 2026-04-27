import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Brain, MessageCircle, Stethoscope, Megaphone, GraduationCap, Sparkles,
  HandshakeIcon, DollarSign, ShieldCheck, Calendar as CalendarIcon,
  Check, AlertTriangle, Send, Search, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  sendLeadMms, listMmsImages, saveFinanceCheck,
  saveBooking, updateLeadStatus, logCallAttempt, ensureRepForEmail,
} from "@/utils/sales-call.functions";

export const Route = createFileRoute("/_dashboard/sales-call")({
  component: SalesCallPortal,
});

type Lead = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; funding_preference: string | null;
  ad_name: string | null; ad_set_name: string | null; campaign_name: string | null;
  status: string | null; call_notes: string | null; created_at: string;
  callback_scheduled_at: string | null; day_number: number | null;
  finance_eligible: boolean | null; booking_date: string | null; booking_time: string | null;
  clinic_id: string | null; rep_id: string | null;
};

type Clinic = {
  id: string; clinic_name: string; address: string | null;
  doctor_name: string | null; city: string | null; state: string | null;
};

const STEPS = [
  { key: "mindset", label: "MINDSET", Icon: Brain },
  { key: "opening", label: "OPENING", Icon: MessageCircle },
  { key: "discovery", label: "DISCOVERY", Icon: Stethoscope },
  { key: "amplification", label: "AMPLIFICATION", Icon: Megaphone },
  { key: "education", label: "EDUCATION", Icon: GraduationCap },
  { key: "audiobook", label: "AUDIOBOOK", Icon: Sparkles, special: true },
  { key: "commitment", label: "COMMITMENT", Icon: HandshakeIcon },
  { key: "price", label: "PRICE & SELL", Icon: DollarSign },
  { key: "finance", label: "FINANCE CHECK", Icon: ShieldCheck },
  { key: "booking", label: "DEPOSIT & BOOK", Icon: CalendarIcon },
] as const;

type StepKey = typeof STEPS[number]["key"];

const COLORS = {
  bg: "#f7f7f5",
  card: "#ffffff",
  line: "#ebebeb",
  text: "#111111",
  muted: "#111111",
  hint: "#111111",
  placeholder: "#111111",
  coral: "#f4522d",
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  amberDark: "#92400e",
  amberBg: "#fffbeb",
  red: "#ef4444",
  gold: "#d97706",
  // legacy alias kept so existing references keep working
  // (was previously used as the "primary action" color)
};

function statusColor(s: string | null) {
  switch (s) {
    case "new": return COLORS.blue;
    case "contacted": return COLORS.amber;
    case "booked": return COLORS.green;
    case "ineligible": return COLORS.red;
    case "dropped": return COLORS.muted;
    default: return COLORS.blue;
  }
}

function fmtTime(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function SalesCallPortal() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [step, setStep] = useState<StepKey>("mindset");
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());
  const [repId, setRepId] = useState<string | null>(null);
  const [repName, setRepName] = useState<string>("");
  const [mmsImages, setMmsImages] = useState<{ name: string; url: string }[]>([]);

  // Resolve rep from auth email
  useEffect(() => {
    if (!user?.email) return;
    void ensureRepForEmail({ data: { email: user.email, name: user.user_metadata?.name ?? "" } })
      .then((r) => {
        if (r.success && r.rep) { setRepId(r.rep.id); setRepName(r.rep.name); }
      });
  }, [user?.email, user?.user_metadata?.name]);

  // Load leads + realtime
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("meta_leads").select("*").order("created_at", { ascending: false }).limit(500);
      setLeads((data ?? []) as Lead[]);
    };
    void load();
    const ch = supabase.channel("sales-call-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "meta_leads" }, load).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // Load MMS images
  useEffect(() => {
    void listMmsImages().then((r) => { if (r.success) setMmsImages(r.images); });
  }, []);

  const active = useMemo(() => leads.find((l) => l.id === activeId) ?? null, [leads, activeId]);

  const markStepComplete = (k: StepKey) => {
    setCompleted((prev) => { const n = new Set(prev); n.add(k); return n; });
  };

  const advance = (current: StepKey) => {
    markStepComplete(current);
    const idx = STEPS.findIndex((s) => s.key === current);
    if (idx >= 0 && idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  // Show full-screen lead chooser before entering the framework
  if (!active) {
    return (
      <LeadChooser
        leads={leads}
        onPick={(id) => { setActiveId(id); setStep("mindset"); setCompleted(new Set()); }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* LEFT — vertical step nav (desktop only) */}
      <aside className="hidden md:flex flex-col flex-shrink-0" style={{ width: 220, background: "#ffffff", borderRight: `0.5px solid ${COLORS.line}` }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: COLORS.line }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: COLORS.hint, fontWeight: 500 }}>Sales Call</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text, marginTop: 4 }}>Framework</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {STEPS.map((s) => {
            const isActive = step === s.key;
            const isDone = completed.has(s.key);
            const special = "special" in s && s.special;
            return (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                className="w-full text-left flex items-center gap-3 transition-colors"
                style={{
                  padding: "10px 18px",
                  background: isActive ? "#f9f9f9" : "transparent",
                  borderLeft: isActive ? `3px solid ${special ? COLORS.gold : COLORS.coral}` : "3px solid transparent",
                }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 16, height: 16,
                    background: isActive ? (special ? COLORS.gold : COLORS.coral) : isDone ? "transparent" : "#ebebeb",
                  }}
                >
                  {isDone && !isActive && <Check className="h-3 w-3" style={{ color: COLORS.muted }} />}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: "0.04em",
                  color: isActive ? COLORS.text : isDone ? COLORS.muted : COLORS.hint,
                }}>
                  {s.label}{special ? " ⭐" : ""}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* CENTER */}
      <main className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 py-[60px]">
        <div className="w-full" style={{ maxWidth: 640 }}>
          <StepContent
            step={step}
            lead={active}
            repName={repName}
            repId={repId}
            mmsImages={mmsImages}
            onAdvance={advance}
            onMarkComplete={markStepComplete}
          />
        </div>
      </main>

      {/* RIGHT — sidebar on desktop, stacked below on mobile */}
      <aside
        className="flex flex-col flex-shrink-0 w-full lg:w-[320px]"
        style={{
          background: "#ffffff",
          borderLeft: `0.5px solid ${COLORS.line}`,
          borderTop: `0.5px solid ${COLORS.line}`,
        }}
      >
        <RightPanel
          active={active}
          repId={repId}
          mmsImages={mmsImages}
          onChangeLead={() => setActiveId(null)}
        />
      </aside>

      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        input::placeholder, textarea::placeholder { color: #111111; opacity: 1; }
      `}</style>
    </div>
  );
}

/* ─────────────── STEP CONTENT ─────────────── */

function StepContent({
  step, lead, repName, repId, mmsImages, onAdvance, onMarkComplete,
}: {
  step: StepKey;
  lead: Lead | null;
  repName: string;
  repId: string | null;
  mmsImages: { name: string; url: string }[];
  onAdvance: (k: StepKey) => void;
  onMarkComplete: (k: StepKey) => void;
}) {
  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center text-center" style={{ color: COLORS.muted }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: COLORS.text, marginBottom: 8 }}>No active lead</div>
          <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6 }}>Pick a lead from the right panel to begin.</div>
        </div>
      </div>
    );
  }

  const fname = lead.first_name || "there";
  const funding = lead.funding_preference || "your enquiry";

  if (step === "mindset") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 1 — Mindset</Eyebrow>
        <StepHeading>Changing Lives</StepHeading>
        <ScriptBody>
          I'm not here to simply book appointments — I'm here to transform <span style={{ fontWeight: 500 }}>{fname}'s</span> life.
          If I don't help overcome the fears and objections, they won't get the treatment they desperately need.
          They'll continue living in fear, watching their situation deteriorate — when they could be reclaiming their confidence and quality of life.
        </ScriptBody>
        <div className="mt-7 flex justify-end">
          <button
            onClick={() => onAdvance("mindset")}
            className="rounded-[6px]"
            style={{ background: COLORS.green, color: "#ffffff", fontSize: 13, fontWeight: 500, padding: "10px 20px" }}
          >
            I'm ready
          </button>
        </div>
      </div>
    );
  }

  if (step === "opening") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 2 — Opening</Eyebrow>
        <StepHeading>Set the Stage</StepHeading>
        <ScriptBody>
          Hi <Pill name>{fname}</Pill> it's <Pill name>{repName || "[your name]"}</Pill> from Hair Transplant Group, how are you?
          I saw you made a Facebook enquiry about {funding} and I wanted to make sure I called you straight away
          — if I don't call you now I won't be able to call you back later, it's just so busy today.
          So — what's happening with your hair situation <Pill name>{fname}</Pill>?
        </ScriptBody>
        <Coach>
          Name first → proves you're not spam. Who you are → reference their enquiry → pre-empt the callback objection immediately
          → open question hands control to them. The "how are you" gets an automatic "good" — that breath is yours.
        </Coach>

        <CalloutAmber title='"Call me back" handler'>
          That's not a problem at all — I know you won't expect my call. Do you have just one minute now, just to see if it even
          makes sense for me to call you back later?
          <Coach>One minute calls become ten-minute calls. Just get them talking.</Coach>
        </CalloutAmber>

        <NextBtn onClick={() => onAdvance("opening")} />
      </div>
    );
  }

  if (step === "discovery") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 3 — Discovery</Eyebrow>
        <StepHeading>Understand Their Pain (5–7 mins)</StepHeading>

        <ScriptBody>
          So what's going on with your hair situation?
        </ScriptBody>
        <Coach>Ask it. Then stop. Don't interrupt. Don't fill silence. Let them lead.</Coach>

        <CalloutAmber title="Echoing technique">
          When they say something — echo it back. They say "I lose a lot in the shower." You say "You lose a lot in the shower?"
          with genuine curiosity. This proves you heard them. Do it throughout the call.
        </CalloutAmber>

        <DiscoveryChecklist />
        <Section title="History">
          <textarea
            placeholder="Write down everything they tell you. Word for word. You will use their exact words in amplification and audiobook."
            className="w-full rounded-[6px] outline-none"
            style={{
              background: "#f9f9f9",
              border: `0.5px solid ${COLORS.line}`,
              color: COLORS.text,
              fontSize: 14,
              lineHeight: 1.6,
              padding: 12,
              minHeight: 140,
            }}
          />
        </Section>

        <NextBtn onClick={() => onAdvance("discovery")} />
      </div>
    );
  }

  if (step === "amplification") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 4 — Amplification</Eyebrow>
        <StepHeading>Summarise Back</StepHeading>
        <ScriptBody>
          So let me make sure I understand... You've been dealing with [pain point] for [timeframe],
          it's affecting [specific impacts they told you], and you're tired of [consequences].... Is that right?
        </ScriptBody>
        <Coach>
          Reflect their exact pain back in one sentence. Get them to say yes — that yes means they feel completely heard
          and is your bridge to education. Don't rush it. Don't move on until you have it.
        </Coach>
        <Section title="Your amplification sentence">
          <textarea
            placeholder="Write your amplification sentence here before you say it out loud."
            className="w-full rounded-[6px] outline-none"
            style={{
              background: "#f9f9f9",
              border: `0.5px solid ${COLORS.line}`,
              color: COLORS.text,
              fontSize: 14,
              lineHeight: 1.6,
              padding: 12,
              minHeight: 100,
            }}
          />
        </Section>
        <NextBtn onClick={() => onAdvance("amplification")} />
      </div>
    );
  }

  if (step === "education") {
    return (
      <EducationStep lead={lead} mmsImages={mmsImages} onNext={() => onAdvance("education")} repId={repId} />
    );
  }

  if (step === "audiobook") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow gold>Step 6 — Audiobook ⭐</Eyebrow>
        <div
          className="rounded-[10px]"
          style={{
            background: "#fffbeb",
            border: `0.5px solid ${COLORS.gold}`,
            borderLeft: `2px solid ${COLORS.gold}`,
            padding: 28,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 500, color: COLORS.text, lineHeight: 1.3 }}>
            <span style={{ color: COLORS.gold, marginRight: 8 }}>⭐</span>
            This is where the sale happens. Not at the deposit. Right here.
          </h1>
          <p style={{ marginTop: 16, fontSize: 16, color: COLORS.text, lineHeight: 1.7 }}>
            <Pill name>{lead.first_name || "[name]"}</Pill> I want you to picture something for me...
          </p>
          <ul style={{ marginTop: 20, fontSize: 14, color: COLORS.text, lineHeight: 1.7 }} className="space-y-3">
            <li>👉 Use their words — not generic phrases. Whatever they told you in discovery, feed it back into the picture you paint.</li>
            <li>👉 Reference at least 2 specific things they actually said — their hairline, their confidence, their why now moment, how long they've dealt with it, what they've tried.</li>
            <li>👉 Frame it as waking up tomorrow without the problem — "Imagine waking up and looking in the mirror and just seeing your hairline back. You're getting ready for [their event/milestone]. You're not thinking about it anymore. You're just... you again."</li>
            <li>👉 Make it personal and specific. Generic pictures don't land. Their picture lands.</li>
            <li>👉 Keep it to 2–3 sentences. Then stop. Silence is doing the work.</li>
          </ul>
          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              borderRadius: 6,
              background: "#fef3c7",
              borderLeft: `2px solid ${COLORS.gold}`,
            }}
          >
            <p style={{ fontSize: 14, color: COLORS.amberDark, fontWeight: 500, lineHeight: 1.6 }}>
              Say the picture. Then stop. Do not speak. The silence is working for you. Wait for them to respond.
            </p>
          </div>
        </div>
        <NextBtn onClick={() => onAdvance("audiobook")} gold />
      </div>
    );
  }

  if (step === "commitment") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 7 — Commitment</Eyebrow>
        <StepHeading>Ask For Commitment</StepHeading>
        <ScriptBody>
          Based on all of that — is it something you wanna get sorted now? Where are you at with all of this?
        </ScriptBody>
        <Coach>Wait for their answer. Let them tell you where they're at. Do not fill the silence.</Coach>
        <div className="mt-5 grid gap-2">
          <RuleBad>Never say "would you like to book" — binary yes/no exit door.</RuleBad>
          <RuleBad>Never say "do you want to think about it" — you just lost them.</RuleBad>
          <RuleBad>Never say "no pressure" or "no rush" — you're handing them the off-ramp.</RuleBad>
          <RuleGood>Ask it open. Wait. Let them land.</RuleGood>
        </div>
        <CalloutGreen title="When they say yes">
          Fantastic. I want to get you in with <Pill name>Dr. [doctor_name]</Pill> at <Pill name>[clinic_name]</Pill>. Based on everything you've told me
          — [their specific situation from discovery] — she's exactly the right person for you. Let me see what her availability looks like.
          <Coach>Presume the booking. You are a naive optimist. It is all paperwork from here.</Coach>
        </CalloutGreen>
        <NextBtn onClick={() => onAdvance("commitment")} />
      </div>
    );
  }

  if (step === "price") {
    return <PriceStep onNext={() => onAdvance("price")} />;
  }

  if (step === "finance") {
    return <FinanceStep lead={lead} onComplete={() => { onMarkComplete("finance"); onAdvance("finance"); }} />;
  }

  if (step === "booking") {
    return <BookingStep lead={lead} onBooked={() => onMarkComplete("booking")} />;
  }

  return null;
}

/* ─────────── Helpers ─────────── */

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-[10px] ${className}`}
      style={{ background: COLORS.card, border: `0.5px solid ${COLORS.line}` }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: gold ? COLORS.gold : COLORS.coral,
        marginBottom: 12,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        fontWeight: 500,
        color: COLORS.hint,
      }}
    >
      {children}
    </div>
  );
}

// Pill: plain text by default. Only the lead's name (`name` prop) is weight 500.
// No coloured background highlights — keep script body clean and readable.
function Pill({ children, name }: { children: React.ReactNode; name?: boolean; gold?: boolean }) {
  return (
    <span style={{ color: COLORS.text, fontWeight: name ? 500 : 400 }}>
      {children}
    </span>
  );
}

function Coach({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-3"
      style={{
        fontSize: 13,
        lineHeight: 1.6,
        fontStyle: "italic",
        color: COLORS.muted,
      }}
    >
      {children}
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <Label>{title}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function NextBtn({ onClick, gold }: { onClick: () => void; gold?: boolean }) {
  return (
    <div className="mt-7 flex justify-end">
      <button
        onClick={onClick}
        className="rounded-[6px]"
        style={{
          background: gold ? COLORS.gold : COLORS.green,
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 500,
          padding: "10px 20px",
        }}
      >
        Mark complete
      </button>
    </div>
  );
}

function RuleBad({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[6px] flex items-start gap-2"
      style={{
        background: "#fef2f2",
        border: `0.5px solid ${COLORS.line}`,
        color: COLORS.text,
        fontSize: 14,
        lineHeight: 1.6,
        padding: "10px 12px",
      }}
    >
      <X className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.red }} />
      <span>{children}</span>
    </div>
  );
}

function RuleGood({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[6px] flex items-start gap-2"
      style={{
        background: "#ecfdf5",
        border: `0.5px solid ${COLORS.line}`,
        color: COLORS.text,
        fontSize: 14,
        lineHeight: 1.6,
        padding: "10px 12px",
      }}
    >
      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.green }} />
      <span>{children}</span>
    </div>
  );
}

// Step heading: large 22px heading, weight 500, generous bottom margin
function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 22,
        fontWeight: 500,
        color: COLORS.text,
        marginBottom: 20,
        lineHeight: 1.3,
      }}
    >
      {children}
    </h1>
  );
}

// Script body: prominent "Say this" card — white, 2px coral left border, 14px #111
function ScriptBody({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[6px]"
      style={{
        background: "#ffffff",
        border: `0.5px solid ${COLORS.line}`,
        borderLeft: `2px solid ${COLORS.coral}`,
        padding: "18px 20px",
        fontSize: 14,
        lineHeight: 1.7,
        fontWeight: 400,
        color: COLORS.text,
      }}
    >
      {children}
    </div>
  );
}

// Amber "Call me back" / handler callout
function CalloutAmber({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: COLORS.amberBg,
        borderLeft: `2px solid ${COLORS.amber}`,
        borderRadius: 0,
        padding: "14px 16px",
        marginTop: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: COLORS.amberDark,
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, color: COLORS.amberDark, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

// Green callout for success-style sections (e.g. "When they say yes")
function CalloutGreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#ecfdf5",
        borderLeft: `2px solid ${COLORS.green}`,
        borderRadius: 0,
        padding: "14px 16px",
        marginTop: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#047857",
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function DiscoveryChecklist() {
  const items = [
    "Where on the head is the loss happening?",
    "How long has it been happening?",
    "Is it hereditary? Does it run in the family?",
    "What have they already tried? (medication, concealers, etc.)",
    null, // why now special
    "How does it make you feel? (use carefully — position as an advisor)",
  ];
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [whyNow, setWhyNow] = useState(false);
  const toggle = (i: number) => setChecked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  return (
    <Section title="Discovery checklist">
      <div className="space-y-2">
        {items.map((it, i) => it === null ? (
          <label
            key="why-now"
            className="flex items-start gap-3 cursor-pointer"
            style={{
              background: COLORS.amberBg,
              borderLeft: `2px solid ${COLORS.amber}`,
              borderRadius: 0,
              padding: "12px 14px",
            }}
          >
            <input type="checkbox" checked={whyNow} onChange={() => setWhyNow((v) => !v)} className="mt-1" />
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.amberDark, fontWeight: 500 }}>
                Why now?
              </div>
              <p style={{ fontSize: 13, marginTop: 6, color: COLORS.amberDark, lineHeight: 1.6 }}>
                Critical. There is always a reason they enquired today. A wedding. An event. A birthday. A photo that upset them.
                Something changed. Find it. This is your anchor for the entire call — you will use it in audiobook.
              </p>
            </div>
          </label>
        ) : (
          <label
            key={i}
            className="flex items-center gap-3 cursor-pointer rounded-[6px]"
            style={{ padding: "10px 12px", background: "transparent" }}
          >
            <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
            <span style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6 }}>{it}</span>
          </label>
        ))}
      </div>
    </Section>
  );
}

function EducationStep({ lead, mmsImages, onNext, repId }: { lead: Lead; mmsImages: { name: string; url: string }[]; onNext: () => void; repId: string | null }) {
  void repId;
  const send = async (url: string) => {
    const r = await sendLeadMms({ data: { leadId: lead.id, mediaUrl: url, body: "" } });
    if (r.success) toast.success("Image sent"); else toast.error(r.error);
  };
  return (
    <div className="max-w-2xl mx-auto">
      <Eyebrow>Step 5 — Education</Eyebrow>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: "#111", marginBottom: 20, lineHeight: 1.3 }}>Educate & Show</h1>

      <Card className="px-5 py-5">
        <Label>Card 1 — Knowledge Check</Label>
        <p className="text-lg font-medium mt-2">What do you know about hair transplants?</p>
        <Coach>Start with what they already know. Fill in the gaps only. Don't lecture. Let them feel smart.</Coach>
      </Card>

      <Card className="px-5 py-5 mt-3">
        <Label>Card 2 — The Product (no price yet)</Label>
        <div className="mt-3 space-y-4 text-sm leading-relaxed">
          <div><div className="font-medium mb-1">What is a graft?</div>
            <p>Think of it like planting a garden. A graft is one tiny root that contains between 1 and 4 hairs. We take those roots from the back of your head — where the hair is genetically programmed to never fall out. We plant them in the areas where you're losing hair. Because they come from that resistant zone, they stay. Permanently. They grow, you cut them, you wash them — they're yours for life.</p></div>
          <div><div className="font-medium mb-1">Why medication doesn't fix it</div>
            <p>Things like Rogaine and Finasteride can slow the loss and keep existing hair stronger. But here's the thing — they cannot grow hair back in areas that are already gone. If the follicle is dead, it's dead. No pill or spray brings it back. Only transplanting a living root from elsewhere does that. That's the only way.</p></div>
          <div><div className="font-medium mb-1">Why going overseas is a risk</div>
            <p>Turkey looks cheap on paper — but here's what's hidden in that price. The doctor usually designs the hairline and then leaves. Technicians — not surgeons — do the actual procedure. You're in a foreign country. If something goes wrong when you get home, you're on your own. No local follow-up. No one to call. No recourse. Australian clinics are AHPRA regulated, doctor-led, and if anything needs attention — it's a 10-minute drive, not a $3,000 flight.</p></div>
          <div><div className="font-medium mb-1">Why Nitai specifically</div>
            <p>Most clinics quote you one price and charge more on the day. Nitai has never done that — not once. The quote you get is the quote. Dr. Shabna Singh is in the room all day — not just for the design, the whole treatment. Full aftercare is included. And they treat cases most clinics turn away.</p></div>
        </div>
      </Card>

      <Card className="px-5 py-5 mt-3">
        <Label>Card 3 — Send Images</Label>
        <p className="text-sm mt-2">Show don't tell. Send the before/after right now while you're talking.</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {mmsImages.length === 0 ? (
            <div className="text-[13px]" style={{ color: COLORS.muted }}>Upload images to the <code>mms-images</code> bucket to enable sending.</div>
          ) : mmsImages.slice(0, 4).map((img) => (
            <button key={img.name} onClick={() => void send(img.url)}
              className="px-3 py-2 rounded-md text-[13px] font-medium flex items-center gap-2"
              style={{ background: COLORS.coral, color: "#ffffff" }}>
              <Send className="h-3.5 w-3.5" /> Send {img.name.replace(/\.[^.]+$/, "")}
            </button>
          ))}
        </div>
        <p className="text-sm mt-3 italic" style={{ color: COLORS.muted }}>"Have a look at your phone — I've just sent you something."</p>
      </Card>

      <Card className="px-5 py-5 mt-3">
        <Label>Card 4 — Connect to Their Situation</Label>
        <p className="text-sm mt-2">Now bring it back to them specifically. Use their exact words from discovery.</p>
        <ul className="mt-3 text-sm space-y-1.5 list-disc pl-5">
          <li>Name what they told you (hereditary, crown loss, front recession, etc.)</li>
          <li>Reference how long they've been dealing with it</li>
          <li>Reference their WHY NOW if they gave one</li>
          <li>"I'm not saying your situation is like this, but based on what you've told me..."</li>
        </ul>
      </Card>

      <Section title="UNDERSTANDING">
        <textarea className="w-full text-sm rounded-md p-3 outline-none"
          style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text, minHeight: 100 }} />
      </Section>

      <NextBtn onClick={onNext} />
    </div>
  );
}

function PriceStep({ onNext }: { onNext: () => void }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  // Auto-load clinics and pre-select Nitai (the only clinic for now)
  useEffect(() => {
    void supabase
      .from("clinics")
      .select("id, clinic_name, address, doctor_name, city, state")
      .then(({ data }) => {
        const list = (data ?? []) as Clinic[];
        setClinics(list);
        const nitai = list.find((c) => c.clinic_name?.toLowerCase().includes("nitai")) ?? list[0];
        if (nitai) setSelectedClinicId(nitai.id);
      });
  }, []);

  const selected = clinics.find((c) => c.id === selectedClinicId) ?? null;
  const isNitai = selected?.clinic_name?.toLowerCase().includes("nitai") ?? false;

  // Fallback Nitai card if the clinics table is empty
  const nitaiFallback = {
    clinic_name: "Nitai Medical & Cosmetic Centre",
    doctor_name: "Dr. Shabna Singh",
    address: "64 Lincoln Rd, Essendon VIC 3040",
  };

  const journey = [
    "The consult includes a full medical assessment, hair design, imaging — all in one appointment, no obligation.",
    "Normally this consult is $395...",
    "...we do have some complimentary spots available...",
    "...there is just a $75 deposit to secure your spot...",
    "...which is fully refunded when you arrive...",
    "...we do this because we do turn people away for these slots. Does that sound fair?",
  ];

  const display = selected ?? (clinics.length === 0 ? nitaiFallback : null);
  const showNitaiBlock = isNitai || (!selected && clinics.length === 0);

  return (
    <div className="max-w-2xl mx-auto">
      <Eyebrow>Step 8 — Price & Sell</Eyebrow>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: "#111", marginBottom: 20, lineHeight: 1.3 }}>Present Price</h1>

      <ScriptBody>
        That would be with <span style={{ fontWeight: 500 }}>Dr. Shabna Singh</span> at <span style={{ fontWeight: 500 }}>Nitai Medical & Cosmetic Centre</span> in Essendon.
        She's one of our senior specialists — 6 years in hair transplants, world-class trainer.
        Based on what you've told me, she's exactly the right person for you.
      </ScriptBody>
      <Coach>
        Personalise to the specialist. Name the doctor and the clinic. Give a reason tied to exactly what they told you in discovery.
      </Coach>

      {clinics.length > 1 && (
        <Section title="Choose clinic">
          <div className="space-y-2">
            {clinics.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClinicId(c.id)}
                className="w-full text-left px-3 py-2 rounded-md flex items-center justify-between"
                style={{
                  background: selectedClinicId === c.id ? "rgba(45,107,228,0.15)" : "#f9f9f9",
                  border: `1px solid ${selectedClinicId === c.id ? COLORS.coral : COLORS.line}`,
                }}
              >
                <div>
                  <div className="text-sm font-semibold">{c.clinic_name}</div>
                  <div className="text-[13px]" style={{ color: COLORS.muted }}>{c.address}</div>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {display && (
        <Card className="px-5 py-5 mt-4">
          <Label>Selected Clinic</Label>
          <div className="text-base font-medium mt-1">{display.clinic_name}</div>
          {display.doctor_name && <div className="text-sm mt-1">{display.doctor_name}</div>}
          {display.address && <div className="text-sm" style={{ color: COLORS.muted }}>{display.address}</div>}
          {showNitaiBlock && (
            <>
              <p className="mt-3 text-[13px]" style={{ color: COLORS.text }}>
                Free parking on site · Near Lincoln Park · 5 mins from DFO · 10 mins Melbourne Airport · Off Tullamarine Freeway
              </p>
              <ul className="mt-4 text-sm space-y-1.5 list-disc pl-5">
                <li>Transparent pricing — the quote you get is the quote, never charged a patient more on the day</li>
                <li>Elite hair design — natural look, personalised to your face shape and hair loss pattern</li>
                <li>Full aftercare included — PRP, stem cell treatments, ongoing medication management</li>
                <li>Dr. Shabna Singh — 6 years hair transplants, world-class cosmetic injectable trainer, Derma Sutic global ambassador</li>
                <li>Treats advanced cases and afro hair most clinics won't touch</li>
                <li>Can treat patients with very limited donor hair using body hair, PRP and stem cell combination</li>
                <li>Doctor-led and in the room all day — not just for the design</li>
              </ul>
            </>
          )}
        </Card>
      )}

      <Section title="Section B — The Price Journey (read in order)">
        <ol className="space-y-2 list-decimal pl-5">
          {journey.map((line) => <li key={line} className="text-sm leading-relaxed">{line}</li>)}
        </ol>
      </Section>

      <NextBtn onClick={onNext} />
    </div>
  );
}

function FinanceStep({ lead, onComplete }: { lead: Lead; onComplete: () => void }) {
  const [form, setForm] = useState({
    name: "", dob: "", price: "", citizen: "", earning: "", bankrupt: "", centrelink: "", homeowner: "",
  });
  const [result, setResult] = useState<null | { eligible: boolean }>(null);
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const check = async () => {
    const eligible =
      form.citizen === "yes" && form.earning === "yes" && form.bankrupt === "no" && form.centrelink === "no";
    setResult({ eligible });
    const r = await saveFinanceCheck({ data: { leadId: lead.id, eligible, answers: form } });
    if (r.success) toast.success(eligible ? "Marked eligible" : "Marked not eligible");
    onComplete();
  };

  const YN = ({ k }: { k: keyof typeof form }) => (
    <div className="flex gap-2">
      {["yes", "no"].map((v) => (
        <button key={v} onClick={() => set(k, v)}
          className="px-4 py-1.5 rounded-md text-[13px] font-medium capitalize"
          style={{
            background: form[k] === v ? COLORS.coral : "#f9f9f9",
            color: form[k] === v ? "#fff" : COLORS.muted,
            border: `1px solid ${form[k] === v ? COLORS.coral : COLORS.line}`,
          }}>{v}</button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <Eyebrow>Step 9 — Finance Check</Eyebrow>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: "#111", marginBottom: 20, lineHeight: 1.3 }}>Treatment Funding</h1>
      <Card className="px-5 py-5">
        <p className="text-sm leading-relaxed">
          I just need to ask you 6 quick questions — it's not a commitment, it won't affect your credit rating, and it just helps us see if finance could work for you.
        </p>
      </Card>

      <Card className="px-5 py-5 mt-4 space-y-4">
        <FormRow label="Full Name">
          <input value={form.name} onChange={(e) => set("name", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
        </FormRow>
        <FormRow label="Date of Birth">
          <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
        </FormRow>
        <FormRow label="Treatment Price">
          <div className="flex gap-2">
            {["Below 18,000", "18,000", "18,000+"].map((v) => (
              <button key={v} onClick={() => set("price", v)}
                className="px-3 py-1.5 rounded-md text-[13px] font-medium"
                style={{
                  background: form.price === v ? COLORS.coral : "#f9f9f9",
                  color: form.price === v ? "#fff" : COLORS.muted,
                  border: `1px solid ${form.price === v ? COLORS.coral : COLORS.line}`,
                }}>{v}</button>
            ))}
          </div>
        </FormRow>
        <FormRow label="Australian citizen or PR?"><YN k="citizen" /></FormRow>
        <FormRow label="Employed and earning $50,000+ per year?"><YN k="earning" /></FormRow>
        <FormRow label="Bankrupt or in a debt agreement?"><YN k="bankrupt" /></FormRow>
        <FormRow label="Centrelink only source of income?"><YN k="centrelink" /></FormRow>
        <FormRow label="Are you a home owner?"><YN k="homeowner" /></FormRow>

        <button
          onClick={() => void check()}
          className="w-full rounded-[6px]"
          style={{ background: COLORS.green, color: "#ffffff", fontSize: 13, fontWeight: 500, padding: "10px 20px" }}
        >
          Check eligibility
        </button>
      </Card>

      {result && (
        <div className="mt-4 p-4 rounded-md flex items-center gap-3"
          style={{ background: result.eligible ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${result.eligible ? COLORS.green : COLORS.red}` }}>
          {result.eligible
            ? <><Check className="h-6 w-6" style={{ color: COLORS.green }} /><span className="font-medium">Great news — finance options are available.</span></>
            : <><AlertTriangle className="h-6 w-6" style={{ color: COLORS.red }} /><span className="font-medium">Finance may not be available — explore savings or superannuation options with the patient.</span></>}
        </div>
      )}
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-1.5">{children}</div></div>;
}

function BookingStep({ lead, onBooked }: { lead: Lead; onBooked: () => void }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [form, setForm] = useState({
    clinicId: lead.clinic_id ?? "", gender: "", dob: "", healthFund: "",
    address: "", funding: lead.funding_preference ?? "Savings",
    date: "", time: "",
  });
  useEffect(() => {
    void supabase.from("clinics").select("id, clinic_name, address, doctor_name, city, state").then(({ data }) =>
      setClinics((data ?? []) as Clinic[])
    );
  }, []);
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });
  const clinic = clinics.find((c) => c.id === form.clinicId);
  const slots = ["09:00", "10:30", "12:00", "14:00", "15:30"];

  const book = async () => {
    if (!form.date || !form.time) { toast.error("Pick a date and time"); return; }
    const r = await saveBooking({ data: { leadId: lead.id, clinicId: form.clinicId || null, date: form.date, time: form.time } });
    if (r.success) { toast.success("Appointment booked"); onBooked(); } else toast.error(r.error);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Eyebrow>Step 10 — Deposit & Book</Eyebrow>
      <StepHeading>Lock It In</StepHeading>
      <CalloutAmber title="Get it before they hang up">
        If you can't lock in a date today — get the follow-up call scheduled before they go.
        Never let them leave without a next step.
      </CalloutAmber>
      <div style={{ marginTop: 16 }} />

      <Card className="px-5 py-5 space-y-4">
        <FormRow label="Clinic">
          <select value={form.clinicId} onChange={(e) => set("clinicId", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
            <option value="">Select clinic…</option>
            {clinics.map((c) => <option key={c.id} value={c.id}>{c.clinic_name}</option>)}
          </select>
        </FormRow>
        {clinic?.doctor_name && <div className="text-[13px]" style={{ color: COLORS.muted }}>Doctor: <span style={{ color: COLORS.text }}>{clinic.doctor_name}</span></div>}
        <FormRow label="Gender">
          <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
            <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
          </select>
        </FormRow>
        <FormRow label="Date of Birth">
          <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
        </FormRow>
        <FormRow label="Health fund">
          <input value={form.healthFund} onChange={(e) => set("healthFund", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
        </FormRow>
        <FormRow label="Address / Suburb">
          <input value={form.address} onChange={(e) => set("address", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
        </FormRow>
        <FormRow label="Funding type">
          <div className="flex gap-2">
            {["Savings", "Super", "Finance"].map((v) => (
              <button key={v} onClick={() => set("funding", v)}
                className="px-4 py-1.5 rounded-md text-[13px] font-medium"
                style={{
                  background: form.funding === v ? COLORS.coral : "#f9f9f9",
                  color: form.funding === v ? "#fff" : COLORS.muted,
                  border: `1px solid ${form.funding === v ? COLORS.coral : COLORS.line}`,
                }}>{v}</button>
            ))}
          </div>
        </FormRow>
        <FormRow label="Date">
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
        </FormRow>
        <FormRow label="Time slot">
          <div className="flex gap-2 flex-wrap">
            {slots.map((s) => (
              <button key={s} onClick={() => set("time", s)}
                className="px-3 py-1.5 rounded-md text-[13px] font-medium"
                style={{
                  background: form.time === s ? COLORS.green : "#f9f9f9",
                  color: form.time === s ? "#ecfdf5" : COLORS.muted,
                  border: `1px solid ${form.time === s ? COLORS.green : COLORS.line}`,
                }}>{s} {clinic?.doctor_name ? `· ${clinic.doctor_name.split(" ").slice(-1)[0]}` : ""}</button>
            ))}
          </div>
        </FormRow>

        <button
          onClick={() => void book()}
          className="w-full rounded-[6px]"
          style={{ background: COLORS.green, color: "#ffffff", fontSize: 13, fontWeight: 500, padding: "12px 20px" }}
        >
          Book appointment
        </button>
      </Card>
    </div>
  );
}

/* ─────────────── LEAD CHOOSER (entry point) ─────────────── */

const ATTEMPTS_PER_DAY = (day: number) => (day <= 7 ? 3 : 1);

type LeadUrgency = "overdue" | "due" | "upcoming";

function leadUrgency(l: Lead): LeadUrgency {
  if (!l.callback_scheduled_at) return "upcoming";
  const t = new Date(l.callback_scheduled_at).getTime();
  const now = Date.now();
  if (Number.isNaN(t)) return "upcoming";
  if (t < now) return "overdue";
  // due now if within next 30 min
  if (t - now < 30 * 60 * 1000) return "due";
  return "upcoming";
}

function LeadChooser({ leads, onPick }: { leads: Lead[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");

  const sorted = useMemo(() => {
    const score = (l: Lead) => {
      const u = leadUrgency(l);
      if (u === "overdue") return 0;
      if (u === "due") return 1;
      return 2;
    };
    const list = leads.filter((l) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        (l.first_name ?? "").toLowerCase().includes(needle) ||
        (l.last_name ?? "").toLowerCase().includes(needle) ||
        (l.phone ?? "").toLowerCase().includes(needle)
      );
    });
    return [...list].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [leads, q]);

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#ffffff", color: COLORS.text }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 style={{ fontSize: 28, fontWeight: 500, color: "#111", lineHeight: 1.2 }}>
          Who are you calling?
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, color: "#111" }}>Select a lead to begin</p>

        <div className="relative" style={{ marginTop: 24 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#111", opacity: 0.5 }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full rounded-[8px] outline-none"
            style={{
              background: "#ffffff",
              border: `0.5px solid ${COLORS.line}`,
              color: "#111",
              fontSize: 14,
              padding: "12px 14px 12px 38px",
            }}
          />
        </div>

        <div className="mt-6 space-y-2">
          {sorted.length === 0 && (
            <div style={{ padding: "24px 0", fontSize: 14, color: "#111", opacity: 0.7 }}>No leads to call.</div>
          )}
          {sorted.map((l) => {
            const u = leadUrgency(l);
            const accent =
              u === "overdue" ? COLORS.red : u === "due" ? COLORS.amber : "transparent";
            const day = l.day_number ?? 1;
            const attempts = ATTEMPTS_PER_DAY(day);
            const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unnamed lead";
            return (
              <div
                key={l.id}
                className="flex items-center gap-4 rounded-[10px]"
                style={{
                  background: "#ffffff",
                  border: `0.5px solid ${COLORS.line}`,
                  borderLeft: u === "upcoming" ? `0.5px solid ${COLORS.line}` : `4px solid ${accent}`,
                  padding: "16px 18px",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#111" }}>{name}</div>
                  <div style={{ fontSize: 13, color: "#111", marginTop: 2 }}>
                    {l.phone || "no phone"}
                    {l.funding_preference ? <> · <span style={{ color: "#111" }}>{l.funding_preference}</span></> : null}
                  </div>
                  <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background: `${statusColor(l.status)}1a`,
                        color: statusColor(l.status),
                      }}
                    >
                      {l.status || "new"}
                    </span>
                    <span style={{ fontSize: 12, color: "#111", opacity: 0.7 }}>
                      Day {day} · Attempt 1 of {attempts}
                    </span>
                    {u === "overdue" && (
                      <span style={{ fontSize: 12, color: COLORS.red, fontWeight: 500 }}>· Overdue callback</span>
                    )}
                    {u === "due" && (
                      <span style={{ fontSize: 12, color: COLORS.amber, fontWeight: 500 }}>· Due now</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onPick(l.id)}
                  className="rounded-[8px] flex-shrink-0"
                  style={{
                    background: COLORS.coral,
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "10px 18px",
                  }}
                >
                  Start Call →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── RIGHT PANEL (in-call) ─────────────── */

// Pill-bar objections — short labels mapped to the full NEPQ responses
const OBJECTION_PILLS: { label: string; key: string }[] = [
  { label: "Call me back", key: "Call me back" },
  { label: "Email me", key: "Email me" },
  { label: "Not interested", key: "I am not interested" },
  { label: "Already sorted", key: "I already took care of it" },
  { label: "Too far", key: "The clinic is too far away" },
  { label: "Think about it", key: "I need to think about it" },
  { label: "No time", key: "I don't have time" },
  { label: "Just the price", key: "I just want the price" },
  { label: "Not feeling good", key: "I'm not feeling good" },
];

function RightPanel({
  active, repId, mmsImages, onChangeLead,
}: {
  active: Lead;
  repId: string | null;
  mmsImages: { name: string; url: string }[];
  onChangeLead: () => void;
}) {
  const [callTimer, setCallTimer] = useState(0);
  const [callRunning, setCallRunning] = useState(false);
  const [openObjection, setOpenObjection] = useState<string | null>(null);

  useEffect(() => {
    if (!callRunning) return;
    const i = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [callRunning]);

  // Reset open objection when switching leads
  useEffect(() => { setOpenObjection(null); setCallTimer(0); setCallRunning(false); }, [active.id]);

  const callNow = () => {
    if (!active.phone) { toast.error("No phone number"); return; }
    window.location.href = `tel:${active.phone}`;
    setCallRunning(true);
  };

  const sendImage = async (url: string) => {
    const r = await sendLeadMms({ data: { leadId: active.id, mediaUrl: url, body: "" } });
    if (r.success) toast.success("Sent"); else toast.error(r.error);
  };

  const logAttempt = async (outcome: "no_answer" | "connected") => {
    setCallRunning(false);
    const slot = (() => {
      const h = new Date().getHours();
      if (h < 11) return "morning"; if (h < 14) return "lunch"; return "arvo";
    })();
    await logCallAttempt({ data: {
      leadId: active.id, repId, outcome,
      attemptNumber: 1, dialNumber: 1, dayNumber: active.day_number ?? 1, timeSlot: slot,
      durationSeconds: callTimer,
    }});
    setCallTimer(0);
    toast.success(outcome === "connected" ? "Marked connected" : "Logged no-answer");
  };

  const day = active.day_number ?? 1;
  const attempts = ATTEMPTS_PER_DAY(day);
  const fullName = [active.first_name, active.last_name].filter(Boolean).join(" ") || "Unnamed";
  const objectionResp = openObjection
    ? OBJECTIONS.find((o) => o.q === openObjection) ?? null
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Change lead link — top of right column, small + muted */}
      <div style={{ padding: "12px 18px 0" }}>
        <button
          onClick={onChangeLead}
          style={{
            fontSize: 12,
            color: "#111",
            opacity: 0.55,
            background: "transparent",
          }}
        >
          ← Change Lead
        </button>
      </div>

      {/* Section 1 — Lead card */}
      <div style={{ padding: "12px 18px 18px" }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: "#111", lineHeight: 1.25 }}>
          {fullName}
        </div>
        {active.phone && (
          <div style={{ fontSize: 14, color: COLORS.coral, marginTop: 4 }}>{active.phone}</div>
        )}
        <div style={{ marginTop: 10 }}>
          {active.funding_preference ? (
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                background: COLORS.amberBg,
                color: COLORS.amberDark,
                border: `0.5px solid ${COLORS.amber}`,
              }}
            >
              {active.funding_preference}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#111", opacity: 0.5 }}>Funding unknown</span>
          )}
          <span
            style={{
              marginLeft: 8,
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              background: `${statusColor(active.status)}1a`,
              color: statusColor(active.status),
            }}
          >
            {active.status || "new"}
          </span>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#111" }}>
          Created {fmtTime(active.created_at)}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#111" }}>
          Day {day} · Attempt 1 of {attempts} today
        </div>
      </div>

      {/* Section 2 — Action buttons */}
      <div style={{ padding: "0 18px 16px" }}>
        <button
          onClick={callNow}
          className="w-full rounded-[8px] flex items-center justify-center gap-2"
          style={{
            background: COLORS.coral,
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 500,
            padding: "14px 16px",
          }}
        >
          📞 Call Now
        </button>
        {callRunning && (
          <div className="text-center font-mono mt-2" style={{ color: COLORS.green, fontSize: 13 }}>
            ⏱ {Math.floor(callTimer / 60).toString().padStart(2, "0")}:{(callTimer % 60).toString().padStart(2, "0")}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={() => void logAttempt("connected")}
            className="rounded-[8px]"
            style={{
              background: "#ffffff",
              color: COLORS.green,
              border: `1px solid ${COLORS.green}`,
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 12px",
            }}
          >
            ✅ Connected
          </button>
          <button
            onClick={() => void logAttempt("no_answer")}
            className="rounded-[8px]"
            style={{
              background: "#ffffff",
              color: COLORS.red,
              border: `1px solid ${COLORS.red}`,
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 12px",
            }}
          >
            ❌ No Answer
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.amberDark, fontWeight: 500 }}>
          🚫 Do not leave a voicemail
        </div>
        <button
          onClick={async () => {
            await updateLeadStatus({ data: { leadId: active.id, status: "dropped" } });
            toast.success("Lead dropped");
          }}
          style={{
            marginTop: 8,
            background: "transparent",
            color: "#111",
            opacity: 0.55,
            fontSize: 12,
            textDecoration: "underline",
          }}
        >
          Mark as dropped
        </button>
      </div>

      {/* Section 3 — Clinic info */}
      <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111" }}>
          Clinic
        </div>
        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 500, color: "#111" }}>
          Nitai Medical & Cosmetic Centre
        </div>
        <div style={{ fontSize: 13, color: "#111" }}>Dr. Shabna Singh</div>
        <div style={{ fontSize: 13, color: "#111" }}>64 Lincoln Rd Essendon VIC 3040</div>
        <ul style={{ marginTop: 8, fontSize: 12, color: "#111", lineHeight: 1.7 }}>
          <li>· Free parking</li>
          <li>· Near Lincoln Park</li>
          <li>· 5 mins DFO</li>
          <li>· 10 mins Airport</li>
        </ul>
      </div>

      {/* Section 4 — Objections (pill bar) */}
      <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111" }}>
          Objections
        </div>

        {objectionResp && (
          <div
            className="rounded-[8px]"
            style={{
              marginTop: 10,
              background: "#ffffff",
              border: `0.5px solid ${COLORS.line}`,
              borderLeft: `2px solid ${COLORS.amber}`,
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.7,
              color: "#111",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.amberDark, marginBottom: 6 }}>
              "{objectionResp.q}"
            </div>
            {objectionResp.a}
            {(objectionResp as { note?: string }).note && (
              <div style={{ marginTop: 8, fontSize: 12, color: COLORS.amberDark, fontStyle: "italic" }}>
                {(objectionResp as { note?: string }).note}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
          {OBJECTION_PILLS.map((p) => {
            const isOpen = openObjection === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setOpenObjection(isOpen ? null : p.key)}
                style={{
                  background: isOpen ? "#fffbeb" : "#ffffff",
                  border: `0.5px solid ${isOpen ? COLORS.amber : "#e5e5e5"}`,
                  borderRadius: 20,
                  fontSize: 12,
                  color: "#111",
                  padding: "4px 10px",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 5 — Send before & afters */}
      <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111" }}>
          Send Before & Afters
        </div>
        {mmsImages.length === 0 ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "#111", opacity: 0.55 }}>
            No images available.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10 }}>
            {mmsImages.slice(0, 2).map((img, i) => (
              <button
                key={img.name}
                onClick={() => void sendImage(img.url)}
                className="rounded-[8px]"
                style={{
                  background: "#eff6ff",
                  color: "#2563eb",
                  border: `0.5px solid #bfdbfe`,
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "10px 8px",
                }}
              >
                Before & After {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const OBJECTIONS = [
  { q: "Call me back", a: "Yeah of course — and I will. I'm just curious though, when you filled in the form, what was going on that made you want to find out more about it?", note: "Gets them talking about their own motivation. One minute becomes ten." },
  { q: "Email me", a: "Yeah absolutely. I just want to make sure I send you the right thing — what was the main thing you were hoping to get answered when you looked into this?" },
  { q: "I am not interested", a: "Yeah that's completely fair. I'm just curious — what made you look into it in the first place? Because most people that say that are usually just not sure if it's the right fit for them yet." },
  { q: "I already took care of it", a: "Oh that's great — congratulations. Out of curiosity, what did you end up going with? I just want to make sure we're not across something you've already sorted." },
  { q: "I'm not feeling good", a: "Sorry to hear that — hope you feel better soon. When would be a better time, later today or would tomorrow work better for you?" },
  { q: "The clinic is too far away", a: "Yeah I hear you. Can I ask — if we could find something closer to you, is this something you'd genuinely want to move forward with?", note: "If yes → trigger suburb input + clinic selector immediately." },
  { q: "I need to think about it", a: "Of course, that makes complete sense. I'm just curious — what part of it do you want to think through? Is it the cost, the procedure itself, or something else? Because I might be able to help right now." },
  { q: "I don't have time", a: "Totally get it. Can I ask — is it literally the time right now, or is it more that you're not sure this is the right move for you?", note: "If time → 'When's a two-minute window today — I'll call you exactly then.'" },
  { q: "I just want the price", a: "Absolutely — and I'll get you that. I just need to ask you a couple of quick things first so I can make sure I'm giving you the right number for your specific situation. It'll take two minutes. What's going on with your hair at the moment?" },
];
