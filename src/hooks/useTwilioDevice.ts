import { useCallback, useEffect, useRef, useState } from "react";
import { Device, type Call } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";
import { logFrontendError, extractErrorMessage } from "@/utils/log-frontend-error";
import { startRingback, stopRingback } from "@/utils/ringback";

// Browser-based Twilio softphone — module-level singleton.
//
// IMPORTANT: A single Device is shared across the whole app. The hook is a thin
// subscriber so navigating between pages does NOT tear down / rebuild the
// Device, fetch a fresh token, re-register, or stack listeners.

type Status =
  | "idle"
  | "loading"
  | "ready"
  | "connecting"
  | "ringing-incoming"
  | "in-call"
  | "error";

type DialerStatus = "connecting" | "ready" | "failed";

const TOKEN_REFRESH_MS = 50 * 60 * 1000;

function lowLatencyMediaOptions() {
  // Keep audio constraints realistic. Asking the browser for ideal:0.01s
  // latency makes it silently degrade or buffer more to compensate, which
  // INCREASES perceived delay. Standard AEC/NS/AGC at default latency wins.
  return {
    rtcConstraints: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
      },
    },
  };
}

// ----- Singleton state -----
let device: Device | null = null;
let activeCall: Call | null = null;
let pendingIncoming: Call | null = null;
// Second simultaneous incoming call while another call is active (call-waiting).
// We surface it on the banner instead of auto-rejecting; user can answer (which
// puts the current call on hold-via-disconnect) or reject it.
let waitingCall: Call | null = null;
let initPromise: Promise<void> | null = null;
let refreshTimer: number | null = null;

let currentStatus: Status = "idle";
let currentDialerStatus: DialerStatus = "connecting";
let currentError: string | null = null;
let currentCallSid: string | null = null;
let currentIncomingFrom: string | null = null;
let currentLeadId: string | null = null;
let currentCallPhone: string | null = null;
let currentCallStartedAt: number | null = null;

type Snapshot = {
  status: Status;
  dialerStatus: DialerStatus;
  error: string | null;
  activeCallSid: string | null;
  activeLeadId: string | null;
  activePhone: string | null;
  activeCallStartedAt: number | null;
  incomingFrom: string | null;
  waitingFrom: string | null;
};

let currentWaitingFrom: string | null = null;

const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

function setSnapshot(patch: Partial<Snapshot>) {
  if (patch.status !== undefined) currentStatus = patch.status;
  if (patch.dialerStatus !== undefined) currentDialerStatus = patch.dialerStatus;
  if (patch.error !== undefined) currentError = patch.error;
  if (patch.activeCallSid !== undefined) currentCallSid = patch.activeCallSid;
  if (patch.activeLeadId !== undefined) currentLeadId = patch.activeLeadId;
  if (patch.activePhone !== undefined) currentCallPhone = patch.activePhone;
  if (patch.activeCallStartedAt !== undefined) currentCallStartedAt = patch.activeCallStartedAt;
  if (patch.incomingFrom !== undefined) currentIncomingFrom = patch.incomingFrom;
  if (patch.waitingFrom !== undefined) currentWaitingFrom = patch.waitingFrom;
  notify();
}

