import { useEffect, useMemo, useRef, useState } from "react";
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Play, Grid3x3, Minus, X, FileText, ArrowRight,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { supabase } from "@/integrations/supabase/client";
import { findLeadByPhone } from "@/utils/sales-call.functions";
import { toast } from "sonner";

// Global floating call widget. Renders nothing unless a call is connecting or
// in progress. Three visual states:
//   - minimised pill (bottom-right)
//   - expanded panel (caller info, mute/hold/keypad/hangup)
//   - keypad overlay inside the expanded panel (DTMF tones)
// After the call ends, prompts the user to log the outcome.

type Outcome = "interested" | "not_interested" | "callback" | "voicemail" | "no_answer";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const KEYPAD: { d: string; sub?: string }[] = [
  { d: "1" }, { d: "2", sub: "ABC" }, { d: "3", sub: "DEF" },
  { d: "4", sub: "GHI" }, { d: "5", sub: "JKL" }, { d: "6", sub: "MNO" },
  { d: "7", sub: "PQRS" }, { d: "8", sub: "TUV" }, { d: "9", sub: "WXYZ" },
  { d: "*" }, { d: "0", sub: "+" }, { d: "#" },
];

// Resolve the clinic + contact name for the active call SID by reading the
// call_records → clinics join. Polls briefly because the row is upserted by
// voice-outbound right around the time the call connects.
function useCallContext(callSid: string | null) {
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!callSid) {
      setClinicName(null);
      setContactName(null);
      setPhone(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const fetchCtx = async () => {
      attempts += 1;
      const { data } = await supabase
        .from("call_records")
        .select("phone, clinic_id, call_analysis, clinics(clinic_name, owner_name)")
        .eq("twilio_call_sid", callSid)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const clinic = (data as { clinics: { clinic_name?: string; owner_name?: string } | null }).clinics;
        if (clinic?.clinic_name) setClinicName(clinic.clinic_name);
        const analysis = data.call_analysis as { contact_name?: string | null } | null;
        const owner = analysis?.contact_name || clinic?.owner_name || null;
        if (owner) setContactName(owner);
        if (data.phone) setPhone(data.phone);
      }
      if (!cancelled && !clinicName && attempts < 5) {
        setTimeout(fetchCtx, 1000);
      }
    };
    void fetchCtx();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callSid]);

  return { clinicName, contactName, phone };
}

