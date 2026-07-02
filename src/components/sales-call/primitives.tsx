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

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-[10px] ${className}`}
      style={{ background: COLORS.card, border: `0.5px solid ${COLORS.line}` }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
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

export function Label({ children }: { children: React.ReactNode }) {
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
export function Pill({ children, name }: { children: React.ReactNode; name?: boolean; gold?: boolean }) {
  return (
    <span style={{ color: COLORS.text, fontWeight: name ? 500 : 400 }}>
      {children}
    </span>
  );
}

export function Coach({ children }: { children: React.ReactNode }) {
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

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <Label>{title}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function NextBtn({ onClick, gold, label = "I'm ready" }: { onClick: () => void; gold?: boolean; label?: string }) {
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

export function RuleBad({ children }: { children: React.ReactNode }) {
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

export function RuleGood({ children }: { children: React.ReactNode }) {
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
export function StepHeading({ children }: { children: React.ReactNode }) {
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
export function ScriptBody({ children }: { children: React.ReactNode }) {
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
export function CalloutAmber({ title, children }: { title: string; children: React.ReactNode }) {
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
export function CalloutGreen({ title, children }: { title: string; children: React.ReactNode }) {
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

export function CompactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

export function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-1.5">{children}</div></div>;
}

