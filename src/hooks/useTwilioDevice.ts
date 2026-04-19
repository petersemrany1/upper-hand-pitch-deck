import { useCallback, useEffect, useRef, useState } from "react";
import { Device, type Call } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";
import { logFrontendError, extractErrorMessage } from "@/utils/log-frontend-error";

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

// ----- Singleton state -----
let device: Device | null = null;
let activeCall: Call | null = null;
let pendingIncoming: Call | null = null;
let initPromise: Promise<void> | null = null;
let refreshTimer: number | null = null;

let currentStatus: Status = "loading";
let currentDialerStatus: DialerStatus = "connecting";
let currentError: string | null = null;
let currentCallSid: string | null = null;
let currentIncomingFrom: string | null = null;

type Snapshot = {
  status: Status;
  dialerStatus: DialerStatus;
  error: string | null;
  activeCallSid: string | null;
  incomingFrom: string | null;
};

const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

function setSnapshot(patch: Partial<Snapshot>) {
  if (patch.status !== undefined) currentStatus = patch.status;
  if (patch.dialerStatus !== undefined) currentDialerStatus = patch.dialerStatus;
  if (patch.error !== undefined) currentError = patch.error;
  if (patch.activeCallSid !== undefined) currentCallSid = patch.activeCallSid;
  if (patch.incomingFrom !== undefined) currentIncomingFrom = patch.incomingFrom;
  notify();
}

async function fetchToken(): Promise<string> {
  const { data, error: fnErr } = await supabase.functions.invoke("voice-token", {
    body: { identity: "peter_browser" },
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

      const d = new Device(token, {
        logLevel: 1,
        codecPreferences: ["opus" as never, "pcmu" as never],
        edge: "sydney",
        region: "au1",
      } as ConstructorParameters<typeof Device>[1]);
      device = d;

      d.on("registered", () => {
        console.log("Voice SDK: registered");
        console.log("DEVICE REGISTERED");
        console.log("DEVICE READY");
        console.log("DEVICE IDENTITY: peter_browser");
        setSnapshot({ status: "ready", dialerStatus: "ready", error: null });
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

        // If already on a call, auto-reject the new one
        if (activeCall) {
          console.log("Voice SDK: rejecting incoming — already on a call");
          try { call.reject(); } catch { /* noop */ }
          return;
        }

        pendingIncoming = call;
        setSnapshot({ status: "ringing-incoming", incomingFrom: from });

        call.on("accept", (c: Call) => {
          console.log("Voice SDK: incoming call accepted, sid =", c.parameters?.CallSid);
          activeCall = c;
          pendingIncoming = null;
          setSnapshot({ activeCallSid: c.parameters?.CallSid ?? null, status: "in-call", incomingFrom: null });
        });
        call.on("disconnect", () => {
          console.log("Voice SDK: incoming call disconnected");
          activeCall = null;
          pendingIncoming = null;
          setSnapshot({ activeCallSid: null, status: "ready", incomingFrom: null });
        });
        call.on("cancel", () => {
          console.log("Voice SDK: incoming call cancelled by caller");
          activeCall = null;
          pendingIncoming = null;
          setSnapshot({ activeCallSid: null, status: "ready", incomingFrom: null });
        });
        call.on("reject", () => {
          console.log("Voice SDK: incoming call rejected");
          pendingIncoming = null;
          setSnapshot({ status: "ready", incomingFrom: null });
        });
        call.on("error", (e: { message?: string; code?: number }) => {
          console.error("Voice SDK: incoming call error:", e);
          activeCall = null;
          pendingIncoming = null;
          setSnapshot({ error: e?.message || `Incoming call error (${e?.code ?? "unknown"})`, status: "ready", incomingFrom: null });
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

async function placeCall(phone: string): Promise<void> {
  if (!device) {
    setSnapshot({ error: "Dialler not ready yet. Try again in a moment." });
    return;
  }
  if (currentStatus !== "ready" && currentStatus !== "in-call") {
    setSnapshot({ error: "Dialler still connecting. Wait until DEVICE READY before calling." });
    return;
  }

  setSnapshot({ error: null, status: "connecting" });
  try {
    const outgoing = await device.connect({ params: { phone } });
    activeCall = outgoing;

    outgoing.on("ringing", () => setSnapshot({ status: "connecting" }));
    outgoing.on("accept", (c: Call) => {
      console.log("Voice SDK: call accepted, sid =", c.parameters?.CallSid);
      setSnapshot({ activeCallSid: c.parameters?.CallSid ?? null, status: "in-call" });
    });
    outgoing.on("disconnect", () => {
      console.log("Voice SDK: call disconnected");
      activeCall = null;
      setSnapshot({ activeCallSid: null, status: "ready" });
    });
    outgoing.on("cancel", () => {
      activeCall = null;
      setSnapshot({ activeCallSid: null, status: "ready" });
    });
    outgoing.on("reject", () => {
      activeCall = null;
      setSnapshot({ activeCallSid: null, status: "ready" });
    });
    outgoing.on("error", (e: { message?: string; code?: number }) => {
      console.error("Voice SDK call error:", e);
      activeCall = null;
      setSnapshot({ error: e?.message || `Call error (${e?.code ?? "unknown"})`, status: "error" });
    });
  } catch (err) {
    const msg = extractErrorMessage(err, "Failed to start call");
    setSnapshot({ error: msg, status: "error" });
    throw err instanceof Error ? err : new Error(msg);
  }
}

function hangupCall() {
  try { activeCall?.disconnect(); } catch { /* noop */ }
  try { pendingIncoming?.reject(); } catch { /* noop */ }
  activeCall = null;
  pendingIncoming = null;
  setSnapshot({ activeCallSid: null, status: "ready", incomingFrom: null });
}

function answerIncoming() {
  if (!pendingIncoming) return;
  try { pendingIncoming.accept(); } catch (e) { console.error("answerIncoming failed", e); }
}

function rejectIncoming() {
  if (!pendingIncoming) return;
  try { pendingIncoming.reject(); } catch (e) { console.error("rejectIncoming failed", e); }
  pendingIncoming = null;
  setSnapshot({ status: "ready", incomingFrom: null });
}

export function useTwilioDevice() {
  const [, forceRender] = useState(0);
  const subRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const sub = () => forceRender((n) => n + 1);
    subRef.current = sub;
    subscribers.add(sub);
    void ensureDevice();
    return () => {
      subscribers.delete(sub);
      // Intentionally do NOT destroy the Device — it's a singleton.
    };
  }, []);

  const call = useCallback((phone: string) => placeCall(phone), []);
  const hangup = useCallback(() => hangupCall(), []);
  const answer = useCallback(() => answerIncoming(), []);
  const reject = useCallback(() => rejectIncoming(), []);
  const retry = useCallback(() => {
    setSnapshot({ error: null });
    if (device && currentStatus !== "ready") setSnapshot({ status: "ready" });
  }, []);

  return {
    status: currentStatus,
    dialerStatus: currentDialerStatus,
    error: currentError,
    activeCallSid: currentCallSid,
    incomingFrom: currentIncomingFrom,
    call,
    hangup,
    answer,
    reject,
    retry,
  };
}
