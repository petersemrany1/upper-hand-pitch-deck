// Ported from the Legal app (family-law-floater/src/hooks/use-dialler.ts). Re-run the port script to refresh.
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getVoiceToken } from "@/legal/lib/voice.functions";

type Call = {
  parameters?: Record<string, string>;
  disconnect: () => void;
  mute: (muted: boolean) => void;
  isMuted: () => boolean;
  /** Play DTMF tones into the call ("press 1 for reception"). */
  sendDigits?: (digits: string) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type Device = {
  connect: (options: { params: Record<string, string> }) => Promise<Call>;
  destroy: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  updateToken: (token: string) => void;
  register?: () => Promise<void>;
};

type TwilioBrowserGlobal = {
  Device: new (token: string, options?: { maxCallSignalingTimeoutMs?: number }) => Device;
};

declare global {
  interface Window {
    Twilio?: TwilioBrowserGlobal;
  }
}

let twilioSdkPromise: Promise<TwilioBrowserGlobal> | null = null;

type RingbackTone = {
  stop: () => void;
};

/**
 * Carrier early-media is not guaranteed to reach a browser softphone. Generate
 * the familiar Australian ring cadence locally until Twilio reports answer.
 */
function startRingbackTone(): RingbackTone | null {
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  const gain = context.createGain();
  const oscillators = [400, 450].map((frequency) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start();
    return oscillator;
  });
  gain.gain.value = 0;
  gain.connect(context.destination);

  const scheduleCadence = () => {
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.075, now + 0.01);
    gain.gain.setValueAtTime(0, now + 0.4);
    gain.gain.setValueAtTime(0.075, now + 0.6);
    gain.gain.setValueAtTime(0, now + 1);
  };

  scheduleCadence();
  const cadenceTimer = window.setInterval(scheduleCadence, 3000);
  void context.resume();

  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      window.clearInterval(cadenceTimer);
      for (const oscillator of oscillators) oscillator.stop();
      void context.close();
    },
  };
}

function diallerErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; description?: unknown; code?: unknown };
    const detail =
      typeof candidate.message === "string"
        ? candidate.message
        : typeof candidate.description === "string"
          ? candidate.description
          : "";
    if (candidate.code === 20104 || detail.includes("AccessTokenExpired")) {
      return "The calling session expired. Press call again to reconnect.";
    }
    if (candidate.code === 31005) {
      return "The browser lost its connection to the calling service. Check your internet connection, then try again.";
    }
    if (candidate.code === 20101 || detail.includes("AccessTokenInvalid")) {
      return "Twilio rejected the calling key. Update the Twilio API Key SID and API Key Secret in Settings, then try again.";
    }
    if (/unauthorized|invalid token|authorization header/i.test(detail)) {
      return "Your session expired. Refresh the page and try the call again.";
    }
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(detail)) {
      return "Could not reach the calling service. Check your connection and try again.";
    }
    if (detail) return detail;
  }
  return "Could not start the call. Please try again.";
}

export function loadTwilioSdk(): Promise<TwilioBrowserGlobal> {
  if (window.Twilio?.Device) return Promise.resolve(window.Twilio);
  if (twilioSdkPromise) return twilioSdkPromise;

  const loadingPromise = new Promise<TwilioBrowserGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-twilio-voice-sdk="true"]',
    );
    const script = existing ?? document.createElement("script");

    const finish = () => {
      if (window.Twilio?.Device) resolve(window.Twilio);
      else reject(new Error("Twilio calling could not load. Refresh the page and try again."));
    };

    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () =>
        reject(new Error("Twilio calling could not load. Check your connection and try again.")),
      { once: true },
    );

    if (!existing) {
      script.src = "/vendor/twilio-voice-2.18.3.min.js";
      script.async = true;
      script.dataset["twilioVoiceSdk"] = "true";
      document.head.appendChild(script);
    } else if (window.Twilio?.Device) {
      finish();
    }
  }).catch((error: unknown) => {
    twilioSdkPromise = null;
    throw error;
  });

  twilioSdkPromise = loadingPromise;
  return loadingPromise;
}

export type DiallerState = {
  ready: boolean;
  status: "idle" | "connecting" | "ringing" | "on-call" | "ending";
  muted: boolean;
  seconds: number;
  /** Twilio CallSid of the current/last call, as reported by the SDK. */
  lastCallSid: string | null;
  startCall: (input: {
    to: string;
    leadId: string;
    repId: string | null;
    /** Extra TwiML-app parameters (e.g. ProspectAttemptId for Firm Cold Calling). */
    extraParams?: Record<string, string>;
  }) => Promise<boolean>;
  hangUp: () => void;
  toggleMute: () => void;
  /** Send keypad digits (0-9, * or #) into the live call, e.g. for an automated menu. */
  sendDigits: (digits: string) => void;
};

