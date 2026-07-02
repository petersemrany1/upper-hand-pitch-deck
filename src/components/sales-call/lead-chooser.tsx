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

type DayCol = "yesterday" | "today" | "tomorrow";
type DragState = { id: string; col: DayCol; pointerId: number; dragging: boolean; startX: number; startY: number; offsetX: number; offsetY: number; width: number; height: number };
type DragVisual = { id: string; left: number; top: number; width: number; height: number };

export function LeadChooser({
  leads,
  attemptCounts,
  attemptsByDay,
  firstCallByLead,
  onLocalLeadUpdate,
  onPick,
}: {
  leads: Lead[];
  attemptCounts: Record<string, number>;
  attemptsByDay: Record<string, Record<string, { count: number; lastOutcome: string | null }>>;
  firstCallByLead: Record<string, string>;
  onLocalLeadUpdate?: (id: string, patch: Partial<Lead>) => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [openStatusFor, setOpenStatusFor] = useState<string | null>(null);
  const [statusAnchor, setStatusAnchor] = useState<{ top: number; left: number } | null>(null);
  
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  // Local override so drag/drop and "move" buttons re-bucket immediately
  // without waiting for the realtime round-trip. Maps lead id → forced column.
  const [forcedCol, setForcedCol] = useState<Record<string, DayCol>>({});
  const [dropCol, setDropCol] = useState<DayCol | null>(null);
  // Manual ordering per column (id list). When present, leads in that column
  // render in this order; new leads append at the end.
  const [manualOrder, setManualOrder] = useState<Record<DayCol, string[]>>({
    yesterday: [], today: [], tomorrow: [],
  });
  const [dropTarget, setDropTarget] = useState<{ col: DayCol; beforeId: string | null } | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dropTargetRef = useRef<{ col: DayCol; beforeId: string | null } | null>(null);
  // Snapshot of the currently rendered ids per column (kept in sync via useEffect
  // below). Used by drag/drop math.
  const colOrderRef = useRef<Record<DayCol, string[]>>({
    yesterday: [], today: [], tomorrow: [],
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayKey = localDateKey(today);
  const yesterdayKey = localDateKey(yesterday);

  const persistedColumnFor = (l: Lead): DayCol | null => {
    const payload = rawPayloadObject(l.raw_payload);
    const column = payload.pipeline_column;
    if (column !== "today" && column !== "tomorrow" && column !== "yesterday") return null;
    // If the move was tagged with the calendar date it referred to, resolve it
    // relative to today. e.g. a "tomorrow" set yesterday should appear in
    // "today" today, then slide to "yesterday" the day after.
    const setOnRaw = payload.pipeline_column_date;
    const setOn = typeof setOnRaw === "string" ? setOnRaw : null;
    if (setOn) {
      // Compute the absolute target date the user originally meant.
      const [y, m, d] = setOn.split("-").map((n) => parseInt(n, 10));
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        const setOnDate = new Date(y, m - 1, d);
        const target = new Date(setOnDate);
        if (column === "tomorrow") target.setDate(target.getDate() + 1);
        else if (column === "yesterday") target.setDate(target.getDate() - 1);
        // Compare to today
        const targetKey = localDateKey(target);
        if (targetKey === localDateKey(today)) return "today";
        if (targetKey === localDateKey(tomorrow)) return "tomorrow";
        if (targetKey === localDateKey(yesterday)) return "yesterday";
        // If the target date is in the past (older than yesterday), slide to yesterday.
        if (target.getTime() < yesterday.getTime()) return "yesterday";
        // If the target date is further in the future than tomorrow, keep in tomorrow.
        if (target.getTime() > tomorrow.getTime()) return "tomorrow";
      }
    }
    return column;
  };

  const filtered = useMemo(() => {
    const list = leads.filter((l) => {
      // Hide closed-out leads (not interested / had convo no sale) from the main pipeline.
      const ns = normaliseStatus(l.status, l);
      if (ns === "not_interested" || ns === "had_convo_no_sale") return false;
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

  // Bucketing helpers
  const callbackOn = (l: Lead, when: Date) => {
    if (!l.callback_scheduled_at) return false;
    const cb = new Date(l.callback_scheduled_at);
    return sameLocalDate(cb, when);
  };
  const callbackIsOverdue = (l: Lead) => {
    if (!l.callback_scheduled_at) return false;
    const t = new Date(l.callback_scheduled_at).getTime();
    return !Number.isNaN(t) && t <= Date.now();
  };
  const noAnswerYesterday = (l: Lead) => {
    const slot = attemptsByDay[l.id]?.[yesterdayKey];
    if (!slot) return false;
    const outcome = (slot.lastOutcome ?? "").toLowerCase();
    return outcome.includes("no") || outcome.includes("voicemail") || outcome.includes("missed") || outcome === "no-answer";
  };
  const isNew = (l: Lead) => normaliseStatus(l.status, l) === "new" && (attemptsByDay[l.id]?.[todayKey]?.count ?? 0) === 0;
  const failedThreeToday = (l: Lead) => {
    if (forcedCol[l.id] === "today") return false;
    const slot = attemptsByDay[l.id]?.[todayKey];
    if (!slot) return false;
    if (slot.count < 3) return false;
    const outcome = (slot.lastOutcome ?? "").toLowerCase();
    // only auto-bump if the recent calls were no-answers (not connected/booked)
    return outcome.includes("no") || outcome.includes("voicemail") || outcome.includes("missed") || outcome === "no-answer";
  };
  const exhaustedYesterday = (l: Lead) => {
    const slot = attemptsByDay[l.id]?.[yesterdayKey];
    if (!slot || slot.count < 3) return false;
    const outcome = (slot.lastOutcome ?? "").toLowerCase();
    return outcome.includes("no") || outcome.includes("voicemail") || outcome.includes("missed") || outcome === "no-answer";
  };

  // A lead is "active today" if there's been any call attempt today, or if
  // the lead has a callback scheduled for today/future, or the rep has
  // explicitly set a status that implies they're still working it.
  const hasActivityToday = (l: Lead) => (attemptsByDay[l.id]?.[todayKey]?.count ?? 0) > 0;
  const isConverted = (l: Lead) => normaliseStatus(l.status, l) === "booked_deposit_paid";

  // Build column buckets — every lead appears in EXACTLY one column.
  // Priority order: tomorrow (future callback / auto-bumped) > today > yesterday.
  const buckets = useMemo(() => {
    const out = {
      yesterday: [] as Lead[],
      today: [] as { section: "overdue" | "callback" | "no-answer-yesterday" | "new" | "remaining"; lead: Lead }[],
      tomorrow: [] as Lead[],
    };
    const placed = new Set<string>();

    for (const l of filtered) {
      if (placed.has(l.id)) continue;

      // -1) Converted leads (deposit paid) live in their own popup, not the columns.
      if (isConverted(l)) { placed.add(l.id); continue; }

      // -1b) Cancelled / no-show / dropped leads are hidden from the call sheet entirely.
      const rawStatus = (l.status ?? "").toLowerCase();
      if (rawStatus === "cancelled" || rawStatus === "no_show" || rawStatus === "dropped") { placed.add(l.id); continue; }

      // 0) User-forced/persisted column wins (drag/drop or move buttons)
      const forced = forcedCol[l.id] ?? persistedColumnFor(l);
      if (forced === "tomorrow") { out.tomorrow.push(l); placed.add(l.id); continue; }
      if (forced === "yesterday") { out.today.push({ section: "remaining", lead: l }); placed.add(l.id); continue; }
      if (forced === "today") {
        // Pick the most appropriate today section for forced leads
        const u = leadUrgency(l);
        if (callbackOn(l, today) && u === "overdue") out.today.push({ section: "overdue", lead: l });
        else if (callbackOn(l, today)) out.today.push({ section: "callback", lead: l });
        else if (noAnswerYesterday(l)) out.today.push({ section: "no-answer-yesterday", lead: l });
        else if (isNew(l)) out.today.push({ section: "new", lead: l });
        else out.today.push({ section: "remaining", lead: l });
        placed.add(l.id); continue;
      }

      // 1) Tomorrow column wins first (future-scheduled callback or auto-bumped)
      if (callbackOn(l, tomorrow) || failedThreeToday(l)) {
        out.tomorrow.push(l); placed.add(l.id); continue;
      }

      // 2) Today column — overdue / callback / no-answer-yesterday / new / remaining
      if (callbackIsOverdue(l)) {
        out.today.push({ section: "overdue", lead: l }); placed.add(l.id); continue;
      }
      if (callbackOn(l, today)) {
        out.today.push({ section: "callback", lead: l }); placed.add(l.id); continue;
      }
      if (noAnswerYesterday(l) || exhaustedYesterday(l)) {
        // shows in TODAY (so the rep retries them today), not duplicated in yesterday
        out.today.push({ section: "no-answer-yesterday", lead: l }); placed.add(l.id); continue;
      }
      if (isNew(l)) {
        out.today.push({ section: "new", lead: l }); placed.add(l.id); continue;
      }

      // 3) Yesterday column removed — leftover yesterday-activity leads fall into today's "remaining".

      // 4) Everything else falls into today's "remaining"
      out.today.push({ section: "remaining", lead: l }); placed.add(l.id);
    }

    // Sort within today: overdue → callback (by time) → no-answer-yesterday → new → remaining
    const order = { overdue: 0, callback: 1, "no-answer-yesterday": 2, new: 3, remaining: 4 } as const;
    out.today.sort((a, b) => {
      const oa = order[a.section]; const ob = order[b.section];
      if (oa !== ob) return oa - ob;
      // within callback section, sort by scheduled time ascending
      if (a.section === "callback" || a.section === "overdue") {
        const ta = a.lead.callback_scheduled_at ? new Date(a.lead.callback_scheduled_at).getTime() : 0;
        const tb = b.lead.callback_scheduled_at ? new Date(b.lead.callback_scheduled_at).getTime() : 0;
        return ta - tb;
      }
      return new Date(b.lead.created_at).getTime() - new Date(a.lead.created_at).getTime();
    });

    out.yesterday.sort((a, b) => {
      const ya = callbackOn(a, yesterday) ? 0 : 1;
      const yb = callbackOn(b, yesterday) ? 0 : 1;
      if (ya !== yb) return ya - yb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    out.tomorrow.sort((a, b) => {
      const ta = a.callback_scheduled_at ? new Date(a.callback_scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.callback_scheduled_at ? new Date(b.callback_scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, attemptsByDay, forcedCol, todayKey, yesterdayKey]);

  // Per-lead generation status for the AI pipeline summary so cards can show
  // "Generating…" while the edge function builds the one-liner. Triggered
  // lazily for any lead that doesn't have a cached summary yet.
  const [genStatus, setGenStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});
  const genQueueRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing = leads.filter((l) => !l.pipeline_summary && !genQueueRef.current.has(l.id)).slice(0, 6);
    if (!missing.length) return;
    missing.forEach((l) => genQueueRef.current.add(l.id));
    setGenStatus((s) => {
      const next = { ...s };
      missing.forEach((l) => { next[l.id] = "loading"; });
      return next;
    });
    (async () => {
      for (const l of missing) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-pipeline-summary", { body: { lead_id: l.id } });
          if (error) throw error;
          const summary = (data?.summary ?? "").toString();
          if (summary && onLocalLeadUpdate) onLocalLeadUpdate(l.id, { pipeline_summary: summary });
          setGenStatus((s) => ({ ...s, [l.id]: "done" }));
        } catch (err) {
          console.warn("pipeline summary failed for", l.id, err);
          setGenStatus((s) => ({ ...s, [l.id]: "error" }));
        }
      }
    })();
  }, [leads, onLocalLeadUpdate]);

  // Apply manual reordering on top of the auto buckets. When the user has
  // dragged any card within a column, that column renders as one flat list
  // in the manual order (so they can slot a lead anywhere — not auto-bottom).
  const orderedYesterday = useMemo(() => {
    const ids = manualOrder.yesterday;
    if (ids.length === 0) return buckets.yesterday;
    const map = new Map(buckets.yesterday.map((l) => [l.id, l] as const));
    const ordered: Lead[] = [];
    for (const id of ids) { const l = map.get(id); if (l) { ordered.push(l); map.delete(id); } }
    for (const l of buckets.yesterday) if (map.has(l.id)) { ordered.push(l); map.delete(l.id); }
    return ordered;
  }, [buckets.yesterday, manualOrder.yesterday]);

  const orderedTomorrow = useMemo(() => {
    const ids = manualOrder.tomorrow;
    if (ids.length === 0) return buckets.tomorrow;
    const map = new Map(buckets.tomorrow.map((l) => [l.id, l] as const));
    const ordered: Lead[] = [];
    for (const id of ids) { const l = map.get(id); if (l) { ordered.push(l); map.delete(id); } }
    for (const l of buckets.tomorrow) if (map.has(l.id)) { ordered.push(l); map.delete(l.id); }
    return ordered;
  }, [buckets.tomorrow, manualOrder.tomorrow]);

  const todayManualFlat = useMemo(() => {
    const ids = manualOrder.today;
    if (ids.length === 0) return null;
    const map = new Map(buckets.today.map((it) => [it.lead.id, it] as const));
    const ordered: { section: "overdue" | "callback" | "no-answer-yesterday" | "new" | "remaining"; lead: Lead }[] = [];
    for (const id of ids) { const it = map.get(id); if (it) { ordered.push(it); map.delete(id); } }
    for (const it of buckets.today) if (map.has(it.lead.id)) { ordered.push(it); map.delete(it.lead.id); }
    return ordered;
  }, [buckets.today, manualOrder.today]);

  // Keep a ref of what's currently rendered in each column so drop math works.
  useEffect(() => {
    colOrderRef.current = {
      yesterday: orderedYesterday.map((l) => l.id),
      today: (todayManualFlat ?? buckets.today).map((it) => it.lead.id),
      tomorrow: orderedTomorrow.map((l) => l.id),
    };
  }, [orderedYesterday, orderedTomorrow, todayManualFlat, buckets.today]);

  const setDropPreview = useCallback((next: { col: DayCol; beforeId: string | null } | null) => {
    const prev = dropTargetRef.current;
    if (prev?.col === next?.col && prev?.beforeId === next?.beforeId) return;
    dropTargetRef.current = next;
    setDropCol(next?.col ?? null);
    setDropTarget(next);
  }, []);

  const columnFromSection = (section: string): DayCol =>
    section === "yesterday" ? "yesterday" : section === "tomorrow" ? "tomorrow" : "today";

  const blocksCardDrag = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest("button,a,input,textarea,select,[data-no-card-drag]");

  const dropTargetFromPoint = (leadId: string, x: number, y: number) => {
    const draggedEl = document.querySelector(`[data-lead-card][data-lead-id="${leadId}"]`) as HTMLElement | null;
    const draggedRect = draggedEl?.getBoundingClientRect();
    if (draggedRect && x >= draggedRect.left && x <= draggedRect.right && y >= draggedRect.top && y <= draggedRect.bottom) return null;
    const previousPointerEvents = draggedEl?.style.pointerEvents;
    if (draggedEl) draggedEl.style.pointerEvents = "none";
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (draggedEl) draggedEl.style.pointerEvents = previousPointerEvents ?? "";
    const column = el?.closest("[data-drop-col]") as HTMLElement | null;
    const col = column?.dataset.dropCol as DayCol | undefined;
    if (!col) return null;

    const card = el?.closest("[data-lead-card]") as HTMLElement | null;
    const overId = card?.dataset.leadId;
    if (overId === leadId) return null;
    if (!column || !card || !overId || !column.contains(card)) return { col, beforeId: null };

    const rect = card.getBoundingClientRect();
    const isAbove = y < rect.top + rect.height / 2;
    return { col, beforeId: isAbove ? overId : nextLeadIdInCol(col, overId) };
  };

  const finishDrag = useCallback((clientX: number, clientY: number, pointerId?: number) => {
    const state = dragStateRef.current;
    if (pointerId !== undefined && state && state.pointerId !== pointerId) return;
    if (!state) return;
    dragStateRef.current = null;
    const originalEl = document.querySelector(`[data-lead-card][data-lead-id="${state.id}"]`) as HTMLElement | null;
    const originalRect = originalEl?.getBoundingClientRect();
    if (state.dragging && originalRect && clientX >= originalRect.left && clientX <= originalRect.right && clientY >= originalRect.top && clientY <= originalRect.bottom) {
      setDropPreview(null);
      setDragVisual(null);
      return;
    }
    const target = dropTargetFromPoint(state.id, clientX, clientY) ?? dropTargetRef.current;
    setDropPreview(null);
    setDragVisual(null);
    if (state.dragging && target) void handleDrop(state.id, target.col, target);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || (state.pointerId !== -1 && state.pointerId !== e.pointerId)) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      if (!state.dragging && Math.hypot(dx, dy) < 8) return;
      e.preventDefault();
      state.dragging = true;
      setDragVisual({ id: state.id, left: e.clientX - state.offsetX, top: e.clientY - state.offsetY, width: state.width, height: state.height });
      setDropPreview(dropTargetFromPoint(state.id, e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => finishDrag(e.clientX, e.clientY, e.pointerId);
    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    const onBlur = () => finishDrag(0, 0);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [finishDrag]);

  // Close the status menu when the user presses Escape.
  useEffect(() => {
    if (!openStatusFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenStatusFor(null); setStatusAnchor(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openStatusFor]);

  // Mutators
  const changeStatus = async (leadId: string, key: StatusKey) => {
    const lead = leads.find((l) => l.id === leadId);
    const patch: Partial<Lead> = {
      status: key,
      ...(key !== "callback_scheduled" ? { callback_scheduled_at: null } : {}),
    };
    // Optimistic local update so UI updates immediately, no refresh required.
    onLocalLeadUpdate?.(leadId, patch);
    setOpenStatusFor(null);
    setStatusAnchor(null);
    setSavingStatus(leadId);
    try {
      const nowIso = new Date().toISOString();
      const dbPatch = key !== "callback_scheduled"
        ? { status: key, callback_scheduled_at: null, updated_at: nowIso }
        : { status: key, updated_at: nowIso };
      const { error } = await supabase
        .from("meta_leads")
        .update(dbPatch)
        .eq("id", leadId);
      if (error) throw error;
      toast.success("Status updated");
    } catch {
      onLocalLeadUpdate?.(leadId, {
        status: lead?.status ?? null,
        callback_scheduled_at: lead?.callback_scheduled_at ?? null,
      });
      toast.error("Couldn't update status");
    } finally {
      setSavingStatus(null);
    }
  };

  const moveToToday = async (leadId: string) => {
    // Optimistic local override so the card jumps columns instantly
    setForcedCol((prev) => ({ ...prev, [leadId]: "today" }));
    const lead = leads.find((l) => l.id === leadId);
    const rawPayload = { ...rawPayloadObject(lead?.raw_payload ?? null), pipeline_column: "today", pipeline_column_date: localDateKey(today) };
    onLocalLeadUpdate?.(leadId, { raw_payload: rawPayload });
    // If the lead has a callback set for tomorrow, clear it back to today's next slot
    if (lead?.callback_scheduled_at) {
      const cb = new Date(lead.callback_scheduled_at);
      if (sameLocalDate(cb, tomorrow)) {
        const next = new Date();
        next.setMinutes(next.getMinutes() + 30);
        onLocalLeadUpdate?.(leadId, { callback_scheduled_at: next.toISOString(), raw_payload: rawPayload });
        await supabase
          .from("meta_leads")
          .update({ callback_scheduled_at: next.toISOString(), raw_payload: rawPayload, updated_at: new Date().toISOString() })
          .eq("id", leadId);
        toast.success("Moved to Today");
        return;
      }
    }
    await supabase
      .from("meta_leads")
      .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    toast.success("Moved to Today");
  };

  const moveToTomorrow = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    const rawPayload = { ...rawPayloadObject(lead?.raw_payload ?? null), pipeline_column: "tomorrow", pipeline_column_date: localDateKey(today) };
    setForcedCol((prev) => ({ ...prev, [leadId]: "tomorrow" }));
    onLocalLeadUpdate?.(leadId, { raw_payload: rawPayload });
    await supabase
      .from("meta_leads")
      .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    toast.success("Moved to Tomorrow");
  };

  const moveToYesterday = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    const rawPayload = { ...rawPayloadObject(lead?.raw_payload ?? null), pipeline_column: "yesterday", pipeline_column_date: localDateKey(today) };
    setForcedCol((prev) => ({ ...prev, [leadId]: "yesterday" }));
    // Clear any future callback so it doesn't drag the lead back to today/tomorrow
    onLocalLeadUpdate?.(leadId, { callback_scheduled_at: null, raw_payload: rawPayload });
    await supabase
      .from("meta_leads")
      .update({ callback_scheduled_at: null, raw_payload: rawPayload, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    toast.success("Moved to Yesterday");
  };

  const clearCallback = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    const wasCallbackStatus = normaliseStatus(lead?.status, lead) === "callback_scheduled";
    const newStatus = wasCallbackStatus ? "in_progress" : lead?.status;
    // Optimistic local update so the card refreshes immediately
    onLocalLeadUpdate?.(leadId, {
      callback_scheduled_at: null,
      ...(wasCallbackStatus ? { status: "in_progress" } : {}),
    });
    try {
      const nowIso = new Date().toISOString();
      const query = wasCallbackStatus
        ? supabase.from("meta_leads").update({ callback_scheduled_at: null, status: newStatus ?? "in_progress", updated_at: nowIso }).eq("id", leadId)
        : supabase.from("meta_leads").update({ callback_scheduled_at: null, updated_at: nowIso }).eq("id", leadId);
      const { error } = await query;
      if (error) throw error;
      toast.success("Callback removed");
    } catch (e) {
      // Revert optimistic change on failure
      onLocalLeadUpdate?.(leadId, {
        callback_scheduled_at: lead?.callback_scheduled_at ?? null,
        ...(wasCallbackStatus ? { status: lead?.status } : {}),
      });
      toast.error(`Couldn't remove callback${e instanceof Error ? `: ${e.message}` : ""}`);
    }
  };

  const renderStatusBadge = (l: Lead) => {
    const meta = statusMeta(l.status, l);
    const showTime = meta.key === "callback_scheduled" && l.callback_scheduled_at;
    const cb = l.callback_scheduled_at ? new Date(l.callback_scheduled_at) : null;
    const cbLabel = cb ? cb.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }) : "";
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          if (openStatusFor === l.id) {
            setOpenStatusFor(null);
          } else {
            // Estimated menu height (8 status options ~36px + cancel + padding)
            const estimatedMenuHeight = 360;
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow < estimatedMenuHeight + 16
              ? Math.max(8, rect.top - estimatedMenuHeight - 4)
              : rect.bottom + 4;
            setStatusAnchor({ top, left: rect.left });
            setOpenStatusFor(l.id);
          }
        }}
        disabled={savingStatus === l.id}
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          background: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.color}33`,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{meta.emoji}</span>
        <span>{meta.label}{showTime ? ` — ${cbLabel}` : ""}</span>
        <ChevronDown style={{ width: 12, height: 12, opacity: 0.6 }} />
      </button>
    );
  };

  const renderLeadCard = (
    l: Lead,
    opts: { tone?: "muted" | "today"; section?: "overdue" | "callback" | "no-answer-yesterday" | "new" | "remaining" | "tomorrow" | "yesterday"; preview?: boolean } = {}
  ) => {
    const tone = opts.tone ?? "today";
    const section = opts.section ?? "remaining";
    const u = leadUrgency(l);
    const day = pipelineDay(l, firstCallByLead[l.id]);
    const attempts = ATTEMPTS_PER_DAY(day);
    const todayCount = attemptCounts[l.id] ?? 0;
    const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unnamed lead";
    const cb = l.callback_scheduled_at ? new Date(l.callback_scheduled_at) : null;
    const cbTime = cb ? cb.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }) : null;


    let accent: string = "transparent";
    let banner: { text: string; color: string; bg: string } | null = null;
    if (section === "overdue" || (section === "callback" && u === "overdue")) {
      accent = COLORS.red;
      banner = { text: `⚠️ Overdue — ${name} was due at ${cbTime ?? ""}`.trim(), color: "#fff", bg: COLORS.red };
    } else if (section === "callback") {
      accent = COLORS.coral;
      banner = { text: `📞 Call ${name}${cbTime ? ` at ${cbTime}` : ""}`, color: "#fff", bg: COLORS.coral };
    } else if (section === "no-answer-yesterday") {
      accent = COLORS.amber;
    } else if (section === "new") {
      accent = COLORS.blue;
    }

    return (
      <div
        key={l.id}
        data-lead-card
        data-lead-id={l.id}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (opts.preview || e.button !== 0 || blocksCardDrag(e.target)) return;
          const col = columnFromSection(section);
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          dragStateRef.current = { id: l.id, col, pointerId: e.pointerId, dragging: false, startX: e.clientX, startY: e.clientY, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, width: rect.width, height: rect.height };
          // Do NOT call setPointerCapture — it routes pointer events away from
          // document-level listeners on some browsers, which breaks drop detection.
        }}
        className="rounded-[10px]"
        style={{
          background: "#ffffff",
          border: `0.5px solid ${COLORS.line}`,
          borderLeft: accent === "transparent" ? `0.5px solid ${COLORS.line}` : `4px solid ${accent}`,
          marginBottom: 8,
          // Drop indicator above this card
          boxShadow: dropTarget?.beforeId === l.id ? `inset 0 3px 0 0 ${COLORS.coral}` : undefined,
          transition: "box-shadow 80ms",
          cursor: "grab",
          opacity: !opts.preview && dragVisual?.id === l.id ? 0.18 : tone === "muted" ? 0.7 : 1,
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}
      >
        {banner && (
          <div style={{ background: banner.bg, color: banner.color, fontSize: 12, fontWeight: 600, padding: "6px 12px" }}>
            {banner.text}
          </div>
        )}
        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Visual grip only — the whole card now moves from the first press. */}
          <div
            title="Drag to move"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 36, flexShrink: 0,
              pointerEvents: "none",
              color: "#bbb", fontSize: 14, lineHeight: 1,
              userSelect: "none", WebkitUserSelect: "none",
              touchAction: "none",
            }}
          >
            ⋮⋮
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{name}</div>
              {(() => {
                const a = (l.ad_set_name ?? "").toLowerCase();
                const loc = a.includes("melbourne") ? "MELBOURNE" : a.includes("byron") ? "BYRON" : a.includes("sydney") ? "SYDNEY" : null;
                if (!loc) return null;
                const c = loc === "MELBOURNE" ? { bg: "#e0f2fe", fg: "#075985" } : loc === "SYDNEY" ? { bg: "#f3e8ff", fg: "#6b21a8" } : { bg: "#dcfce7", fg: "#166534" };
                return (
                  <span style={{ background: c.bg, color: c.fg, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 8px", borderRadius: 999 }}>
                    {loc}
                  </span>
                );
              })()}
              <span style={{ fontSize: 11, color: "#999" }}>· {fmtShort(l.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 8 }}>
              {renderStatusBadge(l)}
              <span style={{ fontSize: 11, color: "#666" }}>
                Day {day} · Attempt {Math.min(todayCount, attempts)} of {attempts}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button
              onClick={() => onPick(l.id)}
              className="rounded-[8px] flex-shrink-0"
              style={{
                background: tone === "muted" ? "#f5f5f4" : COLORS.coral,
                color: tone === "muted" ? "#111" : "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 14px",
                border: tone === "muted" ? `1px solid ${COLORS.line}` : "none",
              }}
            >
              {tone === "muted" ? "Open" : "Start →"}
            </button>
            {section === "tomorrow" && (
              <button
                onClick={() => void moveToToday(l.id)}
                style={{ fontSize: 11, color: COLORS.coral, background: "transparent", textDecoration: "underline" }}
              >
                ← Move to Today
              </button>
            )}
            {section !== "tomorrow" && section !== "yesterday" && (
              <button
                onClick={() => void moveToTomorrow(l.id)}
                style={{ fontSize: 11, color: "#666", background: "transparent", textDecoration: "underline" }}
              >
                Push to Tomorrow →
              </button>
            )}
            {l.callback_scheduled_at && (
              <button
                onClick={() => void clearCallback(l.id)}
                title="Remove the scheduled callback for this lead"
                style={{ fontSize: 11, color: COLORS.red, background: "transparent", textDecoration: "underline" }}
              >
                ✕ Clear callback
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Today subgroup headers
  const todayGrouped = useMemo(() => {
    const groups: Record<string, Lead[]> = { overdue: [], callback: [], "no-answer-yesterday": [], new: [], remaining: [] };
    for (const item of buckets.today) groups[item.section].push(item.lead);
    return groups;
  }, [buckets.today]);

  // Collapsed today sections (each section can be folded so the rep can
  // skip past New leads to get to Remaining etc.).
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (k: string) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));

  const SectionHeader = ({ title, count, color, sectionKey }: { title: string; count: number; color: string; sectionKey: string }) => {
    if (count === 0) return null;
    const isCollapsed = !!collapsed[sectionKey];
    return (
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
          color, margin: "12px 0 6px", background: "transparent", border: "none",
          cursor: "pointer", padding: "2px 4px", width: "100%", textAlign: "left",
        }}
      >
        <ChevronDown
          style={{
            width: 12, height: 12, opacity: 0.7,
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 120ms",
          }}
        />
        <span>{title} · {count}</span>
      </button>
    );
  };

  // Helper for renderLeadCard's onDragOver: given a column and a lead id,
  // return the id of the lead that comes AFTER it in render order (or null
  // if it's the last). Used so dropping in the bottom half of a card inserts
  // the dragged lead immediately after it.
  const nextLeadIdInCol = (col: DayCol, afterId: string): string | null => {
    const arr = colOrderRef.current[col];
    const i = arr.indexOf(afterId);
    if (i < 0 || i === arr.length - 1) return null;
    return arr[i + 1];
  };

  // Drop handlers
  const handleDrop = async (id: string, col: DayCol, target: { col: DayCol; beforeId: string | null } | null) => {
    setDropPreview(null);

    // 1) Update column membership when crossing day boundaries
    const wasInCol: DayCol =
      colOrderRef.current.yesterday.includes(id) ? "yesterday" :
      colOrderRef.current.tomorrow.includes(id) ? "tomorrow" : "today";
    if (wasInCol !== col) {
      if (col === "today") void moveToToday(id);
      else if (col === "tomorrow") void moveToTomorrow(id);
      else void moveToYesterday(id);
    }

    // 2) Apply manual ordering inside the target column
    setManualOrder((prev) => {
      // Start from current rendered order so we preserve existing layout
      const base = [...colOrderRef.current[col]].filter((x) => x !== id);
      let insertAt = base.length;
      if (target && target.col === col && target.beforeId) {
        const idx = base.indexOf(target.beforeId);
        if (idx >= 0) insertAt = idx;
      }
      base.splice(insertAt, 0, id);
      return { ...prev, [col]: base };
    });
  };

  const Column = ({
    title, subtitle, tone, col, children, count,
  }: {
    title: string; subtitle: string; tone: "muted" | "today";
    col: DayCol; children: React.ReactNode; count: number;
  }) => (
    <div
      data-drop-col={col}
      onPointerEnter={() => { if (dragStateRef.current?.dragging) setDropPreview({ col, beforeId: null }); }}
      style={{
        flex: 1,
        minWidth: 0,
        background: tone === "today" ? "#ffffff" : "#fafafa",
        border: `1px solid ${dropCol === col ? COLORS.coral : COLORS.line}`,
        borderRadius: 14,
        padding: 14,
        opacity: tone === "muted" ? 0.85 : 1,
        transition: "border-color 120ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: tone === "today" ? "#111" : "#666" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#999" }}>{count} {count === 1 ? "lead" : "leads"}</div>
      </div>
      <div style={{ fontSize: 11, color: "#999", marginBottom: 10 }}>{subtitle}</div>
      {children}
    </div>
  );

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "#f7f7f5", color: COLORS.text }}
      onClick={(e) => {
        // Only close the status popover when the click is on the bare
        // background — clicks anywhere else (cards, popover, buttons) keep
        // the popover open so options can be selected.
        if (e.target === e.currentTarget) {
          setOpenStatusFor(null);
          setStatusAnchor(null);
        }
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", lineHeight: 1.2 }}>
              Today's call sheet
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
              {todayGrouped.callback.length + todayGrouped.overdue.length} callback{(todayGrouped.callback.length + todayGrouped.overdue.length) === 1 ? "" : "s"} ·{" "}
              {todayGrouped["no-answer-yesterday"].length} to retry from yesterday ·{" "}
              {todayGrouped.new.length} new lead{todayGrouped.new.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="relative" style={{ minWidth: 260 }}>
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
                fontSize: 13,
                padding: "10px 12px 10px 36px",
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: "1.6fr 1fr" }}>

          <Column
            title="Today"
            subtitle={today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}
            tone="today"
            col="today"
            count={buckets.today.length}
          >
            {buckets.today.length === 0 && <div style={{ fontSize: 13, color: "#888" }}>You're all caught up.</div>}
            {todayManualFlat ? (
              todayManualFlat.map((it) => renderLeadCard(it.lead, { section: it.section }))
            ) : (
              <>
                <SectionHeader title="⚠️ Overdue callbacks" count={todayGrouped.overdue.length} color={COLORS.red} sectionKey="overdue" />
                {!collapsed.overdue && todayGrouped.overdue.map((l) => renderLeadCard(l, { section: "overdue" }))}
                <SectionHeader title="📞 Callbacks scheduled" count={todayGrouped.callback.length} color={COLORS.coral} sectionKey="callback" />
                {!collapsed.callback && todayGrouped.callback.map((l) => renderLeadCard(l, { section: "callback" }))}
                <SectionHeader title="🟡 No answer yesterday" count={todayGrouped["no-answer-yesterday"].length} color={COLORS.amber} sectionKey="no-answer-yesterday" />
                {!collapsed["no-answer-yesterday"] && todayGrouped["no-answer-yesterday"].map((l) => renderLeadCard(l, { section: "no-answer-yesterday" }))}
                <SectionHeader title="🔵 New leads" count={todayGrouped.new.length} color={COLORS.blue} sectionKey="new" />
                {!collapsed.new && todayGrouped.new.map((l) => renderLeadCard(l, { section: "new" }))}
                <SectionHeader title="Remaining" count={todayGrouped.remaining.length} color="#999" sectionKey="remaining" />
                {!collapsed.remaining && todayGrouped.remaining.map((l) => renderLeadCard(l, { section: "remaining" }))}
              </>
            )}
          </Column>

          {/* Tomorrow column removed per request — leads pushed to tomorrow will surface in Today on the next day. */}
        </div>
      </div>

      {dragVisual && (() => {
        const lead = leads.find((item) => item.id === dragVisual.id);
        if (!lead) return null;
        return (
          <div
            style={{
              position: "fixed",
              left: dragVisual.left,
              top: dragVisual.top,
              width: dragVisual.width,
              height: dragVisual.height,
              zIndex: 2000,
              pointerEvents: "none",
              transform: "rotate(1deg)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
            }}
          >
            {renderLeadCard(lead, { tone: forcedCol[lead.id] === "tomorrow" ? "muted" : "today", section: forcedCol[lead.id] === "tomorrow" ? "tomorrow" : "remaining", preview: true })}
          </div>
        );
      })()}

      {openStatusFor && statusAnchor && (() => {
        const lead = leads.find((x) => x.id === openStatusFor);
        if (!lead) return null;
        return (
          <>
            {/* Full-screen backdrop catches clicks anywhere outside the menu */}
            <div
              onClick={() => { setOpenStatusFor(null); setStatusAnchor(null); }}
              onContextMenu={(e) => { e.preventDefault(); setOpenStatusFor(null); setStatusAnchor(null); }}
              style={{ position: "fixed", inset: 0, zIndex: 999, background: "transparent" }}
            />
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: statusAnchor.top,
                left: statusAnchor.left,
                zIndex: 1000,
                background: "#fff",
                border: `1px solid ${COLORS.line}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: 220,
                maxHeight: "calc(100vh - 16px)",
                overflowY: "auto",
                padding: 4,
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => void changeStatus(lead.id, opt.key)}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 10px",
                    borderRadius: 6, background: "transparent", color: "#111",
                    fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                    border: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f4")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{opt.emoji}</span>
                  <span style={{ color: opt.color, fontWeight: 600 }}>{opt.label}</span>
                </button>
              ))}
              <div style={{ height: 1, background: COLORS.line, margin: "4px 0" }} />
              <button
                type="button"
                onClick={() => { setOpenStatusFor(null); setStatusAnchor(null); }}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 10px",
                  borderRadius: 6, background: "transparent", color: "#666",
                  fontSize: 12, cursor: "pointer", border: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f4")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Cancel
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}

/* ─────────────── RIGHT PANEL (in-call) ─────────────── */

// Pill-bar objections — short labels mapped to the full NEPQ responses
function CallbacksTodayButton({ callbacks, onPick }: { callbacks: Lead[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const count = callbacks.length;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Scheduled callbacks today"
        style={{ position: "relative", background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "8px 10px", cursor: "pointer", color: "#e8e8e8", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
      >
        <PhoneCall size={16} />
        {count > 0 && (
          <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "#f4522d", color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{count}</span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, maxHeight: 360, overflow: "auto", background: "#fff", color: "#111", border: "0.5px solid #e8e8e6", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 50 }}>
          <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f0f0ee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Callbacks today</div>
            <div style={{ fontSize: 11, color: "#888" }}>{count} scheduled</div>
          </div>
          {count === 0 ? (
            <div style={{ padding: "18px 14px", fontSize: 13, color: "#888", textAlign: "center" }}>No callbacks scheduled for today.</div>
          ) : (
            callbacks.map((l) => {
              const t = new Date(l.callback_scheduled_at!);
              const overdue = t.getTime() <= Date.now();
              const time = t.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
              const name = `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "(no name)";
              return (
                <button
                  key={l.id}
                  onClick={() => { onPick(l.id); setOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 14px", background: "transparent", border: "none", borderBottom: "0.5px solid #f4f4f2", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: overdue ? "#b91c1c" : "#c2410c", background: overdue ? "#fee2e2" : "#ffedd5", padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>{overdue ? "Overdue" : time}</span>
                    <span style={{ fontSize: 13, color: "#111", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{overdue ? time : ""} ›</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

