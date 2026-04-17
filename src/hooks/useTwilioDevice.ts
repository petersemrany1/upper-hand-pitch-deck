import { useEffect, useRef, useState, useCallback } from "react";
import { Device, type Call } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";
import { logFrontendError, extractErrorCode, extractErrorMessage } from "@/utils/log-frontend-error";

type Status = "idle" | "loading" | "ready" | "connecting" | "in-call" | "error";
type DialerStatus = "connecting" | "ready" | "failed";

const DEVICE_INIT_TIMEOUT_MS = 10_000;

function formatAUPhone(num: string): string {
  let cleaned = num.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  return "+61" + cleaned;
}

function describeTwilioCode(code: number | string | null): string {
  const map: Record<string, string> = {
    "20101": "Twilio rejected the access token (invalid or expired). Check the token edge function and TWILIO_API_KEY credentials.",
    "20104": "Access token has expired.",
    "31000": "General Twilio Voice SDK error.",
    "31005": "Connection error — the WebSocket dropped.",
    "31201": "Microphone permission was denied by the browser.",
    "31202": "No microphone input device available.",
    "31204": "JWT (access token) is invalid.",
    "31205": "JWT signature failed validation.",
    "31206": "Rate exceeded for the access token.",
    "31208": "Microphone access blocked by the user.",
    "31402": "No audio received from Twilio.",
    "31403": "No audio sent to Twilio (likely mic muted/blocked).",
    "53000": "Signaling connection error.",
    "53405": "Media connection failed.",
  };
  return code ? map[String(code)] || `Twilio error ${code}.` : "Unknown Twilio error.";
}

