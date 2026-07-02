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
} from "@/components/sales-call/logic";
import { STEPS, StepContent, type StepKey } from "@/components/sales-call/steps";
import { LeadChooser } from "@/components/sales-call/lead-chooser";
import { RightPanel } from "@/components/sales-call/right-panel";



export const PRACTICE_LEAD_ID = "practice-dave-ai";
// Admin-only Test mode: when set, the portal renders identically to the real
// sales call but is scoped to this single lead so admins can sandbox the flow.
export const TEST_MODE_LEAD_ID = "5e70f557-73ce-4bb7-a11a-6b718dbd092f"; // Peter Test
function AdminTestButton() {
  const { role } = useAuth();
  if (role !== "admin") return null;
  return (
    <Link
      to="/sales-call-test"
      title="Open Peter Test sandbox"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        background: "#fde68a",
        color: "#92400e",
        border: "1px solid #f59e0b",
        borderRadius: 999,
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        textDecoration: "none",
      }}
    >
      🧪 Test (Peter)
    </Link>
  );
}

export function SalesCallPortal({ practiceMode = false, testLeadId }: { practiceMode?: boolean; testLeadId?: string | string[] } = {}) {
  const testLeadIds = Array.isArray(testLeadId) ? testLeadId : testLeadId ? [testLeadId] : [];
  const firstTestLeadId = testLeadIds[0];
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as { leadId?: string; phone?: string };
  const navigate = useNavigate();
  // Read the active call's lead so the ?leadId= switch effect can tell when
  // the user is asking to jump to the lead they're CURRENTLY on the phone
  // with (e.g. clicking "Open in Sales Call" on the FloatingCallWidget after
  // ringing a missed caller back). In that case we must not block on the
  // outcome gate — the very call that armed the gate is the call they want
  // to land in.
  const { activeLeadId: liveCallLeadId } = useTwilioDevice();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("salesCall.activeId") || null;
  });
  const loadedLeadIdsKey = useMemo(() => leads.map((l) => l.id).sort().join(","), [leads]);
  const resolvingLeadIdRef = useRef<string | null>(null);
  const [step, setStep] = useState<StepKey>(() => {
    if (typeof window === "undefined") return "mindset";
    return (sessionStorage.getItem("salesCall.step") as StepKey) || "mindset";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeId) sessionStorage.setItem("salesCall.activeId", activeId);
    else sessionStorage.removeItem("salesCall.activeId");
  }, [activeId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("salesCall.step", step);
  }, [step]);
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());
  const [repId, setRepId] = useState<string | null>(null);
  const [repName, setRepName] = useState<string>("");
  const [mmsImages, setMmsImages] = useState<{ name: string; url: string }[]>([]);
  // Discovery notes + AI pre-fill, lifted so they persist across steps and feed amplification/audiobook
  const [discoveryNotes, setDiscoveryNotes] = useState<string>("");
  const [ampPrefill, setAmpPrefill] = useState<string>("");
  const [audioPrefill, setAudioPrefill] = useState<string>("");
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  // attempts grouped per lead per local date "YYYY-MM-DD" with the most recent outcome
  const [attemptsByDay, setAttemptsByDay] = useState<Record<string, Record<string, { count: number; lastOutcome: string | null }>>>({});
  // First-ever call timestamp per lead — used so "Day N" counts from the
  // first time the rep actually called them (not from when the lead landed).
  const [firstCallByLead, setFirstCallByLead] = useState<Record<string, string>>({});
  const [dueCallbacks, setDueCallbacks] = useState<Lead[]>([]);
  const [showCallbackAlert, setShowCallbackAlert] = useState(false);
  // Session mode.
  // Source of truth for "is a session active" and "when did it start" is the
  // DB (`rep_sessions` row with ended_at IS NULL). sessionStorage is kept only
  // as an optimistic cache for non-timer fields (queue, counts, current step)
  // so refreshing the tab doesn't lose the in-progress queue. The timer
  // itself is derived from now - started_at, so refresh / new tab no longer
  // resets it to zero. Clicking End Session and then Start Session creates a
  // brand new row, so the timer correctly restarts then.
  const sessionRestored = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem("salesCall.session") || "null"); } catch { return null; }
  })();
  const [sessionActive, setSessionActive] = useState<boolean>(sessionRestored?.active ?? false);
  const [manualMode, setManualMode] = useState<boolean>(sessionRestored?.manualMode ?? false);
  const [sessionQueue, setSessionQueue] = useState<string[]>(sessionRestored?.queue ?? []);
  const [sessionIndex, setSessionIndex] = useState<number>(sessionRestored?.index ?? 0);
  const [sessionCalls, setSessionCalls] = useState<number>(sessionRestored?.calls ?? 0);
  const [sessionBookings, setSessionBookings] = useState<number>(sessionRestored?.bookings ?? 0);
  const [sessionPaused, setSessionPaused] = useState<boolean>(sessionRestored?.paused ?? false);
  const [sessionSeconds, setSessionSeconds] = useState<number>(sessionRestored?.seconds ?? 0);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(
    typeof sessionRestored?.startedAt === "string" ? sessionRestored.startedAt : null
  );
  const sessionEndRequestedRef = useRef(false);

  // On mount: ask the server whether this rep has an open session and, if so,
  // hydrate sessionStartedAt + sessionSeconds from `started_at`. This is what
  // fixes the timer resetting after a refresh / new tab.
  useEffect(() => {
    let cancelled = false;
    void getCurrentRepSession({ data: undefined as never })
      .then((row) => {
        if (cancelled || !row || sessionEndRequestedRef.current) return;
        // Only resume if sessionStorage also has an in-progress queue. Without
        // this guard, opening the tab on a new browser (or after clearing site
        // data) would flip sessionActive=true with an empty queue, falling
        // straight into the "Session complete" branch on every page load.
        const hasLocalQueue = Array.isArray(sessionRestored?.queue) && sessionRestored.queue.length > 0;
        if (!hasLocalQueue) {
          try { closeRepSession(); } catch { /* noop */ }
          return;
        }
        setSessionStartedAt(row.started_at);
        setSessionSeconds(Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000)));
        setSessionActive(true);
      })
      .catch(() => { /* not signed in / no rep — ignore */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Practice mode: inject a synthetic "Dave AI" lead and auto-activate the
  // session so the rep lands directly inside the call cockpit without having
  // to press "Start calling session". No clinic is assigned.
  useEffect(() => {
    if (!practiceMode) return;
    setLeads((prev) => {
      if (prev.some((l) => l.id === PRACTICE_LEAD_ID)) return prev;
      const dave: Lead = {
        id: PRACTICE_LEAD_ID,
        first_name: "Dave",
        last_name: "AI",
        email: null,
        phone: null,
        funding_preference: null,
        ad_name: null,
        ad_set_name: null,
        campaign_name: null,
        status: "practice",
        call_notes: null,
        created_at: new Date().toISOString(),
        callback_scheduled_at: null,
        day_number: 1,
        finance_eligible: null,
        booking_date: null,
        booking_time: null,
        clinic_id: null,
        rep_id: null,
        raw_payload: null,
        pipeline_summary: null,
        pipeline_summary_updated_at: null,
      };
      return [dave, ...prev];
    });
    setActiveId(PRACTICE_LEAD_ID);
    setStep("mindset");
    setCompleted(new Set());
    setSessionActive(true);
    setSessionQueue([PRACTICE_LEAD_ID]);
    setSessionIndex(0);
    if (!sessionStartedAt) setSessionStartedAt(new Date().toISOString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceMode]);

  // Test mode (admin sandbox): auto-pin to the single test lead and
  // auto-start the session so the admin lands in the cockpit immediately.
  useEffect(() => {
    if (testLeadIds.length === 0) return;
    setActiveId(testLeadIds[0]);
    setStep("mindset");
    setCompleted(new Set());
    setSessionActive(true);
    setSessionQueue(testLeadIds);
    setSessionIndex(0);
    if (!sessionStartedAt) setSessionStartedAt(new Date().toISOString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testLeadIds.join(",")]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("salesCall.session", JSON.stringify({
      active: sessionActive, manualMode, queue: sessionQueue, index: sessionIndex,
      calls: sessionCalls, bookings: sessionBookings, paused: sessionPaused, seconds: sessionSeconds,
      startedAt: sessionStartedAt,
    }));
  }, [sessionActive, manualMode, sessionQueue, sessionIndex, sessionCalls, sessionBookings, sessionPaused, sessionSeconds, sessionStartedAt]);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionActiveRef = useRef(false);
  useEffect(() => { sessionActiveRef.current = sessionActive; }, [sessionActive]);
  const sessionQueueRef = useRef<string[]>([]);
  useEffect(() => { sessionQueueRef.current = sessionQueue; }, [sessionQueue]);
  const sessionIndexRef = useRef<number>(0);
  useEffect(() => { sessionIndexRef.current = sessionIndex; }, [sessionIndex]);
  const leadsRef = useRef<Lead[]>([]);
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  // Timer: while a session is active and not paused, recompute seconds from
  // (now - started_at). Using a derived value (instead of s + 1) means
  // refreshes don't drift and multiple tabs stay in sync.
  useEffect(() => {
    if (sessionActive && !sessionPaused && sessionStartedAt) {
      const recompute = () => {
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000));
        setSessionSeconds(elapsed);
      };
      recompute();
      sessionTimerRef.current = setInterval(recompute, 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [sessionActive, sessionPaused, sessionStartedAt]);

  // Fire-and-forget close of the rep's open session row. Called from every
  // path that exits sessionActive (manual End button, queue exhausted, etc.).
  const closeRepSession = useCallback(() => {
    endRepSession({ data: undefined as never }).catch((err) => {
      console.error("endRepSession failed", err);
    });
  }, []);

  useEffect(() => {
    if (!sessionActive || !sessionStartedAt || !repId) return;
    const sessionLeadIds = new Set(sessionQueue);
    const repLeadIds = new Set(leads.filter((l) => l.rep_id === repId).map((l) => l.id));
    const phones = new Set(
      leads
        .filter((l) => l.rep_id === repId || sessionLeadIds.has(l.id))
        .map((l) => normalisePhoneDigits(l.phone))
        .filter(Boolean),
    );

    const ownsLead = (leadId: string | null) =>
      Boolean(leadId && (repLeadIds.has(leadId) || sessionLeadIds.has(leadId)));
    const ownsCall = (row: { rep_id: string | null; lead_id: string | null; phone?: string | null }) => {
      if (row.rep_id === repId) return true;
      if (ownsLead(row.lead_id)) return true;
      const digits = normalisePhoneDigits(row.phone);
      return Boolean(!row.rep_id && digits && phones.has(digits));
    };

    const loadSessionStats = async () => {
      const [callsRes, bookingsRes] = await Promise.all([
        supabase
          .from("call_records")
          .select("id, rep_id, lead_id, phone, called_at")
          .gte("called_at", sessionStartedAt),
        supabase
          .from("meta_leads")
          .select("id, rep_id, status, updated_at")
          .eq("status", "booked_deposit_paid")
          .gte("updated_at", sessionStartedAt),
      ]);
      if (callsRes.error || bookingsRes.error) {
        console.error("session stat backfill failed", callsRes.error ?? bookingsRes.error);
        return;
      }

      const ownedCalls = (callsRes.data ?? []).filter(ownsCall);
      const callOwnedLeadIds = new Set(ownedCalls.map((row) => row.lead_id).filter(Boolean) as string[]);
      const bookedLeadIds = new Set(
        (bookingsRes.data ?? [])
          .filter((row) => row.rep_id === repId || sessionLeadIds.has(row.id) || callOwnedLeadIds.has(row.id))
          .map((row) => row.id),
      );

      // Dedupe double-dials: collapse consecutive calls to the same lead/phone
      // within 60 seconds into a single attempt. A "double dial" (hang up
      // immediately, redial) shouldn't count as two calls.
      const DOUBLE_DIAL_WINDOW_MS = 60_000;
      const sorted = [...ownedCalls].sort((a, b) => {
        const at = new Date(a.called_at as string).getTime();
        const bt = new Date(b.called_at as string).getTime();
        return at - bt;
      });
      const lastByKey = new Map<string, number>();
      let uniqueCalls = 0;
      for (const row of sorted) {
        const key = row.lead_id || normalisePhoneDigits(row.phone) || row.id;
        const t = new Date(row.called_at as string).getTime();
        const prev = lastByKey.get(key);
        if (prev === undefined || t - prev > DOUBLE_DIAL_WINDOW_MS) {
          uniqueCalls += 1;
        }
        lastByKey.set(key, t);
      }

      setSessionCalls(uniqueCalls);
      setSessionBookings(bookedLeadIds.size);
    };

    void loadSessionStats();
    const unsubs = [
      subscribeRealtime({ table: "call_records" }, () => void loadSessionStats()),
      subscribeRealtime({ table: "meta_leads" }, () => void loadSessionStats()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [sessionActive, sessionStartedAt, repId, leads, sessionQueue]);

  useEffect(() => {
    if (!sessionActive) return;
    const handleStarted = () => setSessionCalls((c) => c + 1);
    window.addEventListener("upperhand:sales-call-started", handleStarted);
    return () => window.removeEventListener("upperhand:sales-call-started", handleStarted);
  }, [sessionActive]);

  const sessionTimeStr = `${Math.floor(sessionSeconds / 3600).toString().padStart(2, "0")}:${Math.floor((sessionSeconds % 3600) / 60).toString().padStart(2, "0")}:${(sessionSeconds % 60).toString().padStart(2, "0")}`;
  // Ref on the centre scroll column so we can reset scroll-to-top whenever
  // the active lead or current step changes (otherwise picking a new client
  // leaves the user at the previous scroll position — often the bottom).
  const mainScrollRef = useRef<HTMLElement | null>(null);
  // Forced-outcome guard: when a call has just ended without a booking,
  // InCallPanel surfaces a modal and sets this ref to true so the parent
  // can block lead navigation until an outcome is selected.
  const outcomeRequiredRef = useRef(false);
  // Mirrors RightPanel's `outcomePending` (set the moment a dial fires).
  // We check this on every "jump to lead" shortcut (missed-call popups,
  // ?leadId= deeplinks, callbacks list, manual lead pick) so a click that
  // would whisk us away from a just-dialled lead is intercepted instead.
  const outcomePendingRef = useRef(false);
  const gateActive = () => outcomeRequiredRef.current || outcomePendingRef.current;
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  // Lead that just had a call complete and still needs an outcome logged.
  // Persists across activeId changes so navigating away (or never clicking
  // "Next Lead") still surfaces the forced-outcome modal: we snap the
  // portal back to that lead and RightPanel auto-opens the modal.
  const [pendingOutcomeLeadId, setPendingOutcomeLeadId] = useState<string | null>(null);
  // Snap back to the lead that needs an outcome whenever the user
  // navigates away before logging one.
  useEffect(() => {
    if (!pendingOutcomeLeadId) return;
    if (activeId === pendingOutcomeLeadId) return;
    setActiveId(pendingOutcomeLeadId);
    setStep("mindset");
    setCompleted(new Set());
  }, [pendingOutcomeLeadId, activeId]);
  useEffect(() => {
    // Reset the inner column scroll AND every scrollable ancestor (the
    // dashboard <main> wraps this view in `overflow-y-auto`, so without this
    // the page stays scrolled to the bottom after picking a new lead).
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0 });
      let node: HTMLElement | null = mainScrollRef.current?.parentElement ?? null;
      while (node) {
        const style = window.getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY)) node.scrollTop = 0;
        node = node.parentElement;
      }
    }
  }, [activeId, step]);

  useEffect(() => {
    const check = async () => {
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60000);
      const { data } = await supabase
        .from("meta_leads")
        .select(SALES_CALL_LEAD_SELECT)
        .in("status", ["Callback Scheduled", "callback_scheduled"])
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
    const leadIds = loadedLeadIdsKey.split(",").filter(Boolean);
    if (leadIds.length === 0) return;

    const load = async () => {
      // Last 3 days of call attempts so we can show "no answer yesterday",
      // count today's attempts (auto-bump after 3), etc.
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - 2); // covers yesterday + today
      const { data } = await supabase
        .from("call_records")
        .select("lead_id, called_at, outcome, status")
        .in("lead_id", leadIds)
        .gte("called_at", since.toISOString())
        .order("called_at", { ascending: true });

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const counts: Record<string, number> = {};
      const byDay: Record<string, Record<string, { count: number; lastOutcome: string | null }>> = {};

      for (const row of data ?? []) {
        if (!row.lead_id || !row.called_at) continue;
        const d = new Date(row.called_at);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
        if (dayStart.getTime() === today.getTime()) {
          counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1;
        }
        byDay[row.lead_id] = byDay[row.lead_id] ?? {};
        const slot = byDay[row.lead_id][dayKey] ?? { count: 0, lastOutcome: null };
        slot.count += 1;
        slot.lastOutcome = (row.outcome as string | null) ?? (row.status as string | null) ?? slot.lastOutcome;
        byDay[row.lead_id][dayKey] = slot;
      }
      setAttemptCounts(counts);
      setAttemptsByDay(byDay);

      // First-ever call timestamp per lead (across all history, ascending order
      // so the first row per lead wins). Drives the "Day N" pipeline counter.
      const { data: firstRows } = await supabase
        .from("call_records")
        .select("lead_id, called_at")
        .in("lead_id", leadIds)
        .order("called_at", { ascending: true })
        .limit(5000);
      const firsts: Record<string, string> = {};
      for (const row of firstRows ?? []) {
        if (!row.lead_id || !row.called_at) continue;
        if (!firsts[row.lead_id]) firsts[row.lead_id] = row.called_at as string;
      }
      setFirstCallByLead(firsts);
    };
    void load();
    return subscribeRealtime({ table: "call_records" }, () => void load());
  }, [loadedLeadIdsKey]);

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
      const baseQuery = supabase
        .from("meta_leads")
        .select(SALES_CALL_LEAD_SELECT);
      const { data } = testLeadIds.length > 0
        ? await baseQuery.in("id", testLeadIds)
        : await baseQuery.order("created_at", { ascending: false }).limit(SALES_CALL_LEAD_LIMIT);
      setLeads((prev) => {
        const fetched = (data ?? []) as Lead[];
        // Preserve the synthetic practice lead (Dave AI) so the supabase
        // refresh doesn't wipe it out and blank the practice-call page.
        const practice = prev.find((l) => l.id === PRACTICE_LEAD_ID);
        return practice ? [practice, ...fetched.filter((l) => l.id !== PRACTICE_LEAD_ID)] : fetched;
      });
    };
    void load();
    const unsubscribe = subscribeRealtime({ table: "meta_leads" }, (payload) => {
        if (payload.eventType === "INSERT" && sessionActiveRef.current) {
          const newId = (payload.new as { id?: string } | null)?.id;
          if (newId) setSessionQueue((prev) => (prev.includes(newId) ? prev : [newId, ...prev]));
        }
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (oldId) setLeads((prev) => prev.filter((l) => l.id !== oldId));
          return;
        }
        const nextLead = payload.new as Lead | null;
        if (!nextLead?.id) return;
        setLeads((prev) => {
          const idx = prev.findIndex((l) => l.id === nextLead.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...nextLead };
            return next;
          }
          return [nextLead, ...prev].slice(0, SALES_CALL_LEAD_LIMIT);
        });
      });
    return () => unsubscribe();
  }, []);

  // Missed-call jump-the-queue: if an inbound missed call comes in from a lead
  // that's already in the current session queue (e.g. someone marked "no answer"
  // who's now ringing back), bump them to be the NEXT lead so pressing "Next
  // lead" jumps straight to them.
  useEffect(() => {
    const seen = new Set<string>();
    const handle = (row: { id?: string; direction?: string; status?: string | null; duration?: number | null; phone?: string | null } | null) => {
      if (!row || row.direction !== "inbound" || !row.id) return;
      const s = (row.status || "").toLowerCase();
      const answered = (row.duration && row.duration > 0) || s === "in-progress" || s === "completed";
      if (answered) return;
      if (seen.has(row.id)) return;
      seen.add(row.id);
      const tail = (row.phone || "").replace(/[^0-9]/g, "").slice(-9);
      if (tail.length < 6) return;
      const lead = leadsRef.current.find((l) => (l.phone || "").replace(/[^0-9]/g, "").slice(-9) === tail);
      if (!lead) return;
      const queue = sessionQueueRef.current;
      const idx = queue.indexOf(lead.id);
      const cur = sessionIndexRef.current;
      if (idx === -1) {
        // Not in queue yet — insert right after current position
        if (!sessionActiveRef.current) return;
        const next = [...queue];
        next.splice(cur + 1, 0, lead.id);
        setSessionQueue(next);
      } else if (idx > cur + 1) {
        // Already queued later — move to next-in-line
        const next = [...queue];
        next.splice(idx, 1);
        next.splice(cur + 1, 0, lead.id);
        setSessionQueue(next);
      } else {
        return; // already next or current
      }
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() || row.phone || "Lead";
      toast.success(`📞 ${name} called back — queued next`);
    };
    const unsubs = [
      subscribeRealtime({ table: "call_records", event: "INSERT" }, (p) => handle(p.new as Parameters<typeof handle>[0])),
      subscribeRealtime({ table: "call_records", event: "UPDATE" }, (p) => handle(p.new as Parameters<typeof handle>[0])),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);



  // Load MMS images
  useEffect(() => {
    void listMmsImages().then((r) => { if (r.success) setMmsImages(r.images); });
  }, []);

  // Preselect a lead from ?leadId= (used by the FloatingCallWidget's
  // "Open in Sales Call" button when an inbound caller is recognised).
  // We react to the search param itself (not just initial mount) so clicking
  // the widget while already on this page still switches to the new lead.
  useEffect(() => {
    const wantedId = search.leadId;
    if (!wantedId) return;
    if (leads.length === 0) return;
    const found = leads.find((l) => l.id === wantedId);
    if (!found) {
      if (resolvingLeadIdRef.current === wantedId) return;
      resolvingLeadIdRef.current = wantedId;
      void supabase
        .from("meta_leads")
        .select(SALES_CALL_LEAD_SELECT)
        .eq("id", wantedId)
        .maybeSingle()
        .then(({ data }) => {
          resolvingLeadIdRef.current = null;
          if (data) setLeads((prev) => prev.some((l) => l.id === wantedId) ? prev : [data as Lead, ...prev]);
        });
      return;
    }
    if (activeId !== found.id) {
      // Explicit "Open in Sales Call" deeplinks should ALWAYS jump to the
      // requested lead — never get silently blocked by a stale outcome gate
      // on whatever lead was previously active. Clear the gate refs for the
      // prior lead so the new lead's right-panel renders cleanly.
      outcomeRequiredRef.current = false;
      outcomePendingRef.current = false;
      setPendingLeadId(null);
      setActiveId(found.id);
      setStep("mindset");
      setCompleted(new Set());
    }
    // Clear the param so a refresh doesn't re-trigger and so re-clicking the
    // same lead from the widget still fires this effect again.
    navigate({ to: "/sales-call", search: (prev: Record<string, unknown>) => ({ ...prev, leadId: undefined, phone: undefined }), replace: true });
  }, [search.leadId, leads, activeId, navigate]);

  useEffect(() => {
    const wantedPhone = search.phone;
    if (!wantedPhone || search.leadId) return;
    let cancelled = false;
    void findLeadByPhone({ data: { phone: wantedPhone } }).then((r) => {
      if (cancelled) return;
      const foundId = r.success ? r.lead?.id : null;
      if (foundId) {
        navigate({ to: "/sales-call", search: (prev: Record<string, unknown>) => ({ ...prev, leadId: foundId, phone: undefined }), replace: true });
        return;
      }
      navigate({ to: "/sales-call", search: (prev: Record<string, unknown>) => ({ ...prev, phone: undefined }), replace: true });
    });
    return () => { cancelled = true; };
  }, [search.phone, search.leadId, navigate]);

  const active = useMemo(() => leads.find((l) => l.id === activeId) ?? null, [leads, activeId]);
  const activeLeadIndex = useMemo(() => leads.findIndex((l) => l.id === activeId), [leads, activeId]);

  const updateLocalLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const markStepComplete = (k: StepKey) => {
    setCompleted((prev) => { const n = new Set(prev); n.add(k); return n; });
  };

  const advance = (current: StepKey) => {
    markStepComplete(current);
    const idx = STEPS.findIndex((s) => s.key === current);
    if (idx >= 0 && idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  // Notes are intentionally left blank on every Discovery entry so the advisor
  // fills them out live during the call rather than relying on old data.
  useEffect(() => {
    setDiscoveryNotes("");
  }, [activeId]);

  const callbackBanner = null;

  // Today's callbacks (overdue + scheduled-for-today) for the at-a-glance panel
  const todaysCallbacks = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const list = leads.filter((l) => {
      if (!l.callback_scheduled_at) return false;
      const s = normaliseStatus(l.status, l);
      if (s === "not_interested" || s === "booked_deposit_paid" || s === "had_convo_no_sale") return false;
      const raw = (l.status ?? "").toLowerCase();
      if (raw === "cancelled" || raw === "no_show" || raw === "dropped") return false;
      const t = new Date(l.callback_scheduled_at).getTime();
      return !Number.isNaN(t) && t < end.getTime();
    });
    return list.sort((a, b) =>
      new Date(a.callback_scheduled_at!).getTime() - new Date(b.callback_scheduled_at!).getTime()
    );
  }, [leads]);

  // Build the ordered session queue from the same buckets as LeadChooser
  const buildSessionQueue = useCallback((): string[] => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const todayKey = localDateKey(today);
    const yesterdayKey = localDateKey(yesterday);
    const callbackOverdue = (l: Lead) => {
      if (!l.callback_scheduled_at) return false;
      const t = new Date(l.callback_scheduled_at).getTime();
      return !Number.isNaN(t) && t <= Date.now();
    };
    const callbackToday = (l: Lead) => {
      if (!l.callback_scheduled_at) return false;
      return sameLocalDate(new Date(l.callback_scheduled_at), today);
    };
    const noAnsYesterday = (l: Lead) => {
      const slot = attemptsByDay[l.id]?.[yesterdayKey];
      if (!slot) return false;
      const o = (slot.lastOutcome ?? "").toLowerCase();
      return o.includes("no") || o.includes("voicemail") || o.includes("missed") || o === "no-answer";
    };
    const newish = (l: Lead) =>
      normaliseStatus(l.status, l) === "new" && (attemptsByDay[l.id]?.[todayKey]?.count ?? 0) === 0;

    const eligible = leads.filter((l) => {
      const s = normaliseStatus(l.status, l);
      if (s === "not_interested" || s === "booked_deposit_paid" || s === "had_convo_no_sale") return false;
      const raw = (l.status ?? "").toLowerCase();
      if (raw === "cancelled" || raw === "no_show" || raw === "dropped") return false;
      return true;
    });

    const overdue: Lead[] = [];
    const cbToday: Lead[] = [];
    const chase: Lead[] = [];
    const noAns: Lead[] = [];
    const newLeads: Lead[] = [];
    const remaining: Lead[] = [];
    const placed = new Set<string>();
    for (const l of eligible) {
      if (callbackOverdue(l)) { overdue.push(l); placed.add(l.id); continue; }
      if (callbackToday(l)) { cbToday.push(l); placed.add(l.id); continue; }
      if (normaliseStatus(l.status, l) === "had_convo_chase_up") { chase.push(l); placed.add(l.id); continue; }
      if (noAnsYesterday(l)) { noAns.push(l); placed.add(l.id); continue; }
      if (newish(l)) { newLeads.push(l); placed.add(l.id); continue; }
      remaining.push(l); placed.add(l.id);
    }
    const cbSort = (a: Lead, b: Lead) => {
      const ta = a.callback_scheduled_at ? new Date(a.callback_scheduled_at).getTime() : 0;
      const tb = b.callback_scheduled_at ? new Date(b.callback_scheduled_at).getTime() : 0;
      return ta - tb;
    };
    cbToday.sort(cbSort);
    overdue.sort(cbSort);
    // TEMP (24–25 Jun 2026 Sydney only): start with brand-new leads first.
    const sydToday = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    const newFirst = sydToday === "2026-06-24" || sydToday === "2026-06-25";
    return (newFirst
      ? [...newLeads, ...overdue, ...cbToday, ...chase, ...noAns, ...remaining]
      : [...overdue, ...cbToday, ...chase, ...noAns, ...newLeads, ...remaining]
    ).map((l) => l.id);
  }, [leads, attemptsByDay]);

  // Show start-session screen / advance queue when no active lead
  if (!active) {
    if (!sessionActive && !manualMode) {
      const queueCount = buildSessionQueue().length;
      return (
        <>
          {callbackBanner}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 40, background: "#f7f7f5", overflow: "auto" }}>
            <button
              onClick={async () => {
                sessionEndRequestedRef.current = false;
                const q = buildSessionQueue();
                let startedAt: string;
                try {
                  const row = await startRepSession({ data: undefined as never });
                  startedAt = row.started_at;
                } catch (err) {
                  console.error("startRepSession failed", err);
                  startedAt = new Date().toISOString();
                }
                setSessionQueue(q);
                setSessionIndex(0);
                setSessionCalls(0);
                setSessionBookings(0);
                setSessionSeconds(0);
                setSessionStartedAt(startedAt);
                setSessionPaused(false);
                setSessionActive(true);
                if (q.length > 0) {
                  if (gateActive()) {
                    setPendingLeadId(q[0]);
                    toast.error("Please set a call outcome first");
                    return;
                  }
                  setActiveId(q[0]);
                  setStep("mindset");
                  setCompleted(new Set());
                  setAmpPrefill("");
                  setAudioPrefill("");
                }
              }}
              style={{ background: "#f4522d", color: "#fff", border: "none", borderRadius: 16, fontSize: 22, fontWeight: 600, padding: "32px 0", width: "100%", maxWidth: 520, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 20px rgba(244,82,45,0.25)", letterSpacing: "-0.01em" }}
            >
              Start calling session
            </button>
            <AdminTestButton />
          </div>
        </>
      );
    }
    if (manualMode && !sessionActive) {
      return (
        <>
          {callbackBanner}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #e8e8e6", background: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <button
                onClick={() => setManualMode(false)}
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#111", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit" }}
              >
                ← Close lead sheet
              </button>
              <div style={{ fontSize: 12, color: "#888" }}>Browsing all leads</div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <LeadChooser
                leads={leads}
                attemptCounts={attemptCounts}
                attemptsByDay={attemptsByDay}
                firstCallByLead={firstCallByLead}
                onLocalLeadUpdate={updateLocalLead}
                onPick={(id) => {
                  if (gateActive()) {
                    setPendingLeadId(id);
                    toast.error("Please set a call outcome first");
                    return;
                  }
                  setActiveId(id); setStep("mindset"); setCompleted(new Set());
                  setAmpPrefill(""); setAudioPrefill("");
                }}
              />
            </div>
          </div>
        </>
      );
    }
    // sessionActive — auto-advance
    const nextId = sessionQueue[sessionIndex];
    if (nextId) {
      const leadLoaded = leads.some((l) => l.id === nextId);
      if (leadLoaded && activeId !== nextId) {
        queueMicrotask(() => {
          setActiveId(nextId);
          setStep("mindset");
          setCompleted((prev) => (prev.size === 0 ? prev : new Set()));
          setAmpPrefill("");
          setAudioPrefill("");
        });
      } else if (!leadLoaded && leads.length > 0) {
        // Leads have loaded but this queued id isn't in the result set
        // (deleted, filtered out, or older than the fetch limit). Skip past
        // it instead of leaving the page permanently blank.
        queueMicrotask(() => {
          setSessionIndex((i) => i + 1);
        });
      }
      // If leads.length === 0 we're still loading — wait for the next render.
    } else {
      queueMicrotask(() => {
        setSessionActive(false);
        setSessionPaused(false);
        setSessionStartedAt(null);
        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        closeRepSession();
        toast.success("Session complete — great work!");
      });
    }
    return null;
  }


  return (
    <>
      {callbackBanner}
      {sessionActive && !practiceMode && (
        <div style={{ background: '#0b0b0b', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, minHeight: 58, borderBottom: '1px solid #2a2a2a', boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {[
              { num: sessionCalls as number | string, label: 'Calls', color: '#fff' },
              { num: sessionBookings as number | string, label: 'Booked', color: '#f4522d' },
              { num: Math.max(0, sessionQueue.length - sessionIndex) as number | string, label: 'Remaining', color: '#f59e0b' },
              { num: `${Math.floor(sessionSeconds/3600).toString().padStart(2,'0')}:${Math.floor((sessionSeconds%3600)/60).toString().padStart(2,'0')}:${(sessionSeconds%60).toString().padStart(2,'0')}`, label: sessionPaused ? 'On break' : 'Session time', color: sessionPaused ? '#f59e0b' : '#fff' },
            ].map(s => (
              <div key={String(s.label)} style={{ textAlign: 'center', minWidth: 58 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#b8b8b8', marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <NotificationBell />
            <button
              onClick={() => setSessionPaused(p => !p)}
              style={{ fontSize: 13, fontWeight: 700, color: sessionPaused ? '#f59e0b' : '#e8e8e8', background: 'transparent', border: `1px solid ${sessionPaused ? '#f59e0b' : '#555'}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {sessionPaused ? '▶ Resume' : '☕ Break'}
            </button>
            <button
              onClick={() => {
                sessionEndRequestedRef.current = true;
                // End Session is a deliberate exit. Force-clear any stale
                // outcome gate so the user can always leave the session.
                if (gateActive()) {
                  outcomeRequiredRef.current = false;
                  outcomePendingRef.current = false;
                  try {
                    if (activeId) {
                      window.sessionStorage.removeItem(`salescall.gate.${activeId}`);
                      window.sessionStorage.removeItem(`htg.outcomeGate.${activeId}`);
                    }
                  } catch {
                    // Ignore storage cleanup failures; ending the session must still work.
                  }
                }
                setPendingOutcomeLeadId(null);
                setSessionActive(false); setSessionPaused(false); setSessionStartedAt(null); setActiveId(null); if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); closeRepSession();
              }}
              style={{ fontSize: 13, fontWeight: 700, color: '#e8e8e8', background: 'transparent', border: '1px solid #555', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              End session
            </button>
          </div>
        </div>
      )}
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
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center px-6 py-[60px]">
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
            onBookedSaved={(leadId, patch) => {
              updateLocalLead(leadId, patch);
              if (leadId === active.id) {
                outcomePendingRef.current = false;
                outcomeRequiredRef.current = false;
              }
              if (pendingOutcomeLeadId === leadId) setPendingOutcomeLeadId(null);
            }}
            onDepositPaid={() => {
              if (sessionActive) {
                setSessionBookings((b) => b + 1);
                const nextIndex = sessionIndex + 1;
                setSessionIndex(nextIndex);
                const nextId = sessionQueue[nextIndex];
                if (nextId) {
                  setActiveId(nextId);
                  setStep("mindset");
                  setCompleted(new Set());
                  setAmpPrefill(""); setAudioPrefill("");
                } else {
                  setActiveId(null);
                  setSessionActive(false);
                  setSessionPaused(false);
                  setSessionStartedAt(null);
                  if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
                  closeRepSession();
                  toast.success("Session complete — great work!");
                }
              }
            }}
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
          practiceMode={practiceMode}
          active={active}
          repId={repId}
          mmsImages={mmsImages}
          attemptCounts={attemptCounts}
          firstCallAt={firstCallByLead[active.id] ?? null}
          onLocalLeadUpdate={updateLocalLead}
          onChangeLead={() => {
            if (sessionActive) {
              const nextIndex = sessionIndex + 1;
              setSessionIndex(nextIndex);
              const nextId = sessionQueue[nextIndex];
              if (nextId) {
                setActiveId(nextId);
                setStep("mindset");
                setCompleted(new Set());
                setAmpPrefill(""); setAudioPrefill("");
              } else {
                setActiveId(null);
                setSessionActive(false);
                setSessionPaused(false);
                setSessionStartedAt(null);
                if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
                closeRepSession();
                toast.success("Session complete — great work!");
              }
            } else {
              setActiveId(null);
            }
          }}
          onPreviousLead={() => {
            if (sessionActive) {
              const previousIndex = sessionIndex - 1;
              const previousId = sessionQueue[previousIndex];
              if (previousId) {
                setSessionIndex(previousIndex);
                setActiveId(previousId);
                setStep("mindset");
                setCompleted(new Set());
                setAmpPrefill(""); setAudioPrefill("");
              }
              return;
            }
            const previous = activeLeadIndex > 0 ? leads[activeLeadIndex - 1] : null;
            if (previous) {
              setActiveId(previous.id);
              setStep("mindset");
              setCompleted(new Set());
              setAmpPrefill(""); setAudioPrefill("");
            }
          }}
          hasPreviousLead={sessionActive ? sessionIndex > 0 : activeLeadIndex > 0}
          onOutcomeRequiredChange={(val) => { outcomeRequiredRef.current = val; }}
          onOutcomePendingChange={(val) => { outcomePendingRef.current = val; }}
          onCallStarted={() => {}}
          pendingOutcomeLeadId={pendingOutcomeLeadId}
          onPendingOutcomeArmed={(leadId) => setPendingOutcomeLeadId(leadId)}
          onAfterOutcomeApplied={(wasBooked?: boolean) => {
            setPendingOutcomeLeadId(null);
            if (sessionActive) {
              if (wasBooked) setSessionBookings((b) => b + 1);
              const nextIndex = sessionIndex + 1;
              setSessionIndex(nextIndex);
              const nextId = sessionQueue[nextIndex];
              if (nextId) {
                setActiveId(nextId);
                setStep("mindset");
                setCompleted(new Set());
                setAmpPrefill(""); setAudioPrefill("");
              } else {
                setActiveId(null);
                setSessionActive(false);
                setSessionPaused(false);
                setSessionStartedAt(null);
                if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
                closeRepSession();
                toast.success("Session complete — great work!");
              }
              return;
            }
            if (pendingLeadId) {
              const id = pendingLeadId;
              setPendingLeadId(null);
              setActiveId(id);
              setStep("mindset");
              setCompleted(new Set());
              setAmpPrefill(""); setAudioPrefill("");
            }
          }}
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

