// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/practice-call.tsx). Re-run the port script to refresh.
import { Link } from "@/legal/runtime/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { LeadPanel } from "@/legal/components/sales-call/LeadPanel";
import { STEPS, type StepContext } from "@/legal/components/sales-call/steps";
import { ModuleGate, useTrainingStatus } from "@/legal/components/training/module-progress";
import { Button } from "@/legal/components/ui/button";
import { supabase } from "@/legal/integrations/supabase/client";
import { fetchCurrentStaff } from "@/legal/lib/client-leads";
import {
  fetchBlockedSlots,
  fetchFirms,
  fetchLawyers,
  fetchTradingHours,
} from "@/legal/lib/partner-firms";
import { appendObjection, type CallLead } from "@/legal/lib/sales-call";
import {
  availablePersonas,
  PERSONAS,
  pickPersona,
  PENDING_PRACTICE_CALL_KEY,
  PRACTICE_AGENT_ID,
  practiceLead,
  type PracticePersona,
} from "@/legal/lib/training/practice";
import { TRAINING_STATUS_KEY } from "@/legal/lib/training/progress";
import { practiceTokenFn, savePracticeCallFn } from "@/legal/lib/training/training.functions";

// AI practice inside the real call screen: the same step panels and right panel reps use
// live, driven by a pretend lead. Nothing here can text, charge, book, email a firm or
// touch a real lead — every action that would is replaced with a local "practice" stand-in,
// and the pretend lead's id isn't a UUID, so server functions that write to leads refuse it.

const LegalRoutePage = () => (
    <ModuleGate slug="ai">
      <ConversationProvider>
        <PracticeCall />
      </ConversationProvider>
    </ModuleGate>
  );

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LegalRoutePage as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Practice Call — Legal Group Portal" }] }),
  component: LegalRoutePage,
});

const PRACTICE_NOTE = "(practice — not sent)";
const noop = () => {};

