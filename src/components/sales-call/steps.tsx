import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import {
  Brain, MessageCircle, Stethoscope, Megaphone, GraduationCap, Sparkles,
  HandshakeIcon, DollarSign, ShieldCheck, Calendar as CalendarIcon,
  Check, AlertTriangle, Send, Search, X, ChevronDown, PhoneCall, RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { toast } from "sonner";
import {
  sendLeadMms, listMmsImages, saveFinanceCheck,
  saveBooking, clearBooking, updateLeadStatus, ensureRepForEmail,
  saveCallNotes, discoveryToAmpAudio, findLeadByPhone,
  getCurrentRepSession, startRepSession, endRepSession,
} from "@/utils/sales-call.functions";
import { sendClinicHandoverEmail, sendDepositSmsToPatient, sendBookingConfirmationSms, sendManualSms, sendStandaloneDepositSms } from "@/utils/resend.functions";
import { stopRingback } from "@/utils/ringback";
import { generateSlots, holidayLabelFor, summarizeDay, ymdLocal, type TradingHours, type BlockedSlot, type ExistingAppt, type AvailabilityOverride } from "@/lib/slot-generation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChargeCardOverPhoneModal } from "@/components/ChargeCardOverPhoneModal";
import { openMessenger, setMessengerThread } from "@/hooks/useMessenger";
import { useConversation } from "@elevenlabs/react";
import { savePracticeCallRecording, enqueuePracticeCallSave } from "@/lib/practice-recordings.functions";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";
import NorwoodPricingCalculator from "@/components/NorwoodPricingCalculator";
import {
  ATTEMPTS_PER_DAY, COLORS, SALES_CALL_LEAD_LIMIT, SALES_CALL_LEAD_SELECT,
  STATUS_OPTIONS, fmtShort, fmtTime, getTimeSlot, leadHasBookedSale,
  leadUrgency, localDateKey, normalisePhoneDigits, normaliseStatus,
  pipelineDay, rawPayloadObject, sameLocalDate, statusColor, statusMeta,
  type Clinic, type Lead, type LeadUrgency, type PartnerDoctor,
  type RawPayloadObject, type StatusKey,
} from "./logic";
import { Card, Eyebrow, Label, Pill, Coach, Section, NextBtn, RuleBad, RuleGood, StepHeading, ScriptBody, CalloutAmber, CalloutGreen, CompactRow, FormRow } from "./primitives";
import { BookingStep } from "./booking";

export const STEPS = [
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

export type StepKey = typeof STEPS[number]["key"];
export function StepContent({
  step, lead, repName, repId, mmsImages, onAdvance, onMarkComplete,
  discoveryNotes, setDiscoveryNotes, ampPrefill, setAmpPrefill, audioPrefill, setAudioPrefill,
  onDepositPaid, onBookedSaved,
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
  onDepositPaid?: () => void;
  onBookedSaved?: (leadId: string, patch: Partial<Lead>) => void;
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
          — if I don't call you now I won't be able to call you back later, it's just been so busy in the clinic today.
          So how can I help with your hair situation, <Pill name>{fname}</Pill>?
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
                Fill out your Discovery notes to personalise this summary.
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
    const highlight = COLORS.coral;
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Eyebrow>Step 6 — Audiobook</Eyebrow>
        <h1 style={{
          fontSize: 32, fontWeight: 500, color: COLORS.text, lineHeight: 1.2,
          letterSpacing: "-0.01em", marginBottom: 32, textAlign: "center",
        }}>
          Paint The Picture
        </h1>

        {/* 1. SAY THIS — pivot line */}
        <div style={{
          background: "#fafaf7",
          borderLeft: `2px solid ${COLORS.coral}`,
          borderRadius: "0 8px 8px 0",
          padding: "18px 22px",
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
            color: COLORS.coral, marginBottom: 10,
          }}>
            Say this
          </div>
          <div style={{ fontSize: 19, fontWeight: 500, color: COLORS.text, lineHeight: 1.5 }}>
            "Look, I could talk about the technical side all day — but what it really comes down to is this..."
          </div>
        </div>

        {/* 2. THE FORMULA */}
        <div style={{
          background: "#ffffff",
          border: `0.5px solid ${COLORS.line}`,
          borderRadius: 8,
          padding: "18px 22px",
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
            color: COLORS.text, marginBottom: 10,
          }}>
            The formula
          </div>
          <div style={{ fontSize: 18, color: COLORS.text, lineHeight: 1.6 }}>
            Imagine waking up <span style={{ color: highlight, fontWeight: 600 }}>[timeframe]</span> from now... <span style={{ color: highlight, fontWeight: 600 }}>[use their exact words from discovery]</span> ... <span style={{ color: highlight, fontWeight: 600 }}>[their dream outcome]</span>. How would that actually feel?
          </div>
        </div>

        {/* 3. STOP */}
        <div style={{
          background: "#ffffff",
          border: `0.5px solid ${COLORS.line}`,
          borderRadius: 8,
          padding: "16px 20px",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
        }}>
          <span style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "#dc2626",
            marginTop: 6,
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, lineHeight: 1.4 }}>
              Then stop. Don't speak.
            </div>
            <div style={{ fontSize: 14, color: COLORS.hint, lineHeight: 1.6, marginTop: 4 }}>
              The silence is working for you. Wait for them to respond.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "commitment") {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div style={{
          fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
          color: COLORS.coral, marginBottom: 6, textAlign: "center",
        }}>
          Commitment
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 500, color: COLORS.text, lineHeight: 1.2,
          textAlign: "center", letterSpacing: "-0.01em", marginBottom: 18,
        }}>
          Ask For Commitment
        </h1>

        {/* Commitment script — phone-friendly stacked blocks */}
        <div style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}>
          {/* Step 1 — The ask */}
          <div style={{
            background: "#ffffff",
            borderLeft: `4px solid ${COLORS.coral}`,
            borderRadius: "0 10px 10px 0",
            padding: "22px 20px",
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: COLORS.coral, marginBottom: 10,
            }}>
              1 — The Ask
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.45, color: COLORS.text }}>
              👉 "Based on all of that, is it something you wanna get sorted now? Where are you at with all of this?"
            </div>
          </div>

          {/* Step 2 — Wait */}
          <div style={{
            background: "#fafafa",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 14,
            lineHeight: 1.5,
            color: COLORS.text,
            fontStyle: "italic",
          }}>
            👉 Wait for their answer — let them tell you where they're at.
          </div>

          {/* Step 3 — Their yes */}
          <div style={{
            background: "#ffffff",
            borderLeft: `3px solid ${COLORS.coral}`,
            borderRadius: "0 8px 8px 0",
            padding: "14px 16px",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.08em", color: COLORS.coral, marginBottom: 8,
            }}>
              2 — When they say yes
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: COLORS.text }}>
              Instantly say:
            </div>
            <div style={{
              marginTop: 8,
              fontSize: 15,
              lineHeight: 1.6,
              color: COLORS.text,
              fontWeight: 500,
            }}>
              "Excellent, I really want to book you in with Doctor <span style={{ color: COLORS.hint }}>[name]</span>, because based on what you told me about <span style={{ color: COLORS.hint }}>[link to their specific situation]</span> I think they would be perfect for you."
            </div>
            <div style={{
              marginTop: 10,
              fontSize: 15,
              lineHeight: 1.6,
              color: COLORS.text,
              fontWeight: 500,
            }}>
              "They also <span style={{ color: COLORS.hint }}>[drop 3 key selling points]</span> — and that's why I wouldn't want you seeing anyone else."
            </div>
          </div>

          {/* Step 4 — Never say */}
          <div style={{
            background: "#ffffff",
            border: `0.5px solid ${COLORS.line}`,
            borderRadius: 8,
            padding: "14px 16px",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.08em", color: COLORS.red, marginBottom: 10,
            }}>
              Note — never say
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ['"would you like to book"', "that gives them a yes/no exit"],
                ['"do you want to think about it"', "you just lost them"],
                ['"no pressure" or "no rush"', "you're handing them the off-ramp"],
              ].map(([phrase, why]) => (
                <div key={phrase} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  fontSize: 14, lineHeight: 1.5, color: COLORS.text,
                }}>
                  <span style={{ color: COLORS.red, fontSize: 14, marginTop: 1 }}>❌</span>
                  <div>
                    <span style={{ fontWeight: 500 }}>NEVER say {phrase}</span>
                    <span style={{ color: COLORS.hint }}> — {why}</span>
                  </div>
                </div>
              ))}
            </div>
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
    return <BookingStep lead={lead} discoveryNotes={discoveryNotes} onBooked={() => onMarkComplete("booking")} onDepositPaid={onDepositPaid} onBookedSaved={onBookedSaved} repId={repId} />;
  }

  return null;
}