async function fetchToken(): Promise<string> {
  // Pass the user's access token explicitly. supabase.functions.invoke does
  // this automatically once a session exists, but we also keep the explicit
  // header so a stale anon-only client still authenticates.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Not signed in — cannot fetch voice token");
  }
  const { data, error: fnErr } = await supabase.functions.invoke("voice-token", {
    body: { identity: "peter_browser" },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (fnErr || !data?.token) {
    const msg = data?.error || fnErr?.message || "Failed to fetch voice token";
    throw new Error(msg);
  }
  console.log(`TOKEN IDENTITY: ${data.identity}`);
  console.log(`TOKEN INCOMING ALLOWED: ${data.incomingAllowed === true}`);
  return data.token as string;
}

function scheduleTokenRefresh() {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(async () => {
    try {
      const next = await fetchToken();
      device?.updateToken(next);
      scheduleTokenRefresh();
    } catch (err) {
      console.error("Voice SDK: token refresh failed", err);
    }
  }, TOKEN_REFRESH_MS);
}

async function ensureDevice(): Promise<void> {
  if (device || initPromise) return initPromise ?? Promise.resolve();
  initPromise = (async () => {
    try {
      setSnapshot({ status: "loading", dialerStatus: "connecting" });
      const token = await fetchToken();

      // Audio tuning notes:
      // - Opus first: it has built-in packet-loss concealment + adaptive
      //   jitter handling. PCMU is narrowband and degrades badly on wifi,
      //   forcing the browser's jitter buffer to grow → audible delay.
      // - 24kbps Opus = clean speech with low buffering.
      // - edge: "sydney" keeps the media path local for AU users.
      // - dscp tags packets so home routers prioritise voice.
      // - closeProtection avoids accidental disconnects mid-call.
      const d = new Device(token, {
        // Required for call waiting. Without this, the Twilio SDK silently
        // ignores a second invite while the browser has an active call, so our
        // "incoming" handler never fires and no banner can appear.
        allowIncomingWhileBusy: true,
        logLevel: 1,
        codecPreferences: ["opus" as never, "pcmu" as never],
        edge: "sydney",
        dscp: true,
        maxAverageBitrate: 24000,
        forceAggressiveIceNomination: true,
        closeProtection: true,
        enableImprovedSignalingErrorPrecision: true,
      } as ConstructorParameters<typeof Device>[1]);
      device = d;

      d.on("registered", () => {
        console.log("Voice SDK: registered");
        console.log("DEVICE REGISTERED");
        console.log("DEVICE READY");
        console.log("DEVICE IDENTITY: peter_browser");
        if (activeCall) {
          setSnapshot({ status: "in-call", dialerStatus: "ready", error: null });
          return;
        }
        if (pendingIncoming) {
          setSnapshot({ status: "ringing-incoming", dialerStatus: "ready", error: null });
          return;
        }
        setSnapshot({ status: "ready", dialerStatus: "ready", error: null, activeCallStartedAt: null });
      });

      d.on("unregistered", () => {
        console.log("Voice SDK: unregistered");
        setSnapshot({ dialerStatus: "connecting" });
      });

      d.on("error", (e: { message?: string; code?: number }) => {
        console.log("DEVICE ERROR", e);
        console.error("Voice SDK error:", e);
        setSnapshot({
          error: e?.message || `Device error (${e?.code ?? "unknown"})`,
          activeCallStartedAt: activeCall ? currentCallStartedAt : null,
          status: "error",
          dialerStatus: "failed",
        });
        void logFrontendError("voice-sdk", `Device error: ${e?.message || e?.code}`, {
          code: e?.code,
          stepsToReproduce: "Twilio Voice SDK emitted an error event on the Device.",
        });
      });

      (d as unknown as { on: (e: string, cb: (...a: unknown[]) => void) => void }).on(
        "disconnect",
        () => console.log("DEVICE DISCONNECTED"),
      );

      d.on("incoming", (call: Call) => {
        const from = call.parameters?.From ?? null;
        console.log("Voice SDK: incoming call from", from, "sid =", call.parameters?.CallSid);
        console.log("INCOMING CALL");

        // Call-waiting: already on a call. Don't reject — surface a second
        // incoming banner so the user can pick it up (which ends the current
        // call) or send to voicemail.
        if (activeCall || pendingIncoming) {
          if (waitingCall) {
            // Already a waiting call queued; reject this third one.
            try { call.reject(); } catch { /* noop */ }
            return;
          }
          waitingCall = call;
          setSnapshot({ status: activeCall ? "in-call" : currentStatus, waitingFrom: from });

          const clear = () => {
            if (waitingCall === call) waitingCall = null;
            setSnapshot({ waitingFrom: null });
          };
          call.on("accept", (c: Call) => {
            console.log("Voice SDK: waiting call accepted, sid =", c.parameters?.CallSid);
            // Disconnect the previous active call — Twilio Voice SDK can only
            // have one active media session at a time in the browser.
            try { activeCall?.disconnect(); } catch { /* noop */ }
            activeCall = c;
            waitingCall = null;
            setSnapshot({
              activeCallSid: c.parameters?.CallSid ?? null,
              activeLeadId: null,
              activePhone: from,
              activeCallStartedAt: Date.now(),
              status: "in-call",
              incomingFrom: null,
              waitingFrom: null,
            });
          });
          call.on("disconnect", clear);
          call.on("cancel", clear);
          call.on("reject", clear);
          call.on("error", (e: { message?: string; code?: number }) => {
            console.error("Voice SDK: waiting call error:", e);
            clear();
          });
          return;
        }

        pendingIncoming = call;
        setSnapshot({ status: "ringing-incoming", incomingFrom: from });

        call.on("accept", (c: Call) => {
          console.log("Voice SDK: incoming call accepted, sid =", c.parameters?.CallSid);
          activeCall = c;
          pendingIncoming = null;
          setSnapshot({ activeCallSid: c.parameters?.CallSid ?? null, activeLeadId: null, activePhone: from, activeCallStartedAt: Date.now(), status: "in-call", incomingFrom: null });
        });
        call.on("disconnect", () => {
          console.log("Voice SDK: incoming call disconnected");
          if (activeCall === call) {
            activeCall = null;
            setSnapshot({ activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "ready", incomingFrom: null });
          }
          if (pendingIncoming === call) pendingIncoming = null;
        });
        call.on("cancel", () => {
          console.log("Voice SDK: incoming call cancelled by caller");
          if (activeCall === call) {
            activeCall = null;
              setSnapshot({ activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "ready", incomingFrom: null });
          }
          if (pendingIncoming === call) {
            pendingIncoming = null;
            setSnapshot({ status: activeCall ? "in-call" : "ready", activeCallStartedAt: activeCall ? currentCallStartedAt : null, incomingFrom: null });
          }
        });
        call.on("reject", () => {
          console.log("Voice SDK: incoming call rejected");
          pendingIncoming = null;
          setSnapshot({ status: "ready", activeCallStartedAt: null, incomingFrom: null });
        });
        call.on("error", (e: { message?: string; code?: number }) => {
          console.error("Voice SDK: incoming call error:", e);
          if (activeCall === call) activeCall = null;
          if (pendingIncoming === call) pendingIncoming = null;
          setSnapshot({ error: e?.message || `Incoming call error (${e?.code ?? "unknown"})`, activeCallStartedAt: activeCall ? currentCallStartedAt : null, status: activeCall ? "in-call" : "ready", incomingFrom: null });
        });
      });

      await d.register();
      scheduleTokenRefresh();
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to initialise dialler");
      console.error("Voice SDK init failed:", err);
      setSnapshot({ error: msg, status: "error", dialerStatus: "failed" });
      await logFrontendError("voice-sdk", `Init failed: ${msg}`, {
        stepsToReproduce: "Page load triggered Voice SDK initialisation.",
      });
      // Allow retry on next consumer mount
      device = null;
      initPromise = null;
    }
  })();
  return initPromise;
}

async function placeCall(phone: string, extraParams?: Record<string, string>): Promise<void> {
  console.log("[placeCall] entry", { phone, hasDevice: !!device, currentStatus });
  if (!device) {
    setSnapshot({ error: "Dialler not ready yet. Try again in a moment." });
    throw new Error("Dialler not ready yet — please wait a moment and try again.");
  }
  if (currentStatus !== "ready" && currentStatus !== "in-call") {
    setSnapshot({ error: "Dialler still connecting. Wait until DEVICE READY before calling." });
    throw new Error(`Dialler not ready (status: ${currentStatus}). Wait until DEVICE READY before calling.`);
  }

  setSnapshot({ error: null, status: "connecting", activeLeadId: extraParams?.leadId || null, activePhone: phone });
  try {
    const params: Record<string, string> = { phone, ...(extraParams || {}) };
    const outgoing = await device.connect({ params, ...lowLatencyMediaOptions() });
    activeCall = outgoing;

    // Insert the call_records row as soon as Twilio assigns a CallSid.
    // This guarantees a row exists before twilio-status fires, so the
    // recording webhook + auto-analyse-call chain has something to update.
    const insertCallRow = async (callSid: string) => {
      const leadId = extraParams?.leadId || null;
      const repId = extraParams?.repId || null;
      const clinicId = extraParams?.clinicId || null;
      // Verification log: confirm lead_id + rep_id are being threaded through
      // on every outbound call. If either prints null on a real call, the
      // upstream caller forgot to pass it.
      console.log("[insertCallRow] saving call_records", {
        callSid,
        leadId,
        repId,
        clinicId,
        phone,
      });
      try {
        await supabase.from("call_records").upsert(
          {
            twilio_call_sid: callSid,
            clinic_id: clinicId,
            lead_id: leadId,
            rep_id: repId,
            phone,
            status: "initiated",
            called_at: new Date().toISOString(),
          },
          { onConflict: "twilio_call_sid" },
        );
      } catch (e) {
        console.error("call_records insert failed", e);
      }
    };

    // CallSid is usually available immediately after connect(), but
    // sometimes only on the ringing/accept event. Try both.
    const earlySid = (outgoing as unknown as { parameters?: { CallSid?: string } }).parameters?.CallSid;
    if (earlySid) {
      void insertCallRow(earlySid);
      setSnapshot({ activeCallSid: earlySid });
    }

    // Subscribe to call_records realtime so we can start ringback only when
    // Twilio's REST status reaches "ringing" — i.e. the destination carrier
    // has confirmed the phone is alerting. The SDK's "ringing" event fires
    // far earlier (as soon as Twilio places the call), so we ignore it here.
    let statusChannel: ReturnType<typeof supabase.channel> | null = null;
    const subscribeToStatus = (sid: string) => {
      if (statusChannel) return;
      statusChannel = supabase
        .channel(`call-status-${sid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "call_records", filter: `twilio_call_sid=eq.${sid}` },
          (payload) => {
            const newStatus = (payload.new as { status?: string } | null)?.status;
            if (newStatus === "ringing") startRingback();
            else if (newStatus && newStatus !== "ringing" && newStatus !== "initiated" && newStatus !== "queued") {
              // in-progress, completed, busy, no-answer, failed, canceled
              stopRingback();
            }
          },
        )
        .subscribe();
    };
    const teardownStatus = () => {
      if (statusChannel) {
        try { supabase.removeChannel(statusChannel); } catch { /* noop */ }
        statusChannel = null;
      }
    };
    if (earlySid) subscribeToStatus(earlySid);

    outgoing.on("ringing", () => {
      const sid = (outgoing as unknown as { parameters?: { CallSid?: string } }).parameters?.CallSid;
      if (sid && sid !== currentCallSid) {
        void insertCallRow(sid);
        setSnapshot({ activeCallSid: sid });
        subscribeToStatus(sid);
      }
      setSnapshot({ status: "connecting" });
    });
    outgoing.on("accept", (c: Call) => {
      console.log("Voice SDK: call accepted, sid =", c.parameters?.CallSid);
      stopRingback();
      teardownStatus();
      const sid = c.parameters?.CallSid ?? null;
      if (sid) void insertCallRow(sid);
      setSnapshot({ activeCallSid: sid, activeCallStartedAt: Date.now(), status: "in-call" });
    });
    outgoing.on("disconnect", () => {
      console.log("Voice SDK: call disconnected");
      stopRingback();
      teardownStatus();
      const sid = (outgoing as unknown as { parameters?: { CallSid?: string } }).parameters?.CallSid;
      // Mark the call as awaiting recording so the Clinics page can show progress.
      if (sid) {
        void supabase
          .from("call_records")
          .update({ analysis_stage: "waiting_for_recording" })
          .eq("twilio_call_sid", sid)
          .then(({ error }) => {
            if (error) console.error("analysis_stage update failed", error);
          });
      }
      activeCall = null;
      setSnapshot({ activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "ready" });
    });
    outgoing.on("cancel", () => {
      stopRingback();
      teardownStatus();
      activeCall = null;
      setSnapshot({ activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "ready" });
    });
    outgoing.on("reject", () => {
      stopRingback();
      teardownStatus();
      activeCall = null;
      setSnapshot({ activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "ready" });
    });
    outgoing.on("error", (e: { message?: string; code?: number }) => {
      console.error("Voice SDK call error:", e);
      stopRingback();
      teardownStatus();
      activeCall = null;
      setSnapshot({ error: e?.message || `Call error (${e?.code ?? "unknown"})`, activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "error" });
    });
  } catch (err) {
    stopRingback();
    const msg = extractErrorMessage(err, "Failed to start call");
    setSnapshot({ error: msg, activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "error" });
    throw err instanceof Error ? err : new Error(msg);
  }
}

function hangupCall() {
  stopRingback();
  try { activeCall?.disconnect(); } catch { /* noop */ }
  try { pendingIncoming?.reject(); } catch { /* noop */ }
  activeCall = null;
  pendingIncoming = null;
  setSnapshot({ activeCallSid: null, activeLeadId: null, activePhone: null, activeCallStartedAt: null, status: "ready", incomingFrom: null });
}

function answerIncoming() {
  // Prefer waiting call if there is one — answering it ends the active call.
  const target = waitingCall ?? pendingIncoming;
  if (!target) return;
  try { target.accept(lowLatencyMediaOptions()); } catch (e) { console.error("answerIncoming failed", e); }
}

function rejectIncoming() {
  // If there's a waiting call, reject that one (don't kill the active call).
  if (waitingCall) {
    try { waitingCall.reject(); } catch (e) { console.error("rejectWaiting failed", e); }
    waitingCall = null;
    setSnapshot({ waitingFrom: null });
    return;
  }
  if (!pendingIncoming) return;
  try { pendingIncoming.reject(); } catch (e) { console.error("rejectIncoming failed", e); }
  pendingIncoming = null;
  setSnapshot({ status: "ready", incomingFrom: null });
}

function sendDigit(digit: string) {
  try {
    (activeCall as unknown as { sendDigits?: (d: string) => void } | null)?.sendDigits?.(digit);
  } catch (e) {
    console.error("sendDigit failed", e);
  }
}

function setMute(muted: boolean) {
  try {
    (activeCall as unknown as { mute?: (m: boolean) => void } | null)?.mute?.(muted);
  } catch (e) {
    console.error("setMute failed", e);
  }
}

// IMPORTANT: `enabled` defaults to FALSE so the Twilio Device only initialises
// when a consumer that actually needs to dial (Phone page, dashboard Quick Dial,
// outbound buttons in Clinics) opts in. Subscribe-only consumers (the floating
// call widget and incoming-call dialog) pass `false` — they react to state
// once the device is booted but don't trigger the heavy token + WebSocket init
// on first paint.
export function useTwilioDevice(enabled: boolean = false) {
  const [, forceRender] = useState(0);
  const subRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const sub = () => forceRender((n) => n + 1);
    subRef.current = sub;
    subscribers.add(sub);
    if (enabled) void ensureDevice();
    return () => {
      subscribers.delete(sub);
      // Intentionally do NOT destroy the Device — it's a singleton.
    };
  }, [enabled]);

  const call = useCallback((phone: string, extraParams?: Record<string, string>) => placeCall(phone, extraParams), []);
  const hangup = useCallback(() => hangupCall(), []);
  const answer = useCallback(() => answerIncoming(), []);
  const reject = useCallback(() => rejectIncoming(), []);
  const sendDtmf = useCallback((digit: string) => sendDigit(digit), []);
  const mute = useCallback((m: boolean) => setMute(m), []);
  const retry = useCallback(() => {
    setSnapshot({ error: null });
    if (device && currentStatus !== "ready") setSnapshot({ status: "ready" });
  }, []);

  return {
    status: currentStatus,
    dialerStatus: currentDialerStatus,
    error: currentError,
    activeCallSid: currentCallSid,
    activeLeadId: currentLeadId,
    activePhone: currentCallPhone,
    activeCallStartedAt: currentCallStartedAt,
    incomingFrom: currentIncomingFrom,
    waitingFrom: currentWaitingFrom,
    call,
    hangup,
    answer,
    reject,
    sendDtmf,
    mute,
    retry,
  };
}
