import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain, MessageCircle, Stethoscope, Megaphone, GraduationCap, Sparkles,
  HandshakeIcon, DollarSign, ShieldCheck, Calendar as CalendarIcon,
  Check, AlertTriangle, Send, Search, X, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { toast } from "sonner";
import {
  sendLeadMms, listMmsImages, saveFinanceCheck,
  saveBooking, updateLeadStatus, ensureRepForEmail,
  saveCallNotes, discoveryToAmpAudio,
} from "@/utils/sales-call.functions";
import { sendClinicHandoverEmail, sendDepositSmsToPatient, sendBookingConfirmationSms, sendManualSms } from "@/utils/resend.functions";
import { stopRingback, primeAudioContext } from "@/utils/ringback";

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
  city: string | null; state: string | null;
  consult_price_original: number | null; consult_price_deposit: number | null;
  parking_info: string | null; nearby_landmarks: string | null;
};

type PartnerDoctor = {
  id: string; clinic_id: string; name: string; title: string | null;
  years_experience: number | null; specialties: string | null;
  what_makes_them_different: string | null;
  natural_results_approach: string | null;
  advanced_cases: string | null; talking_points: string | null;
  aftercare_included: string | null;
};

const STEPS = [
  { key: "mindset", label: "MINDSET", Icon: Brain },
  { key: "opening", label: "OPENING", Icon: MessageCircle },
  { key: "discovery", label: "DISCOVERY", Icon: Stethoscope },
  { key: "amplification", label: "AMPLIFICATION", Icon: Megaphone },
  { key: "education", label: "EDUCATION", Icon: GraduationCap },
  { key: "audiobook", label: "AUDIOBOOK", Icon: Sparkles, special: true },
  { key: "commitment", label: "COMMITMENT", Icon: HandshakeIcon },
  { key: "price", label: "PRICE & SELL THE SPECIALIST", Icon: DollarSign },
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
  // Discovery notes + AI pre-fill, lifted so they persist across steps and feed amplification/audiobook
  const [discoveryNotes, setDiscoveryNotes] = useState<string>("");
  const [ampPrefill, setAmpPrefill] = useState<string>("");
  const [audioPrefill, setAudioPrefill] = useState<string>("");
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [dueCallbacks, setDueCallbacks] = useState<Lead[]>([]);
  const [showCallbackAlert, setShowCallbackAlert] = useState(false);

  useEffect(() => {
    const check = async () => {
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60000);
      const { data } = await supabase
        .from("meta_leads")
        .select("*")
        .eq("status", "Callback Scheduled")
        .lte("callback_scheduled_at", now.toISOString())
        .gte("callback_scheduled_at", fiveMinAgo.toISOString());
      if (data && data.length > 0) {
        setDueCallbacks(data as Lead[]);
        setShowCallbackAlert(true);
      }
    };
    void check();
    const interval = setInterval(() => void check(), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("call_records")
        .select("lead_id")
        .gte("called_at", today.toISOString());
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (!row.lead_id) continue;
        counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1;
      }
      setAttemptCounts(counts);
    };
    void load();
    const ch = supabase.channel("attempt-counts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_records" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // Resolve rep from auth email
  useEffect(() => {
    if (!user?.email) return;
    void ensureRepForEmail({ data: { email: user.email, name: user.user_metadata?.name ?? "" } })
      .then((r) => {
        if (r.success && r.rep) {
          setRepId(r.rep.id);
          // Always prefer first_name from sales_reps; fall back to "there" so the script reads naturally.
          const repAny = r.rep as { first_name?: string | null; name?: string | null };
          const firstOnly = (repAny.first_name?.trim()) || (repAny.name?.split(" ")[0]?.trim()) || "there";
          setRepName(firstOnly);
        }
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

  // Hydrate discovery notes from the active lead's saved call_notes
  useEffect(() => {
    if (active) {
      setDiscoveryNotes(active.call_notes ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const callbackBanner = showCallbackAlert && dueCallbacks.length > 0 ? (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 100,
      background: COLORS.coral, color: "#fff",
      borderRadius: 10, padding: "14px 18px",
      boxShadow: "0 4px 20px rgba(244,82,45,0.3)",
      maxWidth: 320,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📞 Callback due now</div>
      {dueCallbacks.map((l) => (
        <div key={l.id} style={{ fontSize: 13, marginBottom: 2 }}>
          {l.first_name} {l.last_name} — finish your current call first
        </div>
      ))}
      <button
        onClick={() => setShowCallbackAlert(false)}
        style={{ marginTop: 8, fontSize: 11, textDecoration: "underline", background: "transparent", color: "#fff", border: "none", cursor: "pointer" }}
      >
        Dismiss
      </button>
    </div>
  ) : null;

  // Show full-screen lead chooser before entering the framework
  if (!active) {
    return (
      <>
        {callbackBanner}
        <LeadChooser
          leads={leads}
          attemptCounts={attemptCounts}
          onPick={(id) => {
            setActiveId(id); setStep("mindset"); setCompleted(new Set());
            setAmpPrefill(""); setAudioPrefill("");
          }}
        />
      </>
    );
  }

  return (
    <>
      {callbackBanner}
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
                  {s.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* CENTER */}
      <main className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center px-6 py-[60px]">
        <div className="w-full" style={{ maxWidth: 640 }}>
          <StepContent
            step={step}
            lead={active}
            repName={repName}
            repId={repId}
            mmsImages={mmsImages}
            onAdvance={advance}
            onMarkComplete={markStepComplete}
            discoveryNotes={discoveryNotes}
            setDiscoveryNotes={setDiscoveryNotes}
            ampPrefill={ampPrefill}
            setAmpPrefill={setAmpPrefill}
            audioPrefill={audioPrefill}
            setAudioPrefill={setAudioPrefill}
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
          attemptCounts={attemptCounts}
          onChangeLead={() => setActiveId(null)}
        />
      </aside>

      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        input::placeholder, textarea::placeholder { color: #111111; opacity: 1; }
      `}</style>
    </div>
    </>
  );
}

/* ─────────────── STEP CONTENT ─────────────── */

function StepContent({
  step, lead, repName, repId, mmsImages, onAdvance, onMarkComplete,
  discoveryNotes, setDiscoveryNotes, ampPrefill, setAmpPrefill, audioPrefill, setAudioPrefill,
}: {
  step: StepKey;
  lead: Lead | null;
  repName: string;
  repId: string | null;
  mmsImages: { name: string; url: string }[];
  onAdvance: (k: StepKey) => void;
  onMarkComplete: (k: StepKey) => void;
  discoveryNotes: string;
  setDiscoveryNotes: (v: string) => void;
  ampPrefill: string;
  setAmpPrefill: (v: string) => void;
  audioPrefill: string;
  setAudioPrefill: (v: string) => void;
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
          <p>This person enquired because something shifted. Maybe they looked in the mirror. Maybe someone said something. Maybe a photo came up on their phone. They didn't fill in that form by accident.</p>
          <p style={{ marginTop: 24 }}>My job isn't to sell them. My job is to care enough to have an honest conversation — find out what's really going on, and help them see that there's a way through it.</p>
          <p style={{ marginTop: 24 }}>If I do my job right, they leave this call with a plan. If I don't, they go back to doing nothing — and six months from now they're still in the same place.</p>
          <p style={{ marginTop: 24 }}>Pick up the phone. Be curious. Be present. This call matters.</p>
        </ScriptBody>
        <NextBtn onClick={() => onAdvance("mindset")} label="I'm ready" />
      </div>
    );
  }

  if (step === "opening") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 2 — Opening</Eyebrow>
        <StepHeading>Set the Stage</StepHeading>
        <ScriptBody>
          Hi <Pill name>{fname}</Pill>, it's <Pill name>{repName || "there"}</Pill> from Hair Transplant Group, how are you?
          I saw you made a Facebook enquiry about a hair transplant and I wanted to make sure I called you straight away
          — if I don't call you now I won't be able to call you back later, it's just so busy today.
          So — what's happening with your hair situation, <Pill name>{fname}</Pill>?
        </ScriptBody>

        <CalloutAmber title='"Call me back" handler'>
          That's not a problem at all — I know you were not expecting my call. Do you have just one minute now, just to see if it even
          makes sense for me to call you back later?
          <Coach>One minute calls become ten-minute calls. Just get them talking.</Coach>
        </CalloutAmber>

        <Coach>Name → who you are → their enquiry → pre-empt callback → open question</Coach>
      </div>
    );
  }

  if (step === "discovery") {
    return (
      <DiscoveryStep
        lead={lead}
        notes={discoveryNotes}
        setNotes={setDiscoveryNotes}
        setAmpPrefill={setAmpPrefill}
        setAudioPrefill={setAudioPrefill}
      />
    );
  }

  if (step === "amplification") {
    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 4 — Amplification</Eyebrow>
        <StepHeading>Summarise Back</StepHeading>

        {ampPrefill ? (
          <>
            <div style={{
              background: "#ffffff",
              borderLeft: `2px solid ${COLORS.coral}`,
              borderRadius: "0 8px 8px 0",
              padding: "20px 24px",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.coral, marginBottom: 10 }}>
                Say this
              </div>
              <div style={{ fontSize: 20, color: COLORS.text, lineHeight: 1.8, fontWeight: 400 }}>
                {ampPrefill}
              </div>
            </div>
            {discoveryNotes && (
              <div style={{
                background: "#f9f9f9",
                border: `0.5px solid ${COLORS.line}`,
                borderRadius: 8,
                padding: "14px 18px",
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>
                  Their words
                </div>
                <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7 }}>{discoveryNotes}</div>
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ padding: "40px 0", fontSize: 20, lineHeight: 1.8, fontWeight: 400, color: COLORS.text, textAlign: "center" }}>
              So let me make sure I understand... You've been dealing with [pain point] for [timeframe],
              it's affecting [specific impacts they told you], and you're tired of [consequences].... Is that right?
            </p>
            <div style={{
              background: COLORS.amberBg,
              borderLeft: `2px solid ${COLORS.amber}`,
              borderRadius: "0 8px 8px 0",
              padding: "12px 16px",
            }}>
              <div style={{ fontSize: 13, color: COLORS.amberDark, lineHeight: 1.6 }}>
                Go back to Discovery and click "Use in next steps →" to generate a personalised summary from your notes.
              </div>
            </div>
          </>
        )}

        <p style={{ marginTop: 24, fontSize: 14, lineHeight: 1.7, fontStyle: "italic", color: "#666666", textAlign: "center" }}>
          Get them to say yes. That yes is your bridge to education.
        </p>
      </div>
    );
  }

  if (step === "education") {
    return (
      <EducationStep lead={lead} mmsImages={mmsImages} onNext={() => onAdvance("education")} repId={repId} />
    );
  }

  if (step === "audiobook") {
    const fnameAudio = lead.first_name || "[name]";
    const examples: { label: string; text: string }[] = [
      {
        label: "The Mirror Moment",
        text: "Imagine waking up six months from now, getting ready in the morning, looking in the mirror — and just seeing your hairline back. No hat. No checking angles. Just you, looking like you again. How would that actually feel?",
      },
      {
        label: "The Social Moment",
        text: "Picture yourself at [their event — wedding, birthday, reunion]. Someone takes a photo. And for the first time in years you're not dreading seeing it. You're not thinking about it at all. How would that feel?",
      },
      {
        label: "The Everyday Moment",
        text: "Think about just getting out of the shower and not having to think about it. No awkward styling. Just getting on with your day. That's what this gives you. How would that feel?",
      },
    ];

    const bullets = [
      "Use THEIR words — not generic phrases",
      "Reference their WHY NOW — the wedding, the event, the photo",
      "Name their specific area — hairline, crown, temples",
      "Frame it as waking up tomorrow without the problem",
      "2–3 sentences max. Then stop.",
    ];

    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Eyebrow>Step 6 — Audiobook</Eyebrow>
        <h1 style={{
          fontSize: 32, fontWeight: 500, color: COLORS.text, lineHeight: 1.2,
          letterSpacing: "-0.01em", marginBottom: 20, textAlign: "center",
        }}>
          Paint The Picture
        </h1>

        {/* Top banner */}
        <div style={{
          background: "#fffbeb",
          border: "0.5px solid #fcd34d",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 500,
          color: "#92400e",
          lineHeight: 1.5,
        }}>
          ⭐ This is where the sale happens. Not at the deposit. Right here.
        </div>

        {/* SAY THIS card */}
        <div style={{
          background: "#ffffff",
          borderLeft: `2px solid ${COLORS.coral}`,
          borderRadius: "0 8px 8px 0",
          padding: "16px 20px",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
            color: COLORS.coral, marginBottom: 8,
          }}>
            Say this
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: COLORS.text, lineHeight: 1.4 }}>
            {fnameAudio}, I want you to picture something for me...
          </div>
          <div style={{ marginTop: 10, fontSize: 13, fontStyle: "italic", color: COLORS.text, lineHeight: 1.5 }}>
            Then pause. Use their exact words from discovery. Make it personal.
          </div>
        </div>

        {/* Optional AI prefill, kept subtle */}
        {audioPrefill && (
          <div style={{
            marginTop: 16,
            padding: "14px 16px",
            borderRadius: 8,
            background: "#ffffff",
            border: `0.5px solid ${COLORS.gold}`,
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.gold, fontWeight: 500, marginBottom: 6 }}>
              AI-suggested picture (from discovery)
            </div>
            <p style={{ fontSize: 15, color: COLORS.text, lineHeight: 1.7 }}>{audioPrefill}</p>
          </div>
        )}

        {/* Coaching bullets */}
        <ul className="flex flex-col" style={{ gap: 8, marginTop: 24 }}>
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start" style={{ gap: 10 }}>
              <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: COLORS.coral, marginTop: 8, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6 }}>{b}</span>
            </li>
          ))}
        </ul>

        {/* Examples */}
        <div style={{
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
          color: COLORS.text, fontWeight: 600, marginTop: 24, marginBottom: 12,
        }}>
          Examples
        </div>
        <div className="flex flex-col" style={{ gap: 12 }}>
          {examples.map((ex, i) => (
            <div key={i}>
              <div style={{
                fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em",
                color: COLORS.text, fontWeight: 600, marginBottom: 8,
              }}>
                {ex.label}
              </div>
              <div style={{
                background: "#ffffff",
                border: `0.5px solid ${COLORS.line}`,
                borderRadius: 8,
                padding: 20,
                fontSize: 17,
                fontStyle: "italic",
                color: COLORS.text,
                lineHeight: 1.8,
              }}>
                {ex.text}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom warning */}
        <div style={{
          marginTop: 24,
          background: "#fffbeb",
          borderLeft: `2px solid ${COLORS.gold}`,
          borderRadius: "0 8px 8px 0",
          padding: "14px 16px",
          fontSize: 14,
          fontWeight: 500,
          color: "#92400e",
          lineHeight: 1.6,
        }}>
          Say the picture. Then stop. Do not speak. The silence is working for you. Wait for them to respond.
        </div>
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
          Fantastic. Fantastic. I want to get you in with <Pill name>Dr. [NAME]</Pill> — honestly based on everything you've told me, <Pill name>Dr. [NAME]</Pill> is exactly who you want for this. [reference what they said on the call]. Let me just pull up the availability now."
          <Coach>Presume the booking.</Coach>
        </CalloutGreen>
        <div style={{
          background: COLORS.amberBg,
          borderLeft: `2px solid ${COLORS.amber}`,
          borderRadius: "0 8px 8px 0",
          padding: "14px 16px",
          marginTop: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.amberDark, marginBottom: 8 }}>
            When they wobble
          </div>
          <div style={{ fontSize: 14, color: COLORS.amberDark, lineHeight: 1.7 }}>
            "Yeah of course — what part of it do you want to think through? Is it the cost, the procedure itself, or something else? Because I might actually be able to help you with that right now."
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontStyle: "italic", color: COLORS.amberDark, lineHeight: 1.5 }}>
            Agree. Then open it up. Get them talking about the specific concern and you're back in discovery.
          </div>
        </div>
      </div>
    );
  }

  if (step === "price") {
    return <PriceStep lead={lead} onNext={() => onAdvance("price")} />;
  }

  if (step === "finance") {
    return <FinanceStep lead={lead} onComplete={() => { onMarkComplete("finance"); onAdvance("finance"); }} />;
  }

  if (step === "booking") {
    return <BookingStep lead={lead} discoveryNotes={discoveryNotes} onBooked={() => onMarkComplete("booking")} />;
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
      style={{
        marginTop: 24,
        fontSize: 14,
        lineHeight: 1.7,
        fontStyle: "italic",
        color: "#666666",
        textAlign: "center",
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

function NextBtn({ onClick, gold, label = "I'm ready" }: { onClick: () => void; gold?: boolean; label?: string }) {
  return (
    <div className="flex justify-center" style={{ marginTop: 40 }}>
      <button
        onClick={onClick}
        className="rounded-[8px]"
        style={{
          background: gold ? COLORS.gold : COLORS.coral,
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 500,
          padding: "14px 32px",
          minWidth: 200,
          cursor: "pointer",
        }}
      >
        {label}
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

// Step heading: large 36px Apple-reveal heading
function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 36,
        fontWeight: 500,
        color: COLORS.text,
        marginBottom: 32,
        lineHeight: 1.2,
        textAlign: "center",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h1>
  );
}

// Script body: large, plain, centred. No card, no border, no background.
// Just the text breathing on white.
function ScriptBody({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "40px 0",
        fontSize: 18,
        lineHeight: 1.8,
        fontWeight: 400,
        color: COLORS.text,
        textAlign: "center",
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
  // Compact, tight checklist. Items strikethrough + fade when checked.
  type Item = { key: string; text: string; whyNow?: false } | { key: "why-now"; whyNow: true };
  const items: Item[] = [
    { key: "where", text: "Where exactly — hairline, crown, temples, all over?" },
    { key: "how-long", text: "How long has it been happening?" },
    { key: "pace", text: "Is it getting worse or has it stabilised?" },
    { key: "hereditary", text: "Is it hereditary? Who in the family?" },
    { key: "tried", text: "What have they already tried — medication, products, overseas?" },
    { key: "why-now", whyNow: true },
    { key: "impact", text: "How is it affecting your daily life — photos, social situations, confidence?" },
    { key: "feel", text: "How does it actually make you feel when you think about it?" },
    { key: "outcome", text: "If we could fix this completely — what does that look like for you?" },
  ];
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setChecked((s) => {
    const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
        color: COLORS.text, fontWeight: 500, marginBottom: 6,
      }}>
        Checklist
      </div>
      <div className="flex flex-col" style={{ gap: 0 }}>
        {items.map((it) => {
          if (it.whyNow) {
            const isOn = checked.has("why-now");
            return (
              <label key="why-now" className="flex items-center gap-2 cursor-pointer" style={{ padding: "2px 0" }}>
                <input type="checkbox" checked={isOn} onChange={() => toggle("why-now")} />
                <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: COLORS.amber, flexShrink: 0 }} />
                <span style={{
                  fontSize: 14, lineHeight: 1.4, color: COLORS.amberDark, fontWeight: 600,
                  opacity: isOn ? 0.5 : 1,
                  textDecoration: isOn ? "line-through" : "none",
                }}>
                  ⚠️ WHY NOW?
                </span>
                <span style={{
                  fontSize: 13, color: COLORS.amberDark, fontStyle: "italic",
                  opacity: isOn ? 0.5 : 1,
                  textDecoration: isOn ? "line-through" : "none",
                }}>
                  Always a reason. A photo. An event. A comment someone made. A mirror moment. Find it and name it.
                </span>
              </label>
            );
          }
          const isOn = checked.has(it.key);
          return (
            <label key={it.key} className="flex items-center gap-2 cursor-pointer" style={{ padding: "2px 0" }}>
              <input type="checkbox" checked={isOn} onChange={() => toggle(it.key)} />
              <span style={{
                fontSize: 14, lineHeight: 1.4, color: COLORS.text,
                opacity: isOn ? 0.5 : 1,
                textDecoration: isOn ? "line-through" : "none",
              }}>
                {it.text}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function DiscoveryStep({
  lead, notes, setNotes, setAmpPrefill, setAudioPrefill,
}: {
  lead: Lead;
  notes: string;
  setNotes: (v: string) => void;
  setAmpPrefill: (v: string) => void;
  setAudioPrefill: (v: string) => void;
}) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  // Track whether the user has actually edited the textarea this session.
  // Without this guard, the hydration effect on the parent would seed `notes`
  // from meta_leads.call_notes, then the autosave below would immediately
  // re-save those same notes — and worse, if the AI pipeline writes a fresh
  // patient summary while the rep is still on the discovery step, this
  // autosave would clobber it with the stale (or empty) textarea contents.
  const userEditedRef = useRef(false);

  // Debounced auto-save to meta_leads.call_notes (1s).
  // Rules:
  // - Only fire after the rep has actually typed (userEditedRef).
  // - Never overwrite existing call_notes with an empty string — the AI
  //   pipeline writes patient summaries here and an empty save would wipe
  //   the handover note for the clinic.
  useEffect(() => {
    if (!lead?.id) return;
    if (!userEditedRef.current) return;
    if (!notes.trim()) return;
    const handle = setTimeout(() => {
      void saveCallNotes({ data: { leadId: lead.id, notes } }).then((r) => {
        if (r.success) setSavedAt(Date.now());
      });
    }, 1000);
    return () => clearTimeout(handle);
  }, [notes, lead?.id]);

  const handleNotesChange = (v: string) => {
    userEditedRef.current = true;
    setNotes(v);
  };

  const handleAi = async () => {
    if (!notes.trim()) {
      toast.error("Write your discovery notes first");
      return;
    }
    setAiLoading(true); setAiDone(false);
    const r = await discoveryToAmpAudio({ data: { notes } });
    setAiLoading(false);
    if (r.success) {
      setAmpPrefill(r.amplification);
      setAudioPrefill(r.audiobook);
      setAiDone(true);
      toast.success("Next steps updated");
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div style={{
        fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
        color: COLORS.coral, marginBottom: 6, textAlign: "center",
      }}>
        Discovery
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 500, color: COLORS.text, lineHeight: 1.2,
        textAlign: "center", letterSpacing: "-0.01em", marginBottom: 18,
      }}>
        Understand Their Pain <span style={{ fontSize: 16, fontWeight: 400, color: COLORS.text }}>(5–7 mins)</span>
      </h1>

      {/* Opening question — script card */}
      <div style={{
        marginTop: 16,
        background: "#ffffff",
        borderLeft: `2px solid ${COLORS.coral}`,
        borderRadius: "0 8px 8px 0",
        padding: "16px 20px",
      }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: COLORS.text, lineHeight: 1.4 }}>
          "So what's going on with your hair situation?"
        </div>
        <div style={{
          marginTop: 10, fontSize: 13, fontStyle: "italic", color: COLORS.text, lineHeight: 1.5,
        }}>
          Ask it. Then stop. Don't interrupt. Don't fill silence. Let them lead.
        </div>
      </div>

      {/* Checklist */}
      <DiscoveryChecklist />

      {/* Echoing tip — quiet line above HISTORY */}
      <p style={{
        marginTop: 14, marginBottom: 6, fontSize: 13, fontStyle: "italic",
        color: COLORS.text, lineHeight: 1.5,
      }}>
        Echoing tip: when they say something — repeat it back as a question with genuine curiosity.
      </p>

      {/* History */}
      <div>
        <div style={{
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
          color: COLORS.text, fontWeight: 500, marginBottom: 6,
        }}>
          History
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Write what they tell you..."
          className="w-full rounded-[6px] outline-none discovery-history"
          style={{
            background: "#f9f9f9",
            border: `0.5px solid ${COLORS.line}`,
            color: COLORS.text,
            fontSize: 14,
            lineHeight: 1.5,
            padding: 10,
            minHeight: 80,
            resize: "vertical",
          }}
        />
        <div style={{ marginTop: 4, height: 14, fontSize: 12, color: "#888" }}>
          {savedAt ? "Saved" : ""}
        </div>

        {/* AI pre-fill button */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => void handleAi()}
            disabled={aiLoading}
            className="rounded-[8px] inline-flex items-center gap-2"
            style={{
              background: COLORS.coral,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 18px",
              cursor: aiLoading ? "wait" : "pointer",
              opacity: aiLoading ? 0.7 : 1,
            }}
          >
            {aiLoading && (
              <span
                style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  display: "inline-block",
                  animation: "discoverySpin 0.8s linear infinite",
                }}
              />
            )}
            {aiLoading ? "Generating…" : "Use in next steps →"}
          </button>
          {aiDone && !aiLoading && (
            <div style={{ fontSize: 13, color: COLORS.green }}>
              ✓ Next steps updated
            </div>
          )}
        </div>
      </div>

      {/* Override the global #111 placeholder for this textarea so it reads light. */}
      <style>{`
        textarea.discovery-history::placeholder { color: #bbbbbb !important; opacity: 1; }
        @keyframes discoverySpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


function EducationStep({ lead, mmsImages, onNext, repId }: { lead: Lead; mmsImages: { name: string; url: string }[]; onNext: () => void; repId: string | null }) {
  void repId; void onNext;
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);
  const [doctor, setDoctor] = useState<PartnerDoctor | null>(null);

  useEffect(() => {
    void (async () => {
      // Pick the lead's clinic if set, else the first active partner clinic
      let clinicId = lead.clinic_id;
      if (!clinicId) {
        const { data: c } = await supabase.from("partner_clinics").select("id").eq("is_active", true).limit(1);
        clinicId = c?.[0]?.id ?? null;
      }
      if (!clinicId) return;
      const { data: docs } = await supabase
        .from("partner_doctors")
        .select("id, clinic_id, name, title, years_experience, specialties, what_makes_them_different, natural_results_approach, advanced_cases, talking_points, aftercare_included")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("created_at")
        .limit(1);
      setDoctor(((docs ?? [])[0] as PartnerDoctor) ?? null);
    })();
  }, [lead.clinic_id]);

  const send = async (idx: number, url: string | undefined) => {
    if (!url) {
      toast.error("No image found in mms-images bucket");
      return;
    }
    setSendingIdx(idx);
    const r = await sendLeadMms({ data: { leadId: lead.id, mediaUrl: url, body: "" } });
    setSendingIdx(null);
    if (r.success) toast.success("Image sent"); else toast.error(r.error);
  };

  const img1 = mmsImages[0];
  const img2 = mmsImages[1];

  const ImgBtn = ({ idx, label }: { idx: number; label: string }) => {
    const url = idx === 0 ? img1?.url : img2?.url;
    const sending = sendingIdx === idx;
    return (
      <button
        onClick={() => void send(idx, url)}
        disabled={sending}
        className="rounded-[8px] flex items-center justify-center gap-2"
        style={{
          flex: 1,
          background: "#eff6ff",
          color: "#2563eb",
          border: "0.5px solid #bfdbfe",
          padding: 14,
          fontSize: 15,
          fontWeight: 500,
          cursor: sending ? "not-allowed" : "pointer",
          opacity: sending ? 0.7 : 1,
        }}
      >
        <Send className="h-4 w-4" />
        {sending ? "Sending…" : label}
      </button>
    );
  };

  const StepLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
      color: COLORS.text, fontWeight: 600, marginBottom: 10,
    }}>
      {children}
    </div>
  );

  type CardProps = { color?: string; children: React.ReactNode };
  const SayThisCard = ({ color = COLORS.coral, children }: CardProps) => (
    <div style={{
      background: "#ffffff",
      borderLeft: `2px solid ${color}`,
      borderRadius: "0 8px 8px 0",
      padding: "16px 20px",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
        color, marginBottom: 8,
      }}>
        Say this
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header — no eyebrow */}
      <h1 style={{
        fontSize: 32, fontWeight: 500, color: COLORS.text, lineHeight: 1.2,
        textAlign: "center", letterSpacing: "-0.01em", marginBottom: 28,
      }}>
        Educate &amp; Show
      </h1>

      {/* 1 — Knowledge Check */}
      <StepLabel>1. Knowledge Check</StepLabel>
      <SayThisCard>
        <div style={{ fontSize: 18, fontWeight: 500, color: COLORS.text, lineHeight: 1.4 }}>
          What do you know about hair transplants?
        </div>
        <div style={{ marginTop: 10, fontSize: 13, fontStyle: "italic", color: COLORS.text, lineHeight: 1.5 }}>
          Start with what they know. Fill the gaps only. Don't lecture.
        </div>
      </SayThisCard>

      <div style={{ height: 24 }} />

      {/* 2 — The Product */}
      <StepLabel>2. The Product</StepLabel>
      <SayThisCard>
        <div style={{ fontSize: 16, color: COLORS.text, lineHeight: 1.9 }}>
          So basically — we take tiny grafts from the back of your head. That's the permanent zone — that hair is genetically programmed to never fall out. We plant those grafts exactly where you're losing it. Because they come from that permanent zone they keep that same DNA. They stay. They grow. You cut them, wash them, style them — they're your real hair. For life.
        </div>
        <div style={{ marginTop: 12, fontSize: 13, fontStyle: "italic", color: COLORS.text, lineHeight: 1.5 }}>
          No general anaesthetic. Just local numbing. Same day. Home that night.
        </div>
      </SayThisCard>

      <div style={{ height: 24 }} />

      {/* 3 — Send Photos */}
      <StepLabel>3. Send Photos</StepLabel>
      <p style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>
        Show don't tell — send while you're talking.
      </p>
      <div className="flex" style={{ gap: 12, marginBottom: 14 }}>
        <ImgBtn idx={0} label="Before & After 1" />
        <ImgBtn idx={1} label="Before & After 2" />
      </div>
      <SayThisCard>
        <div style={{ fontSize: 16, color: COLORS.text, lineHeight: 1.6 }}>
          "Have a look at your phone — I've just sent you something."
        </div>
      </SayThisCard>

      <div style={{ height: 24 }} />

      {/* 4 — The Difference */}
      <StepLabel>4. The Difference</StepLabel>
      <SayThisCard color="#f59e0b">
        <div style={{ fontSize: 13, fontStyle: "italic", color: "#f59e0b", lineHeight: 1.5, marginBottom: 12 }}>
          I'm not saying this is the case for you — but it's worth knowing...
        </div>
        <div style={{ fontSize: 16, color: COLORS.text, lineHeight: 1.9 }}>
          {doctor?.what_makes_them_different || (
            <>A lot of clinics just plant the grafts straight up. Quick and easy for them. But the result looks like a doll's head — stiff, unnatural, you can tell from a mile away. The difference is in the angle. Your specialist places every single graft at the exact angle your natural hair grows — studying the direction, the flow, the whole pattern. That's the difference between a result that looks fake and one where nobody can ever tell.</>
          )}
          {doctor?.natural_results_approach && (
            <div style={{ marginTop: 12, fontSize: 15, color: COLORS.text, lineHeight: 1.8 }}>
              {doctor.natural_results_approach}
            </div>
          )}
        </div>
      </SayThisCard>

      <div style={{ height: 24 }} />

      {/* 5 — Bring it back to them */}
      <StepLabel>5. Bring it back to them</StepLabel>
      <ul className="flex flex-col" style={{ gap: 8 }}>
        {[
          "Use their exact words from discovery",
          "Name their specific area — hairline, crown, temples",
          "\"Based on what you've told me about [their situation] — you're actually in a good position right now.\"",
        ].map((b, i) => (
          <li key={i} className="flex items-start" style={{ gap: 10 }}>
            <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: COLORS.coral, marginTop: 8, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6 }}>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceStep({ lead, onNext }: { lead: Lead; onNext: () => void }) {
  void onNext;
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctor, setDoctor] = useState<PartnerDoctor | null>(null);

  useEffect(() => {
    void (async () => {
      // Pick the lead's selected partner clinic if set, otherwise the first active partner clinic.
      const { data: clinics } = await supabase
        .from("partner_clinics")
        .select("id, clinic_name, address, city, state, consult_price_original, consult_price_deposit, parking_info, nearby_landmarks")
        .eq("is_active", true);
      const list = (clinics ?? []) as Clinic[];
      const picked = (lead.clinic_id ? list.find((c) => c.id === lead.clinic_id) : null) ?? list[0] ?? null;
      setClinic(picked);

      if (picked) {
        const { data: docs } = await supabase
          .from("partner_doctors")
          .select("id, clinic_id, name, title, years_experience, specialties, what_makes_them_different, natural_results_approach, advanced_cases, talking_points, aftercare_included")
          .eq("clinic_id", picked.id)
          .eq("is_active", true)
          .order("created_at");
        setDoctor(((docs ?? [])[0] as PartnerDoctor) ?? null);
      }
    })();
  }, [lead.clinic_id]);

  const doctorName = doctor?.name ?? "your specialist";
  const priceOriginal = clinic?.consult_price_original ?? 395;
  const clinicLine = clinic
    ? [clinic.clinic_name, [clinic.address, clinic.city, clinic.state].filter(Boolean).join(", ")].filter(Boolean).join(" — ")
    : null;

  const Bullet = ({ children, amber }: { children: React.ReactNode; amber?: boolean }) => (
    <div className="flex items-start gap-3">
      <span style={{
        display: "inline-block", width: 7, height: 7, borderRadius: "50%",
        flexShrink: 0, marginTop: 8,
        background: amber ? COLORS.amber : COLORS.coral,
      }} />
      <span style={{ fontSize: 15, color: COLORS.text, lineHeight: 1.8 }}>{children}</span>
    </div>
  );

  const SayThis = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      background: "#ffffff",
      borderLeft: `2px solid ${COLORS.coral}`,
      borderRadius: "0 8px 8px 0",
      padding: "14px 18px",
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.coral, marginBottom: 6 }}>
        Say this
      </div>
      <div style={{ fontSize: 15, color: COLORS.text, lineHeight: 1.8 }}>{children}</div>
    </div>
  );

  const Block = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
    <div style={{
      background: "#ffffff",
      border: `0.5px solid ${COLORS.line}`,
      borderRadius: 10,
      padding: "20px 24px",
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.06em", color: "#999999", marginBottom: 14,
      }}>
        {number} — {title}
      </div>
      <div className="flex flex-col" style={{ gap: 10 }}>{children}</div>
    </div>
  );

  const PriceRow = ({ num, children }: { num: number; children: React.ReactNode }) => (
    <div className="flex items-start gap-3" style={{ padding: "10px 0", borderBottom: `0.5px solid #f3f3f3` }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: COLORS.coral,
        color: "#fff", fontSize: 10, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 2,
      }}>{num}</div>
      <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7, fontStyle: "italic" }}>{children}</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <Eyebrow>Step 8 — Price & Sell The Specialist</Eyebrow>
      <StepHeading>Present Price</StepHeading>

      {/* Block 1 — Locate */}
      <Block number="1" title="Locate them">
        <Bullet>
          Where do they live → pick clinic → <strong>{doctorName}</strong>, senior, sees patients like you
        </Bullet>
        {clinicLine && (
          <Bullet>
            <span style={{ color: "#555" }}>{clinicLine}</span>
          </Bullet>
        )}
        {clinic?.nearby_landmarks && (
          <Bullet>
            <span style={{ color: "#555" }}>{clinic.nearby_landmarks}</span>
          </Bullet>
        )}
      </Block>

      {/* Block 2 — Name the specialist */}
      <Block number="2" title="Name the specialist">
        <SayThis>
          "That would be with <strong>{doctorName}</strong> — she's one of our senior hair transplant specialists."
        </SayThis>
        <Bullet>Give their title — <em style={{ color: "#555" }}>"she's one of our seniors"</em></Bullet>
        <Bullet amber>
          Give a reason tied to what THEY said → <em style={{ color: "#555" }}>"based on what you told me, she's exactly the right person for you"</em>
        </Bullet>
      </Block>

      {/* Block 3 — Price journey */}
      <div style={{
        background: "#ffffff",
        border: `0.5px solid ${COLORS.line}`,
        borderRadius: 10,
        padding: "20px 24px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em", color: "#999999", marginBottom: 4,
        }}>
          3 — Walk the price journey
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.amber, marginBottom: 14 }}>
          exact order — do not skip
        </div>
        <PriceRow num={1}>"The consult includes a full medical assessment, hair design, imaging — all in one appointment."</PriceRow>
        <PriceRow num={2}>"Normally this consult is <strong style={{ fontStyle: "normal" }}>${priceOriginal}</strong>..."</PriceRow>
        <PriceRow num={3}>"...we do have some complimentary spots available..."</PriceRow>
        <PriceRow num={4}>"...there is just a <strong style={{ fontStyle: "normal" }}>$75 deposit</strong> to secure your spot..."</PriceRow>
        <PriceRow num={5}>"...which is <strong style={{ fontStyle: "normal" }}>fully refunded</strong> when you arrive..."</PriceRow>
        <div className="flex items-start gap-3" style={{ padding: "10px 0" }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: COLORS.coral,
            color: "#fff", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2,
          }}>6</div>
          <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7, fontStyle: "italic" }}>
            "...we do this because we turn people away for these slots. <strong style={{ fontStyle: "normal" }}>Does that sound fair?</strong>"
          </div>
        </div>
      </div>

      {/* Amber warning */}
      <div style={{
        background: COLORS.amberBg,
        borderLeft: `2px solid ${COLORS.amber}`,
        borderRadius: "0 8px 8px 0",
        padding: "14px 18px",
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.amberDark, lineHeight: 1.6 }}>
          After "does that sound fair?" — stop. Wait. Do not fill the silence. Their answer tells you exactly where to go next.
        </div>
      </div>
    </div>
  );
}