export function useTwilioDevice() {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const initTimeoutRef = useRef<number | null>(null);
  const initAttemptRef = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [dialerStatus, setDialerStatus] = useState<DialerStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);

  const clearInitTimeout = useCallback(() => {
    if (initTimeoutRef.current !== null) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, []);

  const destroyDevice = useCallback(() => {
    clearInitTimeout();
    try {
      deviceRef.current?.destroy();
    } catch {}
    deviceRef.current = null;
  }, [clearInitTimeout]);

  const initializeDevice = useCallback(async () => {
    const attemptId = ++initAttemptRef.current;
    destroyDevice();
    callRef.current = null;
    setActiveCallSid(null);
    setError(null);
    setStatus("loading");
    setDialerStatus("connecting");

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("twilio-token", { body: {} });
      if (fnErr || !data?.token) {
        const msg = fnErr?.message || "Token edge function returned no token";
        await logFrontendError(
          "twilio-token",
          `Failed to generate Twilio access token: ${msg}`,
          {
            fnError: fnErr ? { message: fnErr.message, name: fnErr.name } : null,
            responseData: data ?? null,
            stepsToReproduce: "Loading the dialer / call page triggers token generation on mount.",
          }
        );
        throw new Error(msg);
      }
      if (attemptId !== initAttemptRef.current) return;

      const device = new Device(data.token, {
        logLevel: 1,
        codecPreferences: ["opus" as never, "pcmu" as never],
      });

      const failDialer = async (description: string, details: Record<string, unknown> = {}) => {
        if (attemptId !== initAttemptRef.current) return;
        clearInitTimeout();
        console.error("Twilio dialer failed:", description, details);
        setError("Connection failed — click to retry");
        setStatus("error");
        setDialerStatus("failed");
        await logFrontendError("twilio-device", description, {
          ...details,
          troubleshootingHint: "Verify TWILIO_TWIML_APP_SID exactly matches the TwiML App SID in the Twilio console.",
        });
        try {
          device.destroy();
        } catch {}
        if (deviceRef.current === device) {
          deviceRef.current = null;
        }
      };

      device.on("registered", () => {
        if (attemptId !== initAttemptRef.current) return;
        clearInitTimeout();
        deviceRef.current = device;
        setError(null);
        setStatus("ready");
        setDialerStatus("ready");
      });

      device.on("error", async (e: unknown) => {
        const code = extractErrorCode(e);
        const msg = extractErrorMessage(e, "Twilio Device error");
        const description = describeTwilioCode(code);
        console.error("Twilio Device error:", e);
        await failDialer(
          `Twilio Device failure: ${description} (${msg})`,
          {
            twilioCode: code,
            rawMessage: msg,
            rawError: safeSerializeError(e),
            stepsToReproduce: "Browser-side Twilio Device emitted an error event during registration or call signaling.",
          }
        );
      });

      device.on("tokenWillExpire", async () => {
        try {
          const { data: refreshed, error: refreshErr } = await supabase.functions.invoke("twilio-token", { body: {} });
          if (refreshErr || !refreshed?.token) {
            await logFrontendError(
              "twilio-token",
              `Failed to refresh expiring Twilio token: ${refreshErr?.message || "no token returned"}`,
              {
                fnError: refreshErr ? { message: refreshErr.message } : null,
                stepsToReproduce: "Twilio token nearing expiry; SDK requested a refresh.",
              }
            );
            return;
          }
          device.updateToken(refreshed.token);
        } catch (err) {
          await logFrontendError(
            "twilio-token",
            `Exception during Twilio token refresh: ${extractErrorMessage(err)}`,
            { rawError: safeSerializeError(err) }
          );
        }
      });

      initTimeoutRef.current = window.setTimeout(() => {
        void failDialer(
          "Twilio Device registration timed out after 10 seconds",
          {
            twilioCode: "registration-timeout",
            timeoutMs: DEVICE_INIT_TIMEOUT_MS,
            stepsToReproduce: "Open a page that mounts the browser dialer and wait for Twilio Device registration.",
          }
        );
      }, DEVICE_INIT_TIMEOUT_MS);

      deviceRef.current = device;
      await device.register();

      if (attemptId !== initAttemptRef.current) {
        try {
          device.destroy();
        } catch {}
      }
    } catch (err) {
      if (attemptId !== initAttemptRef.current) return;
      const msg = extractErrorMessage(err, "Twilio init failed");
      console.error("Twilio init failed:", err);
      clearInitTimeout();
      setError("Connection failed — click to retry");
      setStatus("error");
      setDialerStatus("failed");
      await logFrontendError(
        "twilio-device",
        `Twilio Device failed to initialise: ${msg}`,
        {
          twilioCode: extractErrorCode(err),
          rawError: safeSerializeError(err),
          stepsToReproduce: "Page load — useTwilioDevice tried to fetch a token and register the Twilio Device.",
          troubleshootingHint: "Verify TWILIO_TWIML_APP_SID exactly matches the TwiML App SID in the Twilio console.",
        }
      );
    }
  }, [clearInitTimeout, destroyDevice]);

  useEffect(() => {
    void initializeDevice();

    return () => {
      initAttemptRef.current += 1;
      clearInitTimeout();
      try {
        deviceRef.current?.destroy();
      } catch {}
      deviceRef.current = null;
      callRef.current = null;
    };
  }, [clearInitTimeout, initializeDevice]);

  const retry = useCallback(() => {
    void initializeDevice();
  }, [initializeDevice]);

  const call = useCallback(async (phone: string) => {
    const device = deviceRef.current;
    if (!device) {
      const userMessage = dialerStatus === "failed"
        ? "Connection failed — click to retry"
        : "Dialer is still connecting";
      await logFrontendError(
        "twilio-call",
        "Attempted to place a call before Twilio Device was ready",
        { phone, dialerStatus, stepsToReproduce: "User clicked Call before the Device finished registering." }
      );
      throw new Error(userMessage);
    }
    if (callRef.current) return;

    const formatted = formatAUPhone(phone);
    setStatus("connecting");

    try {
      const conn = await device.connect({ params: { To: formatted } });
      callRef.current = conn;

      conn.on("accept", (c: Call) => {
        setStatus("in-call");
        const sid = c.parameters?.CallSid || null;
        setActiveCallSid(sid);
        if (sid) {
          supabase.from("call_records").insert({ twilio_call_sid: sid, status: "in-progress" });
        }
      });
      conn.on("disconnect", () => {
        callRef.current = null;
        setActiveCallSid(null);
        setStatus("ready");
      });
      conn.on("cancel", () => {
        callRef.current = null;
        setActiveCallSid(null);
        setStatus("ready");
      });
      conn.on("error", async (e: unknown) => {
        const code = extractErrorCode(e);
        const msg = extractErrorMessage(e, "Twilio call error");
        console.error("Call error:", e);
        setError(msg);
        callRef.current = null;
        setActiveCallSid(null);
        setStatus("ready");
        await logFrontendError(
          "twilio-call",
          `Twilio call failed: ${describeTwilioCode(code)} (${msg})`,
          {
            twilioCode: code,
            rawMessage: msg,
            phone: formatted,
            rawError: safeSerializeError(e),
            stepsToReproduce: `Outbound call to ${formatted} via browser SDK.`,
          }
        );
      });
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to start call");
      setStatus("ready");
      callRef.current = null;
      await logFrontendError(
        "twilio-call",
        `Failed to initiate Twilio call: ${msg}`,
        {
          twilioCode: extractErrorCode(err),
          phone: formatted,
          rawError: safeSerializeError(err),
          stepsToReproduce: `User clicked Call for ${formatted}; device.connect() threw before any call events fired.`,
        }
      );
      throw err;
    }
  }, [dialerStatus]);

  const hangup = useCallback(() => {
    callRef.current?.disconnect();
    callRef.current = null;
    setActiveCallSid(null);
    setStatus("ready");
  }, []);

  return { status, dialerStatus, error, call, hangup, retry, activeCallSid };
}

function safeSerializeError(e: unknown): unknown {
  if (!e) return null;
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack };
  }
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return String(e);
  }
}
