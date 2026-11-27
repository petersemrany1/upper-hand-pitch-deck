// Ported from the Legal app (family-law-floater/src/routes/_authenticated/sales-call.tsx). Re-run the port script to refresh.
import { useFirmOffices } from "@/legal/components/firm-portal/FirmOffices";
import { chosenOfficeId } from "@/legal/lib/firm-offices";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calculator,
  PhoneCall,
  PhoneForwarded,
  Play,
  Square,
} from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import { supabase } from "@/legal/integrations/supabase/client";
import { prepareHandoverIntel } from "@/legal/lib/handover-preparation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/legal/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/legal/components/ui/tabs";
import { LEAD_STATUSES, fetchCurrentStaff, leadName, statusMeta } from "@/legal/lib/client-leads";
import {
  fetchBlockedSlots,
  fetchFirmBookings,
  fetchFirms,
  fetchLawyers,
  fetchPacks,
  fetchTradingHours,
} from "@/legal/lib/partner-firms";
import {
  appendObjection,
  bumpSession,
  buildPicture,
  buildSummary,
  endSession,
  fetchCallRecords,
  fetchLead,
  fetchOpenSession,

  isCallbackDue,
  markDepositPaid,
  resetDepositAndHandover,
  startSession,
  updateLead,
  type CallLead,
} from "@/legal/lib/sales-call";
import { isBookedPaid } from "@/legal/lib/call-queue";
import { useSalesQueue } from "@/legal/hooks/use-sales-queue";
import { useCallNotes } from "@/legal/hooks/use-call-notes";
import { useServerFn } from "@tanstack/react-start";
import { checkDepositPayment, sendDepositLink } from "@/legal/lib/deposit.functions";
import {
  confirmBookingFn,
  rescheduleBookingFn,
  leadBookingStateFn,
  rebookAfterNoShowFn,
  confirmationSmsStatusFn,
  handoverStatusFn,
  sendConfirmationSmsFn,
  sendHandoverFn,
  previewConfirmationSmsFn,
  previewHandoverFn,
  generateHandoverIntelFn,

  resetConfirmationSmsFn,
  consultModeFn,
  setConsultModeFn,
} from "@/legal/lib/booking.functions";
import { STEPS, type StepContext } from "@/legal/components/sales-call/steps";
import { LeadPanel } from "@/legal/components/sales-call/LeadPanel";
import { CallNotes } from "@/legal/components/sales-call/call-notes";
import { ManualDepositDialog } from "@/legal/components/sales-call/manual-deposit-dialog";
import { InboxPhone } from "@/legal/components/sales-call/inbox-phone";
import {
  ConfirmationSmsDialog,
  HandoverDialog,
  type HandoverPreview,
  type SmsPreview,
} from "@/legal/components/sales-call/send-flow";
import { OutcomeModal } from "@/legal/components/sales-call/outcome-modal";
import { CallWidget } from "@/legal/components/sales-call/call-widget";
import { SessionTimer } from "@/legal/components/sales-call/session-timer";
import { PreviousCallsButton } from "@/legal/components/sales-call/previous-calls";
import { ClientReview } from "@/legal/components/sales-call/client-review";
import { ClientAssetCalculator } from "@/legal/components/sales-call/client-assets";
import { useDialler } from "@/legal/hooks/use-dialler";


// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { SalesCallPage as LegalPage };
export const Route = legalRoute({
  validateSearch: (search: Record<string, unknown>): { lead: string | undefined; view?: "review" } => ({
    lead: typeof search['lead'] === "string" && search['lead'] ? search['lead'] : undefined,
    ...(search['view'] === "review" ? { view: "review" } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sales Call — Legal Group Portal" },
      { name: "description", content: "The rep calling workspace for divorce enquiry leads." },
      { property: "og:title", content: "Sales Call — Legal Group Portal" },
      {
        property: "og:description",
        content: "The rep calling workspace for divorce enquiry leads.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SalesCallPage,
});

const SOON = "Connects in the next update";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function SessionBar({
  sessionId,
  startedAt,
  calls,
  bookings,
  onEnd,
  children,
}: {
  sessionId: string;
  startedAt: string;
  calls: number;
  bookings: number;
  onEnd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2">
      <SessionTimer key={sessionId} sessionId={sessionId} startedAt={startedAt} />
      <span className="text-xs text-muted-foreground">{calls} calls</span>
      <span className="text-xs text-muted-foreground">{bookings} bookings</span>
      <span className="text-xs text-muted-foreground">Shared queue · Newest first</span>
      <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-3">
        {children}
        <Button size="sm" variant="outline" onClick={onEnd}>
          <Square className="mr-1 h-3.5 w-3.5" /> End session
        </Button>
      </div>
    </div>
  );
}

function SalesCallPage() {
  const { lead, view } = Route.useSearch();
  const navigate = Route.useNavigate();
  // Unmount the calling workspace completely: a review must never claim or
  // renew a client, start a session, hydrate edits, or initialise the dialler.
  if (view === "review" && lead) {
    return <ClientReview
      key={lead}
      leadId={lead}
      onBack={() => void navigate({ search: { lead: undefined }, replace: true })}
      onOpenCalling={() => void navigate({ search: { lead }, replace: true })}
    />;
  }
  return <SalesCallWorkspace />;
}

function SalesCallWorkspace() {
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();
  const { lead: pinnedLeadId } = Route.useSearch();
  const [startingSession, setStartingSession] = useState(false);
  const startingSessionRef = useRef(false);
  // Outcome gate — in memory only, so a refresh deliberately drops it.
  const [gateLeadId, setGateLeadId] = useState<string | null>(null);
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [handoverGateOpen, setHandoverGateOpen] = useState(false);
  const [lastCallSeconds, setLastCallSeconds] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [mobilePanel, setMobilePanel] = useState("call");
  const [assetsLeadId, setAssetsLeadId] = useState<string | null>(null);
  const [exPartner, setExPartner] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [pictureText, setPictureText] = useState("");
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [returningOpen, setReturningOpen] = useState(false);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const officesQuery = useFirmOffices(selectedFirmId);
  const bookingLocationId = chosenOfficeId(officesQuery.data ?? [], selectedLocationId);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [consultMode, setConsultMode] = useState<"in_person" | "zoom">("in_person");
  const [customTime, setCustomTime] = useState(false);
  const [booking, setBooking] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [depositLinkLeadId, setDepositLinkLeadId] = useState<string | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsPreview, setSmsPreview] = useState<SmsPreview | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);
  const smsAttempt = useRef(0);
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [handoverPreviewData, setHandoverPreviewData] = useState<HandoverPreview | null>(null);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverIntelBuilding, setHandoverIntelBuilding] = useState(false);
  const [handoverIntelError, setHandoverIntelError] = useState<string | null>(null);
  const [handoverIntelProgress, setHandoverIntelProgress] = useState<string | null>(null);
  const handoverController = useRef<AbortController | null>(null);
  const handoverAttempt = useRef(0);

  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [manualDepositOpen, setManualDepositOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxSeenAt, setInboxSeenAt] = useState<string>(() => {
    if (typeof window === "undefined") return new Date().toISOString();
    return window.localStorage.getItem("inbox-seen-at") ?? new Date(0).toISOString();
  });
  const sendDepositLinkFn = useServerFn(sendDepositLink);
  const checkDepositPaymentFn = useServerFn(checkDepositPayment);
  const bookFn = useServerFn(confirmBookingFn);
  const rescheduleFn = useServerFn(rescheduleBookingFn);
  const bookingStateFn = useServerFn(leadBookingStateFn);
  const rebookFn = useServerFn(rebookAfterNoShowFn);
  const confirmationSendFn = useServerFn(sendConfirmationSmsFn);
  const confirmationStatusFn = useServerFn(confirmationSmsStatusFn);
  const handoverReadyFn = useServerFn(handoverStatusFn);
  const handoverSendFn = useServerFn(sendHandoverFn);
  const smsPreviewFn = useServerFn(previewConfirmationSmsFn);
  const consultModeReadFn = useServerFn(consultModeFn);
  const consultModeWriteFn = useServerFn(setConsultModeFn);
  const handoverPreviewFn = useServerFn(previewHandoverFn);
  const handoverIntelFn = useServerFn(generateHandoverIntelFn);



  const staffQuery = useQuery({ queryKey: ["current-staff"], queryFn: fetchCurrentStaff });
  const staff = staffQuery.data ?? null;
  const isAdmin = staff?.role === "admin";

  const sessionQuery = useQuery({
    queryKey: ["rep-session", staff?.id],
    queryFn: () => fetchOpenSession(staff!.id),
    enabled: Boolean(staff),
    // Recover the count from call records, including callbacks arriving after hangup.
    refetchInterval: (query) => (query.state.data ? 5000 : false),
  });
  const session = sessionQuery.data ?? null;
  const salesQueue = useSalesQueue(session?.id, pinnedLeadId, Boolean(gateLeadId));
  const activeId = salesQueue.leadId;
  useEffect(() => () => {
    handoverAttempt.current++;
    handoverController.current?.abort();
  }, [activeId]);
  const serving = salesQueue.loading;
  const depositLinkSent = depositLinkLeadId === activeId && activeId !== null;
  const leadQuery = useQuery({
    queryKey: ["call-lead", activeId],
    queryFn: () => fetchLead(activeId!),
    enabled: Boolean(activeId),
  });
  const lead = leadQuery.data ?? null;
  const callNotes = useCallNotes(lead, staff?.id);
  const { notes, setNotes, flush: flushNotes, open: notesOpen, setOpen: setNotesOpen } = callNotes;

  const bookingStateQuery = useQuery({
    queryKey: ["lead-booking-state", activeId],
    enabled: Boolean(activeId && lead),
    queryFn: () => bookingStateFn({ data: { leadId: activeId! } }),
    refetchInterval: 15000,
  });

  const prevLeadQuery = useQuery({
    queryKey: ["call-lead-prev", lead?.previous_lead_id],
    queryFn: () => fetchLead(lead!.previous_lead_id!),
    enabled: Boolean(lead?.previous_lead_id),
  });

  const callsQuery = useQuery({
    queryKey: ["call-records", activeId],
    queryFn: () => fetchCallRecords(activeId!),
    enabled: Boolean(activeId),
  });

  const firmsQuery = useQuery({
    queryKey: ["firms"],
    queryFn: fetchFirms,
    // Keep the seeded test record out of every sales picker and city match.
    // Query selection leaves the shared admin/history cache intact.
    select: (firms) =>
      firms.filter((firm) => firm.firm_name.trim().toLowerCase() !== "test family law firm"),
  });
  const packsQuery = useQuery({ queryKey: ["firm-packs"], queryFn: fetchPacks });
  const lawyersQuery = useQuery({
    queryKey: ["firm-lawyers", selectedFirmId],
    queryFn: () => fetchLawyers(selectedFirmId!),
    enabled: Boolean(selectedFirmId),
  });
  const hoursQuery = useQuery({
    queryKey: ["firm-hours", selectedFirmId],
    queryFn: () => fetchTradingHours(selectedFirmId!),
    enabled: Boolean(selectedFirmId),
  });
  const blockedQuery = useQuery({
    queryKey: ["firm-blocked", selectedFirmId],
    queryFn: () => fetchBlockedSlots(selectedFirmId!),
    enabled: Boolean(selectedFirmId),
  });
  // Times already taken at this firm, so booked slots disappear from the picker.
  const firmBookingsQuery = useQuery({
    queryKey: ["firm-bookings", selectedFirmId],
    queryFn: () => fetchFirmBookings(selectedFirmId!),
    enabled: Boolean(selectedFirmId),
  });

  // Remaining consults per firm — safe lookup, no access to pack rows needed.
  const firmIds = (firmsQuery.data ?? []).map((f) => f.id);
  const balancesQuery = useQuery({
    queryKey: ["pack-balances", firmIds.join(",")],
    enabled: firmIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        firmIds.map(async (id) => {
          const { data } = await supabase.rpc("get_firm_pack_balance", { _firm_id: id });
          return [id, typeof data === "number" ? data : null] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number | null>;
    },
  });

  const unreadQuery = useQuery({
    queryKey: ["inbox-unread", inboxSeenAt],
    queryFn: async () => {
      const { count } = await supabase
        .from("sms_messages")
        .select("id", { count: "exact", head: true })
        .eq("direction", "inbound")
        .gt("created_at", inboxSeenAt);
      return count ?? 0;
    },
    refetchInterval: 20000,
  });
  const unreadCount = unreadQuery.data ?? 0;

  // The booked appointment's consult mode, so the toggle reflects reality.
  const consultModeQuery = useQuery({
    queryKey: ["consult-mode", activeId],
    enabled: Boolean(activeId) && Boolean(lead?.booking_date),
    queryFn: () => consultModeReadFn({ data: { leadId: activeId! } }),
  });

  useEffect(() => {
    const saved = consultModeQuery.data?.mode;
    if (saved) setConsultMode(saved);
  }, [consultModeQuery.data?.mode, activeId]);

  const changeConsultMode = (mode: "in_person" | "zoom") => {
    if (mode === "in_person" && bookingStateQuery.data?.kind === "active" && !bookingLocationId) {
      toast.error("Choose an office before switching to in person");
      return;
    }
    setConsultMode(mode);
    if (!activeId || bookingStateQuery.data?.kind !== "active") return;
    void consultModeWriteFn({ data: { leadId: activeId, mode, locationId: bookingLocationId } })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["consult-mode", activeId] });
        void queryClient.invalidateQueries({ queryKey: ["confirmation-sms", activeId] });
        void queryClient.invalidateQueries({ queryKey: ["lead-booking-state", activeId] });
        toast.success(mode === "zoom" ? "Consult set to Zoom" : "Consult set to in person");
      })
      .catch((e: unknown) => { setConsultMode(consultModeQuery.data?.mode ?? "in_person"); toast.error((e as Error).message); });
  };

  const confirmationQuery = useQuery({
    queryKey: ["confirmation-sms", activeId],
    enabled: Boolean(activeId) && Boolean(lead?.booking_date),
    queryFn: () => confirmationStatusFn({ data: { leadId: activeId! } }),
  });

  const handoverQuery = useQuery({
    queryKey: [
      "handover-ready",
      activeId,
      lead?.call_notes,
      lead?.deposit_paid_at,
      lead?.handover_sent_at,
    ],
    enabled: Boolean(activeId) && Boolean(lead?.booking_date),
    queryFn: () => handoverReadyFn({ data: { leadId: activeId! } }),
  });



  const actionPending = useRef(false);
  async function runSalesAction(action: () => Promise<void>) {
    if (serving || actionPending.current) return;
    actionPending.current = true;
    try { await action(); } finally { actionPending.current = false; }
  }

  const finishSession = (message?: string) => runSalesAction(async () => {
      try {
        await flushNotes();
        if (session) await endSession(session.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not end this session.");
        return;
      }
      setGateLeadId(null);
      setOutcomeOpen(false);
      setHandoverGateOpen(false);
      hydratedFor.current = null;
      if (staff) {
        queryClient.setQueryData(["rep-session", staff.id], null);
        void queryClient.invalidateQueries({ queryKey: ["rep-session", staff.id] });
        void queryClient.invalidateQueries({ queryKey: ["rep-today", staff.id] });
      }
      if (message) toast.success(message);
    });

  /** Recheck the shared pool on every Next, always newest eligible first. */
  const advance = async () => {
    try { await flushNotes(); } catch {
      toast.error("Your notes couldn’t be saved. Please retry before moving on.");
      return;
    }
    if (!(await salesQueue.load(true))) return;
    // Once the rep moves past the very first lead of this session, the mindset
    // step is retired; every subsequent lead starts on the Opening step.
    if (session) {
      try {
        window.localStorage.setItem(`sales-call-mindset-shown-${session.id}`, "1");
      } catch {
        /* storage unavailable — fall back to in-memory behaviour */
      }
    }
    setGateLeadId(null);
    setOutcomeOpen(false);
    setHandoverGateOpen(false);
    setStepIndex(0);
    setSummaryText("");
    setPictureText("");
    hydratedFor.current = null;
    // Moving on releases the pinned lead so a later refresh doesn't jump back.
    if (pinnedLeadId) void navigate({ search: { lead: undefined }, replace: true });

  };

  // Hydrate editable fields when the active lead changes.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!lead || hydratedFor.current === lead.id) return;
    hydratedFor.current = lead.id;
    setExPartner(lead.ex_partner_full_name ?? "");
    setCallbackAt(toLocalInput(lead.callback_scheduled_at));
    setSelectedFirmId(lead.firm_id);
    setSelectedLocationId(null);
    setSelectedLawyerId(lead.lawyer_id);
    setBookingDate(lead.booking_date ?? "");
    setBookingTime(lead.booking_time);
    // Mindset is shown for the first lead of a session only; every later lead
    // lands straight on the Opening step. The flag survives refresh.
    const mindsetAlreadyShown = (() => {
      if (!session) return false;
      try {
        return window.localStorage.getItem(`sales-call-mindset-shown-${session.id}`) === "1";
      } catch {
        return false;
      }
    })();
    setStepIndex(mindsetAlreadyShown ? 1 : 0);
    setSummaryText("");
    setPictureText("");
    setReturningOpen(false);
    setDepositLinkLeadId(null);
    setSmsDialogOpen(false);
    smsAttempt.current++;
    setSmsPreview(null);
    setHandoverDialogOpen(false);
    setHandoverPreviewData(null);
  }, [lead, session]);

  const hydratedOffice = useRef<string | null>(null);
  useEffect(() => {
    if (!activeId || !bookingStateQuery.data) return;
    const appointment = bookingStateQuery.data.appointment;
    const key = `${activeId}:${appointment?.id ?? "new"}`;
    if (hydratedOffice.current === key) return;
    hydratedOffice.current = key;
    setSelectedLocationId(appointment?.location_id ?? null);
  }, [activeId, bookingStateQuery.data]);

  // A refresh deliberately drops any stored gate state — stale modals must never resurrect.
  useEffect(() => {
    try {
      for (const store of [window.localStorage, window.sessionStorage]) {
        for (const key of Object.keys(store)) {
          if (key.startsWith("outcome-gate") || key.startsWith("sales-call-gate")) {
            store.removeItem(key);
          }
        }
      }
    } catch {
      /* storage unavailable — nothing to purge */
    }
  }, []);

  // Realtime: the Square webhook stamping deposit_paid_at flips Step 10 to PAID.
  // depositSeen tracks the lead we've already seen paid, so ordinary row updates
  // (notes, ex-partner name, status) never re-fire the toast.
  const depositSeen = useRef<string | null>(null);
  const depositCheck = useQuery({
    queryKey: ["square-deposit-check", activeId],
    enabled: Boolean(activeId && !lead?.deposit_paid_at &&
      ((lead?.stripe_checkout_session_id && !lead.stripe_checkout_session_id.startsWith("cs_")) || depositLinkSent)),
    queryFn: () => checkDepositPaymentFn({ data: { leadId: activeId! } }),
    refetchInterval: 10000,
    retry: false,
  });
  useEffect(() => {
    if (!activeId || lead?.deposit_paid_at || !depositCheck.data?.paid) return;
    if (depositSeen.current !== activeId) {
      depositSeen.current = activeId;
      toast.success("$75 deposit paid — booking unlocked");
    }
    void queryClient.invalidateQueries({ queryKey: ["call-lead", activeId] });
    void queryClient.invalidateQueries({ queryKey: ["handover-ready", activeId] });
    void queryClient.invalidateQueries({ queryKey: ["confirmation-sms", activeId] });
  }, [activeId, lead?.deposit_paid_at, depositCheck.data, queryClient]);

  useEffect(() => {
    if (lead?.deposit_paid_at && lead.id) depositSeen.current = lead.id;
  }, [lead?.id, lead?.deposit_paid_at]);
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`lead-deposit-${activeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "client_leads", filter: `id=eq.${activeId}` },
        (payload) => {
          const row = payload.new as { deposit_paid_at?: string | null };
          void queryClient.invalidateQueries({ queryKey: ["call-lead", activeId] });
          void queryClient.invalidateQueries({ queryKey: ["handover-ready", activeId] });
          void queryClient.invalidateQueries({ queryKey: ["confirmation-sms", activeId] });
          if (row.deposit_paid_at && depositSeen.current !== activeId) {

            depositSeen.current = activeId;
            toast.success("$75 deposit paid — booking unlocked");
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, queryClient]);


  // Default the firm to the lead's city. Lawyer allocation remains separate.
  useEffect(() => {
    if (selectedFirmId || !lead?.city) return;
    const firms = firmsQuery.data ?? [];
    const match = firms.find(
      (f) => (f.city ?? "").trim().toLowerCase() === lead.city!.trim().toLowerCase(),
    );
    if (match) setSelectedFirmId(match.id);
  }, [lead, firmsQuery.data, selectedFirmId]);

  // Lawyer never auto-selects: if the selected lawyer isn't in the firm's
  // loaded list, clear it. Trilogy displays null as Any available lawyer.
  useEffect(() => {
    if (!lawyersQuery.data) return; // Loading must not erase an existing assignment.
    const list = lawyersQuery.data;
    if (selectedLawyerId && !list.some((l) => l.id === selectedLawyerId)) {
      setSelectedLawyerId(null);
    }
  }, [lawyersQuery.data, selectedLawyerId]);



  const refreshLead = () => {
    void queryClient.invalidateQueries({ queryKey: ["call-lead", activeId] });
  };

  const saveExPartner = () => {
    if (!lead) return;
    if ((lead.ex_partner_full_name ?? "") === exPartner) return;
    void updateLead(lead.id, { ex_partner_full_name: exPartner.trim() || null })
      .then(refreshLead)
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const saveLeadName = (first: string, last: string) => {
    if (!lead) return;
    if (!first && !last) {
      toast.error("Enter at least a first or last name");
      return;
    }
    void updateLead(lead.id, { first_name: first || null, last_name: last || null })
      .then(() => {
        toast.success("Client name updated");
        refreshLead();
        
      })
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const setFunding = (value: string) => {
    if (!lead) return;
    void updateLead(lead.id, { funding_preference: value })
      .then(refreshLead)
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const setStatus = (status: string) => {
    if (!lead) return;
    void updateLead(lead.id, { status })
      .then(() => {
        toast.success(`Status set to ${statusMeta(status).label}`);
        refreshLead();
      })
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const saveCallback = () => {
    if (!lead || !callbackAt) return;
    const atIso = new Date(callbackAt).toISOString();
    void updateLead(lead.id, { callback_scheduled_at: atIso })
      .then(() => {
        toast.success("Callback saved");
        refreshLead();
      })
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const addObjection = (objection: string) => setNotes((prev) => appendObjection(prev, objection));

  const prepNextSteps = () => {
    if (!lead) return;
    setSummaryText(buildSummary(lead, notes));
    setPictureText(buildPicture(lead, notes));
    toast.success("Step 5 and Step 7 prepped from your notes");
  };

  // Browser dialler. Hanging up NEVER opens the outcome modal — the rep must be
  // free to double-dial. Pressing Next Lead is what summons it.
  const diallerSecondsRef = useRef(0);
  const dialler = useDialler(() => {
    setLastCallSeconds(diallerSecondsRef.current || null);
    void queryClient.invalidateQueries({ queryKey: ["call-records", activeId] });
    void queryClient.invalidateQueries({ queryKey: ["rep-session", staff?.id] });
    void queryClient.invalidateQueries({ queryKey: ["rep-today", staff?.id] });
  });
  diallerSecondsRef.current = dialler.seconds;

  const handleStartCall = () => runSalesAction(async () => {
    if (!lead?.phone || serving) return;
    try {
      if (!(await salesQueue.ensureClaim())) return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reserve this client. Please retry.");
      return;
    }
    // The outcome gate arms the moment the dial fires, tied to this exact lead.
    setGateLeadId(lead.id);
    setLastCallSeconds(null);
    await dialler
      .startCall({ to: lead.phone, leadId: lead.id, repId: staff?.id ?? null })
      .catch((e: unknown) => toast.error((e as Error).message));
  });

  const outcomeOwed = Boolean(gateLeadId) && !isBookedPaid(lead);

  const handleNextLead = () => runSalesAction(async () => {
    if (serving) return;
    if (dialler.status !== "idle") {
      toast.error("End the call first.");
      return;
    }
    // Hard lock: deposit paid but firm not told yet — check fresh, not cached.
    if (lead) {
      let paid = Boolean(lead.deposit_paid_at);
      let sent = Boolean(lead.handover_sent_at);
      const { data: fresh } = await supabase
        .from("client_leads")
        .select("deposit_paid_at, handover_sent_at")
        .eq("id", lead.id)
        .maybeSingle();
      if (fresh) {
        paid = Boolean(fresh.deposit_paid_at);
        sent = Boolean(fresh.handover_sent_at);
        void queryClient.invalidateQueries({ queryKey: ["sales-call-lead", lead.id] });
      }
      if (paid && !sent) {
        setHandoverGateOpen(true);
        return;
      }
    }

    if (isBookedPaid(lead)) {
      setGateLeadId(null);
      await advance();
      return;
    }
    if (gateLeadId && lead && gateLeadId === lead.id) {
      if (outcomeOpen) toast.error("Please set a call outcome first.");
      else setOutcomeOpen(true);
      return;
    }
    await advance();
  });

  const switchingClient = useRef(false);
  const openInboxClient = (id: string) => runSalesAction(async () => {
    if (switchingClient.current) return;
    switchingClient.current = true;
    try {
      if (id === activeId) {
        setInboxOpen(false);
        return;
      }
      if (dialler.status !== "idle") {
        toast.error("End the current call before opening another client.");
        return;
      }
      if (lead) {
        const { data: fresh, error } = await supabase
          .from("client_leads")
          .select("deposit_paid_at, handover_sent_at")
          .eq("id", lead.id)
          .single();
        if (error) {
          toast.error("Could not check the current client. Please retry.");
          return;
        }
        if (fresh.deposit_paid_at && !fresh.handover_sent_at) {
          toast.error("Complete this client's handover before switching clients.");
          return;
        }
        if (outcomeOwed) {
          toast.error("Save the current call outcome before switching clients.");
          return;
        }
        try {
          await flushNotes();
        } catch {
          toast.error("Your notes couldn't be saved. Please retry before switching.");
          return;
        }
      }
      if (!(await salesQueue.load(false, id))) return;
      setGateLeadId(null);
      setLastCallSeconds(null);
      setInboxOpen(false);
      await navigate({ search: { lead: id }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this client.");
    } finally {
      switchingClient.current = false;
    }
  });

  const handleOutcome = (status: string, callbackAtIso?: string) => {
    if (!lead) return;
    setSavingOutcome(true);
    void updateLead(lead.id, { status })
      .then(() =>
        callbackAtIso ? updateLead(lead.id, { callback_scheduled_at: callbackAtIso }) : undefined,
      )
      .then(async () => {
        toast.success(`Status set to ${statusMeta(status).label}`);
        void queryClient.invalidateQueries({ queryKey: ["rep-session", staff?.id] });
        void queryClient.invalidateQueries({ queryKey: ["rep-today", staff?.id] });
        await runSalesAction(advance);
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setSavingOutcome(false));
  };

  const handleConfirmBooking = () => {
    if (
      !lead ||
      !selectedFirmId ||
      !bookingDate ||
      !bookingTime ||
      booking ||
      !bookingStateQuery.data ||
      bookingStateQuery.isError
    )
      return;
    if (consultMode === "in_person" && (officesQuery.isPending || officesQuery.isError || !bookingLocationId)) {
      toast.error("Choose an office before booking");
      return;
    }
    const state = bookingStateQuery.data;
    if (state.kind === "closed") return;
    if (state.kind === "active" && selectedFirmId !== lead.firm_id) {
      toast.error("Keep the booked firm selected when changing the office or time");
      return;
    }
    const rebooking = state.kind === "no_show";
    const updating = state.kind === "active";
    setBooking(true);
    const save =
      rebooking && state.appointment
        ? rebookFn({
            data: {
              leadId: lead.id,
              previousAppointmentId: state.appointment.id,
              firmId: selectedFirmId,
              lawyerId: selectedLawyerId,
              locationId: bookingLocationId,
              date: bookingDate,
              time: bookingTime,
              consultMode,
              customTime,
            },
          })
        : updating
          ? rescheduleFn({
              data: { leadId: lead.id, date: bookingDate, time: bookingTime, customTime, locationId: bookingLocationId },
            })
          : bookFn({
              data: {
                leadId: lead.id,
                firmId: selectedFirmId,
                lawyerId: selectedLawyerId,
                locationId: bookingLocationId,
                date: bookingDate,
                time: bookingTime,
                consultMode,
                customTime,
              },
            });
    void save
      .then(async () => {
        // Refresh saved details before opening a confirmation built from them.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["call-lead", lead.id] }),
          queryClient.invalidateQueries({ queryKey: ["lead-booking-state", lead.id] }),
          queryClient.invalidateQueries({ queryKey: ["consult-mode", lead.id] }),
        ]);
        toast.success(
          rebooking
            ? "Client rebooked — review the new confirmation text"
            : updating
              ? "Appointment updated"
              : "Consultation booked",
        );
        // Always re-check the send-once guard before deciding, so a stale cache
        // can't swallow the review dialog.
        let alreadySent = false;
        try {
          const status = await confirmationStatusFn({ data: { leadId: lead.id } });
          alreadySent = Boolean((status as { sent?: boolean })?.sent);
          queryClient.setQueryData(["confirmation-sms", lead.id], status);
        } catch {
          alreadySent = false;
        }
        if (!alreadySent) openSmsDialog();

        if (session && !updating && !rebooking) {
          try {
            await bumpSession(session.id, "bookings_made", session.bookings_made);
          } catch {
            toast.error("Consultation booked, but the session booking count could not be saved.");
          }
        }
        void queryClient.invalidateQueries({ queryKey: ["firm-packs"] });
        void queryClient.invalidateQueries({ queryKey: ["firm-bookings"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-reminders"] });
        void queryClient.invalidateQueries({ queryKey: ["appointment-attendance"] });
        void queryClient.invalidateQueries({ queryKey: ["rebooking-slots"] });
        void queryClient.invalidateQueries({ queryKey: ["handover-ready", lead.id] });
        void queryClient.invalidateQueries({ queryKey: ["pack-balances"] });
        void queryClient.invalidateQueries({ queryKey: ["rep-session", staff?.id] });
        void queryClient.invalidateQueries({ queryKey: ["rep-today", staff?.id] });
        refreshLead();
      })
      .catch((e: unknown) => {
        toast.error((e as Error).message);
        void queryClient.invalidateQueries({ queryKey: ["lead-booking-state", lead.id] });
        void queryClient.invalidateQueries({ queryKey: ["rebooking-slots"] });
      })
      .finally(() => setBooking(false));
  };

  const openSmsDialog = () => {
    if (!lead) return;
    const attempt = ++smsAttempt.current;
    setSmsPreview(null);
    setSmsLoading(true);
    setSmsDialogOpen(true);
    void smsPreviewFn({ data: { leadId: lead.id } })
      .then((p) => {
        if (attempt === smsAttempt.current) setSmsPreview(p as SmsPreview);
      })
      .catch((e: unknown) => {
        if (attempt === smsAttempt.current) setSmsPreview({ ok: false, error: (e as Error).message });
      })
      .finally(() => {
        if (attempt === smsAttempt.current) setSmsLoading(false);
      });
  };

  const handleSendConfirmation = (body: string) => {
    if (!lead) return;
    setSendingConfirmation(true);
    void confirmationSendFn({ data: { leadId: lead.id, body, bookingKey: smsPreview?.bookingKey } })
      .then((result) => {
        if (!result.ok) toast.error(result.error ?? "Could not send the confirmation");
        else if (result.skipped) toast.info("Confirmation was already sent for this appointment");
        else toast.success("Confirmation texted to the client");
        if (result.ok) setSmsDialogOpen(false);
        void queryClient.invalidateQueries({ queryKey: ["confirmation-sms", lead.id] });
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setSendingConfirmation(false));
  };

  const loadHandoverIntel = (leadId: string, attempt: number) => {
    handoverController.current?.abort();
    const controller = new AbortController();
    handoverController.current = controller;
    setHandoverIntelError(null);
    setHandoverIntelBuilding(true);
    void prepareHandoverIntel(
      (signal) => handoverIntelFn({ data: { leadId }, signal }),
      { signal: controller.signal, onProgress: (stage) => {
        if (attempt === handoverAttempt.current) setHandoverIntelProgress(stage);
      } },
    )
      .then((intel) => {
        if (attempt !== handoverAttempt.current) return;
        if (intel?.notes) {
          setHandoverPreviewData((prev) =>
            prev && prev.ok ? { ...prev, notes: intel.notes as string } : prev,
          );
          return;
        }
        setHandoverIntelError(
          intel?.error ?? "The AI summary could not be generated. You can write the handover notes yourself or retry.",
        );
      })
      .catch(() => {
        if (attempt === handoverAttempt.current && !controller.signal.aborted) {
          setHandoverIntelError("The summary connection was interrupted. You can write the handover notes yourself or retry; your booking and payment are saved.");
        }
      })
      .finally(() => {
        if (attempt === handoverAttempt.current) setHandoverIntelBuilding(false);
      });
  };

  const retryHandoverSummary = () => {
    if (!lead || !handoverPreviewData?.ok) return;
    loadHandoverIntel(lead.id, ++handoverAttempt.current);
  };

  const openHandoverDialog = () => {
    if (!lead) return;
    const leadId = lead.id;
    const attempt = ++handoverAttempt.current;
    handoverController.current?.abort();
    setHandoverIntelError(null);
    setHandoverIntelBuilding(false);
    setHandoverPreviewData(null);
    setHandoverLoading(true);
    setHandoverDialogOpen(true);
    void handoverPreviewFn({ data: { leadId } })
      .then((p) => {
        if (attempt !== handoverAttempt.current) return;
        const preview = p as HandoverPreview;
        // Keep saved intel visible while the latest calls are checked. The
        // rep can explicitly check the saved notes or write their own instead
        // of waiting for a slow or failed automatic summary.
        setHandoverPreviewData(preview);
        if (!preview.ok) return;
        // Intel is built in its own request so a slow transcription/AI step can
        // never time out the preview or the send.
        loadHandoverIntel(leadId, attempt);
      })
      .catch(() => { if (attempt === handoverAttempt.current) setHandoverPreviewData({ ok: false, error: "The handover could not be loaded. Please retry; your booking and payment are saved." }); })
      .finally(() => { if (attempt === handoverAttempt.current) setHandoverLoading(false); });
  };


  const handleSendHandover = (payload: { to: string; cc: string; notes: string; funding: string }) => {
    if (!lead) return;
    setSendingHandover(true);
    void handoverSendFn({
      data: {
        leadId: lead.id,
        to: payload.to,
        cc: payload.cc,
        notes: payload.notes,
        funding: payload.funding,
      },
    })
      .then((result) => {
        if (!result.ok) toast.error(result.error ?? "Could not send the handover");
        else {
          toast.success("Handover emailed to the firm");
          handoverAttempt.current++;
          handoverController.current?.abort();
          setHandoverDialogOpen(false);
          refreshLead();
        }
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setSendingHandover(false));
  };


  const handleMarkDeposit = () => {
    if (!lead) return;
    void markDepositPaid(lead.id)
      .then(() => {
        toast.success("Deposit marked paid");
        refreshLead();
      })
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const handleResetDeposit = () => {
    if (!lead) return;
    void resetDepositAndHandover(lead.id)
      .then(async () => {
        await resetConfirmationSmsFn({ data: { leadId: lead.id } }).catch(() => undefined);
        setDepositLinkLeadId(null);
        queryClient.removeQueries({ queryKey: ["square-deposit-check", lead.id] });
        depositSeen.current = null;
        toast.success("Payment, confirmation text and handover reset");
        refreshLead();
        queryClient.setQueryData(["confirmation-sms", lead.id], { sent: false });
        void queryClient.invalidateQueries({ queryKey: ["handover-ready", lead.id] });
        void queryClient.invalidateQueries({ queryKey: ["confirmation-sms", lead.id] });
      })
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const handleSendDepositLink = () => {
    if (!lead) return;
    setSendingLink(true);
    void sendDepositLinkFn({
      data: { leadId: lead.id, firmId: selectedFirmId, lawyerId: selectedLawyerId },
    })
      .then((result) => {
        setDepositLinkLeadId(lead.id);
        void queryClient.invalidateQueries({ queryKey: ["call-lead", lead.id] });
        void queryClient.invalidateQueries({ queryKey: ["square-deposit-check", lead.id] });
        if (result.smsSent) toast.success("$75 deposit link texted to the client");
        else toast.error(`Link created but SMS failed: ${result.smsError ?? "unknown error"}`);
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setSendingLink(false));
  };

  // End Session ALWAYS works: it force-clears every gate. A rep is never trapped.
  const handleEndSession = () => {
    if (serving) return;
    if (dialler.status !== "idle") {
      toast.error("End the call first.");
      return;
    }
    finishSession();
  };

  const handleStartSession = () => {
    if (!staff || startingSessionRef.current) return;
    startingSessionRef.current = true;
    setStartingSession(true);
    void startSession(staff.id)
      .then((started) => {
        queryClient.setQueryData(["rep-session", staff.id], started);
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => {
        startingSessionRef.current = false;
        setStartingSession(false);
      });
  };

  const stepCtx: StepContext | null = lead
    ? {
        lead,
        isAdmin: Boolean(isAdmin),
        repName: staff?.name ?? null,
        notes,
        onNotesChange: setNotes,
        summaryText,
        pictureText,
        onPrepNextSteps: prepNextSteps,
        firms: firmsQuery.data ?? [],
        packs: packsQuery.data ?? [],
        lawyers: lawyersQuery.data ?? [],
        tradingHours: hoursQuery.data ?? [],
        blockedSlots: blockedQuery.data ?? [],
        selectedLocationId: bookingLocationId,
        onSelectLocation: setSelectedLocationId,
        selectedFirmId,
        onSelectFirm: (id) => {
          setSelectedFirmId(id);
          setSelectedLocationId(null);
          setBookingTime(null);
          setSelectedLawyerId(null);
        },
        selectedLawyerId,
        onSelectLawyer: setSelectedLawyerId,
        bookingDate,
        onBookingDate: setBookingDate,
        bookingTime,
        bookedTimes: firmBookingsQuery.data ?? [],
        onBookingTime: (v: string, custom?: boolean) => {
          setBookingTime(v);
          setCustomTime(Boolean(custom));
        },

        consultMode,
        onConsultMode: changeConsultMode,
        onConfirmBooking: handleConfirmBooking,
        onMarkDepositPaid: handleMarkDeposit,
        onResetDeposit: handleResetDeposit,
        onSendDepositLink: handleSendDepositLink,
        depositLinkSent: depositLinkSent || Boolean(lead.stripe_checkout_session_id && !lead.stripe_checkout_session_id.startsWith("cs_")),
        checkingDeposit: depositCheck.isFetching,
        depositCheckError: depositCheck.isError ? "Couldn’t check Square. We’ll retry automatically; you can also check again below." : depositCheck.data?.status === "NO_SQUARE_ORDER" ? "This older link has no saved Square reference. Payment needs to be verified before marking it paid." : null,
        onCheckDeposit: () => { void depositCheck.refetch(); },
        exPartner,
        onExPartnerChange: setExPartner,
        onExPartnerSave: saveExPartner,
        onSelectFunding: setFunding,
        sendingLink,
        booking,
        bookingState: bookingStateQuery.data,
        bookingStateLoading: bookingStateQuery.isPending,
        bookingStateError: bookingStateQuery.isError,
        onRetryBookingState: () => {
          void bookingStateQuery.refetch();
        },
        packBalances: balancesQuery.data ?? {},
        confirmationSent: Boolean(confirmationQuery.data?.sent),
        sendingConfirmation,
        onSendConfirmation: openSmsDialog,
        handoverReady: Boolean(handoverQuery.data?.ready),
        handoverReason: handoverQuery.data?.reason ?? null,
        handoverSentAt: lead.handover_sent_at ?? null,
        sendingHandover,
        onSendHandover: openHandoverDialog,
      }

    : null;

  // ---------- Idle: no open session ----------
  if (!session) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
        <Button
          size="lg"
          className="h-16 px-10 text-lg"
          disabled={!staff || startingSession || sessionQuery.isFetching}
          onClick={handleStartSession}
        >
          <Play className="mr-2 h-5 w-5" />
          {startingSession
            ? "Starting…"
            : sessionQuery.isFetching
              ? "Checking session…"
              : "Start Sales Call"}
        </Button>
        {(staffQuery.isError || sessionQuery.isError) && (
          <p role="alert" className="mt-4 max-w-md text-sm text-destructive">
            Couldn’t load your calling session. Refresh the page and try again.
          </p>
        )}
      </main>
    );
  }

  // ---------- Session running ----------
  const selectStep = (index: number) => {
    setStepIndex(index);
    void flushNotes().catch(() => {});
  };
  const StepButton = ({
    s,
    i,
    variant,
  }: {
    s: (typeof STEPS)[number];
    i: number;
    variant: "rail" | "chip";
  }) => {
    const Icon = s.icon;
    const active = i === stepIndex;
    if (variant === "rail") {
      return (
        <button
          key={s.key}
          type="button"
          onClick={() => selectStep(i)}
          aria-label={`Step ${i + 1} — ${s.label}`}
          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
            active
              ? "border border-primary bg-primary/10 text-primary"
              : "hover:bg-muted/50"
          }`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {i + 1}
          </span>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{s.label}</span>
        </button>
      );
    }
    return (
      <button
        key={s.key}
        type="button"
        onClick={() => selectStep(i)}
        aria-label={`Step ${i + 1} — ${s.label}`}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
          active ? "border-primary bg-primary/10" : "hover:bg-muted/50"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {s.label}
      </button>
    );
  };

  const centrePanel = (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {lead ? (
        <>
          {/* Desktop: vertical step rail on the left */}
          <div className="hidden w-52 shrink-0 flex-col border-r bg-muted/20 lg:flex">
            <div className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-4">
              {STEPS.map((s, i) => (
                <StepButton key={s.key} s={s} i={i} variant="rail" />
              ))}
            </div>
          </div>


          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                  {leadName(lead)}
                </h1>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" aria-haspopup="dialog" aria-expanded={assetsLeadId === lead.id} onClick={() => { setNotesOpen(true); setAssetsLeadId(lead.id); }}>
                    <Calculator className="mr-1.5 size-4" /> Net assets
                  </Button>
                  {bookingStateQuery.data?.kind === "no_show" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStepIndex(STEPS.findIndex((s) => s.key === "book"))}
                    >
                      Rebook client
                    </Button>
                  )}
                  <PreviousCallsButton key={lead.id} leadId={lead.id} clientName={leadName(lead)} />
                  <Button
                    size="sm"
                    onClick={handleStartCall}
                    disabled={!lead.phone || serving || dialler.status !== "idle"}
                    className="bg-green-600 text-white hover:bg-green-700"
                    aria-label={`Call ${leadName(lead)}`}
                  >
                    <PhoneCall className="mr-1 h-3.5 w-3.5" />
                    {dialler.status === "idle" ? "Call" : "On call"}
                  </Button>
                </div>
              </div>

              {lead.previous_lead_id ? (
                <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[13px]">
                  <button
                    type="button"
                    className="font-semibold text-amber-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={() => setReturningOpen((v) => !v)}
                  >
                    Returning client — they enquired before {returningOpen ? "▲" : "▼"}
                  </button>
                  {returningOpen ? (
                    <div className="mt-2 space-y-1 text-muted-foreground">
                      <p>
                        Previous status:{" "}
                        <span className="font-medium text-foreground">
                          {prevLeadQuery.data ? statusMeta(prevLeadQuery.data.status).label : "…"}
                        </span>
                      </p>
                      <p className="whitespace-pre-wrap">
                        Rep notes: {prevLeadQuery.data?.rep_notes || "No rep notes saved."}
                      </p>
                      <p className="whitespace-pre-wrap">
                        Saved summary / earlier notes: {prevLeadQuery.data?.call_notes || "None saved."}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isCallbackDue(lead) ? (
                <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-[13px] font-medium text-amber-700">
                  Callback is due now.
                </div>
              ) : null}
            </div>

            {/* Mobile: keep horizontal step chips below the header */}
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden">
              {STEPS.map((s, i) => (
                <StepButton key={s.key} s={s} i={i} variant="chip" />
              ))}
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden" aria-label="Call workspace">
              <div
                className={`h-full min-h-0 flex-col items-center px-[clamp(1rem,3vw,3rem)] pb-[clamp(1rem,2.5vh,2.5rem)] flex ${
                  stepIndex === 2 || stepIndex === 5 || stepIndex === 10
                    ? "justify-center overflow-hidden pt-[10mm]"
                    : "justify-start overflow-y-auto pt-[20mm]"
                }`}
              >
                <div className={`w-full ${stepIndex === 2 || stepIndex === 5 || stepIndex === 10 ? "h-full" : ""}`}>
                  {stepCtx ? STEPS[stepIndex]?.render(stepCtx) : null}
                </div>
              </div>
              {staff && <ClientAssetCalculator key={lead.id} leadId={lead.id} repId={staff.id}
                clientName={leadName(lead)} open={assetsLeadId === lead.id} onClose={() => setAssetsLeadId(null)} />}
            </div>
            <CallNotes
              {...callNotes}
              open={notesOpen}
              onOpenChange={setNotesOpen}
              onChange={setNotes}
              onSave={flushNotes}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          {serving || (activeId && leadQuery.isPending) ? (
            <p className="text-sm text-muted-foreground">Getting your lead…</p>
          ) : (
            <>
              <PhoneForwarded className="h-8 w-8 text-muted-foreground" />
              <p role={salesQueue.error || leadQuery.isError ? "alert" : undefined} className="text-sm font-medium">
                {salesQueue.error || (leadQuery.isError ? "Couldn’t load this client. Please retry." : "No eligible leads available right now")}
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                {pinnedLeadId
                  ? "You’re signed in. This only affects this client’s calling workspace. You can review their notes and calls, or choose another available client."
                  : "The shared queue checks for new leads and due callbacks automatically."}
              </p>
              {pinnedLeadId && (
                <Button onClick={() => void navigate({ search: { lead: pinnedLeadId, view: "review" } })}>
                  Review this client
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => {
                void salesQueue.load();
                if (activeId) void leadQuery.refetch();
              }}>{pinnedLeadId ? "Try this client again" : "Check again"}</Button>
              {pinnedLeadId && (
                <Button size="sm" variant="outline" onClick={() => void advance()}>
                  Get another client
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleEndSession}>
                <Square className="mr-1 h-3.5 w-3.5" /> End session
              </Button>
            </>
          )}
        </div>

      )}
    </div>
  );

  const markInboxSeen = () => {
    const now = new Date().toISOString();
    setInboxSeenAt(now);
    if (typeof window !== "undefined") window.localStorage.setItem("inbox-seen-at", now);
    void queryClient.invalidateQueries({ queryKey: ["inbox-unread"] });
  };

  const rightPanel = lead ? (
    <LeadPanel
      lead={lead as CallLead}
      exPartner={exPartner}
      onExPartnerChange={setExPartner}
      onExPartnerSave={saveExPartner}
      onStatus={setStatus}
      callbackAt={callbackAt}
      onCallbackAt={setCallbackAt}
      onCallbackSave={saveCallback}
      onObjection={addObjection}
      calls={callsQuery.data ?? []}
      onNextLead={handleNextLead}
      depositPaid={Boolean(lead.deposit_paid_at)}
      depositLinkSent={depositLinkSent || Boolean(lead.stripe_checkout_session_id && !lead.stripe_checkout_session_id.startsWith("cs_"))}
      sendingDepositLink={sendingLink}
      onSendDepositLink={handleSendDepositLink}
      onTakeDepositManually={() => setManualDepositOpen(true)}
      onOpenInbox={() => setInboxOpen(true)}
      unreadCount={unreadCount}
      onSaveName={saveLeadName}
      firms={firmsQuery.data ?? []}
      selectedFirmId={selectedFirmId}
      onSelectFirm={(id) => {
        setSelectedFirmId(id);
        setSelectedLocationId(null);
        setBookingTime(null);
        setSelectedLawyerId(null);
      }}
      lawyers={lawyersQuery.data ?? []}
      selectedLawyerId={selectedLawyerId}
      onSelectLawyer={setSelectedLawyerId}
    />
  ) : null;


  return (
    <main className="flex h-full flex-col overflow-hidden">
      <SessionBar
        sessionId={session.id}
        startedAt={session.started_at}
        calls={session.calls_made}
        bookings={session.bookings_made}
        onEnd={handleEndSession}
      >
        <CallWidget dialler={dialler} leadName={lead ? leadName(lead) : "Client"} />
      </SessionBar>

      {salesQueue.error && lead && <p role="alert" className="border-b px-4 py-2 text-sm text-destructive">{salesQueue.error}</p>}

      <Tabs value={mobilePanel} onValueChange={setMobilePanel} className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
        <TabsList className="mx-3 my-2 shrink-0 self-start lg:hidden">
          <TabsTrigger value="call">Call</TabsTrigger>
          {rightPanel && <TabsTrigger value="lead">Lead</TabsTrigger>}
        </TabsList>
        <div className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden ${rightPanel ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
          <TabsContent forceMount value="call" className="m-0 h-full min-h-0 overflow-hidden data-[state=inactive]:hidden lg:data-[state=inactive]:block">
            {centrePanel}
          </TabsContent>
          {rightPanel && <TabsContent forceMount value="lead" className="m-0 h-full min-h-0 overflow-y-auto border-l data-[state=inactive]:hidden lg:data-[state=inactive]:block">
            {rightPanel}
          </TabsContent>}
        </div>
      </Tabs>

      <ConfirmationSmsDialog
        open={smsDialogOpen}
        preview={smsPreview}
        loading={smsLoading}
        sending={sendingConfirmation}
        onCancel={() => {
          smsAttempt.current++;
          setSmsDialogOpen(false);
        }}
        onSend={handleSendConfirmation}
      />

      <HandoverDialog
        key={lead?.id ?? "handover"}
        open={handoverDialogOpen}
        preview={handoverPreviewData}
        loading={handoverLoading}
        intelBuilding={handoverIntelBuilding}
        intelError={handoverIntelError}
        intelProgress={handoverIntelProgress}
        onRetry={openHandoverDialog}
        onRetrySummary={retryHandoverSummary}

        sending={sendingHandover}
        onCancel={() => { handoverAttempt.current++; handoverController.current?.abort(); setHandoverDialogOpen(false); }}
        onSend={handleSendHandover}
      />

      {lead ? (
        <ManualDepositDialog
          open={manualDepositOpen}
          leadId={lead.id}
          onClose={() => setManualDepositOpen(false)}
          onPaid={() => {
            refreshLead();
            void queryClient.invalidateQueries({ queryKey: ["handover-ready", lead.id] });
            void queryClient.invalidateQueries({ queryKey: ["confirmation-sms", lead.id] });
          }}
        />
      ) : null}

      <InboxPhone
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        leadId={lead?.id ?? null}
        leadName={lead ? leadName(lead) : "Conversation"}
        leadPhone={lead?.phone ?? null}
        onSeen={markInboxSeen}
        onOpenSalesCall={(id) => void openInboxClient(id)}
      />

      <OutcomeModal
        open={outcomeOpen}
        lead={lead ?? null}
        durationSeconds={lastCallSeconds}
        saving={savingOutcome}
        onClose={() => setOutcomeOpen(false)}
        onOutcome={handleOutcome}
      />

      <Dialog open={handoverGateOpen} onOpenChange={setHandoverGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send the handover first</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The $75 deposit is paid but the firm hasn&apos;t been told. Send the handover email in
            Step 10 before moving to the next lead.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setHandoverGateOpen(false)}>
              Back to Step 10
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