async function countMyPracticeCalls(): Promise<number> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;
  const { count } = await supabase
    .from("practice_call_recordings")
    .select("id", { count: "exact", head: true })
    .eq("auth_user_id", auth.user.id);
  return count ?? 0;
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PracticeCall() {
  const queryClient = useQueryClient();
  const status = useTrainingStatus();
  const isAdmin = status.data?.isAdmin ?? false;
  const staff = useQuery({ queryKey: ["current-staff"], queryFn: fetchCurrentStaff });
  const me = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const callsSoFar = useQuery({ queryKey: ["practice-call-count"], queryFn: countMyPracticeCalls });
  const save = useServerFn(savePracticeCallFn);
  const getToken = useServerFn(practiceTokenFn);

  const [persona, setPersona] = useState<PracticePersona | null>(null);
  useEffect(() => {
    if (persona || callsSoFar.isLoading) return;
    setPersona(pickPersona(callsSoFar.data ?? 0));
  }, [persona, callsSoFar.isLoading, callsSoFar.data]);

  // ---- Pretend lead and call-screen state (all local) ----
  const [lead, setLead] = useState<CallLead | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [exPartner, setExPartner] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [consultMode, setConsultMode] = useState<"in_person" | "zoom">("in_person");
  const [depositLinkSent, setDepositLinkSent] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [handoverSentAt, setHandoverSentAt] = useState<string | null>(null);

  const resetCallScreen = useCallback((p: PracticePersona) => {
    setLead(practiceLead(p));
    setStepIndex(0);
    setNotes("");
    setExPartner("");
    setCallbackAt("");
    setSelectedFirmId(null);
    setSelectedLawyerId(null);
    setBookingDate("");
    setBookingTime(null);
    setConsultMode("in_person");
    setDepositLinkSent(false);
    setConfirmationSent(false);
    setHandoverSentAt(null);
  }, []);

  useEffect(() => {
    if (persona) resetCallScreen(persona);
  }, [persona, resetCallScreen]);

  // Real firms and lawyers, read-only, so reps practise with the real lawyer cards.
  const firms = useQuery({ queryKey: ["firms"], queryFn: fetchFirms });
  const lawyers = useQuery({
    queryKey: ["firm-lawyers", selectedFirmId],
    queryFn: () => fetchLawyers(selectedFirmId!),
    enabled: !!selectedFirmId,
  });
  const hours = useQuery({
    queryKey: ["firm-hours", selectedFirmId],
    queryFn: () => fetchTradingHours(selectedFirmId!),
    enabled: !!selectedFirmId,
  });
  const blocked = useQuery({
    queryKey: ["firm-blocked", selectedFirmId],
    queryFn: () => fetchBlockedSlots(selectedFirmId!),
    enabled: !!selectedFirmId,
  });

  // ---- The AI call ----
  const convIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const saveWithRetry = useCallback(
    async (conversationId: string) => {
      for (let attempt = 0; attempt < 12; attempt++) {
        try {
          const r = await save({ data: { conversationId } });
          if (r.saved) {
            try {
              sessionStorage.removeItem(PENDING_PRACTICE_CALL_KEY);
            } catch {
              // Private mode: nothing to clear.
            }
            toast.success(`Practice call saved (${fmt(r.saved.durationSeconds)})`);
            void queryClient.invalidateQueries({ queryKey: ["practice-calls"] });
            void queryClient.invalidateQueries({ queryKey: ["practice-call-count"] });
            void queryClient.invalidateQueries({ queryKey: TRAINING_STATUS_KEY });
            return;
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't save the practice call.");
          return;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      toast.info("Still saving in the background — it'll show on the AI Training page shortly.");
    },
    [save, queryClient],
  );

  const conversation = useConversation({
    onConnect: (info: unknown) => {
      const id = (info as { conversationId?: string })?.conversationId ?? null;
      if (id) {
        convIdRef.current = id;
        // If the rep leaves mid-call, the AI Training page finishes saving it.
        try {
          sessionStorage.setItem(PENDING_PRACTICE_CALL_KEY, id);
        } catch {
          // Private mode: the AI Training page's sync still picks it up.
        }
      }
      startedAtRef.current = Date.now();
      setConnecting(false);
    },
    onDisconnect: () => {
      const id = convIdRef.current;
      convIdRef.current = null;
      startedAtRef.current = null;
      setConnecting(false);
      if (id) void saveWithRetry(id);
    },
    onError: (err: unknown) => {
      console.error("[practice] elevenlabs error", err);
      toast.error("Practice call error");
      setConnecting(false);
    },
  });
  const inCall = connecting || conversation.status === "connected";

  useEffect(() => {
    if (conversation.status !== "connected") return;
    const t = window.setInterval(() => {
      if (startedAtRef.current) setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(t);
  }, [conversation.status]);

  const startCall = async () => {
    if (inCall || !persona || !me.data) return;
    setConnecting(true);
    setSeconds(0);
    resetCallScreen(persona);
    setStepIndex(1);
    try {
      // Ask for the mic up front (clear prompt), then release it: the call opens its own.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.getTracks().forEach((t) => t.stop());
      const { token } = await getToken();
      const session = {
        userId: me.data,
        dynamicVariables: { persona: persona.id },
        overrides: {
          agent: { firstMessage: persona.pickup },
          ...(persona.voiceId ? { tts: { voiceId: persona.voiceId } } : {}),
        },
      };
      const id = await conversation.startSession(
        token
          ? { ...session, conversationToken: token, connectionType: "webrtc" }
          : { ...session, agentId: PRACTICE_AGENT_ID, connectionType: "webrtc" },
      );
      if (typeof id === "string") convIdRef.current = id;
    } catch (e) {
      console.error("[practice] startSession failed", e);
      toast.error(e instanceof Error ? e.message : "Couldn't start the practice call");
      setConnecting(false);
    }
  };

  const endCall = async () => {
    try {
      await conversation.endSession();
    } catch (e) {
      console.error("[practice] endSession failed", e);
    }
  };

  const practiceToast = (what: string) => toast.info(`${what} ${PRACTICE_NOTE}`);

  const ctx: StepContext | null = useMemo(() => {
    if (!lead) return null;
    return {
      lead,
      isAdmin,
      repName: staff.data?.name ?? null,
      notes,
      onNotesChange: setNotes,
      summaryText: "",
      pictureText: "",
      onPrepNextSteps: noop,
      firms: firms.data ?? [],
      packs: [],
      lawyers: lawyers.data ?? [],
      tradingHours: hours.data ?? [],
      blockedSlots: blocked.data ?? [],
      selectedFirmId,
      onSelectFirm: (id: string) => {
        setSelectedFirmId(id);
        setSelectedLawyerId(null);
      },
      selectedLawyerId,
      onSelectLawyer: setSelectedLawyerId,
      bookingDate,
      onBookingDate: setBookingDate,
      bookingTime,
      onBookingTime: (v: string) => setBookingTime(v),
      bookedTimes: [],
      consultMode,
      onConsultMode: setConsultMode,
      onConfirmBooking: () => {
        setLead((l) => (l ? { ...l, booking_date: bookingDate, booking_time: bookingTime } : l));
        toast.success("Booked (practice — no real booking made)");
      },
      onMarkDepositPaid: () =>
        setLead((l) => (l ? { ...l, deposit_paid_at: new Date().toISOString() } : l)),
      onResetDeposit: () => {
        setDepositLinkSent(false);
        setConfirmationSent(false);
        setHandoverSentAt(null);
        setLead((l) =>
          l ? { ...l, deposit_paid_at: null, booking_date: null, booking_time: null } : l,
        );
      },
      onSendDepositLink: () => {
        setDepositLinkSent(true);
        practiceToast("$75 link texted");
        // Stand-in for Square: the "client" pays a few seconds later.
        window.setTimeout(
          () => setLead((l) => (l ? { ...l, deposit_paid_at: new Date().toISOString() } : l)),
          8000,
        );
      },
      depositLinkSent,
      checkingDeposit: false,
      depositCheckError: null,
      onCheckDeposit: noop,
      exPartner,
      onExPartnerChange: setExPartner,
      onExPartnerSave: noop,
      onSelectFunding: (v: string) => setLead((l) => (l ? { ...l, funding_preference: v } : l)),
      sendingLink: false,
      booking: false,
      packBalances: {},
      confirmationSent,
      sendingConfirmation: false,
      onSendConfirmation: () => {
        setConfirmationSent(true);
        practiceToast("Confirmation text");
      },
      handoverReady: Boolean(lead.booking_date),
      handoverReason: null,
      handoverSentAt,
      sendingHandover: false,
      onSendHandover: () => {
        setHandoverSentAt(new Date().toISOString());
        practiceToast("Handover to firm");
      },
    };
    // practiceToast is stable enough for this memo (it only calls toast).
  }, [
    lead,
    isAdmin,
    staff.data?.name,
    notes,
    firms.data,
    lawyers.data,
    hours.data,
    blocked.data,
    selectedFirmId,
    selectedLawyerId,
    bookingDate,
    bookingTime,
    consultMode,
    depositLinkSent,
    exPartner,
    confirmationSent,
    handoverSentAt,
  ]);

  if (!persona || !lead || !ctx) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Getting your practice client…
      </div>
    );
  }

  const name = `${lead.first_name} ${lead.last_name}`;

  return (
    <main className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b bg-amber-50 px-4 py-2 text-[13px] text-amber-900">
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Practice
        </span>
        <span>
          You're calling an AI client. Nothing here texts, charges, books or emails anyone. The call
          is recorded so you and Peter can listen back.
        </span>
        <Link to="/training/ai" className="ml-auto font-bold text-amber-900 underline">
          ‹ Back to AI Training
        </Link>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col lg:flex-row">
          <div className="hidden w-52 shrink-0 flex-col border-r bg-muted/20 lg:flex">
            <div className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-4">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = i === stepIndex;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStepIndex(i)}
                    aria-label={`Step ${i + 1} — ${s.label}`}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-medium ${
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
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold">{name}</h1>
                <span className="text-xs text-muted-foreground">{persona.summary}</span>
                <div className="ml-auto flex items-center gap-2">
                  {isAdmin && !inCall ? (
                    <select
                      aria-label="Practice client"
                      value={persona.id}
                      onChange={(e) =>
                        setPersona(PERSONAS.find((p) => p.id === e.target.value) ?? persona)
                      }
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      {availablePersonas().map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} {p.firstName}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {inCall ? (
                    <>
                      <span className="text-xs font-medium text-muted-foreground" role="status">
                        {connecting
                          ? "Connecting…"
                          : `${conversation.isSpeaking ? `🗣 ${lead.first_name} speaking` : "🎧 Listening"} · ⏱ ${fmt(seconds)}`}
                      </span>
                      <Button size="sm" variant="destructive" onClick={() => void endCall()}>
                        🔴 End Practice Call
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => void startCall()}
                      disabled={!me.data}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      📞 Start Practice Call
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden">
              {STEPS.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    i === stepIndex ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div
              className={`flex flex-1 flex-col items-center px-[clamp(1rem,3vw,3rem)] pb-[clamp(1rem,2.5vh,2.5rem)] ${
                stepIndex === 2 || stepIndex === 5
                  ? "justify-center overflow-hidden pt-[10mm]"
                  : "justify-start overflow-y-auto pt-[20mm]"
              }`}
            >
              <div className={`w-full ${stepIndex === 2 || stepIndex === 5 ? "h-full" : ""}`}>
                {STEPS[stepIndex]?.render(ctx)}
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden h-full overflow-hidden border-l lg:block">
          <LeadPanel
            lead={lead}
            exPartner={exPartner}
            onExPartnerChange={setExPartner}
            onExPartnerSave={noop}
            onStatus={() => practiceToast("Status")}
            callbackAt={callbackAt}
            onCallbackAt={setCallbackAt}
            onCallbackSave={() => practiceToast("Callback")}
            onObjection={(o) => setNotes((prev) => appendObjection(prev, o))}
            calls={[]}
            onNextLead={() => toast.info("End the practice call, then start another.")}
            depositPaid={Boolean(lead.deposit_paid_at)}
            depositLinkSent={depositLinkSent}
            sendingDepositLink={false}
            onSendDepositLink={ctx.onSendDepositLink}
            onTakeDepositManually={() => toast.info("In practice, send the $75 link instead.")}
            onOpenInbox={() => toast.info("Inbox isn't part of practice.")}
            unreadCount={0}
            onSaveName={noop}
            firms={firms.data ?? []}
            selectedFirmId={selectedFirmId}
            onSelectFirm={ctx.onSelectFirm}
            lawyers={lawyers.data ?? []}
            selectedLawyerId={selectedLawyerId}
            onSelectLawyer={setSelectedLawyerId}
          />
        </aside>
      </div>
    </main>
  );
}
