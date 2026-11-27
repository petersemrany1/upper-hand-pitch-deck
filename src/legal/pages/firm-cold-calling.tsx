// Ported from the Legal app (family-law-floater/src/routes/_authenticated/firm-cold-calling.tsx). Re-run the port script to refresh.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ExternalLink,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Search,
  SkipForward,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { CallStages } from "@/legal/components/cold-calling/CallStages";
import { FirmCard } from "@/legal/components/cold-calling/FirmCard";
import { DispositionPanel } from "@/legal/components/cold-calling/DispositionPanel";
import { ImportWizard } from "@/legal/components/cold-calling/ImportWizard";
import {
  FitScore,
  StatusBadge,
  TierBadge,
  primaryContact,
} from "@/legal/components/cold-calling/prospect-ui";
import { Badge } from "@/legal/components/ui/badge";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/legal/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/legal/components/ui/tabs";
import { Textarea } from "@/legal/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/legal/components/ui/dialog";
import { Label } from "@/legal/components/ui/label";
import { useDialler, type DiallerState } from "@/legal/hooks/use-dialler";
import {
  endProspectCallFn,
  getHandoverDraftFn,
  getColdEmailDraftFn,
  getColdSmsDraftFn,
  getPendingHandoverFn,
  linkCallSidFn,
  prospectActionFn,
  saveDispositionFn,
  sendColdEmailFn,
  sendColdSmsFn,
  sendHandoverFn,
  transcribeAttemptFn,
  debriefAttemptFn,
  ensureDailyAssignmentFn,
  startProspectCallFn,
} from "@/legal/lib/cold-calling/cold-calling.functions";
import {
  fetchAllContacts,
  fetchAttemptsForFirm,
  fetchAttemptsSince,
  fetchColdCallingSettings,
  fetchUnsavedAttempt,
  fetchProspects,
  fetchStaffDirectory,
  formatWhen,
  staffName,
  type ProspectFirm,
} from "@/legal/lib/cold-calling/client";
import { sydneyWorkDate } from "@/legal/lib/cold-calling/daily-phone";
import type { DispositionInput } from "@/legal/lib/cold-calling/dispositions";
import { formatAuNumber, isCallback } from "@/legal/lib/cold-calling/callbacks";
import { isFirmOpenNow, zonedInstant } from "@/legal/lib/cold-calling/calling-window";
import {
  compareProspects,
  isEligibleToCall,
  isFollowUpDue,
  isTestFirm,
} from "@/legal/lib/cold-calling/queues";
import { DEFAULT_BOOKING_URL, missingComplianceFields } from "@/legal/lib/cold-calling/settings";
import {
  DECISION_MAKER_DISPOSITIONS,
  PROSPECT_STATUSES,
  SETTER_PAY,
  dispositionLabel,
  prospectStatusLabel,
} from "@/legal/lib/cold-calling/types";
import { fetchCurrentStaff } from "@/legal/lib/client-leads";
import { formatDuration } from "@/legal/lib/sales-call";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { FirmColdCallPortal as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Firm Cold Call Portal — Legal Group Portal" },
      {
        name: "description",
        content:
          "Call family-law firms with the script on screen, then work the follow-up pipeline.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FirmColdCallPortal,
});

type Phase = "idle" | "dialling" | "live" | "wrap_up";

const PIPELINE_STAGES = [
  { value: "follow_up_all", label: "Follow ups" },
  { value: "follow_up_due", label: "Follow ups due" },
  { value: "gatekeeper", label: "Gatekeeper" },
  { value: "emailed", label: "Emailed / texted" },
  { value: "meeting_booked", label: "Closer Zoom set" },
  { value: "new", label: "New" },
  { value: "no_answer", label: "No answer" },
  { value: "warm", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "bad_fit", label: "Bad fit" },
  { value: "do_not_contact", label: "Do not contact" },
  { value: "exhausted", label: "Exhausted" },
  { value: "applied", label: "Applied via Meta" },
] as const;

/** Setters see only what needs a human follow-up and what has been booked; everything else is served by the Call tab. */
const SETTER_STAGES = [
  { value: "follow_up_all", label: "Follow ups" },
  { value: "follow_up_due", label: "Follow ups due" },
  { value: "gatekeeper", label: "Gatekeeper" },
  { value: "emailed", label: "Emailed / texted" },
  { value: "meeting_booked", label: "Closer Zoom set" },
] as const;

