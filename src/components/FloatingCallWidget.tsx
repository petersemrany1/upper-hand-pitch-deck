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

type Outcome = "no_answer" | "callback_scheduled" | "had_convo_chase_up" | "not_interested" | "booked_deposit_paid" | "dropped";

const OUTCOME_LABELS: Record<Outcome, string> = {
  no_answer: "No Answer",
  callback_scheduled: "Callback Scheduled",
  had_convo_chase_up: "Had Convo — Chase Up",
  not_interested: "Not Interested",
  booked_deposit_paid: "Booked — Deposit Paid",
  dropped: "Dropped",
};

const OUTCOME_DOT: Record<Outcome, string> = {
  no_answer: "#eab308",
  callback_scheduled: "#f59e0b",
  had_convo_chase_up: "#92400e",
  not_interested: "#ef4444",
  booked_deposit_paid: "#22c55e",
  dropped: "#111111",
};

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

// Resolve clinic + lead/contact name for the active call SID. Reads
// call_records joined to clinics and meta_leads. Polls briefly because the
// row is upserted by voice-outbound right around the time the call connects.
function useCallContext(callSid: string | null) {
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (!callSid) {
      setClinicName(null);
      setContactName(null);
      setPhone(null);
      setLeadId(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let gotName = false;
    let gotLeadId = false;
    const fetchCtx = async () => {
      attempts += 1;
      const { data } = await supabase
        .from("call_records")
        .select("phone, clinic_id, lead_id, call_analysis, clinics(clinic_name, owner_name), meta_leads(first_name, last_name)")
        .eq("twilio_call_sid", callSid)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const clinic = (data as { clinics: { clinic_name?: string; owner_name?: string } | null }).clinics;
        const lead = (data as { meta_leads: { first_name?: string | null; last_name?: string | null } | null }).meta_leads;
        if (clinic?.clinic_name) setClinicName(clinic.clinic_name);
        const analysis = data.call_analysis as { contact_name?: string | null } | null;
        const leadName = lead ? [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() : "";
        const name = analysis?.contact_name || leadName || clinic?.owner_name || null;
        if (name) { setContactName(name); gotName = true; }
        if (data.phone) setPhone(data.phone);
        if (data.lead_id) { setLeadId(data.lead_id as string); gotLeadId = true; }
      }
      // Keep polling until we have BOTH a name AND a lead id (or we run out of attempts).
      // The lead_id is what powers the "Open in Sales Call" button — without it, the
      // button never appears even though the row will populate moments later.
      if (!cancelled && (!gotName || !gotLeadId) && attempts < 8) {
        setTimeout(fetchCtx, 800);
      }
    };
    void fetchCtx();
    return () => {
      cancelled = true;
    };
  }, [callSid]);

  return { clinicName, contactName, phone, leadId };
}