/* ─────────── Helpers ─────────── */

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
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
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

  // Reset the "user has edited" flag whenever the active lead changes.
  // Without this, switching from Francesco → Jay would carry over Francesco's
  // edit-trust into Jay's session and let an in-flight debounce save
  // Francesco's notes into Jay's row (root cause of the cross-lead
  // pipeline_summary contamination bug).
  useEffect(() => {
    userEditedRef.current = false;
  }, [lead?.id]);

  // Debounced auto-save to meta_leads.call_notes (1s).
  // Rules:
  // - Only fire after the rep has actually typed (userEditedRef).
  // - Never overwrite existing call_notes with an empty string — the AI
  //   pipeline writes patient summaries here and an empty save would wipe
  //   the handover note for the clinic.
  // - Snapshot leadId + notes at scheduling time; if the active lead changes
  //   before the debounce fires we bail, so the save can never land on the
  //   wrong lead's row.
  useEffect(() => {
    if (!lead?.id) return;
    if (!userEditedRef.current) return;
    if (!notes.trim()) return;
    const snapshotLeadId = lead.id;
    const snapshotNotes = notes;
    const handle = setTimeout(() => {
      if (lead?.id !== snapshotLeadId) return; // lead switched mid-debounce — abort
      void saveCallNotes({ data: { leadId: snapshotLeadId, notes: snapshotNotes } }).then((r) => {
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

      {/* Discovery script — scrollable box */}
      <div className="always-scroll" style={{
        marginTop: 16,
        background: "#ffffff",
        borderLeft: `2px solid ${COLORS.coral}`,
        borderRadius: "0 8px 8px 0",
        padding: "16px 20px",
        maxHeight: 420,
        overflowY: "scroll",
        fontSize: 14,
        lineHeight: 1.55,
        color: COLORS.text,
        whiteSpace: "pre-wrap",
      }}>



{`👉 So what's going on with your hair situation?



👉 Let them talk. Don't interrupt. Don't fill silence.



📋 HISTORY
👉 Timeline — "How long's this been going on?" (push for exact — when you first noticed → when it sped up. You'll reuse this number at Q4 and in the amplification.)



📍 THE MAP
 👉 Hairline — how far back → temples → crown/vertex → mid-scalp density → see-through in light → shedding rate → "anything else up top?"
Transition to donor — explicit: "Now let's have a close look at the back and sides"
**Send Norwood photo and clarify which stage of hair loss**



👉 Donor (back & sides) — density → thinning here too or holding → this is the bank, no donor no transplant 👉 Additional clinical (itch, flaking, scarring, previous procedure/Turkey, meds — fin/minox/dut, family pattern & how theirs ended up)



After you map the head, you're only halfway. Before you send the density image, you need five more questions in this order:



👉 "Of the hair you've still got up top, do you feel like it's holding steady, or are you still losing it? And the back and sides — how's that holding up?"

👉 "What do you think is driving it — hereditary, who's it come from? Or stress, health stuff, just age?"

👉 "Have you looked into sorting it before — any clinics, Turkey, stuff online? What did they say?" If yes: "What stopped you going ahead at that point?"

`}<strong>👉 4. Why now?</strong>{` "So you've been dealing with this for [use their own number] years — what's got you looking into it now? Why now do you think?"

If they give a surface answer, dig deeper:
"That makes sense. I speak to people about this every day and everyone's different - but what is it specifically about YOUR situation that's made you say enough is enough?"



👉 5. Impact — ask these as three SEPARATE questions, not one:
"Day to day, what are you doing to manage it at the moment — how you're styling it, any products, fibres, caps, that sort of thing?" [Wait for answer]
"And appearance-wise — in photos, or meeting someone the first time — how's it sitting for you?" [Wait for answer]
"Any sensitivity up top — scalp catching the sun, getting tender, anything like that?" [Wait for answer]
`}
      </div>




      {/* Notes */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
          color: COLORS.text, fontWeight: 500, marginBottom: 6,
        }}>
          Notes
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

      </div>

      {/* Override the global #111 placeholder for this textarea so it reads light. */}
      <style>{`
        textarea.discovery-history::placeholder { color: #bbbbbb !important; opacity: 1; }
        @keyframes discoverySpin { to { transform: rotate(360deg); } }
        .always-scroll::-webkit-scrollbar { width: 12px; -webkit-appearance: none; }
        .always-scroll::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 6px; }
        .always-scroll::-webkit-scrollbar-thumb { background: #c4c4c4; border-radius: 6px; border: 2px solid #f1f1f1; }
        .always-scroll::-webkit-scrollbar-thumb:hover { background: #a0a0a0; }
        .always-scroll { scrollbar-width: thin; scrollbar-color: #c4c4c4 #f1f1f1; }
      `}</style>

    </div>
  );
}


function EducationStep({ lead, mmsImages, onNext, repId }: { lead: Lead; mmsImages: { name: string; url: string }[]; onNext: () => void; repId: string | null }) {
  void repId; void onNext;
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);

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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div style={{
        fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
        color: COLORS.coral, marginBottom: 6, textAlign: "center",
      }}>
        Education
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 500, color: COLORS.text, lineHeight: 1.2,
        textAlign: "center", letterSpacing: "-0.01em", marginBottom: 18,
      }}>
        Educate &amp; Show
      </h1>

      {/* Education script — scrollable box */}
      <div className="always-scroll" style={{
        marginTop: 16,
        background: "#ffffff",
        borderLeft: `2px solid ${COLORS.coral}`,
        borderRadius: "0 8px 8px 0",
        padding: "16px 20px",
        maxHeight: 420,
        overflowY: "scroll",
        fontSize: 14,
        lineHeight: 1.55,
        color: COLORS.text,
        whiteSpace: "pre-wrap",
      }}>


{`🎓 EDUCATION 



KNOWLEDGE CHECK "What do you know about hair transplants?" Start from what they know → fill gaps only → don't lecture



PRODUCT (no price yet)

Grafts from the back → permanent zone → never falls out → planted where you're losing → keeps that DNA → stays & grows, you can cut/wash/style it → your real hair, for life. → Local numbing, no general → same day → home that night



NATURAL VS UN-NATURAL

Everyone's #1 concern: "will people be able to tell?" → hair doesn't grow straight up → it grows at an angle + flows in a direction → good surgeon maps YOUR exact pattern → places every single graft to match that angle + direction → that's the difference between looking "done" vs. completely undetectable → done right, even your barber can't tell."

SEND PHOTOS natural vs unnatural + before/afters → "Have a look at your phone"



DONOR CLOCK (NORWOOD 4+) 

"Think of it like a garden. The thick hair round the back and sides — that's your strong, healthy grass. The thin bit on top — that's bare dirt. A transplant just digs up a little of that strong grass and lays it over the bare dirt. Only thing is — you've only got so much strong grass. You can't just magically grow more. And the bare bit slowly spreads and gets bigger on its own. So no rush at all — right now you've just got the most hair you'll ever have to move around.

UNDERSTANDING

"Why do YOU think a hair transplant would work best for you?"`}
      </div>




      {/* Photo buttons */}
      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <ImgBtn idx={0} label="Before &amp; After 1" />
        <ImgBtn idx={1} label="Before &amp; After 2" />
      </div>
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
      // Only auto-pick when the lead has a clinic_id, or when there's exactly one active partner clinic.
      // Never silently default to "the first clinic in the list" — that mis-assigns leads across clinics.
      const matched = lead.clinic_id ? list.find((c) => c.id === lead.clinic_id) ?? null : null;
      const picked = matched ?? (list.length === 1 ? list[0] : null);
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

      <div style={{
        marginTop: 16,
      }}>
        {/* Walk the price journey */}
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
            Walk the price journey
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.amber, marginBottom: 14 }}>
            exact order — do not skip
          </div>
          <PriceRow num={1}>"The consult includes a full medical assessment, hair design, imaging — all in one appointment."</PriceRow>
          <PriceRow num={2}>"Normally this consult is $395..."</PriceRow>
          <PriceRow num={3}>"...we do have some complimentary spots available sometimes, let me just have a look and see if I can find any free ones"</PriceRow>
          <div className="flex items-start gap-3" style={{ padding: "10px 0", borderBottom: "0.5px solid #f3f3f3" }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: COLORS.coral,
              color: "#fff", fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 2,
            }}>4</div>
            <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7, fontWeight: 700 }}>
              Agree on a time, give 2 options
            </div>
          </div>
          <PriceRow num={5}>"...there is just a $75 deposit to secure your spot, which is fully refunded when you arrive..."</PriceRow>
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
          <div className="flex items-start gap-3" style={{ padding: "10px 0" }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: COLORS.coral,
              color: "#fff", fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 2,
            }}>7</div>
            <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7, fontWeight: 700 }}>
              Ask for their card details if they sound older otherwise send them a link
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
    </div>
  );
}

function FinanceStep({ lead, onComplete }: { lead: Lead; onComplete: () => void }) {
  const autoName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const [form, setForm] = useState({
    name: autoName, dob: "", price: "", citizen: "", earning: "", bankrupt: "", homeowner: "",
  });
  const [result, setResult] = useState<null | { eligible: boolean }>(null);
  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const check = async () => {
    const missing: string[] = [];
    if (form.citizen !== "yes" && form.citizen !== "no") missing.push("Australian citizen or PR");
    if (form.earning !== "yes" && form.earning !== "no") missing.push("Employed and earning $50,000+");
    if (form.bankrupt !== "yes" && form.bankrupt !== "no") missing.push("Bankrupt or in a debt agreement");
    if (missing.length > 0) {
      toast.error(`Please answer: ${missing.join(", ")}`);
      return;
    }
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
        <button
          key={v}
          type="button"
          onClick={(e) => { e.preventDefault(); set(k, v); }}
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

