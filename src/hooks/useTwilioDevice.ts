import { useCallback, useEffect, useRef, useState } from "react";
import { Device, type Call } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";
import { logFrontendError, extractErrorMessage } from "@/utils/log-frontend-error";

// Browser-based Twilio softphone.
//
// Flow:
//   1. On mount, fetch an AccessToken from the voice-token edge function.
//   2. Create a Device, register it, request mic permission.
//   3. On call(phone), invoke device.connect({ params: { phone } }).
//      Twilio fetches the TwiML App's Voice URL (voice-outbound) which dials
//      the clinic over PSTN with our verified callerId.
//   4. Surface call lifecycle events as a single `status` for the UI.

type Status =
  | "idle"
  | "loading"     // fetching token
  | "ready"       // device registered, ready to dial
  | "connecting"  // device.connect() in progress / ringing
  | "in-call"     // call accepted / audio flowing
  | "error";

type DialerStatus = "connecting" | "ready" | "failed";

const TOKEN_REFRESH_MS = 50 * 60 * 1000; // refresh ~10 min before 1h expiry

export function useTwilioDevice() {
  const [status, setStatus] = useState<Status>("loading");
  const [dialerStatus, setDialerStatus] = useState<DialerStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const fetchToken = useCallback(async (): Promise<string> => {
    const { data, error: fnErr } = await supabase.functions.invoke("voice-token", {
      body: { identity: "peter_browser" },
    });
    if (fnErr || !data?.token) {
      const msg = data?.error || fnErr?.message || "Failed to fetch voice token";
      throw new Error(msg);
    }
    return data.token as string;
  }, []);

  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        const next = await fetchToken();
        deviceRef.current?.updateToken(next);
        scheduleTokenRefresh();
      } catch (err) {
        console.error("Voice SDK: token refresh failed", err);
      }
    }, TOKEN_REFRESH_MS);
  }, [fetchToken]);

  // Initialise the Device once on mount.
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        setStatus("loading");
        setDialerStatus("connecting");

        const token = await fetchToken();
        if (!mountedRef.current) return;

        const device = new Device(token, {
          logLevel: 1,
          codecPreferences: ["opus" as never, "pcmu" as never],
          edge: ["sydney", "ashburn"],
        });
        deviceRef.current = device;

device.on("registered", () => {
          console.log("Voice SDK: registered");
          console.log("DEVICE REGISTERED");
          if (!mountedRef.current) return;
          setStatus("ready");
          setDialerStatus("ready");
          setError(null);
        });

        device.on("unregistered", () => {
          console.log("Voice SDK: unregistered");
          if (!mountedRef.current) return;
          setDialerStatus("connecting");
        });

        device.on("error", (e: { message?: string; code?: number }) => {
          console.error("Voice SDK error:", e);
          if (!mountedRef.current) return;
          setError(e?.message || `Device error (${e?.code ?? "unknown"})`);
          setStatus("error");
          setDialerStatus("failed");
          void logFrontendError("voice-sdk", `Device error: ${e?.message || e?.code}`, {
            code: e?.code,
            stepsToReproduce: "Twilio Voice SDK emitted an error event on the Device.",
          });
        });

device.on("incoming", (call: Call) => {
          console.log("Voice SDK: incoming call from", call.parameters?.From, "sid =", call.parameters?.CallSid);
          console.log("INCOMING CALL");

          call.on("accept", (c: Call) => {
            console.log("Voice SDK: incoming call accepted, sid =", c.parameters?.CallSid);
            if (!mountedRef.current) return;
            callRef.current = c;
            setActiveCallSid(c.parameters?.CallSid ?? null);
            setStatus("in-call");
          });

          call.on("disconnect", () => {
            console.log("Voice SDK: incoming call disconnected");
            if (!mountedRef.current) return;
            callRef.current = null;
            setActiveCallSid(null);
            setStatus("ready");
          });

          call.on("cancel", () => {
            console.log("Voice SDK: incoming call cancelled by caller");
            if (!mountedRef.current) return;
            callRef.current = null;
            setActiveCallSid(null);
            setStatus("ready");
          });

          call.on("error", (e: { message?: string; code?: number }) => {
            console.error("Voice SDK: incoming call error:", e);
            if (!mountedRef.current) return;
            setError(e?.message || `Incoming call error (${e?.code ?? "unknown"})`);
            callRef.current = null;
          });

          // Auto-accept for now.
          call.accept();
        });

        await device.register();
        scheduleTokenRefresh();
      } catch (err) {
        const msg = extractErrorMessage(err, "Failed to initialise dialler");
        console.error("Voice SDK init failed:", err);
        if (!mountedRef.current) return;
        setError(msg);
        setStatus("error");
        setDialerStatus("failed");
        await logFrontendError("voice-sdk", `Init failed: ${msg}`, {
          stepsToReproduce: "Page load triggered Voice SDK initialisation.",
        });
      }
    })();

    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      try { callRef.current?.disconnect(); } catch { /* noop */ }
      try { deviceRef.current?.destroy(); } catch { /* noop */ }
      callRef.current = null;
      deviceRef.current = null;
    };
  }, [fetchToken, scheduleTokenRefresh]);

  const call = useCallback(async (phone: string) => {
    setError(null);
    if (!deviceRef.current) {
      setError("Dialler not ready yet. Try again in a moment.");
      return;
    }

    try {
      setStatus("connecting");
      const outgoing = await deviceRef.current.connect({ params: { phone } });
      callRef.current = outgoing;

      outgoing.on("ringing", () => {
        if (!mountedRef.current) return;
        setStatus("connecting");
      });
      outgoing.on("accept", (c: Call) => {
        console.log("Voice SDK: call accepted, sid =", c.parameters?.CallSid);
        if (!mountedRef.current) return;
        setActiveCallSid(c.parameters?.CallSid ?? null);
        setStatus("in-call");
      });
      outgoing.on("disconnect", () => {
        console.log("Voice SDK: call disconnected");
        if (!mountedRef.current) return;
        setActiveCallSid(null);
        setStatus("ready");
        callRef.current = null;
      });
      outgoing.on("cancel", () => {
        if (!mountedRef.current) return;
        setActiveCallSid(null);
        setStatus("ready");
        callRef.current = null;
      });
      outgoing.on("reject", () => {
        if (!mountedRef.current) return;
        setActiveCallSid(null);
        setStatus("ready");
        callRef.current = null;
      });
      outgoing.on("error", (e: { message?: string; code?: number }) => {
        console.error("Voice SDK call error:", e);
        if (!mountedRef.current) return;
        setError(e?.message || `Call error (${e?.code ?? "unknown"})`);
        setStatus("error");
        callRef.current = null;
      });
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to start call");
      setError(msg);
      setStatus("error");
      throw err instanceof Error ? err : new Error(msg);
    }
  }, []);

  const hangup = useCallback(() => {
    try {
      callRef.current?.disconnect();
    } catch { /* noop */ }
    callRef.current = null;
    setActiveCallSid(null);
    setStatus("ready");
  }, []);

  const retry = useCallback(() => {
    setError(null);
    if (deviceRef.current && status !== "ready") setStatus("ready");
  }, [status]);

  return { status, dialerStatus, error, call, hangup, retry, activeCallSid };
}
