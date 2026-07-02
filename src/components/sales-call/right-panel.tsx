import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import {
  Brain, MessageCircle, Stethoscope, Megaphone, GraduationCap, Sparkles,
  HandshakeIcon, DollarSign, ShieldCheck, Calendar as CalendarIcon,
  Check, AlertTriangle, Send, Search, X, ChevronDown, PhoneCall, RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/hooks/useRealtimeSubscription";
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
  PRACTICE_AGENT_ID,
} from "./logic";
import { Card, Eyebrow, Label, Pill, Coach, Section, NextBtn, RuleBad, RuleGood, StepHeading, ScriptBody, CalloutAmber, CalloutGreen, CompactRow, FormRow } from "./primitives";

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

export function RightPanel({
  active, repId, mmsImages, attemptCounts, firstCallAt, onLocalLeadUpdate, onChangeLead, onPreviousLead, hasPreviousLead,
  onOutcomeRequiredChange, onOutcomePendingChange, onAfterOutcomeApplied, onCallStarted, practiceMode = false,
  pendingOutcomeLeadId, onPendingOutcomeArmed,
}: {
  active: Lead;
  repId: string | null;
  mmsImages: { name: string; url: string }[];
  attemptCounts: Record<string, number>;
  firstCallAt: string | null;
  onLocalLeadUpdate?: (id: string, patch: Partial<Lead>) => void;
  onChangeLead: () => void;
  onPreviousLead: () => void;
  hasPreviousLead: boolean;
  onOutcomeRequiredChange?: (val: boolean) => void;
  onOutcomePendingChange?: (val: boolean) => void;
  onAfterOutcomeApplied?: (wasBooked?: boolean) => void;
  onCallStarted?: () => void;
  practiceMode?: boolean;
  pendingOutcomeLeadId?: string | null;
  onPendingOutcomeArmed?: (leadId: string) => void;
}) {
  // repId is threaded into placeCall so call_records.rep_id is set on insert.
  // In practiceMode, skip Twilio device registration entirely — the practice
  // page uses the ElevenLabs widget instead, so registering Twilio just burns
  // CPU and triggers Chrome's "this tab is using extra resources" warning.
  const { status: deviceStatus, call: placeCall, hangup, sendDtmf, activeLeadId: deviceActiveLeadId } = useTwilioDevice(!practiceMode);

  const inCall = deviceStatus === "in-call" || deviceStatus === "connecting";
  const [showHandoverRequired, setShowHandoverRequired] = useState(false);
  const handoverBlocksNextLead = Boolean(active.deposit_paid_at && !active.handover_sent_at);

  // ElevenLabs practice conversation (only used in practiceMode)
  const practiceConvIdRef = useRef<string | null>(null);
  const practiceStartedAtRef = useRef<number | null>(null);
  const [practiceConnecting, setPracticeConnecting] = useState(false);
  const practiceConversation = useConversation({
    onConnect: (info: unknown) => {
      const id = (info as { conversationId?: string })?.conversationId ?? null;
      if (id) practiceConvIdRef.current = id;
      practiceStartedAtRef.current = Date.now();
      setPracticeConnecting(false);
    },
    onDisconnect: () => {
      const convId = practiceConvIdRef.current;
      const startedAt = practiceStartedAtRef.current;
      practiceConvIdRef.current = null;
      practiceStartedAtRef.current = null;
      setPracticeConnecting(false);
      if (!convId) return;
      const durationSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : undefined;
      // Step 1: enqueue immediately. Cheap insert (<100ms) so it completes
      // even if the rep is closing the tab. The cron at
      // /api/public/hooks/process-practice-recordings drains the queue.
      void enqueuePracticeCallSave({ data: { conversationId: convId, durationSeconds } })
        .catch((e) => console.error("[practice] enqueue failed", e));
      // Step 2: best-effort happy-path save so the rep sees the toast now.
      // If ElevenLabs isn't ready in ~8s, the inline save throws a PENDING
      // error — the cron at /api/public/hooks/process-practice-recordings
      // will pick up the queue row written in step 1 and finish the save.
      void savePracticeCallRecording({ data: { conversationId: convId, durationSeconds } })
        .then(() => toast.success("Practice call recording saved"))
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.startsWith("PENDING")) {
            toast.info("Saving recording in the background — refresh in a minute");
          } else {
            console.error("[practice] save recording failed (cron will retry)", e);
            toast.info("Saving recording in the background — refresh in a minute");
          }
        });
    },
    onError: (err) => {
      console.error("[practice] elevenlabs error", err);
      toast.error("Practice call error");
      setPracticeConnecting(false);
    },
  });
  const practiceStatus = practiceConversation.status; // 'connected' | 'disconnected'
  const practiceInCall = practiceConnecting || practiceStatus === "connected";

  const startPracticeCall = async () => {
    if (practiceInCall) return;
    setPracticeConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const convId = await practiceConversation.startSession({
        agentId: PRACTICE_AGENT_ID,
        connectionType: "webrtc",
      });
      if (typeof convId === "string") practiceConvIdRef.current = convId;
      // Don't clear practiceConnecting here — startSession resolves as soon
      // as the conv id is issued, but WebRTC is still negotiating. Leave the
      // "Connecting…" label up until onConnect fires (or onError).
    } catch (e) {
      console.error("[practice] startSession failed", e);
      toast.error(e instanceof Error ? e.message : "Failed to start practice call");
      setPracticeConnecting(false);
    }
  };

  const endPracticeCall = async () => {
    try { await practiceConversation.endSession(); } catch (e) { console.error("[practice] endSession failed", e); }
  };

  const [callTimer, setCallTimer] = useState(0);

  // Forced-outcome modal: only arm it from a real call attempt made for the
  // currently selected lead. Do NOT hydrate old per-lead sessionStorage gates:
  // they made previously-called leads pop the modal before a fresh dial.
  const gateStorageKey = (id: string) => `salescall.gate.${id}`;
  const clearStoredGate = (id: string) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(gateStorageKey(id));
    window.sessionStorage.removeItem(`htg.outcomeGate.${id}`);
  };
  const [outcomeRequired, setOutcomeRequired] = useState(false);
  const [callDurationAtHangup, setCallDurationAtHangup] = useState(0);
  const [outcomePending, setOutcomePending] = useState(false);

  // Selecting/browsing a lead should never inherit an old outcome gate. The
  // gate is re-armed below only when this panel starts or observes a live call
  // for this exact lead.
  useEffect(() => {
    // If parent is snapping us back to a lead that still owes an outcome,
    // preserve the gate so the modal can open instead of being wiped here.
    if (pendingOutcomeLeadId && pendingOutcomeLeadId === active.id) {
      return;
    }
    setOutcomePending(false);
    setOutcomeRequired(false);
    setCallDurationAtHangup(0);
    setOutcomeView("menu");
    wasInCallRef.current = false;
    callAttemptLeadIdRef.current = null;
    onOutcomeRequiredChange?.(false);
    onOutcomePendingChange?.(false);
    clearStoredGate(active.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  // NOTE: we intentionally do NOT auto-open the forced-outcome modal when
  // pendingOutcomeLeadId matches the active lead. The rep must be free to
  // double-dial (call → no answer → hangup → call again) without a modal
  // popping every time the call ends. The modal only opens when the rep
  // explicitly clicks "Next Lead" while an outcome is still pending
  // (see the Next Lead handler below).


  // Mirror outcomePending up to the parent so jump-to-lead shortcuts
  // (missed-call popup, ?leadId= deeplink, callbacks list) can also gate.
  useEffect(() => {
    onOutcomePendingChange?.(outcomePending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomePending]);
  useEffect(() => {
    onOutcomeRequiredChange?.(outcomeRequired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomeRequired]);

  // Purge old stored gates from earlier builds so a refresh cannot resurrect
  // a stale "How did that go?" modal for already-called leads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    Object.keys(window.sessionStorage).forEach((key) => {
      if (key.startsWith("salescall.gate.") || key.startsWith("htg.outcomeGate.")) {
        window.sessionStorage.removeItem(key);
      }
    });
  }, []);
  useEffect(() => {
    if (!leadHasBookedSale(active)) return;
    setOutcomePending(false);
    setOutcomeRequired(false);
    onOutcomePendingChange?.(false);
    onOutcomeRequiredChange?.(false);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(gateStorageKey(active.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id, active.status, active.booking_date, active.booking_time, (active as { deposit_paid_at?: string | null }).deposit_paid_at, (active as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id]);

  const wasInCallRef = useRef(false);
  const callAttemptLeadIdRef = useRef<string | null>(null);
  const [outcomeView, setOutcomeView] = useState<"menu" | "callback" | "drop">("menu");
  const [outcomeCallbackDate, setOutcomeCallbackDate] = useState("");
  const [outcomeCallbackTime, setOutcomeCallbackTime] = useState("");
  const [outcomeBusy, setOutcomeBusy] = useState(false);

  const [condensingNotes, setCondensingNotes] = useState(false);
  const [comprehensiveUpdate, setComprehensiveUpdate] = useState<string | null>(null);
  const [generatingUpdate, setGeneratingUpdate] = useState(false);
  const [openObjection, setOpenObjection] = useState<string | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [panelClinics, setPanelClinics] = useState<Clinic[]>([]);
  const [panelClinic, setPanelClinic] = useState<Clinic | null>(null);
  const [panelDoctor, setPanelDoctor] = useState<PartnerDoctor | null>(null);

  // Doctor selling-points (AI-summarised on demand, cached per doctor)
  const [showSellingPoints, setShowSellingPoints] = useState(false);
  const [sellingPoints, setSellingPoints] = useState<string[] | null>(null);
  const [loadingSellingPoints, setLoadingSellingPoints] = useState(false);
  const [sellingPointsForDoctorId, setSellingPointsForDoctorId] = useState<string | null>(null);

  // Callback scheduling
  
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [savingCallback, setSavingCallback] = useState(false);

  // Send a photo panel
  const [showPhoto, setShowPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ label: string; url: string } | null>(null);
  const [sendingPhoto, setSendingPhoto] = useState(false);

  // SMS panel
  const [showSms, setShowSms] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingDepositLink, setSendingDepositLink] = useState(false);
  const [confirmDepositOpen, setConfirmDepositOpen] = useState(false);
  const [chargeCardOpen, setChargeCardOpen] = useState(false);
  const [smsHistory, setSmsHistory] = useState<{ body: string; sent_at: string | null; created_at: string; direction: string }[]>([]);

  // Live deposit-payment indicator (driven by Stripe webhook → meta_leads update)
  // NOTE: never auto-changes lead status — only mirrors payment receipt.
  const [paymentReceivedAt, setPaymentReceivedAt] = useState<string | null>(
    (active as { deposit_paid_at?: string | null }).deposit_paid_at ?? null,
  );
  const [paymentAmount, setPaymentAmount] = useState<number | null>(
    (active as { deposit_amount?: number | null }).deposit_amount ?? null,
  );
  useEffect(() => {
    setPaymentReceivedAt((active as { deposit_paid_at?: string | null }).deposit_paid_at ?? null);
    setPaymentAmount((active as { deposit_amount?: number | null }).deposit_amount ?? null);
    return subscribeRealtime(
      { table: "meta_leads", event: "UPDATE", filter: `id=eq.${active.id}` },
      (payload) => {
        const row = payload.new as { deposit_paid_at?: string | null; deposit_amount?: number | null };
        if (row.deposit_paid_at) {
          setPaymentReceivedAt((prev) => {
            if (!prev) toast.success(`💳 Payment received — $${row.deposit_amount ?? 75}`);
            return row.deposit_paid_at ?? prev;
          });
          setPaymentAmount(row.deposit_amount ?? null);
        }
      },
    );
  }, [active.id]);




  // Customer journey modal
  const [showJourney, setShowJourney] = useState(false);
  const [journeyCalls, setJourneyCalls] = useState<{
    id: string; called_at: string; direction: string; status: string | null;
    duration: number | null; outcome: string | null;
    call_analysis: { summary?: string; notes?: string; patient_summary?: string; transcript?: string } | null;
  }[]>([]);
  const [loadingJourney, setLoadingJourney] = useState(false);

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
     
  }, [active.id]);

  // Load call history for this lead (for the customer journey view)
  useEffect(() => {
    setLoadingJourney(true);
    void (async () => {
      const { data } = await supabase
        .from("call_records")
        .select("id, called_at, direction, status, duration, outcome, call_analysis")
        .eq("lead_id", active.id)
        .order("called_at", { ascending: true })
        .limit(50);
      setJourneyCalls((data ?? []) as typeof journeyCalls);
      setLoadingJourney(false);
    })();
     
  }, [active.id]);

  const loadDoctorForClinic = useCallback(async (clinicId: string | null) => {
    if (!clinicId) { setPanelDoctor(null); return; }
    const { data: docs } = await supabase
      .from("partner_doctors")
      .select("id, clinic_id, name, title, years_experience, specialties, what_makes_them_different, natural_results_approach, advanced_cases, talking_points, aftercare_included")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("created_at")
      .limit(1);
    setPanelDoctor(((docs ?? [])[0] as PartnerDoctor) ?? null);
  }, []);

  const handleSelectPanelClinic = useCallback((clinicId: string) => {
    const next = panelClinics.find((c) => c.id === clinicId) ?? null;
    setPanelClinic(next);
    // Reset selling points so they regenerate for the new clinic's doctor
    setSellingPoints(null);
    setSellingPointsForDoctorId(null);
    setShowSellingPoints(false);
    void loadDoctorForClinic(next?.id ?? null);
  }, [panelClinics, loadDoctorForClinic]);

  useEffect(() => {
    void (async () => {
      const { data: clinics } = await supabase
        .from("partner_clinics")
        .select("id, clinic_name, address, city, state, consult_price_original, consult_price_deposit, parking_info, nearby_landmarks")
        .eq("is_active", true)
        .order("clinic_name");
      const list = (clinics ?? []) as Clinic[];
      setPanelClinics(list);
      // Only auto-pick when the lead has a clinic_id, or when there's exactly one active partner clinic.
      // The rep can still switch clinics via the dropdown — but we won't silently choose one.
      const matched = active.clinic_id ? list.find((c) => c.id === active.clinic_id) ?? null : null;
      const picked = matched;
      setPanelClinic(picked);
      await loadDoctorForClinic(picked?.id ?? null);
    })();
  }, [active.id, active.clinic_id, loadDoctorForClinic]);



  // Run the timer only when actually connected.
  // We mirror callTimer into a ref so the disconnect effect always reads
  // the latest duration, not a stale closure value.
  const callTimerRef = useRef(0);
  useEffect(() => { callTimerRef.current = callTimer; }, [callTimer]);

  // Fire onCallStarted exactly once per call: when device transitions into
  // "connecting" (i.e. a new call is being placed). This catches every dial,
  // including double-dials, regardless of which button started the call.
  const prevDeviceStatusRef = useRef(deviceStatus);
  useEffect(() => {
    const prev = prevDeviceStatusRef.current;
    const belongsToActiveLead = deviceActiveLeadId === active.id || callAttemptLeadIdRef.current === active.id;
    if (deviceStatus === "connecting" && prev !== "connecting" && prev !== "in-call" && belongsToActiveLead) {
      callAttemptLeadIdRef.current = active.id;
      onCallStarted?.();
      // Mark that a dial happened — even if the call never connects, the rep
      // must log an outcome (e.g. No Answer) before moving to the next lead.
      wasInCallRef.current = true;
    }
    prevDeviceStatusRef.current = deviceStatus;
  }, [active.id, deviceActiveLeadId, deviceStatus, onCallStarted]);

  useEffect(() => {
    if (deviceStatus !== "in-call") return;
    if (deviceActiveLeadId !== active.id && callAttemptLeadIdRef.current !== active.id) return;
    callAttemptLeadIdRef.current = active.id;
    // Any time we reach in-call (outbound OR inbound answered), mark the
    // outcome as pending so the rep can't slip past it without logging.
    // The parent-level "snap back to this lead" arming only happens AFTER
    // the call ends (see hangup effect below) — otherwise the forced-outcome
    // modal would pop the instant the dial starts.
    wasInCallRef.current = true;
    setOutcomePending(true);
    const i = setInterval(() => setCallTimer((t) => {
      const next = t + 1;
      callTimerRef.current = next;
      return next;
    }), 1000);
    return () => clearInterval(i);
  }, [active.id, deviceActiveLeadId, deviceStatus]);

  // Reset timer when the call ends. Capture the duration so the manual
  // "Next Lead" button can require an outcome if a call was just completed.
  useEffect(() => {
    if (deviceStatus === "ready" || deviceStatus === "idle" || deviceStatus === "error") {
      if (wasInCallRef.current) {
        wasInCallRef.current = false;
        const armedLeadId = callAttemptLeadIdRef.current;
        if (armedLeadId && !leadHasBookedSale(active)) {
          // Tell the parent which lead still owes an outcome — even if the
          // user has since navigated away from this lead, the parent will
          // snap back here and the modal will auto-open.
          onPendingOutcomeArmed?.(armedLeadId);
          if (armedLeadId === active.id) {
            setCallDurationAtHangup(callTimerRef.current);
            setOutcomePending(true);
          }
        }
      }
      callAttemptLeadIdRef.current = null;
      setCallTimer(0);
      callTimerRef.current = 0;
      setKeypadOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceStatus]);

  // Practice mode: drive the timer from the ElevenLabs conversation status
  useEffect(() => {
    if (!practiceMode) return;
    if (practiceStatus !== "connected") {
      setCallTimer(0);
      return;
    }
    const i = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [practiceMode, practiceStatus]);

  // Practice mode: pagehide / visibilitychange backup. If the rep closes the
  // tab while a practice call is mid-save, sendBeacon enqueues a pending row
  // to the public endpoint so the cron picks it up. Browsers guarantee
  // sendBeacon delivery even during unload, unlike fetch.
  const currentRepIdForBeacon = useCurrentRepId();
  useEffect(() => {
    if (!practiceMode) return;
    const sendBackup = () => {
      const convId = practiceConvIdRef.current;
      if (!convId) return;
      const startedAt = practiceStartedAtRef.current;
      const durationSeconds = startedAt
        ? Math.max(0, Math.round((Date.now() - startedAt) / 1000))
        : undefined;
      try {
        const payload = JSON.stringify({
          conversationId: convId,
          durationSeconds,
          repId: currentRepIdForBeacon ?? undefined,
        });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/public/hooks/enqueue-practice-recording", blob);
      } catch (e) {
        console.error("[practice] sendBeacon backup failed", e);
      }
    };
    const onPageHide = () => sendBackup();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendBackup();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [practiceMode, currentRepIdForBeacon]);

  // Reset open objection when switching leads
  useEffect(() => { setOpenObjection(null); }, [active.id]);

  const callNow = async () => {
    console.log("[callNow] click", { phone: active.phone, leadId: active.id, deviceStatus });
    if (!active.phone) { toast.error("No phone number"); return; }
    // Mark outcome as pending the INSTANT the rep initiates a dial so the
    // local "Next Lead" button gates correctly. Do NOT arm the parent-level
    // pendingOutcomeLeadId here — that would auto-open the forced-outcome
    // modal immediately on dial. The parent is armed only once the call
    // ends (see hangup effect above).
    callAttemptLeadIdRef.current = active.id;
    wasInCallRef.current = true;
    setOutcomePending(true);
    try {
      console.log("[callNow] placing call to", active.phone);
      await placeCall(active.phone, { leadId: active.id, repId: repId ?? "" });
      console.log("[callNow] placeCall returned");
    } catch (e) {
      stopRingback();
      console.error("[callNow] placeCall threw", e);
      callAttemptLeadIdRef.current = null;
      wasInCallRef.current = false;
      setOutcomePending(false);
      setOutcomeRequired(false);
      setCallDurationAtHangup(0);
      toast.error(e instanceof Error ? e.message : "Failed to start call");
    }
  };

  const sendImage = async (url: string) => {
    const r = await sendLeadMms({ data: { leadId: active.id, mediaUrl: url, body: "" } });
    if (r.success) toast.success("Sent"); else toast.error(r.error);
  };

  const day = pipelineDay(active, firstCallAt);
  const attempts = ATTEMPTS_PER_DAY(day);
  const fullName = [active.first_name, active.last_name].filter(Boolean).join(" ") || "Unnamed";
  const objectionResp = openObjection
    ? OBJECTIONS.find((o) => o.q === openObjection) ?? null
    : null;

  const fmtTimer = `${Math.floor(callTimer / 60).toString().padStart(2, "0")}:${(callTimer % 60).toString().padStart(2, "0")}`;
  const KEYPAD_KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Lead navigation — top of right column */}
      {!practiceMode && (
      <div style={{ padding: "12px 18px 0", display: "flex", justifyContent: "flex-end", gap: 12 }}>
        {!handoverBlocksNextLead && (
        <button
          onClick={() => {
            if (inCall) {
              toast.error("End the call first");
              return;
            }
            // Hard gate: if deposit has been paid, rep MUST send the
            // clinic handover email before moving on to the next lead.
            const depositPaidAt = (active as Lead & { deposit_paid_at?: string | null }).deposit_paid_at ?? null;
            const handoverSentAt = (active as Lead & { handover_sent_at?: string | null }).handover_sent_at ?? null;
            if (depositPaidAt && !handoverSentAt) {
              setShowHandoverRequired(true);
              return;
            }
            const alreadyBooked = leadHasBookedSale(active);
            if (alreadyBooked) {
              setOutcomePending(false);
              setOutcomeRequired(false);
              onOutcomeRequiredChange?.(false);
              onChangeLead();
              return;
            }
            if (outcomePending) {
              setOutcomeRequired(true);
              onOutcomeRequiredChange?.(true);
              return;
            }
            if (outcomeRequired) {
              toast.error("Please set a call outcome first");
              return;
            }
            onChangeLead();
          }}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#111",
            background: "transparent",
          }}
        >
          Next Lead →
        </button>
        )}
      </div>
      )}

      {showHandoverRequired && (
        <div
          onClick={() => setShowHandoverRequired(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, padding: 24, maxWidth: 420, width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>
              Send handover to clinic first
            </div>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 20, lineHeight: 1.5 }}>
              This lead has paid their deposit. You need to send the clinic handover email before moving on to the next lead.
            </div>
            <button
              onClick={() => setShowHandoverRequired(false)}
              style={{
                background: "#111", color: "#fff", border: "none",
                padding: "10px 20px", borderRadius: 8, fontWeight: 600,
                fontSize: 14, cursor: "pointer", width: "100%",
              }}
            >
              Got it — I'll send the handover
            </button>
          </div>
        </div>
      )}

      {/* Section 1 — Lead card */}
      <div style={{ padding: "12px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: practiceMode ? 32 : 18, fontWeight: 500, color: "#111", lineHeight: 1.25 }}>
            {fullName}
          </div>
          {!practiceMode && (
          <button
            onClick={() => { setComprehensiveUpdate(null); setShowJourney(true); }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "5px 10px",
              borderRadius: 14,
              background: "#111",
              color: "#fff",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Customer Journey
          </button>
          )}
        </div>
        {(() => {
          const adSetName = (active.ad_set_name ?? "").toLowerCase();
          const location = adSetName.includes("melbourne") ? "MELBOURNE" : adSetName.includes("byron") ? "BYRON" : adSetName.includes("sydney") ? "SYDNEY" : null;
          if (!location) return null;
          const colors = location === "MELBOURNE"
            ? { bg: "#e0f2fe", fg: "#075985" }
            : location === "SYDNEY"
              ? { bg: "#f3e8ff", fg: "#6b21a8" }
              : { bg: "#dcfce7", fg: "#166534" };
          return (
            <div style={{ marginTop: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  background: colors.bg,
                  color: colors.fg,
                  border: `0.5px solid ${colors.fg}33`,
                }}
              >
                {location}
              </span>
            </div>
          );
        })()}
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
            !practiceMode ? <span style={{ fontSize: 12, color: "#111", opacity: 0.5 }}>Funding unknown</span> : null
          )}
          {(() => {
            const meta = statusMeta(active.status, active);
            return (
              <span style={{ position: "relative", display: "inline-block", marginLeft: 8 }}>
                <select
                  value={meta.key}
                  onChange={async (e) => {
                    const key = e.target.value as StatusKey;
                    const prev = active.status;
                    onLocalLeadUpdate?.(active.id, {
                      status: key,
                      ...(key !== "callback_scheduled" ? { callback_scheduled_at: null } : {}),
                    });
                    try {
                      const nowIso = new Date().toISOString();
                      const dbPatch = key !== "callback_scheduled"
                        ? { status: key, callback_scheduled_at: null, updated_at: nowIso }
                        : { status: key, updated_at: nowIso };
                      const { error } = await supabase.from("meta_leads").update(dbPatch).eq("id", active.id);
                      if (error) throw error;
                      toast.success("Status updated");
                    } catch {
                      onLocalLeadUpdate?.(active.id, { status: prev });
                      toast.error("Couldn't update status");
                    }
                  }}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    padding: "3px 22px 3px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    background: `${meta.bg}`,
                    color: meta.color,
                    border: `0.5px solid ${meta.color}33`,
                    cursor: "pointer",
                    outline: "none",
                  }}
                  title="Change status"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>{o.emoji} {o.label}</option>
                  ))}
                </select>
                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 9, color: meta.color }}>▾</span>
              </span>
            );
          })()}
        </div>
        {!practiceMode && (
        <>
        <div style={{ marginTop: 10, fontSize: 12, color: "#111" }}>
          Created {fmtTime(active.created_at)}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#111" }}>
          Day {day} · Attempt {Math.min(attemptCounts[active.id] ?? 0, attempts)} of {attempts} today
        </div>
        </>
        )}
      </div>

      {/* Section 2 — Call control */}
      <div style={{ padding: "0 18px 16px" }}>
        {practiceMode ? (
          !practiceInCall ? (
            <button
              onClick={() => void startPracticeCall()}
              className="w-full rounded-[8px] flex items-center justify-center gap-2"
              style={{
                background: COLORS.coral,
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 500,
                padding: "14px 16px",
              }}
            >
              📞 Start Practice Call
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
                {practiceStatus !== "connected"
                  ? "Connecting…"
                  : `${practiceConversation.isSpeaking ? "🗣 Dave speaking" : "🎧 Listening"} · ⏱ ${fmtTimer}`}
              </div>
              <button
                onClick={() => void endPracticeCall()}
                className="w-full rounded-[8px] mt-2"
                style={{
                  background: COLORS.red,
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 12px",
                }}
              >
                🔴 End Practice Call
              </button>
            </>
          )
        ) : !inCall ? (
          <button
            onClick={() => void callNow()}
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
        {!practiceMode && (
        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.amberDark, fontWeight: 500 }}>
          🚫 Do not leave a voicemail
        </div>
        )}
      </div>

      {/* Section 3 — Clinic info */}
      <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111" }}>
          Clinic
        </div>
        {panelClinics.length > 0 && (
          <select
            value={panelClinic?.id ?? ""}
            onChange={(e) => handleSelectPanelClinic(e.target.value)}
            style={{
              marginTop: 6,
              width: "100%",
              fontSize: 13,
              padding: "6px 8px",
              border: `0.5px solid ${COLORS.line}`,
              borderRadius: 6,
              background: "#fff",
              color: "#111",
              cursor: "pointer",
            }}
          >
            <option value="">No clinic assigned</option>
            {panelClinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clinic_name}{c.city ? ` — ${c.city}` : ""}
              </option>
            ))}
          </select>
        )}
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

      {/* Section 4b — Norwood pricing calculator */}
      <NorwoodPricingCalculator />

      {/* Section 5 — Send a photo */}
      <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>

        <button
          onClick={() => { setShowPhoto((v) => !v); setSelectedPhoto(null); }}
          style={{
            width: "100%", background: showPhoto ? "#111" : "#ffffff",
            color: showPhoto ? "#fff" : "#111",
            border: `1px solid #111`, borderRadius: 8,
            fontSize: 13, fontWeight: 500, padding: "8px 12px", cursor: "pointer",
          }}
        >
          {showPhoto ? "Hide photo options" : "📷 Send a photo"}
        </button>

        {showPhoto && (() => {
          const PHOTO_OPTIONS: { label: string; url: string }[] = [
            { label: "Natural vs Un-natural", url: "https://sfwokpeeffgrkxaptqji.supabase.co/storage/v1/object/public/mms-images/natural-vs-unnatural.jpg" },
            { label: "Before & After 1", url: "https://sfwokpeeffgrkxaptqji.supabase.co/storage/v1/object/public/mms-images/before-after-1.png" },
            { label: "Before & After 2 (Bald)", url: "https://sfwokpeeffgrkxaptqji.supabase.co/storage/v1/object/public/mms-images/before-after-2-bald.png" },
            { label: "Norwood Scale", url: "https://sfwokpeeffgrkxaptqji.supabase.co/storage/v1/object/public/mms-images/norwood-scale.png" },
          ];
          return (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {PHOTO_OPTIONS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSelectedPhoto(p)}
                  className="rounded-[8px]"
                  style={{
                    background: selectedPhoto?.label === p.label ? "#111" : "#eff6ff",
                    color: selectedPhoto?.label === p.label ? "#fff" : "#2563eb",
                    border: selectedPhoto?.label === p.label ? "1px solid #111" : `0.5px solid #bfdbfe`,
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "10px 8px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}

              {selectedPhoto && (
                <div style={{ marginTop: 4, padding: 10, background: "#fafaf9", border: `0.5px solid ${COLORS.line}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>Preview</div>
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.label}
                    style={{ width: "100%", borderRadius: 6, display: "block", marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={async () => {
                        setSendingPhoto(true);
                        try { await sendImage(selectedPhoto.url); } finally { setSendingPhoto(false); }
                      }}
                      disabled={sendingPhoto}
                      style={{
                        flex: 1, background: "#111", color: "#fff",
                        border: "1px solid #111", borderRadius: 6,
                        fontSize: 12, fontWeight: 500, padding: "8px 10px",
                        cursor: sendingPhoto ? "not-allowed" : "pointer",
                        opacity: sendingPhoto ? 0.6 : 1,
                      }}
                    >
                      {sendingPhoto ? "Sending…" : "Send MMS"}
                    </button>
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      style={{
                        background: "#fff", color: "#111",
                        border: `0.5px solid ${COLORS.line}`, borderRadius: 6,
                        fontSize: 12, padding: "8px 10px", cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Section 5b — Send standalone $75 deposit link */}
      {paymentReceivedAt ? (
        <div style={{ padding: "14px 18px 0" }}>
          <div style={{
            background: "#dcfce7", border: "1px solid #10b981", borderRadius: 8,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
            fontSize: 13, fontWeight: 600, color: "#065f46",
          }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span>Payment received — ${paymentAmount ?? 75} · {new Date(paymentReceivedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          </div>
        </div>
      ) : null}

      <div style={{ padding: "14px 18px 0", display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            if (!active.phone) { toast.error("No phone number on this lead"); return; }
            if (!panelClinic) { toast.error("Select a clinic before sending the payment link"); return; }
            if (sendingDepositLink) return;
            setConfirmDepositOpen(true);
          }}
          disabled={sendingDepositLink || !active.phone || !panelClinic}
          style={{
            flex: 1, background: COLORS.coral, color: "#fff",
            border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 600, padding: "8px 12px",
            cursor: sendingDepositLink || !active.phone || !panelClinic ? "not-allowed" : "pointer",
            opacity: sendingDepositLink || !active.phone || !panelClinic ? 0.6 : 1,
            boxShadow: `0 4px 14px ${COLORS.coral}55`,
          }}
        >
          {sendingDepositLink ? "Sending…" : "💳 Send payment link"}
        </button>
        <button
          onClick={() => setChargeCardOpen(true)}
          style={{
            flex: 1, background: "#ffffff", color: "#111",
            border: `1px solid #111`, borderRadius: 8,
            fontSize: 13, fontWeight: 500, padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          📞 Charge card over the phone
        </button>
      </div>

      <ChargeCardOverPhoneModal
        open={chargeCardOpen}
        onClose={() => setChargeCardOpen(false)}
        defaultAmount={Number(panelClinic?.consult_price_deposit ?? 75)}
        patientName={[active.first_name, active.last_name].filter(Boolean).join(" ") || "Patient"}
        leadId={active.id}
        onSuccess={async (payment) => {
          await supabase
            .from("clinic_appointments")
            .update({
              stripe_payment_intent_id: payment.paymentIntentId,
              deposit_amount: payment.amount,
              refund_status: null,
              refund_processed_at: null,
              stripe_refund_id: null,
            })
            .eq("lead_id", active.id);
        }}
      />


      {/* Branded confirm modal for deposit-link send */}
      {confirmDepositOpen && (
        <div
          onClick={() => !sendingDepositLink && setConfirmDepositOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(17,17,17,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10000, padding: 16, backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, maxWidth: 420, width: "100%",
              overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
              border: `0.5px solid ${COLORS.line}`,
            }}
          >
            <div style={{ padding: "22px 22px 6px" }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "#fff5f2", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 22, marginBottom: 14,
                border: `1px solid ${COLORS.coral}33`,
              }}>💳</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#111", letterSpacing: -0.2 }}>
                Send $75 deposit link?
              </div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 6, lineHeight: 1.5 }}>
                A Stripe payment link will be sent via SMS to{" "}
                <strong style={{ color: "#111" }}>{active.first_name ?? "this lead"}</strong>{" "}
                at <strong style={{ color: "#111" }}>{active.phone}</strong>.
              </div>
            </div>
            <div style={{
              display: "flex", gap: 8, padding: "16px 22px 18px",
            }}>
              <button
                onClick={() => setConfirmDepositOpen(false)}
                disabled={sendingDepositLink}
                style={{
                  flex: 1, background: "#fff", color: "#111",
                  border: `1px solid ${COLORS.line}`, borderRadius: 8,
                  fontSize: 13, fontWeight: 500, padding: "10px 12px",
                  cursor: sendingDepositLink ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (sendingDepositLink) return;
                  setSendingDepositLink(true);
                  const r = await sendStandaloneDepositSms({
                    data: {
                      leadId: active.id,
                      firstName: active.first_name ?? "there",
                      phone: active.phone!,
                      clinicId: panelClinic?.id,
                      doctorName: panelDoctor?.name,
                    },
                  });
                  setSendingDepositLink(false);
                  setConfirmDepositOpen(false);
                  if (r.success) {
                    toast.success("$75 deposit link sent via SMS ✓");
                    window.dispatchEvent(new CustomEvent("lead-payment-link-sent", { detail: { leadId: active.id } }));
                    setSmsHistory((prev) => [...prev, {
                      body: `Deposit link sent: ${r.stripeUrl}`,
                      sent_at: new Date().toISOString(),
                      created_at: new Date().toISOString(),
                      direction: "outbound",
                    }]);
                  } else {
                    toast.error(r.error || "Failed to send deposit link");
                  }
                }}
                disabled={sendingDepositLink}
                style={{
                  flex: 1, background: COLORS.coral, color: "#fff",
                  border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, padding: "10px 12px",
                  cursor: sendingDepositLink ? "not-allowed" : "pointer",
                  opacity: sendingDepositLink ? 0.7 : 1,
                  boxShadow: `0 4px 14px ${COLORS.coral}55`,
                }}
              >
                {sendingDepositLink ? "Sending…" : "Yes, send link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 6 — SMS */}
      <div style={{ padding: "14px 18px 96px", borderTop: `0.5px solid ${COLORS.line}` }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowSms((v) => !v)}
            style={{
              flex: 1, background: showSms ? "#111" : "#ffffff", color: showSms ? "#fff" : "#111",
              border: `1px solid #111`, borderRadius: 8,
              fontSize: 13, fontWeight: 600, padding: "8px 12px", cursor: "pointer",
            }}
          >
            💬 {showSms ? "Hide SMS" : `Quick SMS ${active.first_name ?? ""}`.trim()}
          </button>
          <button
            onClick={async () => {
              const phone = active.phone;
              if (!phone) { toast.error("No phone number on this lead"); return; }
              try {
                const digits = phone.replace(/\D/g, "").slice(-9);
                const { data } = await supabase
                  .from("sms_threads")
                  .select("id, phone")
                  .order("last_message_at", { ascending: false })
                  .limit(200);
                const match = (data ?? []).find((t) => (t.phone ?? "").replace(/\D/g, "").endsWith(digits));
                if (match?.id) setMessengerThread(match.id);
                else setMessengerThread(null);
              } catch { setMessengerThread(null); }
              openMessenger();
            }}
            title="Open full SMS inbox"
            style={{
              background: "#ffffff", color: "#111",
              border: `1px solid ${COLORS.line}`, borderRadius: 8,
              fontSize: 13, fontWeight: 500, padding: "8px 12px", cursor: "pointer",
            }}
          >
            📱 Inbox
          </button>
        </div>
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

      {/* Customer Journey modal */}
      {showJourney && (
        <div
          onClick={() => setShowJourney(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, maxWidth: 720, width: "100%",
              maxHeight: "88vh", display: "flex", flexDirection: "column",
              overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{
              padding: "14px 18px", borderBottom: "1px solid #eee",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
                  {fullName} — Journey
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
                  Quick scan view
                </div>
              </div>
              <button
                onClick={() => setShowJourney(false)}
                style={{ background: "transparent", border: "none", fontSize: 22, color: "#666", cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0, padding: "14px 18px", color: "#111" }}>
              {/* Snapshot chips */}
              {(() => {
                const chips: { label: string; bg: string; fg: string }[] = [];
                chips.push({ label: `● ${active.status || "new"}`, bg: "#eef2ff", fg: "#3730a3" });
                if (active.funding_preference) chips.push({ label: `💰 ${active.funding_preference}`, bg: "#ecfdf5", fg: "#065f46" });
                if (active.booking_date) chips.push({ label: `📅 ${active.booking_date}${active.booking_time ? " " + active.booking_time : ""}`, bg: "#fef3c7", fg: "#92400e" });
                if (active.callback_scheduled_at) chips.push({ label: `⏰ ${fmtTime(active.callback_scheduled_at)}`, bg: "#fee2e2", fg: "#991b1b" });
                const callCount = journeyCalls.length;
                const smsCount = smsHistory.length;
                if (callCount) chips.push({ label: `📞 ${callCount} call${callCount === 1 ? "" : "s"}`, bg: "#f1f5f9", fg: "#334155" });
                if (smsCount) chips.push({ label: `💬 ${smsCount} SMS`, bg: "#f1f5f9", fg: "#334155" });
                chips.push({ label: `🆕 ${fmtTime(active.created_at)}`, bg: "#f9fafb", fg: "#6b7280" });
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {chips.map((c, i) => (
                      <span key={i} style={{
                        fontSize: 11, fontWeight: 600, padding: "4px 8px",
                        borderRadius: 999, background: c.bg, color: c.fg, whiteSpace: "nowrap",
                      }}>{c.label}</span>
                    ))}
                  </div>
                );
              })()}

              {/* Comprehensive Update — AI recap of everything */}
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  disabled={generatingUpdate}
                  onClick={async () => {
                    setGeneratingUpdate(true);
                    setComprehensiveUpdate(null);
                    try {
                      // invoke() attaches the signed-in user's JWT so the
                      // function's sales-role guard can authorise the caller.
                      const { data: j, error: invErr } = await supabase.functions.invoke(
                        "comprehensive-lead-update",
                        { body: { leadId: active.id } },
                      );
                      if (invErr || !(j as { summary?: string } | null)?.summary) {
                        throw new Error((j as { error?: string } | null)?.error || invErr?.message || "Failed");
                      }
                      setComprehensiveUpdate((j as { summary: string }).summary);
                    } catch (e) {
                      toast.error(`Couldn't generate update: ${e instanceof Error ? e.message : "unknown"}`);
                    } finally {
                      setGeneratingUpdate(false);
                    }
                  }}
                  style={{
                    width: "100%",
                    fontSize: 13, fontWeight: 600,
                    color: "#fff",
                    background: generatingUpdate ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none", borderRadius: 8,
                    padding: "10px 14px",
                    cursor: generatingUpdate ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {generatingUpdate ? "✨ Generating recap…" : comprehensiveUpdate ? "✨ Regenerate Comprehensive Update" : "✨ Comprehensive Update"}
                </button>
                {comprehensiveUpdate && (
                  <div style={{
                    marginTop: 10, padding: "12px 14px",
                    background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8,
                    fontSize: 13, lineHeight: 1.55, color: "#1f2937",
                    whiteSpace: "pre-wrap", maxHeight: 360, overflowY: "auto",
                  }}>
                    {comprehensiveUpdate}
                  </div>
                )}
              </div>


              {active.call_notes && active.call_notes.trim() && (
                <details open={active.call_notes.length < 220} style={{ marginBottom: 14 }}>
                  <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>📝 Your notes</span>
                    {active.call_notes.length > 350 && (
                      <button
                        type="button"
                        disabled={condensingNotes}
                        onClick={async (e) => {
                          e.preventDefault();
                          setCondensingNotes(true);
                          try {
                            // invoke() attaches the signed-in user's JWT so the
                            // function's sales-role guard can authorise the caller.
                            const { data: j, error: invErr } = await supabase.functions.invoke(
                              "condense-notes",
                              { body: { leadId: active.id, notes: active.call_notes } },
                            );
                            if (invErr || !(j as { condensed?: string } | null)?.condensed) {
                              throw new Error((j as { error?: string } | null)?.error || invErr?.message || "Failed");
                            }
                            onLocalLeadUpdate?.(active.id, { call_notes: (j as { condensed: string }).condensed });
                            toast.success("Notes condensed");
                          } catch (e) {
                            toast.error(`Couldn't condense: ${e instanceof Error ? e.message : "unknown"}`);
                          } finally {
                            setCondensingNotes(false);
                          }
                        }}
                        style={{
                          fontSize: 10, fontWeight: 500, color: "#1d4ed8",
                          background: "#eff6ff", border: "1px solid #bfdbfe",
                          borderRadius: 6, padding: "2px 6px",
                          cursor: condensingNotes ? "wait" : "pointer",
                          opacity: condensingNotes ? 0.6 : 1,
                        }}
                      >
                        {condensingNotes ? "…" : "✨ Condense"}
                      </button>
                    )}
                  </summary>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap", padding: 10, background: "#fffbe6", borderRadius: 6, border: "1px solid #f0e4a3", lineHeight: 1.5 }}>
                    {active.call_notes}
                  </div>
                </details>
              )}

              {/* Timeline */}
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", marginBottom: 8 }}>
                Timeline (newest first)
              </div>
              {loadingJourney ? (
                <div style={{ fontSize: 13, color: "#666" }}>Loading…</div>
              ) : (() => {
                type Item = { ts: string; node: React.ReactNode };
                const items: Item[] = [];
                journeyCalls.forEach((c) => {
                  const transcript = (c.call_analysis?.transcript || "").trim();
                  const rawSummary = (c.call_analysis?.patient_summary || c.call_analysis?.summary || c.call_analysis?.notes || "").trim();
                  const dur = typeof c.duration === "number" ? c.duration : 0;
                  const outcomeRaw = (c.outcome || "").toLowerCase();
                  const outcomeVoicemail = /voicemail|no[_\s-]?answer|missed|no answer/.test(outcomeRaw);
                  const transcriptVoicemail = dur > 0 && dur <= 10 && /unable to (answer|come)|leave (a |your )?message|voicemail|you've called/i.test(transcript);
                  const inbound = c.direction === "inbound";
                  // Only treat outbound short calls (≤10s) as voicemail; never grey out inbound calls based on duration alone.
                  const looksLikeVoicemail = outcomeVoicemail || transcriptVoicemail || (!inbound && dur > 0 && dur <= 10);
                  const isPlaceholder = /too brief to capture|don'?t have enough information|not enough information/i.test(rawSummary);
                  let shortSummary = "";
                  if (!looksLikeVoicemail && rawSummary && !isPlaceholder) {
                    const firstSentence = rawSummary.split(/(?<=[.!?])\s/)[0];
                    shortSummary = firstSentence.length > 160 ? firstSentence.slice(0, 160).trimEnd() + "…" : firstSentence;
                  }
                  const fullDetail = looksLikeVoicemail ? "" : (rawSummary || transcript);
                  const accent = looksLikeVoicemail ? "#d1d5db" : inbound ? "#22c55e" : "#3b82f6";
                  const icon = looksLikeVoicemail ? "📭" : inbound ? "📞" : "📱";
                  const label = looksLikeVoicemail ? "Voicemail / no answer" : (c.outcome || (inbound ? "Inbound call" : "Outbound call"));
                  const durStr = dur > 0 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : "";
                  const bg = looksLikeVoicemail ? "#f9fafb" : "#fafafa";
                  const labelColor = looksLikeVoicemail ? "#9ca3af" : "#111";
                  const timeColor = looksLikeVoicemail ? "#b0b6c0" : "#666";
                  const itemOpacity = looksLikeVoicemail ? 0.7 : 1;
                  items.push({
                    ts: c.called_at,
                    node: (
                      <div key={`c-${c.id}`} style={{ display: "flex", gap: 8, padding: "8px 10px", borderLeft: `3px solid ${accent}`, background: bg, borderRadius: 4, marginBottom: 6, alignItems: "flex-start", opacity: itemOpacity }}>
                        <div style={{ fontSize: 14, lineHeight: "18px", filter: looksLikeVoicemail ? "grayscale(1)" : undefined }}>{icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                            <span style={{ color: timeColor }}>{fmtTime(c.called_at)}</span>
                            <span style={{ fontWeight: 600, color: labelColor }}>{label}</span>
                            {durStr && <span style={{ color: "#9ca3af", fontSize: 11 }}>{durStr}</span>}
                          </div>
                          {shortSummary && <div style={{ fontSize: 12.5, marginTop: 2, color: "#374151", lineHeight: 1.4 }}>{shortSummary}</div>}
                          {fullDetail && (
                            <details style={{ marginTop: 6 }}>
                              <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#2563eb" }}>
                                Full call detail
                              </summary>
                              {rawSummary && (
                                <div style={{ marginTop: 6, fontSize: 12.5, color: "#1f2937", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                                  {rawSummary}
                                </div>
                              )}
                              {transcript && (
                                <details style={{ marginTop: 8 }}>
                                  <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                                    Full transcript
                                  </summary>
                                  <div style={{ marginTop: 6, maxHeight: 260, overflowY: "auto", fontSize: 11.5, color: "#475569", lineHeight: 1.55, whiteSpace: "pre-wrap", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }}>
                                    {transcript}
                                  </div>
                                </details>
                              )}
                            </details>
                          )}
                        </div>
                      </div>
                    ),
                  });
                });

                smsHistory.forEach((s, i) => {
                  const inbound = s.direction === "inbound";
                  const accent = inbound ? "#a855f7" : "#f97316";
                  const icon = inbound ? "💬" : "✉️";
                  const oneLine = (s.body || "").replace(/\s+/g, " ").trim();
                  const preview = oneLine.length > 140 ? oneLine.slice(0, 140) + "…" : oneLine;
                  items.push({
                    ts: s.created_at,
                    node: (
                      <div key={`s-${i}`} style={{ display: "flex", gap: 8, padding: "8px 10px", borderLeft: `3px solid ${accent}`, background: "#fafafa", borderRadius: 4, marginBottom: 6, alignItems: "flex-start" }}>
                        <div style={{ fontSize: 14, lineHeight: "18px" }}>{icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                            <span style={{ color: "#666" }}>{fmtTime(s.created_at)}</span>
                            <span style={{ fontWeight: 600, color: "#111" }}>{inbound ? "SMS in" : "SMS out"}</span>
                          </div>
                          <div style={{ fontSize: 12.5, marginTop: 2, color: "#374151", lineHeight: 1.4 }}>{preview}</div>
                        </div>
                      </div>
                    ),
                  });
                });
                items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
                if (items.length === 0) {
                  return <div style={{ fontSize: 13, color: "#666" }}>No previous calls or messages yet — this is your first contact.</div>;
                }
                return <div>{items.map((i) => i.node)}</div>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Forced outcome modal */}
      {outcomeRequired && (
        <ForcedOutcomeModal
          active={active}
          callDuration={callDurationAtHangup}
          view={outcomeView}
          setView={setOutcomeView}
          callbackDate={outcomeCallbackDate}
          setCallbackDate={setOutcomeCallbackDate}
          callbackTime={outcomeCallbackTime}
          setCallbackTime={setOutcomeCallbackTime}
          busy={outcomeBusy}
          setBusy={setOutcomeBusy}
          onLocalLeadUpdate={onLocalLeadUpdate}
          onClosed={(status?: string) => {
            setOutcomeRequired(false);
            setCallDurationAtHangup(0);
            setOutcomePending(false);
            setOutcomeView("menu");
            setOutcomeCallbackDate("");
            setOutcomeCallbackTime("");
            onOutcomeRequiredChange?.(false);
            toast.success("Status updated ✓");
            // If parent had a pending lead waiting, let it apply now
            onAfterOutcomeApplied?.(status === "booked_deposit_paid");
          }}
        />
      )}
    </div>
  );
}

function ForcedOutcomeModal({
  active, callDuration, view, setView,
  callbackDate, setCallbackDate, callbackTime, setCallbackTime,
  busy, setBusy, onLocalLeadUpdate, onClosed,
}: {
  active: Lead;
  callDuration: number;
  view: "menu" | "callback" | "drop";
  setView: (v: "menu" | "callback" | "drop") => void;
  callbackDate: string;
  setCallbackDate: (v: string) => void;
  callbackTime: string;
  setCallbackTime: (v: string) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onLocalLeadUpdate?: (id: string, patch: Partial<Lead>) => void;
  onClosed: (status?: string) => void;
}) {
  const apply = async (status: string, extra?: Partial<Lead>) => {
    if (busy) return;
    if (leadHasBookedSale(active) && status !== "booked_deposit_paid") {
      onClosed("booked_deposit_paid");
      return;
    }
    setBusy(true);
    try {
      const r = await updateLeadStatus({ data: { leadId: active.id, status } });
      if (!r?.success) {
        toast.error(r?.error ?? "Failed to update");
        setBusy(false);
        return;
      }
      onLocalLeadUpdate?.(active.id, { status, ...(extra ?? {}) } as Partial<Lead>);
      onClosed(status);
    } finally {
      setBusy(false);
    }
  };

  const confirmCallback = async () => {
    if (!callbackDate || !callbackTime) return;
    const dt = new Date(`${callbackDate}T${callbackTime}:00`);
    if (isNaN(dt.getTime())) { toast.error("Invalid date/time"); return; }
    if (busy) return;
    setBusy(true);
    try {
      const r = await updateLeadStatus({ data: { leadId: active.id, status: "callback_scheduled" } });
      if (!r?.success) {
        toast.error(r?.error ?? "Failed to update");
        setBusy(false);
        return;
      }
      const { error } = await supabase
        .from("meta_leads")
        .update({ callback_scheduled_at: dt.toISOString() })
        .eq("id", active.id);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      onLocalLeadUpdate?.(active.id, { status: "callback_scheduled", callback_scheduled_at: dt.toISOString() } as Partial<Lead>);
      onClosed("callback_scheduled");
    } finally {
      setBusy(false);
    }
  };

  const optionStyle: CSSProperties = {
    width: "100%",
    padding: "14px 20px",
    borderRadius: 10,
    border: "1.5px solid #e8e8e6",
    background: "#fff",
    textAlign: "left",
    fontSize: 15,
    cursor: "pointer",
    marginBottom: 8,
    transition: "border-color 120ms ease",
    display: "flex",
    alignItems: "center",
    gap: 12,
  };
  const dotStyle = (color: string): CSSProperties => ({
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: 999,
    background: color,
    flexShrink: 0,
  });
  const onHover = (e: ReactMouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#f4522d"; };
  const onLeave = (e: ReactMouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#e8e8e6"; };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>How did that go?</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 20, marginTop: 4 }}>
          Set the outcome to keep your pipeline accurate.
          {callDuration > 0 ? ` (Call: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")})` : ""}
        </div>

        {view === "menu" && leadHasBookedSale(active) && (
          <>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 13, color: "#065f46", lineHeight: 1.5, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ Already booked — deposit paid</div>
              This lead is locked in. Don't pick another outcome — it would overwrite the booking.
            </div>
            <button
              style={{ ...optionStyle, justifyContent: "center", borderColor: "#10b981", color: "#065f46", fontWeight: 600 }}
              onClick={() => onClosed("booked_deposit_paid")}
            >
              Close
            </button>
          </>
        )}

        {view === "menu" && !leadHasBookedSale(active) && (
          <>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("no_answer")}>
              <span style={dotStyle("#eab308")} /> No Answer
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} onClick={() => setView("callback")}>
              <span style={dotStyle("#f97316")} /> Callback Scheduled
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("had_convo_chase_up")}>
              <span style={dotStyle("#5b3a13")} /> Had Convo — Chase Up
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("had_convo_no_sale")}>
              <span style={dotStyle("#be185d")} /> Had Convo — No Sale
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("not_interested")}>
              <span style={dotStyle("#ef4444")} /> Not Interested
            </button>
            <div style={{ marginTop: 4, padding: "10px 12px", borderRadius: 10, background: "#f9f9f9", border: "1px dashed #d4d4d2", fontSize: 12, color: "#666", lineHeight: 1.4 }}>
              <span style={{ fontWeight: 600, color: "#111" }}>Booked a consult?</span> Close this and complete Step 10 to lock in the date, take the deposit and create the appointment. Marking it here would skip the booking and the clinic wouldn't see it.
            </div>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} onClick={() => setView("drop")}>
              <span style={dotStyle("#000000")} /> Dropped
            </button>
          </>
        )}

        {view === "callback" && (
          <div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>Pick a date and time for the callback:</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {([
                { label: "+30 min", mins: 30 },
                { label: "+1 hr", mins: 60 },
                { label: "+2 hrs", mins: 120 },
              ] as const).map((opt) => (
                <button
                  key={opt.label}
                  disabled={busy}
                  onClick={() => {
                    const d = new Date(Date.now() + opt.mins * 60_000);
                    const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
                    const hh = String(d.getHours()).padStart(2, "0"); const mi = String(d.getMinutes()).padStart(2, "0");
                    setCallbackDate(`${yyyy}-${mm}-${dd}`);
                    setCallbackTime(`${hh}:${mi}`);
                  }}
                  style={{ flex: 1, fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e8e8e6", background: "#fff", color: "#111", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {([
                { label: "Tomorrow 9am", time: "09:00" },
                { label: "Tomorrow 12pm", time: "12:00" },
                { label: "Tomorrow 3pm", time: "15:00" },
              ] as const).map((opt) => (
                <button
                  key={opt.label}
                  disabled={busy}
                  onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() + 1);
                    const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
                    setCallbackDate(`${yyyy}-${mm}-${dd}`);
                    setCallbackTime(opt.time);
                  }}
                  style={{ flex: 1, fontSize: 11, padding: "8px 6px", borderRadius: 8, border: "1.5px solid #e8e8e6", background: "#fff", color: "#111", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 6, fontStyle: "italic" }}>Or pick custom:</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #e8e8e6", borderRadius: 10, fontSize: 14 }}
              />
              <input
                type="time"
                value={callbackTime}
                onChange={(e) => setCallbackTime(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #e8e8e6", borderRadius: 10, fontSize: 14 }}
              />
            </div>
            {callbackDate && callbackTime && (
              <div style={{ fontSize: 12, color: "#15803d", background: "#dcfce7", padding: "8px 12px", borderRadius: 8, marginBottom: 10, fontWeight: 600 }}>
                Will call back: {new Date(`${callbackDate}T${callbackTime}:00`).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setView("menu")}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #e8e8e6", background: "#fff", fontSize: 14, cursor: "pointer" }}
              >
                ← Back
              </button>
              <button
                onClick={confirmCallback}
                disabled={!callbackDate || !callbackTime || busy}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: (!callbackDate || !callbackTime || busy) ? "#f4a892" : "#f4522d",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (!callbackDate || !callbackTime || busy) ? "not-allowed" : "pointer",
                }}
              >
                Confirm Callback →
              </button>
            </div>
          </div>
        )}

        {view === "drop" && (
          <div>
            <div style={{ fontSize: 14, color: "#111", marginBottom: 16, lineHeight: 1.4 }}>
              Are you sure? This will permanently drop this lead.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setView("menu")}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #e8e8e6", background: "#fff", fontSize: 14, cursor: "pointer" }}
              >
                ← Back
              </button>
              <button
                onClick={() => apply("dropped")}
                disabled={busy}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: busy ? "#f1a3a3" : "#dc2626",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Yes, Drop
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
    a: "Normally the consult is the clinic's full price — but I want to get you in with [Dr Name], they've got some complimentary spots available. The only caveat is the refundable deposit to hold the spot, which is fully refunded when you arrive. Does that sound fair?",
    note: "Pull the exact consult price, deposit amount and doctor name from the clinic panel on the right. Walk the price journey — don't skip steps.",
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