/** Browser dialler on top of the Twilio Voice SDK. */
export function useDialler(onCallEnded?: () => void): DiallerState {
  const tokenFn = useServerFn(getVoiceToken);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const ringbackRef = useRef<RingbackTone | null>(null);
  const tokenExpiresAtRef = useRef(0);
  const endedRef = useRef(onCallEnded);
  endedRef.current = onCallEnded;

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<DiallerState["status"]>("idle");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [lastCallSid, setLastCallSid] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "on-call") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  // Voice tokens are short-lived; always mint a fresh one and remember when it
  // stops being usable so long-lived devices can be re-armed before dialling.
  const fetchToken = useCallback(async (): Promise<string> => {
    let token: string;
    try {
      ({ token } = await tokenFn());
    } catch (error) {
      // A stale/expired Supabase session is the common cause here — refresh
      // once and retry before surfacing an error to the rep.
      const { supabase } = await import("@/legal/integrations/supabase/client");
      const { data } = await supabase.auth.refreshSession();
      if (!data.session) throw error;
      ({ token } = await tokenFn());
    }
    tokenExpiresAtRef.current = Date.now() + 55 * 60 * 1000;
    return token;
  }, [tokenFn]);

  const ensureDevice = useCallback(async (): Promise<Device> => {
    const existing = deviceRef.current;
    if (existing) {
      // Twilio rejects calls placed with an expired token (20104 → 31005), so
      // top the device up whenever the current token is close to lapsing.
      if (Date.now() > tokenExpiresAtRef.current - 60_000) {
        existing.updateToken(await fetchToken());
      }
      return existing;
    }

    const token = await fetchToken();
    const { Device: TwilioDevice } = await loadTwilioSdk();
    // Preserve an established call through a brief signaling interruption.
    // Twilio's default is zero, which disables signaling reconnection.
    const device = new TwilioDevice(token, { maxCallSignalingTimeoutMs: 30_000 });

    device.on("tokenWillExpire", () => {
      void fetchToken()
        .then((fresh) => device.updateToken(fresh))
        .catch(() => {
          /* the next call attempt re-mints a token */
        });
    });
    device.on("error", (error: unknown) => {
      const code = (error as { code?: number } | null)?.code;
      if (code === 20104 || code === 20101) {
        tokenExpiresAtRef.current = 0;
        if (callRef.current) {
          // Destroying the device also hangs up its active call. Refresh the
          // credential in place and retry before the next dial if that fails.
          void fetchToken()
            .then((fresh) => {
              if (deviceRef.current === device) device.updateToken(fresh);
            })
            .catch(() => {});
          return;
        }
        // Token is unusable — drop the device so the next call mints a new one.
        try {
          device.destroy();
        } catch {
          /* already gone */
        }
        if (deviceRef.current === device) deviceRef.current = null;
        tokenExpiresAtRef.current = 0;
        setReady(false);
      }
      toast.error(diallerErrorMessage(error));
    });
    deviceRef.current = device;
    setReady(true);
    return device;
  }, [fetchToken]);

  useEffect(
    () => () => {
      try {
        ringbackRef.current?.stop();
        callRef.current?.disconnect();
        deviceRef.current?.destroy();
      } catch {
        /* nothing to clean up */
      }
    },
    [],
  );

  const startCall = useCallback(
    async ({
      to,
      leadId,
      repId,
      extraParams,
    }: {
      to: string;
      leadId: string;
      repId: string | null;
      extraParams?: Record<string, string>;
    }) => {
      if (callRef.current) return false;
      setStatus("connecting");
      setSeconds(0);
      setLastCallSid(null);
      ringbackRef.current?.stop();
      ringbackRef.current = null;
      try {
        const device = await ensureDevice();
        const call = await device.connect({
          params: { To: to, LeadId: leadId, RepId: repId ?? "", ...(extraParams ?? {}) },
        });
        callRef.current = call;
        const readSid = () => {
          const sid = call.parameters?.["CallSid"];
          if (sid) setLastCallSid(sid);
        };
        readSid();
        call.on("accept", readSid);
        call.on("ringing", (hasEarlyMedia: unknown) => {
          setStatus("ringing");
          ringbackRef.current?.stop();
          ringbackRef.current = hasEarlyMedia === true ? null : startRingbackTone();
        });
        call.on("accept", () => {
          ringbackRef.current?.stop();
          ringbackRef.current = null;
          setStatus("on-call");
        });
        call.on("disconnect", () => {
          ringbackRef.current?.stop();
          ringbackRef.current = null;
          callRef.current = null;
          setStatus("idle");
          setMuted(false);
          endedRef.current?.();
        });
        call.on("cancel", () => {
          ringbackRef.current?.stop();
          ringbackRef.current = null;
          callRef.current = null;
          setStatus("idle");
          endedRef.current?.();
        });
        call.on("reject", () => {
          ringbackRef.current?.stop();
          ringbackRef.current = null;
          callRef.current = null;
          setStatus("idle");
          endedRef.current?.();
        });
        call.on("error", (error: unknown) => {
          ringbackRef.current?.stop();
          ringbackRef.current = null;
          callRef.current = null;
          setStatus("idle");
          toast.error(diallerErrorMessage(error));
          endedRef.current?.();
        });
        return true;
      } catch (error) {
        const activeRingback = (ringbackRef as { current: RingbackTone | null }).current;
        activeRingback?.stop();
        ringbackRef.current = null;
        setStatus("idle");
        callRef.current = null;
        deviceRef.current?.destroy();
        deviceRef.current = null;
        setReady(false);
        toast.error(diallerErrorMessage(error));
        return false;
      }
    },
    [ensureDevice],
  );

  const hangUp = useCallback(() => {
    if (!callRef.current) return;
    ringbackRef.current?.stop();
    ringbackRef.current = null;
    setStatus("ending");
    callRef.current.disconnect();
  }, []);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const next = !call.isMuted();
    call.mute(next);
    setMuted(next);
  }, []);

  const sendDigits = useCallback((digits: string) => {
    const call = callRef.current;
    const clean = digits.replace(/[^0-9*#w]/g, "");
    if (!call || !clean) return;
    try {
      call.sendDigits?.(clean);
    } catch (error) {
      console.error("[dialler] sendDigits failed", error);
    }
  }, []);

  return { ready, status, muted, seconds, lastCallSid, startCall, hangUp, toggleMute, sendDigits };
}