export function FloatingCallWidget() {
  const { status, activeCallSid, activeLeadId, activePhone, activeCallStartedAt, activeCallInstanceId, incomingFrom, hangup, sendDtmf, mute } = useTwilioDevice();
  const { clinicName, contactName, phone, leadId } = useCallContext(activeCallSid);
  const navigate = useNavigate();

  // If this is an inbound call, try to match it to a meta_lead so we can offer
  // a one-tap "Open in Sales Call" button (saves the rep ~15s of fumbling).
  const [matchedLead, setMatchedLead] = useState<{
    id: string; first_name: string | null; last_name: string | null;
  } | null>(null);

  // Clear stale matched lead whenever a new call starts (different SID/instance
  // or different dialled phone). Without this, the previous call's name leaks
  // into the new call's button label until the DB lookup catches up.
  useEffect(() => {
    setMatchedLead(null);
  }, [activeCallInstanceId, activeCallSid, activePhone, incomingFrom]);

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

  useEffect(() => {
    const id = activeLeadId || leadId;
    if (!id || matchedLead?.id === id) return;
    let cancelled = false;
    void supabase
      .from("meta_leads")
      .select("id, first_name, last_name")
      .eq("id", id)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (cancelled || !data) return;
          setMatchedLead({ id: data.id, first_name: data.first_name, last_name: data.last_name });
        },
        () => { /* noop */ },
      );
    return () => { cancelled = true; };
  }, [activeLeadId, leadId, matchedLead?.id]);

  // Outbound fallback: if we know the dialled phone but the call_records row
  // hasn't surfaced a lead_id (e.g. the call was placed from a screen that
  // didn't pass leadId, or the row hasn't been upserted yet), match by phone
  // so the "Open in Sales Call" button still appears.
  useEffect(() => {
    const phoneToMatch = phone || activePhone;
    if (leadId || activeLeadId || !phoneToMatch || incomingFrom) return;
    let cancelled = false;
    void findLeadByPhone({ data: { phone: phoneToMatch } }).then((r) => {
      if (cancelled) return;
      if (r.success && r.lead) {
        setMatchedLead({ id: r.lead.id, first_name: r.lead.first_name, last_name: r.lead.last_name });
      }
    }).catch(() => { /* noop */ });
    return () => { cancelled = true; };
  }, [leadId, activeLeadId, phone, activePhone, incomingFrom]);

  const [expanded, setExpanded] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [dtmfTrail, setDtmfTrail] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);
  const [endedSid, setEndedSid] = useState<string | null>(null);
  const [endedFrom, setEndedFrom] = useState<string | null>(null);

  // Draggable position offset from bottom-right corner. Persisted so the
  // rep's chosen spot survives navigation.
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    try {
      const raw = window.localStorage.getItem("call-widget-offset");
      if (raw) return JSON.parse(raw);
    } catch { /* noop */ }
    return { x: 0, y: 0 };
  });
  const dragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, baseX: dragOffset.x, baseY: dragOffset.y, moved: false };
  };
  const onDrag = (e: React.PointerEvent) => {
    const s = dragStateRef.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    s.moved = true;
    const nx = s.baseX - dx;
    const ny = s.baseY - dy;
    const maxX = Math.max(0, window.innerWidth - 80);
    const maxY = Math.max(0, window.innerHeight - 60);
    setDragOffset({ x: Math.max(0, Math.min(maxX, nx)), y: Math.max(0, Math.min(maxY, ny)) });
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    try { window.localStorage.setItem("call-widget-offset", JSON.stringify(dragOffset)); } catch { /* noop */ }
  };

  const draggableStyle: React.CSSProperties = {
    right: `${16 + dragOffset.x}px`,
    bottom: `${16 + dragOffset.y}px`,
    left: "auto",
    touchAction: "none",
  };

  const startedAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const prevStatusRef = useRef(status);
  const prevStatusForEndRef = useRef(status);
  const prevSidRef = useRef<string | null>(null);

  const isActive = status === "connecting" || status === "in-call";

  // Display label hierarchy: contact/lead name → clinic → incoming caller →
  // phone → fallback. Name first so the rep instantly sees who they're talking to.
  const matchedLeadName = matchedLead
    ? [matchedLead.first_name, matchedLead.last_name].filter(Boolean).join(" ").trim() || null
    : null;
  const primaryLabel = contactName || matchedLeadName || clinicName || incomingFrom || phone || activePhone || "Outbound call";
  const secondaryLabel =
    contactName && clinicName ? clinicName : contactName ? (phone || activePhone) : clinicName ? (phone || activePhone) : null;

  // Track call timer from the canonical Twilio accept timestamp, keyed by a
  // unique call instance. Clearing the interval before every branch prevents
  // old intervals from previous calls ever writing stale minutes back in.
  useEffect(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (status === "connecting") {
      startedAtRef.current = null;
      setSeconds(0);
      return;
    }

    if (status === "in-call") {
      startedAtRef.current = activeCallStartedAt ?? Date.now();
      setSeconds(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
      timerIntervalRef.current = window.setInterval(() => {
        if (startedAtRef.current) {
          setSeconds(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
        }
      }, 1000);
      return () => {
        if (timerIntervalRef.current !== null) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }

    startedAtRef.current = null;
    setSeconds(0);
  }, [status, activeCallSid, activeCallStartedAt, activeCallInstanceId]);

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
    const previousStatus = prevStatusForEndRef.current;
    const wasActive = previousStatus === "in-call" || previousStatus === "connecting";
    if (wasActive && !isActive) {
      // Capture sid + from for the outcome prompt before clearing internal state
      const sidForOutcome = prevSidRef.current;
      const fromForOutcome = incomingFrom || activePhone || phone || null;
      setEndedSid(sidForOutcome);
      setEndedFrom(fromForOutcome);
      setShowOutcome(true);

      prevSidRef.current = null;
      startedAtRef.current = null;
      setExpanded(false);
      setShowKeypad(false);
      setMuted(false);
      setHeld(false);
      setDtmfTrail("");
    }
    prevStatusForEndRef.current = status;
  }, [status, isActive, incomingFrom]);

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
        onClick={(e) => {
          // Don't expand if user just dragged
          if (dragStateRef.current) return;
          setExpanded(true);
          // also catch pointerup-after-drag race
          void e;
        }}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="fixed z-[90] flex items-center gap-3 rounded-full px-4 py-2.5 shadow-2xl transition active:scale-95 cursor-grab active:cursor-grabbing"
        style={{ background: "#ffffff", border: "1px solid #ebebeb", ...draggableStyle }}
        aria-label="Expand active call (drag to move)"
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
      className="fixed z-[95] left-4 sm:left-auto sm:w-[360px] rounded-2xl shadow-2xl animate-fade-in"
      style={{ background: "#ffffff", border: "1px solid #ebebeb", ...draggableStyle }}
      role="dialog"
      aria-label="Active call (drag header to move)"
    >
      {/* Header (drag handle) */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: "none" }}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
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

      {/* Open in Sales Call — always visible during an active call so the rep
          can jump to the lead profile in one tap. Falls back to opening the
          sales-call screen with the phone number when no lead match exists yet. */}
      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => {
            const id = activeLeadId || leadId || matchedLead?.id;
            if (id) {
              navigate({ to: "/sales-call", search: { leadId: id } });
            } else {
              // If the async lead lookup hasn't finished yet, pass the live phone
              // so the Sales Call route can resolve the exact lead itself.
              navigate({ to: "/sales-call", search: { phone: phone || activePhone || incomingFrom || undefined } });
            }
          }}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-500 active:scale-95 transition"
        >
          {(activeLeadId || leadId || matchedLead) ? (
            <>Open {contactName || [matchedLead?.first_name, matchedLead?.last_name].filter(Boolean).join(" ") || "lead"} in Sales Call</>
          ) : (
            <>Open Sales Call</>
          )}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

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
  const [pending, setPending] = useState<Outcome | null>(null);

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
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        let attached = false;
        if (from) {
          const fromDigits = from.replace(/[^0-9]/g, "");
          const tail = fromDigits.slice(-9);
          if (tail.length >= 6) {
            const { data: recent } = await supabase
              .from("call_records")
              .select("id")
              .ilike("phone", `%${tail}%`)
              .gte("called_at", fiveMinAgo)
              .order("called_at", { ascending: false })
              .limit(1);
            if (recent && recent.length > 0) {
              const { error: upErr } = await supabase
                .from("call_records")
                .update({
                  status: "completed",
                  duration: durationSec,
                  call_analysis: { outcome, notes, from, loggedAt: new Date().toISOString() },
                })
                .eq("id", recent[0].id);
              if (upErr) throw upErr;
              attached = true;
            }
          }
        }

        if (!attached) {
          const { data: sessionData } = await supabase.auth.getUser();
          const userEmail = sessionData.user?.email;
          let repId: string | null = null;
          if (userEmail) {
            const { data: rep } = await supabase
              .from("sales_reps")
              .select("id")
              .eq("email", userEmail.toLowerCase().trim())
              .maybeSingle();
            repId = rep?.id ?? null;
          }
          console.log("[CallOutcomePrompt] fallback insert", { from, repId });
          const { error } = await supabase.from("call_records").insert({
            status: "completed",
            duration: durationSec,
            phone: from || null,
            rep_id: repId,
            direction: "outbound",
            call_analysis: { outcome, notes, from, loggedAt: new Date().toISOString() },
          });
          if (error) throw error;
        }
      }
      toast.success("Call logged");
      onClose();
    } catch (e) {
      console.error("Failed to log call outcome", e);
      toast.error("Could not log call");
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const outcomes: Outcome[] = [
    "no_answer",
    "callback_scheduled",
    "had_convo_chase_up",
    "not_interested",
    "booked_deposit_paid",
    "dropped",
  ];

  return (
    <div
      className="fixed z-[95] bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] rounded-2xl shadow-2xl animate-fade-in p-4"
      style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
      role="dialog"
      aria-label="Log call outcome"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
            Log call outcome
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#111111] hover:bg-[#f9f9f9]"
          aria-label="Skip logging"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="text-sm text-[#111111] truncate">{from || "Call ended"}</div>
      <div className="font-mono text-xs text-[#666] mb-3">Duration {formatDuration(durationSec)}</div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Quick notes (optional)…"
        rows={2}
        className="w-full rounded-md px-3 py-2 text-sm text-[#111111] placeholder:text-[#999] mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
      />

      <div className="flex flex-col gap-2">
        {outcomes.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPending(o)}
            disabled={saving}
            className="flex items-center gap-2.5 h-10 px-3 rounded-md text-sm font-semibold text-[#111111] active:scale-[0.98] transition disabled:opacity-50 text-left"
            style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
          >
            <span
              className="inline-block h-3 w-3 rounded-full flex-shrink-0"
              style={{ background: OUTCOME_DOT[o] }}
            />
            <span className="uppercase tracking-wide text-[12px]">{OUTCOME_LABELS[o]}</span>
          </button>
        ))}
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => !saving && setPending(null)}
          role="dialog"
          aria-label="Confirm outcome"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
            style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: OUTCOME_DOT[pending] }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666]">
                Confirm outcome
              </span>
            </div>
            <div className="text-base font-semibold text-[#111111] mb-1">
              {OUTCOME_LABELS[pending]}
            </div>
            <div className="text-sm text-[#666] mb-4">
              Are you sure? Tap outside to pick a different outcome.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={saving}
                className="flex-1 h-10 rounded-md text-sm font-semibold text-[#111111] disabled:opacity-50"
                style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => save(pending)}
                disabled={saving}
                className="flex-1 h-10 rounded-md text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#111111", border: "1px solid #111111" }}
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