function FinanceStep({ lead, onComplete }: { lead: Lead; onComplete: () => void }) {
  const autoName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const [form, setForm] = useState({
    name: autoName, dob: "", price: "", citizen: "", earning: "", bankrupt: "", homeowner: "",
  });
  const [result, setResult] = useState<null | { eligible: boolean }>(null);
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const check = async () => {
    const eligible =
      form.citizen === "yes" && form.earning === "yes" && form.bankrupt === "no";
    setResult({ eligible });
    const r = await saveFinanceCheck({ data: { leadId: lead.id, eligible, answers: form } });
    if (r.success) toast.success(eligible ? "Marked eligible" : "Marked not eligible");
    onComplete();
  };

  const YN = ({ k }: { k: keyof typeof form }) => (
    <div className="flex gap-2">
      {["yes", "no"].map((v) => (
        <button key={v} onClick={() => set(k, v)}
          className="px-3 py-1 rounded-md text-[12px] font-medium capitalize"
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
      <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111", marginBottom: 10, lineHeight: 1.3 }}>Treatment Funding</h1>
      <Card className="px-4 py-3">
        <p className="text-[13px] leading-snug">
          6 quick questions — not a commitment, won't affect credit rating, just checks if finance could work.
        </p>
      </Card>

      <Card className="px-4 py-3 mt-3 space-y-2.5">
        <div>
          <Label>Full Name</Label>
          <div className="mt-1">
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px]" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
          </div>
        </div>

        <CompactRow label="Australian citizen or PR?"><YN k="citizen" /></CompactRow>
        <CompactRow label="Employed and earning $50,000+ per year?"><YN k="earning" /></CompactRow>
        <CompactRow label="Bankrupt or in a debt agreement?"><YN k="bankrupt" /></CompactRow>
        <div>
          <Label>Date of Birth</Label>
          <div className="mt-1">
            <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px]" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
          </div>
        </div>
        <CompactRow label="Are you a home owner?"><YN k="homeowner" /></CompactRow>

        <button
          onClick={() => void check()}
          className="w-full rounded-[6px]"
          style={{ background: COLORS.green, color: "#ffffff", fontSize: 13, fontWeight: 500, padding: "8px 16px", marginTop: 4 }}
        >
          Check eligibility
        </button>
      </Card>

      {result && (
        <div className="mt-3 p-3 rounded-md flex items-center gap-3"
          style={{ background: result.eligible ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${result.eligible ? COLORS.green : COLORS.red}` }}>
          {result.eligible
            ? <><Check className="h-5 w-5" style={{ color: COLORS.green }} /><span className="text-[13px] font-medium">Great news — finance options are available.</span></>
            : <><AlertTriangle className="h-5 w-5" style={{ color: COLORS.red }} /><span className="text-[13px] font-medium">Finance may not be available — explore savings or superannuation options.</span></>}
        </div>
      )}
    </div>
  );
}

function CompactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-1.5">{children}</div></div>;
}

function BookingStep({ lead, discoveryNotes, onBooked }: { lead: Lead; discoveryNotes: string; onBooked: () => void }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<PartnerDoctor[]>([]);
  const FORM_KEY = `booking_form_${lead.id}`;
  const defaultForm = {
    clinicId: lead.clinic_id ?? "",
    doctorId: "",
    gender: "",
    dob: "",
    healthFund: "",
    address: "",
    funding: lead.funding_preference ?? "Savings",
    date: "",
    time: "",
  };
  const [form, setForm] = useState<typeof defaultForm>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(FORM_KEY);
        if (saved) return { ...defaultForm, ...JSON.parse(saved) };
      }
    } catch { /* ignore */ }
    return defaultForm;
  });
  const [booked, setBooked] = useState(false);
  const [bookedData, setBookedData] = useState<{ date: string; time: string; clinicName: string; doctorName: string } | null>(null);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [sendingDeposit, setSendingDeposit] = useState(false);
  const [handoverSent, setHandoverSent] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [depositSent, setDepositSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIntel, setPreviewIntel] = useState("");
  const [previewFunding, setPreviewFunding] = useState("");
  const [previewFinance, setPreviewFinance] = useState("");
  const [previewDeposit, setPreviewDeposit] = useState(false);
  const [previewPhone, setPreviewPhone] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");
  const [intelStatus, setIntelStatus] = useState<"waiting" | "ready" | "timeout">("waiting");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [showManualNotes, setShowManualNotes] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [savingManualNotes, setSavingManualNotes] = useState(false);

  useEffect(() => {
    if (!booked) return;
    if (lead.call_notes?.trim() || discoveryNotes?.trim()) {
      setIntelStatus("ready");
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 18; // 3 minutes at 10s intervals
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (stopped) return;
      attempts += 1;
      setPollAttempt(attempts);

      try {
        const { data, error } = await supabase
          .from("meta_leads")
          .select("call_notes")
          .eq("id", lead.id)
          .single();

        if (stopped) return;

        if (error) {
          setIntelStatus("timeout");
          toast.error("Could not check call intel — you can still send manually");
          return;
        }

        if (data?.call_notes?.trim()) {
          setIntelStatus("ready");
          setPreviewIntel(data.call_notes);
          toast.success("Patient intel ready ✓");
          return;
        }
      } catch {
        if (stopped) return;
        setIntelStatus("timeout");
        toast.error("Error checking call intel — you can still send manually");
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        if (!stopped) {
          setIntelStatus("timeout");
          setShowManualNotes(true);
        }
        return;
      }

      timer = setTimeout(poll, 10000);
    };

    // First poll after 15 seconds to give Twilio time to process
    const initialTimer = setTimeout(poll, 15000);

    return () => {
      stopped = true;
      clearTimeout(initialTimer);
      if (timer) clearTimeout(timer);
    };
  }, [booked, lead.id]);

  useEffect(() => {
    void supabase.from("partner_clinics")
      .select("id, clinic_name, address, city, state, consult_price_original, consult_price_deposit, parking_info, nearby_landmarks")
      .eq("is_active", true)
      .then(({ data }) => setClinics((data ?? []) as Clinic[]));
  }, []);

  // Load doctors for the selected clinic
  useEffect(() => {
    if (!form.clinicId) { setDoctors([]); return; }
    void supabase.from("partner_doctors")
      .select("id, clinic_id, name, title, years_experience, specialties, what_makes_them_different, natural_results_approach, advanced_cases, talking_points, aftercare_included")
      .eq("clinic_id", form.clinicId)
      .eq("is_active", true)
      .order("created_at")
      .then(({ data }) => {
        const list = (data ?? []) as PartnerDoctor[];
        setDoctors(list);
        // Auto-select first doctor if none chosen yet
        if (!form.doctorId && list.length > 0) {
          setForm((f) => ({ ...f, doctorId: list[0].id }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.clinicId]);
  const set = (k: keyof typeof form, v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(FORM_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  // Restore booked state if this lead already has a saved booking (rep navigated away and came back)
  useEffect(() => {
    if (lead.booking_date && lead.booking_time && !booked) {
      const selectedClinic = clinics.find((c) => c.id === form.clinicId);
      const selectedDoctor = doctors.find((d) => d.id === form.doctorId) ?? doctors[0];
      setBookedData({
        date: lead.booking_date,
        time: lead.booking_time,
        clinicName: selectedClinic?.clinic_name ?? "Nitai Medical & Cosmetic Centre",
        doctorName: selectedDoctor?.name ?? "Dr. Shabna Singh",
      });
      setBooked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.booking_date, lead.booking_time, clinics, doctors]);
  const clinic = clinics.find((c) => c.id === form.clinicId);
  const selectedDoctor = doctors.find((d) => d.id === form.doctorId) ?? doctors[0] ?? null;

  const saveManualNotes = async () => {
    if (!manualNotes.trim()) return;
    setSavingManualNotes(true);
    try {
      await supabase
        .from("meta_leads")
        .update({ call_notes: manualNotes.trim(), updated_at: new Date().toISOString() })
        .eq("id", lead.id);
      setPreviewIntel(manualNotes.trim());
      setIntelStatus("ready");
      setShowManualNotes(false);
      toast.success("Notes saved ✓");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingManualNotes(false);
    }
  };

  const book = async () => {
    if (!form.date || !form.time) { toast.error("Pick a date and time"); return; }
    const r = await saveBooking({ data: { leadId: lead.id, clinicId: form.clinicId || null, date: form.date, time: form.time } });
    if (r.success) {
      const selectedClinic = clinics.find((c) => c.id === form.clinicId);
      const sd = doctors.find((d) => d.id === form.doctorId) ?? doctors[0];
      const clinicName = selectedClinic?.clinic_name ?? "Nitai Medical & Cosmetic Centre";
      const doctorName = sd?.name ?? "Dr. Shabna Singh";
      setBookedData({ date: form.date, time: form.time, clinicName, doctorName });
      setBooked(true);
      onBooked();
      toast.success("Appointment booked!");

      // Clear persisted form draft now that booking is saved
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(FORM_KEY);
      } catch { /* ignore */ }

      // Fire-and-forget confirmation SMS to the patient via server function (keeps Twilio creds server-side)
      if (lead.phone) {
        void sendBookingConfirmationSms({
          data: {
            leadId: lead.id,
            firstName: lead.first_name ?? "there",
            phone: lead.phone,
            clinicName,
            doctorName,
            bookingDate: form.date,
            bookingTime: form.time,
            clinicAddress: selectedClinic?.address ?? null,
          },
        })
          .then((res) => {
            if (res.success) toast.success("Confirmation SMS sent to patient ✓");
            else toast.error(`Confirmation SMS failed: ${res.error}`);
          })
          .catch(() => toast.error("Confirmation SMS failed — check Twilio"));
      }
    } else {
      toast.error(r.error);
    }
  };

  const handleSendHandover = async () => {
    if (!bookedData) return;
    setSendingHandover(true);
    const selectedClinic = clinics.find((c) => c.id === form.clinicId);
    const r = await sendClinicHandoverEmail({
      data: {
        leadId: lead.id,
        firstName: lead.first_name ?? "",
        lastName: lead.last_name ?? "",
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        callNotes: discoveryNotes || lead.call_notes || "",
        fundingPreference: lead.funding_preference ?? form.funding,
        financeEligible: lead.finance_eligible ?? null,
        bookingDate: bookedData.date,
        bookingTime: bookedData.time,
        clinicName: bookedData.clinicName,
        clinicEmail: (selectedClinic as { email?: string | null } | undefined)?.email ?? null,
        doctorName: bookedData.doctorName,
        depositPaid: depositSent,
      },
    });
    setSendingHandover(false);
    if (r.success) { setHandoverSent(true); toast.success("Clinic handover email sent ✓"); }
    else toast.error(`Handover failed: ${r.error}`);
  };

  const handleSendDeposit = async () => {
    if (!bookedData || !lead.phone) { toast.error("No phone number on this lead"); return; }
    setSendingDeposit(true);
    const r = await sendDepositSmsToPatient({
      data: {
        leadId: lead.id,
        firstName: lead.first_name ?? "there",
        phone: lead.phone,
        clinicName: bookedData.clinicName,
        doctorName: bookedData.doctorName,
        bookingDate: bookedData.date,
        bookingTime: bookedData.time,
      },
    });
    setSendingDeposit(false);
    if (r.success) { setDepositSent(true); toast.success("Deposit link sent to patient ✓"); }
    else toast.error(`Deposit SMS failed: ${r.error}`);
  };

  const openPreview = async () => {
    const { data: freshLead } = await supabase
      .from("meta_leads")
      .select("call_notes, funding_preference, finance_eligible, phone, email")
      .eq("id", lead.id)
      .single();

    setPreviewIntel(freshLead?.call_notes?.trim() || discoveryNotes?.trim() || "");
    setPreviewFunding(freshLead?.funding_preference || form.funding || lead.funding_preference || "");
    setPreviewFinance(
      freshLead?.finance_eligible === true ? "Yes" :
      freshLead?.finance_eligible === false ? "No" :
      lead.finance_eligible === true ? "Yes" :
      lead.finance_eligible === false ? "No" : "Not checked"
    );
    setPreviewDeposit(depositSent);
    setPreviewPhone(freshLead?.phone || lead.phone || "");
    setPreviewEmail(freshLead?.email || lead.email || "");
    setShowPreview(true);
  };

  const confirmAndSend = async () => {
    setShowPreview(false);
    setSendingHandover(true);
    const selectedClinic = clinics.find((c) => c.id === form.clinicId);
    const r = await sendClinicHandoverEmail({
      data: {
        leadId: lead.id,
        firstName: lead.first_name ?? "",
        lastName: lead.last_name ?? "",
        email: previewEmail || null,
        phone: previewPhone || null,
        callNotes: previewIntel,
        fundingPreference: previewFunding,
        financeEligible: previewFinance === "Yes" ? true : previewFinance === "No" ? false : null,
        bookingDate: bookedData?.date ?? "",
        bookingTime: bookedData?.time ?? "",
        clinicName: bookedData?.clinicName ?? "Nitai Medical & Cosmetic Centre",
        clinicEmail: (selectedClinic as { email?: string | null } | undefined)?.email ?? null,
        doctorName: bookedData?.doctorName ?? "Dr. Shabna Singh",
        depositPaid: depositSent,
      },
    });
    setSendingHandover(false);
    if (r.success) { setHandoverSent(true); toast.success("Clinic handover email sent ✓"); }
    else toast.error(`Handover failed: ${r.error}`);
  };

  if (booked && bookedData) {
    const bookingDisplay = (() => {
      try {
        const d = new Date(`${bookedData.date}T${bookedData.time}`);
        return d.toLocaleString("en-AU", {
          weekday: "long", day: "numeric", month: "long",
          hour: "numeric", minute: "2-digit",
        });
      } catch { return `${bookedData.date} at ${bookedData.time}`; }
    })();

    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 10 — Deposit & Book</Eyebrow>
        <StepHeading>Booked!</StepHeading>

        {/* Confirmation card */}
        <div style={{
          background: "#ffffff",
          border: `0.5px solid ${COLORS.line}`,
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
          marginBottom: 24,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: COLORS.green,
            color: "#fff", fontSize: 24, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
            {[lead.first_name, lead.last_name].filter(Boolean).join(" ")}
          </div>
          <div style={{ fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
            {bookingDisplay}
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted }}>
            with {bookedData.doctorName} · {bookedData.clinicName}
          </div>
        </div>

        {/* Two action buttons */}
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em", color: "#999", marginBottom: 10,
        }}>
          Next steps
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Send handover to clinic */}
          <div className="flex flex-col gap-1.5">
            {/* Intel status indicator */}
            {!handoverSent && (
              <div className="flex items-center gap-2" style={{ padding: "0 4px" }}>
                {intelStatus === "waiting" && (
                  <>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      border: `2px solid ${COLORS.amber}`,
                      borderTopColor: "transparent",
                      animation: "discoverySpin 0.8s linear infinite",
                      flexShrink: 0,
                    }} />
                    <div style={{ fontSize: 13, color: COLORS.amberDark, fontWeight: 500 }}>
                      Analysing call recording... ({pollAttempt}/18)
                    </div>
                    <button
                      onClick={() => setIntelStatus("timeout")}
                      style={{ fontSize: 12, color: "#888", textDecoration: "underline", background: "transparent", marginLeft: 8 }}
                    >
                      Skip
                    </button>
                  </>
                )}
                {intelStatus === "ready" && (
                  <>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: COLORS.green, fontWeight: 500 }}>
                      Patient intel ready ✓ — good to send
                    </div>
                  </>
                )}
                {intelStatus === "timeout" && (
                  <>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.muted, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: COLORS.muted }}>
                      No recording detected — you can still send manually
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Manual notes fallback when no recording was detected */}
            {showManualNotes && !handoverSent && (
              <div style={{
                background: "#fffbeb",
                border: `0.5px solid ${COLORS.amber}`,
                borderRadius: 10,
                padding: "16px 20px",
                marginTop: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.amberDark, marginBottom: 8 }}>
                  ⚠️ No recording detected — type your notes while they're fresh
                </div>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={4}
                  placeholder="What did they tell you? Pain points, motivation, budget, timeline..."
                  className="w-full rounded-[6px] outline-none"
                  style={{
                    background: "#ffffff",
                    border: `0.5px solid ${COLORS.line}`,
                    color: "#111",
                    fontSize: 14,
                    lineHeight: 1.6,
                    padding: "10px 12px",
                    resize: "vertical",
                    marginBottom: 10,
                  }}
                />
                <button
                  onClick={() => void saveManualNotes()}
                  disabled={savingManualNotes || !manualNotes.trim()}
                  style={{
                    background: COLORS.coral,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "8px 20px",
                    borderRadius: 6,
                    border: "none",
                    opacity: savingManualNotes || !manualNotes.trim() ? 0.5 : 1,
                    cursor: savingManualNotes || !manualNotes.trim() ? "default" : "pointer",
                  }}
                >
                  {savingManualNotes ? "Saving..." : "Save notes →"}
                </button>
              </div>
            )}

            {/* Button */}
            <button
              onClick={() => void openPreview()}
              disabled={sendingHandover || handoverSent || intelStatus === "waiting"}
              className="w-full rounded-[8px] flex items-center justify-between"
              style={{
                background: handoverSent ? "#ecfdf5" : intelStatus === "waiting" ? "#f3f3f3" : "#ffffff",
                border: `0.5px solid ${handoverSent ? COLORS.green : COLORS.line}`,
                padding: "16px 20px",
                cursor: handoverSent || intelStatus === "waiting" ? "default" : sendingHandover ? "wait" : "pointer",
                opacity: intelStatus === "waiting" ? 0.5 : sendingHandover ? 0.7 : 1,
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: handoverSent ? COLORS.green : COLORS.text, marginBottom: 2 }}>
                  {handoverSent ? "✓ Handover sent to clinic" : "Send handover to clinic"}
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Patient intel, funding, booking details → peter@gobold.com.au
                </div>
              </div>
              {!handoverSent && intelStatus !== "waiting" && (
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.coral, flexShrink: 0, marginLeft: 12 }}>
                  {sendingHandover ? "Sending…" : "Send →"}
                </div>
              )}
            </button>
          </div>

          {/* Send deposit to patient */}
          <button
            onClick={() => void handleSendDeposit()}
            disabled={sendingDeposit || depositSent}
            className="w-full rounded-[8px] flex items-center justify-between"
            style={{
              background: depositSent ? "#ecfdf5" : "#ffffff",
              border: `0.5px solid ${depositSent ? COLORS.green : COLORS.line}`,
              padding: "16px 20px",
              cursor: depositSent ? "default" : sendingDeposit ? "wait" : "pointer",
              opacity: sendingDeposit ? 0.7 : 1,
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: depositSent ? COLORS.green : COLORS.text, marginBottom: 2 }}>
                {depositSent ? "✓ Deposit link sent to patient" : "Send $75 deposit link to patient"}
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>
                Stripe payment link via SMS → {lead.phone ?? "no phone on file"}
              </div>
            </div>
            {!depositSent && (
              <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.coral, flexShrink: 0, marginLeft: 12 }}>
                {sendingDeposit ? "Sending…" : "Send →"}
              </div>
            )}
          </button>
        </div>

        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg rounded-[12px] flex flex-col" style={{ background: "#ffffff", maxHeight: "90vh", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: `0.5px solid ${COLORS.line}` }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#111" }}>Review before sending</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Edit anything before it goes to the clinic</div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1" style={{ padding: "20px 24px" }}>

                {/* Appointment */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Appointment</div>
                  <div style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>
                    {bookedData ? (() => { try { return new Date(`${bookedData.date}T${bookedData.time}`).toLocaleString("en-AU", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }); } catch { return `${bookedData.date} at ${bookedData.time}`; } })() : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>with {bookedData?.doctorName} · {bookedData?.clinicName}</div>
                </div>

                {/* Patient Intel */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Patient Intel <span style={{ color: COLORS.coral }}>— editable</span></div>
                  <textarea
                    value={previewIntel}
                    onChange={(e) => setPreviewIntel(e.target.value)}
                    rows={5}
                    className="w-full rounded-[6px] outline-none"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, lineHeight: 1.6, padding: "10px 12px", resize: "vertical" }}
                    placeholder="Add call notes here..."
                  />
                </div>

                {/* Funding */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Funding Method <span style={{ color: COLORS.coral }}>— editable</span></div>
                  <input
                    value={previewFunding}
                    onChange={(e) => setPreviewFunding(e.target.value)}
                    className="w-full rounded-[6px] outline-none"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }}
                  />
                </div>

                {/* Key facts row */}
                <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Finance Eligible</div>
                    <select value={previewFinance} onChange={(e) => setPreviewFinance(e.target.value)}
                      className="w-full rounded-[6px] outline-none"
                      style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }}>
                      <option>Not checked</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Deposit Paid</div>
                    <select value={previewDeposit ? "Yes" : "No"} onChange={(e) => setPreviewDeposit(e.target.value === "Yes")}
                      className="w-full rounded-[6px] outline-none"
                      style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }}>
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Patient Contact <span style={{ color: COLORS.coral }}>— editable</span></div>
                  <input value={previewPhone} onChange={(e) => setPreviewPhone(e.target.value)} placeholder="Phone"
                    className="w-full rounded-[6px] outline-none mb-2"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }} />
                  <input value={previewEmail} onChange={(e) => setPreviewEmail(e.target.value)} placeholder="Email"
                    className="w-full rounded-[6px] outline-none"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }} />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-3" style={{ padding: "16px 24px", borderTop: `0.5px solid ${COLORS.line}` }}>
                <button onClick={() => setShowPreview(false)}
                  className="flex-1 rounded-[8px]"
                  style={{ background: "#f3f3f3", color: "#111", fontSize: 14, fontWeight: 500, padding: "12px 0" }}>
                  Cancel
                </button>
                <button onClick={() => void confirmAndSend()}
                  className="flex-1 rounded-[8px]"
                  style={{ background: COLORS.coral, color: "#fff", fontSize: 14, fontWeight: 500, padding: "12px 0" }}>
                  Confirm & Send →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Eyebrow>Step 10 — Deposit & Book</Eyebrow>
      <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111", marginBottom: 8, lineHeight: 1.3 }}>Lock It In</h1>
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: "#92400e",
          marginBottom: 10,
          lineHeight: 1.4,
        }}
      >
        Get it before they hang up — if you can't lock in a date, schedule the follow-up call before they go.
      </div>

      <Card className="px-4 py-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Label>Clinic</Label>
            <select value={form.clinicId} onChange={(e) => set("clinicId", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
              <option value="">Select clinic…</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.clinic_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Gender</Label>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
              <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>

        {doctors.length > 0 && (
          <div>
            <Label>Doctor</Label>
            <select
              value={form.doctorId}
              onChange={(e) => set("doctorId", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1"
              style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.title ? ` — ${d.title}` : ""}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Label>Date of Birth</Label>
            <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
          </div>
          <div>
            <Label>Funding type</Label>
            <div className="flex gap-1.5 mt-1">
              {["Savings", "Super", "Finance"].map((v) => (
                <button key={v} onClick={() => set("funding", v)}
                  className="flex-1 px-2 py-1.5 rounded-md text-[12px] font-medium"
                  style={{
                    background: form.funding === v ? COLORS.coral : "#f9f9f9",
                    color: form.funding === v ? "#fff" : COLORS.muted,
                    border: `1px solid ${form.funding === v ? COLORS.coral : COLORS.line}`,
                  }}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Label>Booking date</Label>
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
          </div>
          <div>
            <Label>Time slot</Label>
            <input type="time" value={form.time} onChange={(e) => set("time", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }} />
          </div>
        </div>

        <button
          onClick={() => void book()}
          className="w-full rounded-[6px]"
          style={{ background: COLORS.green, color: "#ffffff", fontSize: 13, fontWeight: 500, padding: "9px 20px", marginTop: 4 }}
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

function getTimeSlot(lead: Lead): "9am" | "12pm" | "3pm" {
  if (lead.callback_scheduled_at) {
    const h = new Date(lead.callback_scheduled_at).getHours();
    if (h < 10) return "9am";
    if (h < 13) return "12pm";
    return "3pm";
  }
  const hour = new Date().getHours();
  if (hour < 10) return "9am";
  if (hour < 13) return "12pm";
  return "3pm";
}

const fmtShort = (s: string) =>
  new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

function LeadChooser({ leads, attemptCounts, onPick }: { leads: Lead[]; attemptCounts: Record<string, number>; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = leads.filter((l) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        (l.first_name ?? "").toLowerCase().includes(needle) ||
        (l.last_name ?? "").toLowerCase().includes(needle) ||
        (l.phone ?? "").toLowerCase().includes(needle)
      );
    });
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [leads, q]);

  const renderLeadCard = (l: Lead) => {
    const u = leadUrgency(l);
    const accent = u === "overdue" ? COLORS.red : u === "due" ? COLORS.amber : "transparent";
    const day = l.day_number ?? 1;
    const attempts = ATTEMPTS_PER_DAY(day);
    const todayCount = attemptCounts[l.id] ?? 0;
    const attemptDisplay = todayCount;
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
          marginBottom: 8,
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div style={{ fontSize: 15, fontWeight: 500, color: "#111" }}>{name}</div>
            <span style={{ fontSize: 11, color: "#999" }}>· {fmtShort(l.created_at)}</span>
          </div>
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
              Day {day} · Attempt {Math.min(attemptDisplay, attempts)} of {attempts}
            </span>
            {l.callback_scheduled_at && (
              <span style={{ fontSize: 12, color: COLORS.blue, fontWeight: 500 }}>
                · {new Date(l.callback_scheduled_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            {u === "overdue" && (
              <span style={{ fontSize: 12, color: COLORS.red, fontWeight: 500 }}>· Overdue</span>
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
  };

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const overdue = filtered.filter((l) =>
    l.callback_scheduled_at ? new Date(l.callback_scheduled_at) < startOfToday : false
  );
  const overdueIds = new Set(overdue.map((l) => l.id));
  const remaining = filtered.filter((l) => !overdueIds.has(l.id));
  const slot9 = remaining.filter((l) => getTimeSlot(l) === "9am");
  const slot12 = remaining.filter((l) => getTimeSlot(l) === "12pm");
  const slot3 = remaining.filter((l) => getTimeSlot(l) === "3pm");

  const SlotSection = ({ title, slotLeads, color }: { title: string; slotLeads: Lead[]; color: string }) =>
    slotLeads.length === 0 ? null : (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color, marginBottom: 8, paddingLeft: 4 }}>
          {title} — {slotLeads.length} lead{slotLeads.length !== 1 ? "s" : ""}
        </div>
        {slotLeads.map((l) => renderLeadCard(l))}
      </div>
    );

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

        <div className="mt-6">
          {filtered.length === 0 && (
            <div style={{ padding: "24px 0", fontSize: 14, color: "#111", opacity: 0.7 }}>No leads to call.</div>
          )}
          {overdue.length > 0 && <SlotSection title="⚠️ Overdue callbacks" slotLeads={overdue} color={COLORS.coral} />}
          <SlotSection title="9am session" slotLeads={slot9} color="#3b82f6" />
          <SlotSection title="12pm session" slotLeads={slot12} color="#8b5cf6" />
          <SlotSection title="3pm session" slotLeads={slot3} color="#10b981" />
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
  { label: "Not interested", key: "Not interested" },
  { label: "Already sorted", key: "Already sorted" },
  { label: "Not feeling good", key: "Not feeling good" },
  { label: "Too far", key: "Too far" },
  { label: "Think about it", key: "Think about it" },
  { label: "No time", key: "No time" },
  { label: "Consult price", key: "Consult price" },
  { label: "Transplant price", key: "Transplant price" },
  { label: "Who are you", key: "Who are you" },
];

function RightPanel({
  active, repId, mmsImages, attemptCounts, onChangeLead,
}: {
  active: Lead;
  repId: string | null;
  mmsImages: { name: string; url: string }[];
  attemptCounts: Record<string, number>;
  onChangeLead: () => void;
}) {
  void repId;
  const { status: deviceStatus, call: placeCall, hangup, sendDtmf } = useTwilioDevice(true);
  const inCall = deviceStatus === "in-call" || deviceStatus === "connecting";

  const [callTimer, setCallTimer] = useState(0);
  const [openObjection, setOpenObjection] = useState<string | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [panelClinic, setPanelClinic] = useState<Clinic | null>(null);
  const [panelDoctor, setPanelDoctor] = useState<PartnerDoctor | null>(null);

  // Doctor selling-points (AI-summarised on demand, cached per doctor)
  const [showSellingPoints, setShowSellingPoints] = useState(false);
  const [sellingPoints, setSellingPoints] = useState<string[] | null>(null);
  const [loadingSellingPoints, setLoadingSellingPoints] = useState(false);
  const [sellingPointsForDoctorId, setSellingPointsForDoctorId] = useState<string | null>(null);

  // Callback scheduling
  const [showCallbackPicker, setShowCallbackPicker] = useState(false);
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [savingCallback, setSavingCallback] = useState(false);

  // SMS panel
  const [showSms, setShowSms] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsHistory, setSmsHistory] = useState<{ body: string; sent_at: string | null; created_at: string; direction: string }[]>([]);

  // Load SMS history for this lead
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("sms_messages")
        .select("body, sent_at, created_at, direction")
        .eq("lead_id", active.id)
        .order("created_at", { ascending: true })
        .limit(50);
      setSmsHistory((data ?? []) as typeof smsHistory);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  useEffect(() => {
    void (async () => {
      const { data: clinics } = await supabase
        .from("partner_clinics")
        .select("id, clinic_name, address, city, state, consult_price_original, consult_price_deposit, parking_info, nearby_landmarks")
        .eq("is_active", true);
      const list = (clinics ?? []) as Clinic[];
      const picked = (active.clinic_id ? list.find((c) => c.id === active.clinic_id) : null) ?? list[0] ?? null;
      setPanelClinic(picked);
      if (picked) {
        const { data: docs } = await supabase
          .from("partner_doctors")
          .select("id, clinic_id, name, title, years_experience, specialties, what_makes_them_different, natural_results_approach, advanced_cases, talking_points, aftercare_included")
          .eq("clinic_id", picked.id)
          .eq("is_active", true)
          .order("created_at")
          .limit(1);
        setPanelDoctor(((docs ?? [])[0] as PartnerDoctor) ?? null);
      } else {
        setPanelDoctor(null);
      }
    })();
  }, [active.id, active.clinic_id]);

  // Run the timer only when actually connected
  useEffect(() => {
    if (deviceStatus !== "in-call") return;
    const i = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [deviceStatus]);

  // Reset timer when the call ends
  useEffect(() => {
    if (deviceStatus === "ready" || deviceStatus === "idle" || deviceStatus === "error") {
      setCallTimer(0);
      setKeypadOpen(false);
    }
  }, [deviceStatus]);

  // Reset open objection when switching leads
  useEffect(() => { setOpenObjection(null); }, [active.id]);

  const callNow = async () => {
    console.log("[callNow] click", { phone: active.phone, leadId: active.id, deviceStatus });
    if (!active.phone) { toast.error("No phone number"); return; }
    if (deviceStatus === "loading" || deviceStatus === "idle") {
      toast.message("Dialler still warming up — try again in a moment.");
      return;
    }
    if (deviceStatus === "error") {
      toast.error("Dialler errored — refresh the page to reconnect.");
      return;
    }
    // Prime the AudioContext inside the user gesture so ringback can play
    // later when Twilio fires the "ringing" event (browser autoplay policy).
    primeAudioContext();
    try {
      console.log("[callNow] placing call to", active.phone);
      await placeCall(active.phone, { leadId: active.id });
      console.log("[callNow] placeCall returned");
    } catch (e) {
      stopRingback();
      console.error("[callNow] placeCall threw", e);
      toast.error(e instanceof Error ? e.message : "Failed to start call");
    }
  };

  const sendImage = async (url: string) => {
    const r = await sendLeadMms({ data: { leadId: active.id, mediaUrl: url, body: "" } });
    if (r.success) toast.success("Sent"); else toast.error(r.error);
  };

  const day = active.day_number ?? 1;
  const attempts = ATTEMPTS_PER_DAY(day);
  const fullName = [active.first_name, active.last_name].filter(Boolean).join(" ") || "Unnamed";
  const objectionResp = openObjection
    ? OBJECTIONS.find((o) => o.q === openObjection) ?? null
    : null;

  const fmtTimer = `${Math.floor(callTimer / 60).toString().padStart(2, "0")}:${(callTimer % 60).toString().padStart(2, "0")}`;
  const KEYPAD_KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];

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
          Day {day} · Attempt {Math.min(attemptCounts[active.id] ?? 0, attempts)} of {attempts} today
        </div>
      </div>

      {/* Section 2 — Call control */}
      <div style={{ padding: "0 18px 16px" }}>
        {!inCall ? (
          <button
            onClick={() => void callNow()}
            disabled={deviceStatus === "loading" || deviceStatus === "idle"}
            className="w-full rounded-[8px] flex items-center justify-center gap-2"
            style={{
              background: COLORS.coral,
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 500,
              padding: "14px 16px",
              opacity: deviceStatus === "loading" || deviceStatus === "idle" ? 0.6 : 1,
            }}
          >
            📞 Call Now
          </button>
        ) : (
          <>
            <div
              className="w-full rounded-[8px] flex items-center justify-center font-mono"
              style={{
                background: "#f0fdf4",
                color: COLORS.green,
                border: `1px solid ${COLORS.green}`,
                fontSize: 18,
                fontWeight: 600,
                padding: "12px 16px",
                letterSpacing: "0.05em",
              }}
            >
              {deviceStatus === "connecting" ? "Connecting…" : `⏱ ${fmtTimer}`}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => hangup()}
                className="rounded-[8px]"
                style={{
                  background: COLORS.red,
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 12px",
                }}
              >
                🔴 Hang Up
              </button>
              <button
                onClick={() => setKeypadOpen((v) => !v)}
                className="rounded-[8px]"
                style={{
                  background: keypadOpen ? "#111" : "#ffffff",
                  color: keypadOpen ? "#ffffff" : "#111",
                  border: `1px solid #111`,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 12px",
                }}
              >
                ⌨️ Keypad
              </button>
            </div>
            {keypadOpen && (
              <div
                className="mt-2 grid grid-cols-3 gap-2 p-3 rounded-[8px]"
                style={{ background: "#fafaf9", border: `1px solid ${COLORS.line}` }}
              >
                {KEYPAD_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => sendDtmf(k)}
                    className="rounded-[6px]"
                    style={{
                      background: "#ffffff",
                      border: `1px solid ${COLORS.line}`,
                      fontSize: 18,
                      fontWeight: 500,
                      padding: "10px 0",
                      color: "#111",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
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
            display: "block",
          }}
        >
          Mark as dropped
        </button>
        <button
          onClick={() => setShowCallbackPicker(!showCallbackPicker)}
          style={{ fontSize: 12, color: COLORS.coral, textDecoration: "underline", background: "transparent", display: "block", marginTop: 4 }}
        >
          Schedule callback
        </button>
        {showCallbackPicker && (
          <div style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, borderRadius: 8, padding: "12px 14px", marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 8 }}>
              Schedule callback
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {(["30 min", "1 hour", "2 hours"] as const).map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    const d = new Date();
                    d.setMinutes(d.getMinutes() + (label === "30 min" ? 30 : label === "1 hour" ? 60 : 120));
                    setCallbackDate(d.toISOString().split("T")[0]);
                    setCallbackTime(d.toTimeString().slice(0, 5));
                  }}
                  style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: `0.5px solid ${COLORS.line}`, background: "#fff", color: "#111", cursor: "pointer" }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {(["9:00", "12:00", "15:00"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    const d = new Date();
                    const [h] = t.split(":").map(Number);
                    if (d.getHours() >= h) d.setDate(d.getDate() + 1);
                    setCallbackDate(d.toISOString().split("T")[0]);
                    setCallbackTime(t);
                  }}
                  style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: `0.5px solid ${COLORS.line}`, background: "#fff", color: "#111", cursor: "pointer" }}
                >
                  {t === "9:00" ? "9am" : t === "12:00" ? "12pm" : "3pm"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)}
                style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 4, border: `0.5px solid ${COLORS.line}`, background: "#fff", color: "#111" }} />
              <input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)}
                style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 4, border: `0.5px solid ${COLORS.line}`, background: "#fff", color: "#111" }} />
            </div>
            <button
              onClick={async () => {
                if (!callbackDate || !callbackTime) return;
                setSavingCallback(true);
                const dt = new Date(`${callbackDate}T${callbackTime}`);
                await supabase.from("meta_leads").update({
                  callback_scheduled_at: dt.toISOString(),
                  status: "Callback Scheduled",
                  updated_at: new Date().toISOString(),
                }).eq("id", active.id);
                setSavingCallback(false);
                setShowCallbackPicker(false);
                toast.success(`Callback set for ${dt.toLocaleString("en-AU", { weekday: "short", hour: "numeric", minute: "2-digit" })}`);
              }}
              disabled={savingCallback || !callbackDate || !callbackTime}
              style={{ width: "100%", background: COLORS.coral, color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 0", borderRadius: 6, cursor: "pointer", opacity: savingCallback ? 0.6 : 1, border: "none" }}
            >
              {savingCallback ? "Saving..." : "Confirm callback →"}
            </button>
          </div>
        )}
      </div>

      {/* Section 3 — Clinic info */}
      <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111" }}>
          Clinic
        </div>
        {panelClinic ? (
          <>
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 500, color: "#111" }}>
              {panelClinic.clinic_name}
            </div>
            {panelDoctor?.name && (
              <div style={{ fontSize: 13, color: "#111" }}>{panelDoctor.name}</div>
            )}
            {(panelClinic.address || panelClinic.city || panelClinic.state) && (
              <div style={{ fontSize: 13, color: "#111" }}>
                {[panelClinic.address, panelClinic.city, panelClinic.state].filter(Boolean).join(" ")}
              </div>
            )}
            {(panelClinic.parking_info || panelClinic.nearby_landmarks) && (
              <ul style={{ marginTop: 8, fontSize: 12, color: "#111", lineHeight: 1.7, listStyle: "none", padding: 0 }}>
                {panelClinic.parking_info && <li>· {panelClinic.parking_info}</li>}
                {panelClinic.nearby_landmarks
                  ?.split(/[,\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((landmark, i) => <li key={i}>· {landmark}</li>)}
              </ul>
            )}
          </>
        ) : (
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>No clinic assigned</div>
        )}
      </div>

      {/* Section 3b — Doctor Selling Points (collapsible, between Clinic & Objections) */}
      {panelDoctor && (
        <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
          <button
            type="button"
            onClick={async () => {
              const next = !showSellingPoints;
              setShowSellingPoints(next);
              if (
                next &&
                panelDoctor &&
                (sellingPointsForDoctorId !== panelDoctor.id || !sellingPoints)
              ) {
                setLoadingSellingPoints(true);
                try {
                  const { data, error } = await supabase.functions.invoke(
                    "summarize-doctor",
                    {
                      body: {
                        doctor: {
                          ...panelDoctor,
                          clinic_name: panelClinic?.clinic_name ?? null,
                        },
                      },
                    },
                  );
                  if (error) throw error;
                  const points = (data as { points?: string[] })?.points ?? [];
                  setSellingPoints(points);
                  setSellingPointsForDoctorId(panelDoctor.id);
                  if (points.length === 0) {
                    toast.message("No selling points generated — doctor profile may be empty.");
                  }
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Failed to generate selling points";
                  toast.error(msg);
                  setSellingPoints([]);
                } finally {
                  setLoadingSellingPoints(false);
                }
              }
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            aria-expanded={showSellingPoints}
          >
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111" }}>
              Doctor Selling Points
            </span>
            <span style={{ fontSize: 12, color: COLORS.coral, fontWeight: 600 }}>
              {showSellingPoints ? "Hide ▲" : "Show ▼"}
            </span>
          </button>

          {showSellingPoints && (
            <div
              className="rounded-[8px]"
              style={{
                marginTop: 10,
                background: "#fafafa",
                border: `0.5px solid ${COLORS.line}`,
                padding: "10px 12px",
              }}
            >
              {panelDoctor?.name && (
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666", marginBottom: 6 }}>
                  {panelDoctor.name}
                </div>
              )}
              {loadingSellingPoints ? (
                <div style={{ fontSize: 13, color: "#666" }}>Generating…</div>
              ) : sellingPoints && sellingPoints.length > 0 ? (
                <ul style={{ fontSize: 13, color: "#111", lineHeight: 1.55, listStyle: "none", padding: 0, margin: 0 }}>
                  {sellingPoints.map((p, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>· {p}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 13, color: "#666" }}>No points available — fill in the doctor profile in Partner Clinics.</div>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* Section 6 — SMS */}
      <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
        <button
          onClick={() => setShowSms((v) => !v)}
          style={{
            width: "100%", background: showSms ? "#111" : "#ffffff",
            color: showSms ? "#fff" : "#111",
            border: `1px solid #111`, borderRadius: 8,
            fontSize: 13, fontWeight: 500, padding: "8px 12px", cursor: "pointer",
          }}
        >
          {showSms ? "Hide SMS" : "💬 Send SMS"}
        </button>
        {showSms && (
          <div style={{ marginTop: 10 }}>
            {smsHistory.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 10, padding: 8, background: "#fafaf9", borderRadius: 6, border: `0.5px solid ${COLORS.line}` }}>
                {smsHistory.map((m, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: "6px 8px", marginBottom: 4, borderRadius: 6,
                    background: m.direction === "outbound" ? "#eff6ff" : "#f3f3f3",
                    color: "#111",
                  }}>
                    <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>
                      {m.direction === "outbound" ? "→ Sent" : "← Received"} · {new Date(m.sent_at ?? m.created_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </div>
                    {m.body}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 8 }}>
              {[
                { label: "Following up", text: `Hi ${active.first_name ?? "there"}, it's Peter from Hair Transplant Group. Just following up on your enquiry — happy to answer any questions. Give me a call on 0414 999 999 or reply here.` },
                { label: "Callback confirm", text: `Hi ${active.first_name ?? "there"}, confirming I'll give you a call shortly. Look forward to chatting!` },
                { label: "Booking reminder", text: `Hi ${active.first_name ?? "there"}, just a reminder of your consultation tomorrow. Looking forward to seeing you — any questions just reply here.` },
                { label: "Deposit reminder", text: `Hi ${active.first_name ?? "there"}, just a reminder to pay your $75 refundable deposit to secure your consultation spot. Reply if you have any questions!` },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => setSmsText(t.text)}
                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "#fff", border: `0.5px solid ${COLORS.line}`, color: "#111", cursor: "pointer" }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="Type your message…"
              rows={4}
              style={{ width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 6, border: `0.5px solid ${COLORS.line}`, background: "#fff", color: "#111", resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "#888" }}>{smsText.length} chars</span>
              <button
                onClick={async () => {
                  if (!smsText.trim() || !active.phone) { toast.error("Need message + phone"); return; }
                  setSendingSms(true);
                  const r = await sendManualSms({ data: { leadId: active.id, phone: active.phone, body: smsText } });
                  setSendingSms(false);
                  if (r.success) {
                    toast.success("SMS sent");
                    setSmsHistory((prev) => [...prev, { body: smsText, sent_at: new Date().toISOString(), created_at: new Date().toISOString(), direction: "outbound" }]);
                    setSmsText("");
                  } else toast.error(r.error);
                }}
                disabled={sendingSms || !smsText.trim()}
                style={{ background: COLORS.coral, color: "#fff", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", opacity: sendingSms || !smsText.trim() ? 0.6 : 1 }}
              >
                {sendingSms ? "Sending…" : "Send →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const OBJECTIONS = [
  {
    q: "Call me back",
    a: "That's not a problem at all — I know you were not expecting my call. Do you have just one minute now, just to see if it even makes sense for me to call you back later?",
    note: "Gets them talking about their own motivation. One minute becomes ten.",
  },
  {
    q: "Email me",
    a: "Yeah absolutely — I know you were not expecting my call. Do you have just one minute now, just to see if it even makes sense for me to send you anything at all?",
    note: "Same energy as call me back — agree, then get them on the phone for one minute.",
  },
  {
    q: "Not interested",
    a: "Yeah that's completely fair — and I'm not here to push anything. I'm just curious, what made you look into it in the first place? Because usually when someone fills in a form there's something going on.",
    note: "They filled in the form for a reason. Get them back to that moment.",
  },
  {
    q: "Already sorted",
    a: "Oh amazing — good on you. Out of curiosity, what did you end up going with? I just want to make sure we're not doubling up on something you've already got sorted.",
    note: "",
  },
  {
    q: "Not feeling good",
    a: "Sorry to hear that — hope you feel better soon. Look I'll be quick — when would be a better time, later today or would tomorrow morning work?",
    note: "",
  },
  {
    q: "Too far",
    a: "Yeah I totally get that. Can I ask — if the location wasn't an issue, is this something you'd genuinely want to get sorted?",
    note: "If yes → 'Let me see what we can do — whereabouts are you?'",
  },
  {
    q: "Think about it",
    a: "Yeah of course, absolutely — what part of it do you want to think through? Is it the cost, the procedure itself, or something else? Because I might actually be able to help you with that right now.",
    note: "",
  },
  {
    q: "No time",
    a: "Totally get it — is it that you're flat out right now, or is it more that you're not sure this is the right move for you? Because if it's timing I can call you at an exact time that works.",
    note: "",
  },
  {
    q: "Consult price",
    a: "Normally it's $395 — but I want to get you in with Dr. Singh, she's got some complimentary spots available. The only caveat is the $75 deposit to hold the spot, which is fully refunded when you arrive. Does that sound fair?",
    note: "Walk the price journey. Don't skip steps.",
  },
  {
    q: "Transplant price",
    a: "Absolutely — I'll definitely give you the price. Can you just tell me, how much hair do you have on the top at the moment?",
    note: "Agree with their question, then start another conversation. Once they answer you're back in discovery.",
  },
  {
    q: "Who are you",
    a: "Great question — The Hair Transplant Group is a network of specialist clinics all around Australia. [Clinic Name] and [Dr Name] are part of our network. Some clinics have multiple doctors — the reason I'm suggesting Dr [Name] specifically is because of what you just told me about XYZ.",
    note: "Swap [Clinic Name], [Dr Name] and XYZ with the lead's actual details from discovery.",
  },
];