export function FloatingCallWidget() {
  const { status, activeCallSid, incomingFrom, hangup, sendDtmf, mute } = useTwilioDevice();
  const { clinicName, contactName, phone } = useCallContext(activeCallSid);
  const navigate = useNavigate();

  // If this is an inbound call, try to match it to a meta_lead so we can offer
  // a one-tap "Open in Sales Call" button (saves the rep ~15s of fumbling).
  const [matchedLead, setMatchedLead] = useState<{
    id: string; first_name: string | null; last_name: string | null;
  } | null>(null);

  useEffect(() => {
    if (!incomingFrom) { setMatchedLead(null); return; }
    let cancelled = false;
    void findLeadByPhone({ data: { phone: incomingFrom } }).then((r) => {
      if (cancelled) return;
      if (r.success && r.lead) {
        setMatchedLead({ id: r.lead.id, first_name: r.lead.first_name, last_name: r.lead.last_name });
      }
    }).catch(() => { /* noop */ });
    return () => { cancelled = true; };
  }, [incomingFrom]);

  const [expanded, setExpanded] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [dtmfTrail, setDtmfTrail] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);
  const [endedSid, setEndedSid] = useState<string | null>(null);
  const [endedFrom, setEndedFrom] = useState<string | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const prevStatusRef = useRef(status);
  const prevSidRef = useRef<string | null>(null);

  const isActive = status === "connecting" || status === "in-call";

  // Display label hierarchy: clinic name → incoming caller → phone → fallback.
  // Issue #10: clinic name must be prominent, not just the phone number.
  const primaryLabel = clinicName || incomingFrom || phone || "Outbound call";
  const secondaryLabel =
    clinicName && contactName ? contactName : clinicName ? phone : null;

  // Track call timer
  useEffect(() => {
    if (status === "in-call") {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      const id = window.setInterval(() => {
        if (startedAtRef.current) {
          setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }
      }, 1000);
      return () => window.clearInterval(id);
    }
    if (status === "connecting") setSeconds(0);
  }, [status]);

  // Auto-expand on first active call
  useEffect(() => {
    if (isActive && prevStatusRef.current !== "in-call" && prevStatusRef.current !== "connecting") {
      setExpanded(true);
    }
    if (activeCallSid) prevSidRef.current = activeCallSid;
    prevStatusRef.current = status;
  }, [status, isActive, activeCallSid]);

  // Toast on state transitions so Peter has audible/visible feedback (#1).
  const toastedRef = useRef<{ connecting?: boolean; connected?: boolean }>({});
  useEffect(() => {
    if (status === "connecting" && !toastedRef.current.connecting) {
      toastedRef.current = { connecting: true };
      toast.loading("Calling your phone…", { id: "call-status" });
    }
    if (status === "in-call" && !toastedRef.current.connected) {
      toastedRef.current.connected = true;
      toast.success("Connected — call in progress", { id: "call-status" });
    }
    if (status !== "connecting" && status !== "in-call") {
      toastedRef.current = {};
      toast.dismiss("call-status");
    }
  }, [status]);

  // Detect end-of-call → reset + prompt outcome
  useEffect(() => {
    const wasActive = prevStatusRef.current === "in-call" || prevStatusRef.current === "connecting";
    if (wasActive && !isActive) {
      const sid = prevSidRef.current;
      const from = incomingFrom;
      setEndedSid(sid);
      setEndedFrom(from);
      setShowOutcome(true);
      // reset internal state
      startedAtRef.current = null;
      setSeconds(0);
      setExpanded(false);
      setShowKeypad(false);
      setMuted(false);
      setHeld(false);
      setDtmfTrail("");
      prevSidRef.current = null;
    }
  }, [isActive, incomingFrom]);

  const handleDigit = (d: string) => {
    sendDtmf(d);
    setDtmfTrail((t) => (t + d).slice(-12));
  };

  const handleHangup = () => {
    hangup();
  };

  const handleMuteToggle = () => {
    const next = !muted;
    mute(next);
    setMuted(next);
  };

  const handleHoldToggle = () => {
    // Twilio browser SDK has no native hold; emulate by muting both directions.
    const next = !held;
    mute(next);
    setHeld(next);
    setMuted(next);
  };

  const statusLabel = useMemo(() => {
    if (status === "connecting") return "Calling your phone…";
    if (status === "in-call") return held ? "On hold" : "Connected — in progress";
    return "";
  }, [status, held]);

  if (!isActive && !showOutcome) return null;

  if (showOutcome) {
    return (
      <CallOutcomePrompt
        callSid={endedSid}
        from={endedFrom}
        durationSec={seconds}
        onClose={() => setShowOutcome(false)}
      />
    );
  }

  // Minimised pill
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-[90] flex items-center gap-3 rounded-full px-4 py-2.5 shadow-2xl transition active:scale-95"
        style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
        aria-label="Expand active call"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm font-semibold text-[#111111] truncate max-w-[180px]">{primaryLabel}</span>
          {secondaryLabel && (
            <span className="text-[10px] truncate max-w-[180px]" style={{ color: "#111111" }}>{secondaryLabel}</span>
          )}
        </div>
        <span className="font-mono text-xs text-emerald-400">{formatDuration(seconds)}</span>
      </button>
    );
  }

  // Expanded panel
  return (
    <div
      className="fixed z-[95] bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] rounded-2xl shadow-2xl animate-fade-in"
      style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
      role="dialog"
      aria-label="Active call"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
            {statusLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#111111] hover:text-[#111111] hover:bg-[#f9f9f9]"
          aria-label="Minimise call"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Caller info */}
      <div className="px-4 pb-3 text-center">
        <div className="text-lg font-bold text-[#111111] truncate">{primaryLabel}</div>
        {secondaryLabel && (
          <div className="text-xs truncate" style={{ color: "#111111" }}>{secondaryLabel}</div>
        )}
        <div className="font-mono text-2xl text-emerald-400 mt-1">{formatDuration(seconds)}</div>
        {dtmfTrail && (
          <div className="mt-1 font-mono text-xs text-[#111111] tracking-widest">{dtmfTrail}</div>
        )}
      </div>

      {/* Keypad */}
      {showKeypad && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          {KEYPAD.map((k) => (
            <button
              key={k.d}
              type="button"
              onClick={() => handleDigit(k.d)}
              className="flex flex-col items-center justify-center h-14 rounded-lg text-[#111111] active:scale-95 transition"
              style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
              aria-label={`Send digit ${k.d}`}
            >
              <span className="text-xl font-semibold leading-none">{k.d}</span>
              {k.sub && <span className="text-[9px] text-[#111111] mt-0.5 tracking-widest">{k.sub}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Action row */}
      <div className="px-4 pb-4 grid grid-cols-4 gap-2">
        <ActionButton
          active={muted}
          onClick={handleMuteToggle}
          icon={muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          label={muted ? "Unmute" : "Mute"}
        />
        <ActionButton
          active={held}
          onClick={handleHoldToggle}
          icon={held ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          label={held ? "Resume" : "Hold"}
        />
        <ActionButton
          active={showKeypad}
          onClick={() => setShowKeypad((v) => !v)}
          icon={<Grid3x3 className="h-5 w-5" />}
          label="Keypad"
        />
        <button
          type="button"
          onClick={handleHangup}
          className="flex flex-col items-center justify-center gap-1 h-16 rounded-lg bg-red-600 text-[#111111] shadow-lg hover:bg-red-500 active:scale-95 transition"
          aria-label="Hang up"
        >
          <PhoneOff className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">End</span>
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  icon, label, onClick, active,
}: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 h-16 rounded-lg text-[#111111] active:scale-95 transition"
      style={{
        background: active ? "#f4522d" : "#f9f9f9",
        border: `1px solid ${active ? "#f4522d" : "#ebebeb"}`,
      }}
      aria-pressed={active}
      aria-label={label}
    >
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  );
}

function CallOutcomePrompt({
  callSid, from, durationSec, onClose,
}: { callSid: string | null; from: string | null; durationSec: number; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  const save = async (outcome: Outcome) => {
    setSaving(true);
    try {
      if (callSid) {
        const { error } = await supabase
          .from("call_records")
          .update({
            status: "completed",
            duration: durationSec,
            call_analysis: { outcome, notes, from, loggedAt: new Date().toISOString() },
          })
          .eq("twilio_call_sid", callSid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("call_records").insert({
          status: "completed",
          duration: durationSec,
          call_analysis: { outcome, notes, from, loggedAt: new Date().toISOString() },
        });
        if (error) throw error;
      }
      toast.success("Call logged");
      onClose();
    } catch (e) {
      console.error("Failed to log call outcome", e);
      toast.error("Could not log call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed z-[95] bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] rounded-2xl shadow-2xl animate-fade-in p-4"
      style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
      role="dialog"
      aria-label="Log call outcome"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-400" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
            Log call outcome
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#111111] hover:text-[#111111] hover:bg-[#f9f9f9]"
          aria-label="Skip logging"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="text-sm text-[#111111] truncate">{from || "Call ended"}</div>
      <div className="font-mono text-xs text-[#111111] mb-3">Duration {formatDuration(durationSec)}</div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Quick notes (optional)…"
        rows={2}
        className="w-full rounded-md px-3 py-2 text-sm text-[#111111] placeholder:text-[#999] mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
      />

      <div className="grid grid-cols-2 gap-2">
        <OutcomeButton onClick={() => save("interested")} disabled={saving} label="Interested" tone="emerald" />
        <OutcomeButton onClick={() => save("callback")} disabled={saving} label="Callback" tone="blue" />
        <OutcomeButton onClick={() => save("voicemail")} disabled={saving} label="Voicemail" tone="zinc" />
        <OutcomeButton onClick={() => save("no_answer")} disabled={saving} label="No answer" tone="zinc" />
        <button
          type="button"
          onClick={() => save("not_interested")}
          disabled={saving}
          className="col-span-2 h-10 rounded-md text-sm font-semibold text-[#111111] active:scale-95 transition disabled:opacity-50"
          style={{ background: "#fef2f2", border: "1px solid #fef2f2" }}
        >
          Not interested
        </button>
      </div>
    </div>
  );
}

function OutcomeButton({
  onClick, disabled, label, tone,
}: { onClick: () => void; disabled: boolean; label: string; tone: "emerald" | "blue" | "zinc" }) {
  const bg = tone === "emerald" ? "#0f3a25" : tone === "blue" ? "#142a4d" : "#f9f9f9";
  const border = tone === "emerald" ? "#1c5a3a" : tone === "blue" ? "#f4522d" : "#ebebeb";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 rounded-md text-sm font-semibold text-[#111111] active:scale-95 transition disabled:opacity-50"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {label}
    </button>
  );
}