function FirmColdCallPortal() {
  const { user, role } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const workDate = sydneyWorkDate();
  // Midnight Sydney (handles daylight saving), so the tally resets at the start of the Sydney day.
  const dayStartISO = useMemo(
    () => zonedInstant(workDate, "00:00", "Australia/Sydney").toISOString(),
    [workDate],
  );

  const staff = useQuery({ queryKey: ["current-staff"], queryFn: fetchCurrentStaff });
  const directory = useQuery({ queryKey: ["staff-directory"], queryFn: fetchStaffDirectory });
  const settings = useQuery({
    queryKey: ["cold-calling-settings"],
    queryFn: fetchColdCallingSettings,
  });
  const prospects = useQuery({
    queryKey: ["prospects"],
    queryFn: fetchProspects,
    refetchInterval: 15000, // firms ringing back should surface within seconds
  });
  const contacts = useQuery({ queryKey: ["prospect-contacts"], queryFn: fetchAllContacts });

  const [tab, setTab] = useState<"call" | "pipeline" | "import" | "results">("call");
  const [phase, setPhase] = useState<Phase>("idle");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [notes, setNotes] = useState("");
  const [pinnedFirmId, setPinnedFirmId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);
  const [stageId, setStageId] = useState("gatekeeper");
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [zoomAt, setZoomAt] = useState("");
  const [zoomRef, setZoomRef] = useState("");
  const [handoverAttemptId, setHandoverAttemptId] = useState<string | null>(null);
  const assignFn = useServerFn(ensureDailyAssignmentFn);
  // The number the setter is calling from today: give this to a lawyer who wants to ring back.
  const myNumber = useQuery({
    queryKey: ["daily-assignment", user.id, sydneyWorkDate(new Date())],
    queryFn: () => assignFn(),
    enabled: started,
    staleTime: 60 * 60 * 1000,
  });
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);

  const startFn = useServerFn(startProspectCallFn);
  const endFn = useServerFn(endProspectCallFn);
  const saveFn = useServerFn(saveDispositionFn);
  const actionFn = useServerFn(prospectActionFn);

  // Running tally for the header: this caller's calls and Closer Zooms set today (Sydney). Comes
  // from the database, so a refresh or a new tab never resets it.
  const todayAttempts = useQuery({
    queryKey: ["attempts-today", dayStartISO],
    queryFn: () => fetchAttemptsSince(dayStartISO),
    refetchInterval: 30000,
  });
  const tally = useMemo(() => {
    const mine = (todayAttempts.data ?? []).filter((a) => a.caller_user_id === user.id);
    return {
      calls: mine.length,
      zooms: mine.filter((a) => a.business_disposition === "meeting_booked").length,
    };
  }, [todayAttempts.data, user.id]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["prospects"] });
    void queryClient.invalidateQueries({ queryKey: ["attempts-today"] });
  }, [queryClient]);

  // After a refresh: reopen an unsent handover first, else resume an unsaved call.
  const pendingFn = useServerFn(getPendingHandoverFn);
  useEffect(() => {
    void pendingFn()
      .then((pending) => {
        if (pending) {
          setPinnedFirmId(pending.firmId);
          setHandoverAttemptId(pending.attemptId);
          setStarted(true);
        }
      })
      .catch(() => undefined);
  }, [pendingFn]);
  useEffect(() => {
    void fetchUnsavedAttempt(user.id).then((live) => {
      if (live) {
        setAttemptId(live.id);
        setAttemptNumber(live.attempt_number);
        setPinnedFirmId(live.prospect_firm_id);
        setPhase("wrap_up");
        setStarted(true);
      }
    });
  }, [user.id]);

  // ---- next lead: callbacks first, then tier A, score, oldest; skip other setters' leads ----
  const now = useMemo(() => new Date(), [prospects.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  // Test firms are admin-only.
  const visibleFirms = useMemo(
    () =>
      role.isAdmin ? (prospects.data ?? []) : (prospects.data ?? []).filter((f) => !isTestFirm(f)),
    [prospects.data, role.isAdmin],
  );
  const callable = useMemo(
    () =>
      visibleFirms
        .filter((f) => isEligibleToCall(f).eligible)
        .filter((f) => !f.assigned_caller_user_id || f.assigned_caller_user_id === user.id)
        // Only serve a firm once it is 9:00 am in its own state (Perth is two or three hours behind Sydney).
        .filter((f) => isFirmOpenNow(f.state, now))
        .filter((f) => !f.next_follow_up_at || isFollowUpDue(f, now))
        .sort((a, b) => compareProspects(a, b, now)),
    [visibleFirms, user.id, now],
  );
  const currentFirm: ProspectFirm | null = useMemo(() => {
    if (pinnedFirmId) return (prospects.data ?? []).find((f) => f.id === pinnedFirmId) ?? null;
    return callable.find((f) => !skipped.has(f.id)) ?? null;
  }, [pinnedFirmId, prospects.data, callable, skipped]);
  const remaining = callable.filter((f) => !skipped.has(f.id)).length;
  // Firms that rang or texted back and are waiting for this setter (newest first, see compareProspects).
  const callbacksWaiting = useMemo(
    () => callable.filter((f) => isCallback(f) && !skipped.has(f.id)),
    [callable, skipped],
  );

  const nextLead = () => {
    if (phase === "dialling") return;
    if (attemptId) {
      // A call was made: the outcome must be chosen before moving on.
      if (phase === "live") dialler.hangUp();
      setOutcomeOpen(true);
      return;
    }
    if (currentFirm) setSkipped((s) => new Set(s).add(currentFirm.id));
    setPinnedFirmId(null);
    setNotes("");
  };

  // ---- dialler ----
  const diallerSecondsRef = useRef(0);
  const diallerSidRef = useRef<string | null>(null);
  const diallerWasLiveRef = useRef(false);
  // Set when an email/text was sent while the call was still up: the outcome is already saved
  // (follow-up), so when the call ends we go straight to the next lead instead of wrap-up.
  const sentDuringCallRef = useRef(false);
  const onCallEnded = useCallback(() => {
    if (!attemptId) return;
    void endFn({
      data: {
        attemptId,
        durationSeconds: diallerSecondsRef.current,
        callSid: diallerSidRef.current,
        ...(diallerWasLiveRef.current ? { telephonyStatus: "completed" } : {}),
      },
    }).catch(() => undefined);
    if (sentDuringCallRef.current) {
      sentDuringCallRef.current = false;
      setAttemptId(null);
      setNotes("");
      setPinnedFirmId(null);
      setPhase("idle");
      setStageId("gatekeeper");
    } else {
      setPhase("wrap_up");
    }
    invalidate();
  }, [attemptId, endFn, invalidate]);
  /** After the email/text dialog sent: move on now, or (mid-call) once the call ends. */
  const afterLastResortSent = useCallback(
    (what: "email" | "text") => {
      setEmailOpen(false);
      setSmsOpen(false);
      if (currentFirm) setSkipped((prev) => new Set(prev).add(currentFirm.id));
      if (phase === "live" || phase === "dialling") {
        sentDuringCallRef.current = true;
        toast.success(
          `${what === "email" ? "Email" : "Text"} sent — finish the call; it moves to the next lead when you hang up.`,
        );
      } else {
        setAttemptId(null);
        setNotes("");
        setPinnedFirmId(null);
        setPhase("idle");
        setStageId("gatekeeper");
      }
      invalidate();
    },
    [currentFirm, phase, invalidate],
  );
  const dialler = useDialler(onCallEnded);
  diallerSecondsRef.current = dialler.seconds;
  diallerSidRef.current = dialler.lastCallSid;
  const linkSidFn = useServerFn(linkCallSidFn);
  useEffect(() => {
    if (attemptId && dialler.lastCallSid) {
      void linkSidFn({ data: { attemptId, callSid: dialler.lastCallSid } }).catch(() => undefined);
    }
  }, [attemptId, dialler.lastCallSid, linkSidFn]);
  useEffect(() => {
    if (dialler.status === "on-call") diallerWasLiveRef.current = true;
  }, [dialler.status]);
  useEffect(() => {
    if (phase === "live" && dialler.status === "idle") onCallEnded();
  }, [phase, dialler.status, onCallEnded]);

  const missing = settings.data ? missingComplianceFields(settings.data) : [];
  const blockedReason = missing.length
    ? `An admin needs to complete the cold-calling details in Settings: ${missing.join(", ")}.`
    : !currentFirm
      ? "No callable leads right now."
      : null;

  const placeCall = async () => {
    if (!currentFirm || blockedReason) return;
    setPhase("dialling");
    diallerWasLiveRef.current = false;
    setPinnedFirmId(currentFirm.id);
    try {
      const result = await startFn({ data: { firmId: currentFirm.id } });
      setAttemptId(result.attemptId);
      setAttemptNumber(result.attemptNumber);
      invalidate();
      const ok = await dialler.startCall({
        to: result.toNumber,
        leadId: "",
        repId: staff.data?.id ?? null,
        extraParams: { ProspectAttemptId: result.attemptId },
      });
      if (!ok) {
        await endFn({ data: { attemptId: result.attemptId, telephonyStatus: "failed" } }).catch(
          () => undefined,
        );
        setPhase("wrap_up");
        return;
      }
      setPhase("live");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the call");
      setPhase("idle");
    }
  };

  /** Redial the same firm: the try just made is saved as No answer, then a new call starts. */
  const callAgain = async () => {
    if (!attemptId || !currentFirm) return;
    try {
      await saveFn({
        data: { attemptId, firmId: currentFirm.id, disposition: "no_answer", notes },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the previous try");
      return;
    }
    setAttemptId(null);
    setPhase("idle");
    invalidate();
    await placeCall();
  };

  const saving = useMutation({
    mutationFn: (input: DispositionInput) =>
      saveFn({ data: { attemptId: attemptId ?? null, firmId: currentFirm?.id ?? null, ...input } }),
    onSuccess: (result) => {
      toast.success(`Saved: ${prospectStatusLabel(result.prospectStatus)}`);
      // Move past this firm now rather than waiting for the list to refresh.
      if (currentFirm) setSkipped((prev) => new Set(prev).add(currentFirm.id));
      if (result.prospectStatus === "meeting_booked") setHandoverAttemptId(result.attemptId);
      if (result.prospectStatus === "warm" && result.bookingUrl)
        window.open(result.bookingUrl, "_blank", "noopener");
      setAttemptId(null);
      setNotes("");
      setPinnedFirmId(null);
      setPhase("idle");
      setStageId("gatekeeper");
      setOutcomeOpen(false);
      setZoomAt("");
      setZoomRef("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const action = useMutation({
    mutationFn: (input: Parameters<typeof actionFn>[0]["data"]) => actionFn({ data: input }),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const liveLabel =
    phase === "dialling"
      ? "Starting…"
      : phase === "live"
        ? dialler.status === "connecting"
          ? "Connecting…"
          : dialler.status === "ringing"
            ? "Ringing…"
            : dialler.status === "on-call"
              ? `On call · ${formatDuration(dialler.seconds)}`
              : "Ending…"
        : phase === "wrap_up"
          ? "Call ended — Call again, or Next lead to choose the outcome"
          : "Ready";
  const callerFirstName = (staff.data?.name ?? "").split(" ")[0] || "…";
  const bookingUrl = DEFAULT_BOOKING_URL; // Peter's pay-per-show rollout Calendly; not overridable from Settings
  const saveZoom = () => {
    if (!currentFirm) return;
    const t = zoomAt ? new Date(zoomAt).getTime() : NaN;
    if (!Number.isFinite(t)) {
      toast.error("Enter the date and time you confirmed with them.");
      return;
    }
    if (phase === "live") dialler.hangUp();
    saving.mutate({
      disposition: "meeting_booked",
      notes,
      meetingAt: new Date(t).toISOString(),
      meetingReference: zoomRef || bookingUrl,
    });
  };
  const bookingFooter = (
    <div className="mt-3 space-y-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold">
        Press the link, confirm the time with them, then enter it below and save.
      </p>
      <Button asChild variant="outline">
        <a href={bookingUrl} target="_blank" rel="noreferrer noopener">
          Open Calendly <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="zoom-at">Closer call date &amp; time</Label>
          <Input
            id="zoom-at"
            type="datetime-local"
            value={zoomAt}
            onChange={(e) => setZoomAt(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="zoom-ref">Their email or booking reference (optional)</Label>
          <Input
            id="zoom-ref"
            value={zoomRef}
            onChange={(e) => setZoomRef(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      {phase === "live" ? (
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Finish the call first: confirm the time and email with them, say goodbye, then press the
          button — it hangs up and saves.
        </p>
      ) : null}
      <Button
        size="lg"
        className="w-full"
        disabled={!currentFirm || saving.isPending}
        onClick={saveZoom}
      >
        {saving.isPending
          ? "Saving…"
          : phase === "live"
            ? "Hang up & save — Closer Zoom set"
            : "Save outcome — Closer Zoom set"}
      </Button>
    </div>
  );
  const previous = useQuery({
    queryKey: ["firm-attempts", currentFirm?.id],
    queryFn: () => fetchAttemptsForFirm(currentFirm!.id),
    enabled: !!currentFirm,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">Firm Cold Call Portal</h1>
          </div>
          <div
            className="flex items-center gap-4 rounded-xl border bg-muted/40 px-4 py-1.5"
            title="Your calls and Closer Zooms set today, Sydney time. Saved on the server, so refreshing never resets it."
          >
            <div className="text-center leading-tight">
              <div className="text-xl font-bold tabular-nums">{tally.calls}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Calls today
              </div>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden />
            <div className="text-center leading-tight">
              <div className="text-xl font-bold tabular-nums">{tally.zooms}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Zooms set
              </div>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="call">Call</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              {role.isAdmin ? <TabsTrigger value="import">Import</TabsTrigger> : null}
              {role.isAdmin ? <TabsTrigger value="results">Results</TabsTrigger> : null}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 py-4">
        {tab === "call" && !started ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Ready to call?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {prospects.isError
                  ? `Could not load leads: ${(prospects.error as Error).message}`
                  : prospects.isLoading
                    ? "Loading leads…"
                    : callbacksWaiting.length
                      ? `${callbacksWaiting[0]!.firm_name} ${callbacksWaiting[0]!.last_disposition === "texted_back" ? "texted" : "called"} back — they're first up.`
                      : remaining === 0
                        ? visibleFirms.some(
                            (f) => isEligibleToCall(f).eligible && !isFirmOpenNow(f.state, now),
                          )
                          ? "No firms are open yet — leads appear once it is 9:00 am in their state."
                          : "No callable leads right now — check the Pipeline tab."
                        : ""}
              </p>
            </div>
            <Button
              size="lg"
              className="h-16 px-14 text-xl shadow-md"
              disabled={!currentFirm}
              onClick={() => setStarted(true)}
            >
              Start calling
            </Button>
          </div>
        ) : null}

        {tab === "call" && started ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="space-y-4">
              {callbacksWaiting.length ? (
                <div
                  role="status"
                  className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <p className="font-semibold">
                    {callbacksWaiting[0]!.firm_name}{" "}
                    {callbacksWaiting[0]!.last_disposition === "texted_back" ? "texted" : "called"}{" "}
                    back {formatWhen(callbacksWaiting[0]!.next_follow_up_at)}
                    {callbacksWaiting.length > 1
                      ? ` · ${callbacksWaiting.length - 1} more waiting`
                      : ""}
                  </p>
                  <p className="text-xs">
                    {phase === "live" || phase === "dialling"
                      ? "They're your next lead after this call."
                      : currentFirm?.id === callbacksWaiting[0]!.id
                        ? "They're up now — press Call."
                        : "They're your next lead."}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${phase === "live" ? "bg-green-500" : phase === "dialling" ? "bg-amber-500" : "bg-muted-foreground/40"}`}
                  aria-hidden
                />
                <span className="text-sm font-medium">{liveLabel}</span>
                {myNumber.data?.outboundCallerId ? (
                  <span
                    className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    title="The number you are calling from today. If a lawyer wants to ring you back, give them this — it comes straight to your queue."
                  >
                    Your number:{" "}
                    <b className="font-semibold text-foreground">
                      {formatAuNumber(myNumber.data.outboundCallerId)}
                    </b>
                  </span>
                ) : null}
                <div className="ml-auto flex flex-wrap gap-2">
                  {phase === "idle" ? (
                    <>
                      <Button
                        size="lg"
                        disabled={Boolean(blockedReason)}
                        onClick={() => void placeCall()}
                      >
                        <PhoneCall className="h-4 w-4" aria-hidden /> Call
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={nextLead}
                        disabled={!currentFirm}
                      >
                        <SkipForward className="h-4 w-4" aria-hidden /> Next lead
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setEmailOpen(true)}
                        disabled={!currentFirm}
                      >
                        <Mail className="h-4 w-4" aria-hidden /> Email (last resort)
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setSmsOpen(true)}
                        disabled={!currentFirm}
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden /> Text (last resort)
                      </Button>
                    </>
                  ) : phase === "live" ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={dialler.toggleMute}
                        disabled={dialler.status !== "on-call"}
                      >
                        {dialler.muted ? (
                          <MicOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Mic className="h-4 w-4" aria-hidden />
                        )}{" "}
                        {dialler.muted ? "Unmute" : "Mute"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEmailOpen(true)}
                        disabled={!currentFirm}
                      >
                        <Mail className="h-4 w-4" aria-hidden /> Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSmsOpen(true)}
                        disabled={!currentFirm}
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden /> Text
                      </Button>
                      <Button variant="destructive" onClick={dialler.hangUp}>
                        <PhoneOff className="h-4 w-4" aria-hidden /> Hang up
                      </Button>
                    </>
                  ) : phase === "wrap_up" ? (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => void callAgain()}
                        disabled={!currentFirm}
                      >
                        <PhoneCall className="h-4 w-4" aria-hidden /> Call again
                      </Button>
                      <Button size="lg" onClick={nextLead}>
                        <SkipForward className="h-4 w-4" aria-hidden /> Next lead
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setEmailOpen(true)}
                        disabled={!currentFirm}
                      >
                        <Mail className="h-4 w-4" aria-hidden /> Email (last resort)
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setSmsOpen(true)}
                        disabled={!currentFirm}
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden /> Text (last resort)
                      </Button>
                    </>
                  ) : null}
                </div>
                {phase === "live" || phase === "dialling" ? (
                  <DialPad
                    firmName={currentFirm?.firm_name ?? ""}
                    number={currentFirm?.phone_e164 ?? null}
                    status={phase === "dialling" ? "connecting" : dialler.status}
                    seconds={dialler.seconds}
                    onDigit={dialler.sendDigits}
                  />
                ) : null}
                {blockedReason && phase === "idle" ? (
                  <p
                    role="status"
                    className="flex w-full items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 p-2 text-sm dark:bg-amber-950/20"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />{" "}
                    {blockedReason}
                  </p>
                ) : null}
              </div>
              <CallStages
                stageId={stageId}
                onSelect={setStageId}
                vars={{ name: callerFirstName, state: currentFirm?.state ?? "[STATE]" }}
                footers={{ book: bookingFooter }}
              />
            </section>

            <aside className="space-y-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:self-start">
              {!currentFirm ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No callable leads right now — check the Pipeline tab.
                </div>
              ) : (
                <FirmCard
                  firm={currentFirm}
                  contacts={contacts.data?.[currentFirm.id] ?? []}
                  previousAttempts={(previous.data ?? []).filter((a) => a.business_disposition)}
                  onGoToStage={setStageId}
                />
              )}
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Notes
                </p>
                <Textarea
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes while you talk…"
                  aria-label="Call notes"
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Booked a closer call? Use step 7. Otherwise press Next lead and choose the
                  outcome.
                </p>
              </section>
            </aside>
          </div>
        ) : null}

        <Dialog
          open={outcomeOpen}
          onOpenChange={(open) => {
            if (!saving.isPending) setOutcomeOpen(open);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>How did that call go?</DialogTitle>
              <DialogDescription>
                Choose the outcome for {currentFirm?.firm_name ?? "this firm"}. A closer Zoom is
                saved from step 7 instead.
              </DialogDescription>
            </DialogHeader>
            {attemptId ? (
              <DispositionPanel
                staff={directory.data ?? []}
                currentUserId={user.id}
                bookingUrl={bookingUrl}
                saving={saving.isPending}
                onSave={async (input) => {
                  await saving.mutateAsync(input);
                }}
                notes={notes}
                onNotesChange={setNotes}
                exclude={["meeting_booked"]}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <HandoverDialog attemptId={handoverAttemptId} onDone={() => setHandoverAttemptId(null)} />
        <ColdSmsDialog
          open={smsOpen}
          firm={currentFirm}
          attemptId={attemptId}
          onClose={() => setSmsOpen(false)}
          onSent={() => afterLastResortSent("text")}
        />
        <ColdEmailDialog
          open={emailOpen}
          firm={currentFirm}
          attemptId={attemptId}
          onClose={() => setEmailOpen(false)}
          onSent={() => afterLastResortSent("email")}
        />

        {tab === "pipeline" ? (
          <Pipeline
            firms={visibleFirms}
            contacts={contacts.data ?? {}}
            staff={directory.data ?? []}
            isAdmin={role.isAdmin}
            ownerUserId={role.isAdmin ? null : user.id}
            now={now}
            onCall={(firm) => {
              setPinnedFirmId(firm.id);
              setTab("call");
            }}
            onAction={(input) => action.mutate(input)}
          />
        ) : null}

        {tab === "import" && role.isAdmin ? <ImportWizard /> : null}

        {tab === "results" && role.isAdmin ? (
          <Results firms={prospects.data ?? []} staff={directory.data ?? []} />
        ) : null}
      </div>
    </div>
  );
}

function Pipeline({
  firms,
  contacts,
  staff,
  isAdmin,
  ownerUserId,
  now,
  onCall,
  onAction,
}: {
  firms: ProspectFirm[];
  contacts: Record<string, import("@/legal/lib/cold-calling/client").ProspectContact[]>;
  staff: import("@/legal/lib/cold-calling/client").StaffMember[];
  isAdmin: boolean;
  /** When set, only firms this user is responsible for are shown (setters). */
  ownerUserId: string | null;
  now: Date;
  onCall: (firm: ProspectFirm) => void;
  onAction: (input: {
    firmId: string;
    action: "set_deal" | "reopen" | "clear_dnc" | "note" | "bump" | "reset";
    dealStatus?: "open" | "closed_won" | "closed_lost";
    note?: string;
  }) => void;
}) {
  type StageId =
    (typeof PIPELINE_STAGES)[number]["value"] | (typeof SETTER_STAGES)[number]["value"];
  const stages: ReadonlyArray<{ value: StageId; label: string }> = isAdmin
    ? PIPELINE_STAGES
    : SETTER_STAGES;
  const [stage, setStage] = useState<StageId>("follow_up_all");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("any");
  const [noteFor, setNoteFor] = useState<{ id: string; text: string } | null>(null);

  const mine = useMemo(
    () =>
      ownerUserId
        ? firms.filter(
            (f) =>
              f.assigned_caller_user_id === ownerUserId ||
              f.follow_up_owner_user_id === ownerUserId ||
              f.meeting_booked_by === ownerUserId,
          )
        : firms,
    [firms, ownerUserId],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of stages) c[s.value] = 0;
    for (const f of mine) {
      const humanFollowUp =
        ["follow_up", "warm", "gatekeeper"].includes(f.prospect_status) &&
        !f.do_not_contact &&
        !f.suppressed;
      if (humanFollowUp && f.prospect_status !== "gatekeeper")
        c["follow_up_all"] = (c["follow_up_all"] ?? 0) + 1;
      if (humanFollowUp && isFollowUpDue(f, now))
        c["follow_up_due"] = (c["follow_up_due"] ?? 0) + 1;
      const key =
        f.do_not_contact || f.suppressed
          ? "do_not_contact"
          : f.prospect_status === "texted"
            ? "emailed"
            : f.prospect_status;
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [mine, now, stages]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mine
      .filter((f) => {
        const inStage =
          stage === "follow_up_all"
            ? ["follow_up", "warm"].includes(f.prospect_status) &&
              !f.do_not_contact &&
              !f.suppressed
            : stage === "follow_up_due"
              ? ["follow_up", "warm", "gatekeeper"].includes(f.prospect_status) &&
                !f.do_not_contact &&
                !f.suppressed &&
                isFollowUpDue(f, now)
              : stage === "do_not_contact"
                ? f.do_not_contact || f.suppressed
                : stage === "emailed"
                  ? ["emailed", "texted"].includes(f.prospect_status) &&
                    !f.do_not_contact &&
                    !f.suppressed
                  : f.prospect_status === stage && !f.do_not_contact && !f.suppressed;
        if (!inStage) return false;
        if (state !== "any" && f.state !== state) return false;
        if (q) {
          const names = (contacts[f.id] ?? []).map((c) => c.full_name.toLowerCase()).join(" ");
          if (!`${f.firm_name} ${f.primary_city ?? ""} ${names}`.toLowerCase().includes(q))
            return false;
        }
        return true;
      })
      .sort((a, b) => compareProspects(a, b, now));
  }, [mine, contacts, stage, search, state, now]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {stages.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStage(s.value)}
            aria-pressed={stage === s.value}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${stage === s.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-accent"}`}
          >
            {s.label} <span className="opacity-70">{counts[s.value] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-8"
            placeholder="Search firm, city, contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search pipeline"
          />
        </div>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="w-36" aria-label="State">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any state</SelectItem>
            {["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Fit</TableHead>
              <TableHead>Firm</TableHead>
              <TableHead>Decision-maker</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Last call</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {ownerUserId
                    ? "Nothing here yet. New leads come to you on the Call tab — press Start calling. Your follow-ups and booked Zooms show up here after your calls."
                    : "Nothing here."}
                </TableCell>
              </TableRow>
            ) : (
              rows.slice(0, 300).map((f) => {
                const contact = primaryContact(contacts[f.id]);
                const eligible = isEligibleToCall(f).eligible;
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <FitScore score={f.fit_score} />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {f.firm_name} <TierBadge tier={f.priority_tier} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[f.primary_city, f.state].filter(Boolean).join(", ")}
                        {f.website ? (
                          <>
                            {" · "}
                            <a
                              href={f.website}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-primary hover:underline"
                            >
                              site <ExternalLink className="inline h-3 w-3" aria-hidden />
                            </a>
                          </>
                        ) : null}
                        {" · "}
                        {staffName(staff, f.assigned_caller_user_id)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {contact?.full_name ?? (
                          <span className="text-muted-foreground">Not found</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{contact?.position ?? ""}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge firm={f} />
                      {f.deal_status !== "open" ? (
                        <p className="mt-0.5">
                          <Badge variant={f.deal_status === "closed_won" ? "default" : "secondary"}>
                            {f.deal_status === "closed_won" ? "Client won" : "Lost"}
                          </Badge>
                        </p>
                      ) : null}
                      {f.last_disposition ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {dispositionLabel(f.last_disposition)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatWhen(f.last_call_at)}
                      <br />
                      {f.call_attempt_count} attempt{f.call_attempt_count === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell
                      className={
                        isFollowUpDue(f, now)
                          ? "text-sm font-semibold"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {formatWhen(f.next_follow_up_at)}
                      {f.meeting_at ? (
                        <p className="text-xs text-muted-foreground">
                          Meeting {formatWhen(f.meeting_at)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {noteFor?.id === f.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={noteFor.text}
                            onChange={(e) => setNoteFor({ id: f.id, text: e.target.value })}
                            aria-label="New note"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              onAction({ firmId: f.id, action: "note", note: noteFor.text });
                              setNoteFor(null);
                            }}
                            disabled={!noteFor.text.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="block max-h-16 w-full overflow-hidden text-left text-xs text-muted-foreground hover:underline"
                          onClick={() => setNoteFor({ id: f.id, text: "" })}
                          title="Add a note"
                        >
                          {f.follow_up_note ||
                            f.bad_fit_reason ||
                            f.do_not_contact_reason ||
                            "Add note…"}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-end gap-1">
                        <Button size="sm" disabled={!eligible} onClick={() => onCall(f)}>
                          Call
                        </Button>
                        {isAdmin && f.prospect_status === "meeting_booked" ? (
                          <Select
                            value={f.deal_status}
                            onValueChange={(v) =>
                              onAction({
                                firmId: f.id,
                                action: "set_deal",
                                dealStatus: v as "open" | "closed_won" | "closed_lost",
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-36 text-xs" aria-label="Deal">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Deal open</SelectItem>
                              <SelectItem value="closed_won">Client won</SelectItem>
                              <SelectItem value="closed_lost">Lost</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : null}
                        {isAdmin && eligible ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAction({ firmId: f.id, action: "bump" })}
                          >
                            Call first
                          </Button>
                        ) : null}
                        {isAdmin &&
                        ["not_interested", "bad_fit", "exhausted"].includes(f.prospect_status) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAction({ firmId: f.id, action: "reopen" })}
                          >
                            Reopen
                          </Button>
                        ) : null}
                        {isAdmin && (f.call_attempt_count > 0 || f.prospect_status !== "new") ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Reset ${f.firm_name} to new? This deletes its call history.`,
                                )
                              )
                                onAction({ firmId: f.id, action: "reset" });
                            }}
                          >
                            Reset to new
                          </Button>
                        ) : null}
                        {isAdmin && f.do_not_contact ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAction({ firmId: f.id, action: "clear_dnc" })}
                          >
                            Clear DNC
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {rows.length > 300 ? (
          <p className="p-2 text-xs text-muted-foreground">Showing the first 300.</p>
        ) : null}
      </div>
    </div>
  );
}

function Results({
  firms,
  staff,
}: {
  firms: ProspectFirm[];
  staff: import("@/legal/lib/cold-calling/client").StaffMember[];
}) {
  const attempts = useQuery({
    queryKey: ["attempts-all"],
    queryFn: () => fetchAttemptsSince("2026-01-01T00:00:00Z"),
  });
  const rows = useMemo(() => {
    const per = new Map<string, { calls: number; dms: number; meetings: number; won: number }>();
    const firmMap = new Map(firms.map((f) => [f.id, f]));
    for (const a of attempts.data ?? []) {
      const p = per.get(a.caller_user_id) ?? { calls: 0, dms: 0, meetings: 0, won: 0 };
      p.calls += 1;
      if (
        a.business_disposition &&
        (DECISION_MAKER_DISPOSITIONS as readonly string[]).includes(a.business_disposition)
      )
        p.dms += 1;
      if (a.business_disposition === "meeting_booked") {
        p.meetings += 1;
        if (firmMap.get(a.prospect_firm_id)?.deal_status === "closed_won") p.won += 1;
      }
      per.set(a.caller_user_id, p);
    }
    return [...per.entries()];
  }, [attempts.data, firms]);
  const stageCounts = PROSPECT_STATUSES.map(
    (s) => [s.label, firms.filter((f) => f.prospect_status === s.value).length] as const,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stageCounts.map(([label, n]) => (
          <div key={label} className="rounded-xl border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">{label}</span>{" "}
            <span className="font-semibold tabular-nums">{n}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setter</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Decision-makers</TableHead>
              <TableHead className="text-right">Meetings set</TableHead>
              <TableHead className="text-right">Meeting bonus</TableHead>
              <TableHead className="text-right">Clients won</TableHead>
              <TableHead className="text-right">Close bonus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No calls yet.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map(([userId, p]) => (
              <TableRow key={userId}>
                <TableCell className="font-medium">{staffName(staff, userId)}</TableCell>
                <TableCell className="text-right tabular-nums">{p.calls}</TableCell>
                <TableCell className="text-right tabular-nums">{p.dms}</TableCell>
                <TableCell className="text-right tabular-nums">{p.meetings}</TableCell>
                <TableCell className="text-right tabular-nums">
                  ${p.meetings * SETTER_PAY.meetingBonusAud}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.won}</TableCell>
                <TableCell className="text-right tabular-nums">
                  ${p.won * SETTER_PAY.closedDealBonusAud}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Bonuses: ${SETTER_PAY.meetingBonusAud} per meeting set, another $
        {SETTER_PAY.closedDealBonusAud} when you mark the firm “Client won” on the Pipeline tab.
        Hourly pay is tracked outside the portal.
      </p>
    </div>
  );
}

/** After "Closer Zoom set": wait for the transcript, show the drafted handover, let the setter add to it, then send. */
function HandoverDialog({ attemptId, onDone }: { attemptId: string | null; onDone: () => void }) {
  const draftFn = useServerFn(getHandoverDraftFn);
  const sendFn = useServerFn(sendHandoverFn);
  const [extra, setExtra] = useState("");
  const [openedAt, setOpenedAt] = useState(0);
  const [, setTick] = useState(0);
  useEffect(() => {
    setExtra("");
    setOpenedAt(Date.now());
    if (!attemptId) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(t);
  }, [attemptId]);
  const draft = useQuery({
    queryKey: ["handover-draft", attemptId],
    queryFn: () => draftFn({ data: { attemptId: attemptId! } }),
    enabled: !!attemptId,
    // Keep checking until the call summary is in the draft. Real calls never send without it.
    refetchInterval: (q) => (q.state.data?.debriefReady || q.state.data?.isManual ? false : 3000),
  });
  const debriefFn = useServerFn(debriefAttemptFn);
  const debriefing = useMutation({
    mutationFn: () => debriefFn({ data: { attemptId: attemptId! } }),
    onSettled: () => void draft.refetch(),
  });
  useEffect(() => {
    if (draft.data?.stage === "debriefing" && !debriefing.isPending) debriefing.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.data?.stage, draft.dataUpdatedAt]);
  const transcribeFn = useServerFn(transcribeAttemptFn);
  const transcribing = useMutation({
    mutationFn: () => transcribeFn({ data: { attemptId: attemptId! } }),
    onSettled: () => void draft.refetch(),
  });
  useEffect(() => {
    if (draft.data?.stage === "transcribing" && !transcribing.isPending) transcribing.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.data?.stage, draft.dataUpdatedAt]);
  const sending = useMutation({
    mutationFn: () => sendFn({ data: { attemptId: attemptId!, extraNotes: extra } }),
    onSuccess: (r) => {
      toast.success(
        r.result === "skipped" ? "Handover was already sent" : "Handover emailed to Peter",
      );
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const d = draft.data;
  const ready = !!d && (d.debriefReady || d.isManual);
  const waitedSeconds = Math.round((Date.now() - openedAt) / 1000);
  const waitingLabel = !d
    ? "Pulling together the firm details, your notes and the call…"
    : d.stage === "debriefing"
      ? "Writing the call summary for Peter…"
      : d.stage === "transcribing"
        ? "Transcribing the call… usually under a minute."
        : d.stage === "no_recording_yet"
          ? "Call found — waiting for Twilio to finish the recording…"
          : "Looking up the call on Twilio…";
  return (
    <Dialog
      open={!!attemptId}
      onOpenChange={() => {
        /* must wait for the transcript and send — no dismiss */
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>{ready ? "Handover for Peter" : "Generating handover email…"}</DialogTitle>
          <DialogDescription>
            {ready
              ? "Check it, add anything Peter should know, then send. The next lead loads after."
              : "The handover is only sent with the call summary. Keep this open until it is ready, then send."}
          </DialogDescription>
        </DialogHeader>
        {!ready ? (
          <div className="space-y-3 py-6 text-sm text-muted-foreground">
            <p className="flex items-center gap-3">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden
              />{" "}
              {waitingLabel}
            </p>
            {draft.isError ? (
              <p className="text-destructive">{(draft.error as Error).message}</p>
            ) : null}
            {d?.detail ? <p className="text-xs">{d.detail}</p> : null}
            {waitedSeconds > 240 ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                This is taking longer than usual. Keep this window open; the transcript is on its
                way.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{d!.subject}</p>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
              {d!.text}
            </pre>
            <p className="text-xs text-muted-foreground">
              {d!.debriefReady
                ? "Call summary included."
                : "No recording exists for this call, so the handover goes without a call summary."}
            </p>
            <div>
              <Label htmlFor="handover-extra">Anything to add for Peter?</Label>
              <Textarea
                id="handover-extra"
                rows={4}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Who else is involved, what they care about, anything said off the call…"
                className="mt-1"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={() => sending.mutate()}
                disabled={sending.isPending || d!.alreadySent}
              >
                {d!.alreadySent
                  ? "Already sent"
                  : sending.isPending
                    ? "Sending…"
                    : "Send handover to Peter"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** "Just email me": a pre-written email the setter can edit and send in one go. */
function ColdEmailDialog({
  open,
  firm,
  attemptId,
  onClose,
  onSent,
}: {
  open: boolean;
  firm: ProspectFirm | null;
  attemptId: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const draftFn = useServerFn(getColdEmailDraftFn);
  const sendFn = useServerFn(sendColdEmailFn);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // Chrome autofills any writable text field near an email field; read-only until focused defeats it.
  const [editing, setEditing] = useState(false);
  // "Let me send you an email and I'll call you back at 3" → the follow-up is at 3, not a cold Emailed lead.
  const [callBackAt, setCallBackAt] = useState("");
  const draft = useQuery({
    queryKey: ["cold-email-draft", firm?.id],
    queryFn: () => draftFn({ data: { firmId: firm!.id } }),
    enabled: open && !!firm,
  });
  useEffect(() => {
    if (open && draft.data) {
      setSubject(draft.data.subject);
      setBody(draft.data.body);
    }
    if (!open) {
      setTo("");
      setEditing(false);
      setCallBackAt("");
    }
  }, [open, draft.data]);
  const callBackISO = callBackAt ? localToISO(callBackAt) : null;
  const sending = useMutation({
    mutationFn: () =>
      sendFn({
        data: {
          firmId: firm!.id,
          to: to.trim(),
          subject,
          body,
          attemptId,
          callBackAt: callBackISO,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Email sent from ${r.from.replace(/<.*>/, "").trim()}`);
      onSent();
    },
    onError: (e: Error) => toast.error(e.message, { duration: 10000 }),
  });
  const valid =
    /.+@.+\..+/.test(to.trim()) && subject.trim() && body.trim() && (!callBackAt || callBackISO);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !sending.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email {firm?.firm_name ?? "the firm"}</DialogTitle>
          <DialogDescription>
            Only when they insist on an email. It goes out in your name; replies go to Peter. Edit
            anything, then send. If you promised to call them back, set the time below and they go
            to your Follow ups; otherwise they go to the Emailed tab with a follow-up call in three
            business days.
          </DialogDescription>
        </DialogHeader>
        {draft.isLoading ? (
          <p className="text-sm text-muted-foreground">Writing the email…</p>
        ) : draft.isError ? (
          <p className="text-sm text-destructive">{(draft.error as Error).message}</p>
        ) : (
          <div className="space-y-3">
            <form
              autoComplete="off"

              onSubmit={(e) => e.preventDefault()}
            >
              <Label htmlFor="cold-email-to">Their email address</Label>

              <Input
                id="cold-email-to"

                type="email"

                name="email"

                autoComplete="email"

                value={to}

                onChange={(e) => setTo(e.target.value)}

                placeholder="name@firm.com.au"

                className="mt-1"

                autoFocus
              />
            </form>
            <div>
              <Label htmlFor="cold-email-subject">Subject</Label>
              <Input
                id="cold-email-subject"
                readOnly={!editing}
                onFocus={() => setEditing(true)}
                name="cold-email-subject"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cold-email-body">Email</Label>
              <Textarea
                id="cold-email-body"
                readOnly={!editing}
                onFocus={() => setEditing(true)}
                name="cold-email-body"
                autoComplete="new-password"
                data-lpignore="true"
                rows={14}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 font-mono text-[13px]"
              />
            </div>
            <CallBackField id="cold-email-callback" value={callBackAt} onChange={setCallBackAt} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={sending.isPending}>
                Cancel
              </Button>
              <Button onClick={() => sending.mutate()} disabled={!valid || sending.isPending}>
                {sending.isPending
                  ? "Sending…"
                  : callBackAt
                    ? "Send email & set call back"
                    : "Send email"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ColdSmsDialog({
  open,
  firm,
  attemptId,
  onClose,
  onSent,
}: {
  open: boolean;
  firm: ProspectFirm | null;
  attemptId: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const draftFn = useServerFn(getColdSmsDraftFn);
  const sendFn = useServerFn(sendColdSmsFn);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [callBackAt, setCallBackAt] = useState("");
  const draft = useQuery({
    queryKey: ["cold-sms-draft", firm?.id],
    queryFn: () => draftFn({ data: { firmId: firm!.id } }),
    enabled: open && !!firm,
  });
  useEffect(() => {
    if (open && draft.data) {
      setBody(draft.data.body);
      setTo(draft.data.to);
    }
    if (!open) {
      setTo("");
      setCallBackAt("");
    }
  }, [open, draft.data]);
  const callBackISO = callBackAt ? localToISO(callBackAt) : null;
  const sending = useMutation({
    mutationFn: () =>
      sendFn({
        data: { firmId: firm!.id, to: to.trim(), body, attemptId, callBackAt: callBackISO },
      }),
    onSuccess: (r) => {
      toast.success(`Text sent from ${r.from}`);
      onSent();
    },
    onError: (e: Error) => toast.error(e.message, { duration: 10000 }),
  });
  const digits = to.replace(/\D/g, "");
  const looksMobile = /^(04\d{8}|614\d{8})$/.test(digits);
  const valid =
    looksMobile && body.trim().length > 0 && body.length <= 600 && (!callBackAt || callBackISO);
  // Plain ASCII packs 153 characters per segment; an emoji or curly quote drops that to 67.
  const isAscii = Array.from(body).every((ch) => ch.charCodeAt(0) < 128);
  const segments = Math.max(1, Math.ceil(body.length / (isAscii ? 153 : 67)));
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !sending.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Text {firm?.firm_name ?? "the firm"}</DialogTitle>
          <DialogDescription>
            Only when they ask for a text. It goes from your number for today, so their reply comes
            straight back to you as a callback. Mobiles only. If you promised to call them back, set
            the time below; otherwise they go to the Emailed / texted tab with a follow-up call in
            three business days.
          </DialogDescription>
        </DialogHeader>
        {draft.isLoading ? (
          <p className="text-sm text-muted-foreground">Writing the text…</p>
        ) : draft.isError ? (
          <p className="text-sm text-destructive">{(draft.error as Error).message}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="cold-sms-to">Their mobile</Label>
              <Input
                id="cold-sms-to"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="04xx xxx xxx"
                className="mt-1"
                autoFocus={!to}
              />
              {to && !looksMobile ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  Texts only reach mobiles (04…). Ask for their mobile number.
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="cold-sms-body">Text</Label>
              <Textarea
                id="cold-sms-body"
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 text-[14px]"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {body.length} characters · {segments} SMS
              </p>
            </div>
            <CallBackField id="cold-sms-callback" value={callBackAt} onChange={setCallBackAt} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={sending.isPending}>
                Cancel
              </Button>
              <Button onClick={() => sending.mutate()} disabled={!valid || sending.isPending}>
                {sending.isPending
                  ? "Sending…"
                  : callBackAt
                    ? "Send text & set call back"
                    : "Send text"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** datetime-local value (the setter's own clock) → ISO instant, or null when unparsable. */
function localToISO(local: string): string | null {
  const t = new Date(local).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** "Did you promise to call them back?" — optional date & time shown in the email and text dialogs. */
function CallBackField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <Label htmlFor={id}>Did you promise to call them back? (optional)</Label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Input
          id={id}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-auto"
        />
        {value ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
            Clear
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {value
          ? "They go to your Follow ups, due at this time, and become your next lead when it's due."
          : "Leave empty if you didn't promise a time."}
      </p>
    </div>
  );
}

/**
 * Dialler shown from the moment the call starts ringing: who is being called, the call state, and a
 * keypad for automated menus ("press 1 for reception"). Each tap plays that tone into the call.
 */
function DialPad({
  firmName,
  number,
  status,
  seconds,
  onDigit,
}: {
  firmName: string;
  number: string | null;
  status: DiallerState["status"];
  seconds: number;
  onDigit: (digit: string) => void;
}) {
  const [pressed, setPressed] = useState("");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
  // Tones can go into the call as soon as it is set up (the far end's menu may answer while we
  // still show "Ringing"), so only the idle/ending states disable the pad.
  const canPress = status === "ringing" || status === "on-call";
  const stateLabel =
    status === "ringing"
      ? "Ringing…"
      : status === "on-call"
        ? `On call · ${formatDuration(seconds)}`
        : status === "ending"
          ? "Ending…"
          : "Connecting…";
  return (
    <div className="flex w-full flex-wrap items-start gap-4 rounded-xl border bg-background p-3">
      <div className="min-w-[12rem] flex-1">
        <p className="text-sm font-semibold">{firmName}</p>
        <p className="font-mono text-lg">{number ? formatAuNumber(number) : "—"}</p>
        <p
          className={`text-sm ${status === "on-call" ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
        >
          {stateLabel}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Automated menu? Tap the number it asks for — it plays straight into the call.
        </p>
        <div
          className="mt-1 h-7 w-40 rounded-md bg-muted px-2 text-center font-mono text-lg leading-7 tracking-widest"
          aria-live="polite"
        >
          {pressed || "\u00a0"}
        </div>
      </div>
      <div className="grid w-40 grid-cols-3 gap-1">
        {keys.map((k) => (
          <Button
            key={k}
            type="button"
            variant="secondary"
            className="h-10 text-base font-semibold"
            disabled={!canPress}
            onClick={() => {
              onDigit(k);
              setPressed((p) => (p + k).slice(-12));
            }}
          >
            {k}
          </Button>
        ))}
      </div>
    </div>
  );
}
