// Ported from the Legal app (family-law-floater/src/hooks/use-firm-callbacks.ts). Re-run the port script to refresh.
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Call, Device } from "@twilio/voice-sdk";
import { loadTwilioSdk } from "./use-dialler";
import {
  startFirmCallbackSession,
  keepFirmCallbackSession,
  stopFirmCallbackSession,
  declineIncomingFirmCall,
} from "@/legal/lib/firm-callbacks.functions";
import { FIRM_CALLBACK_LEASE_MS, type FirmIncomingCaller } from "@/legal/lib/firm-callbacks";

type Tone = { context: AudioContext; start: () => void; stop: () => void };
function ringtone(): Tone {
  const context = new AudioContext();
  let timer: number | undefined;
  let oscillators: OscillatorNode[] = [];
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(context.destination);
  const stop = () => {
    window.clearInterval(timer);
    timer = undefined;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(0, context.currentTime);
    oscillators.forEach((oscillator) => oscillator.stop());
    oscillators = [];
  };
  return {
    context,
    stop,
    start: () => {
      stop();
      oscillators = [440, 480].map((frequency) => {
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
      const ring = () => {
        const now = context.currentTime;
        gain.gain.setValueAtTime(0.055, now);
        gain.gain.setValueAtTime(0, now + 0.4);
        gain.gain.setValueAtTime(0.055, now + 0.6);
        gain.gain.setValueAtTime(0, now + 1);
      };
      ring();
      timer = window.setInterval(ring, 3000);
    },
  };
}

export function useFirmCallbacks(enabled: boolean, busy: boolean, onEnded: () => void) {
  const startSession = useServerFn(startFirmCallbackSession);
  const keepSession = useServerFn(keepFirmCallbackSession);
  const stopSession = useServerFn(stopFirmCallbackSession);
  const declineCall = useServerFn(declineIncomingFirmCall);
  const [attempt, setAttempt] = useState(0);
  const takeOver = useRef(false);
  const activation = useRef(0);
  const reconnectRef = useRef<(() => void) | null>(null);
  const [connection, setConnection] = useState<
    "off" | "connecting" | "ready" | "waiting" | "error"
  >("off");
  const [error, setError] = useState("");
  const [caller, setCaller] = useState<FirmIncomingCaller | null>(null);
  const [phase, setPhase] = useState<"ringing" | "answering" | "connected">("ringing");
  const [silenced, setSilenced] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [soundError, setSoundError] = useState("");
  const [confirmedUntil, setConfirmedUntil] = useState(0);
  // Wait for sound before claiming a receiver. A silent, newly opened tab must
  // not reserve the account's only callback session.
  const [audioActivated, setAudioActivated] = useState(false);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const tone = useRef<Tone | null>(null);
  const call = useRef<Call | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const heartbeatRef = useRef<(() => Promise<void>) | null>(null);
  // Server-function wrappers can change between renders; do not reconnect a live call.
  const api = useRef({ startSession, keepSession, stopSession });
  api.current = { startSession, keepSession, stopSession };

  const enableSound = useCallback(async () => {
    try {
      if (!tone.current || tone.current.context.state === "closed") tone.current = ringtone();
      const current = tone.current;
      const syncSound = () => {
        const running = current.context.state === "running";
        setSoundReady(running);
        if (running) {
          setAudioActivated(true);
          setSoundError("");
          reconnectRef.current?.();
        }
        void heartbeatRef.current?.();
      };
      current.context.onstatechange = syncSound;
      syncSound();
      await current.context.resume();
      if (tone.current === current && current.context.state !== "closed") syncSound();
    } catch {
      setSoundError(
        "Could not start call audio. Check the browser's sound permission, then try again.",
      );
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Browsers with autoplay permission can reconnect with sound automatically.
    // Otherwise the single Start receiving calls action unlocks audio.
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      if (document.hasFocus()) {
        activation.current += 1;
        takeOver.current = true;
        reconnectRef.current?.();
      }
      void enableSound();
    };
    resume();
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    // A normal interaction also unlocks browser audio after a reload. There is
    // no separate ringtone preference to remember or turn on again.
    document.addEventListener("pointerdown", resume);
    document.addEventListener("keydown", resume);
    window.addEventListener("online", resume);
    return () => {
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
      window.removeEventListener("online", resume);
    };
  }, [enabled, enableSound]);

  useEffect(() => {
    if (phase !== "connected" || !caller) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [caller, phase]);

  useEffect(() => {
    if (!enabled || !audioActivated) {
      setConnection("off");
      if (!enabled) {
        setError("");
        setSoundError("");
      }
      return;
    }
    let stopped = false;
    let device: Device | undefined;
    let interval: number | undefined;
    let confirmationTimer: number | undefined;
    let registered = false;
    let refreshing = false;
    let refreshAgain = false;
    let tokenAt = 0;
    let lastConfirmedActivation = activation.current;
    let reconnecting = false;
    const sessionId = crypto.randomUUID();
    const transferRequested =
      takeOver.current && document.visibilityState === "visible" && document.hasFocus();
    setConnection("connecting");
    setConfirmedUntil(0);
    setError("");
    const release = () => void api.current.stopSession({ data: { sessionId } }).catch(() => {});
    const cleanup = () => {
      stopped = true;
      registered = false;
      window.clearInterval(interval);
      window.clearTimeout(confirmationTimer);
      tone.current?.stop();
      const current = call.current;
      call.current = null;
      if (current?.status() === "pending") current.reject();
      else current?.disconnect();
      device?.destroy();
      release();
    };
    const fail = (reason: unknown) => {
      if (stopped) return;
      stopped = true;
      registered = false;
      setConfirmedUntil(0);
      window.clearTimeout(confirmationTimer);
      window.clearInterval(interval);
      // A callback can arrive just as another tab takes the idle lease. Losing
      // reception (or a heartbeat) must never disconnect that existing call.
      // Keep its device alive until the caller or receiver ends the call.
      if (!call.current) cleanup();
      setConnection("error");
      setError(
        reason instanceof Error
          ? reason.message
          : "The firm-call connection was interrupted. Retrying automatically.",
      );
    };
    const waitForSession = (status: "waiting" | "moved" | "disabled") => {
      if (stopped) return;
      stopped = true;
      registered = false;
      setConfirmedUntil(0);
      window.clearTimeout(confirmationTimer);
      window.clearInterval(interval);
      // Background pages must not fight to take the session back. A new user
      // interaction since our last confirmed heartbeat can request it here.
      if (status === "moved") takeOver.current = activation.current > lastConfirmedActivation;
      if (!call.current) cleanup();
      setConnection(status === "disabled" ? "off" : "waiting");
      setError("");
    };
    reconnectRef.current = () => {
      if (
        !stopped ||
        reconnecting ||
        call.current ||
        busyRef.current ||
        tone.current?.context.state !== "running"
      )
        return;
      reconnecting = true;
      setAttempt((value) => value + 1);
    };
    const heartbeat = async () => {
      // Audio/focus events can fire while startSession is still claiming the
      // lease. Refreshing then would fail and tear down our own new session.
      // Registration happens only after the claim and token are complete.
      if (stopped || !registered) return;
      if (device?.state !== "registered") {
        fail(new Error("Incoming-call registration was lost. Reconnecting automatically."));
        return;
      }
      if (refreshing) {
        refreshAgain = true;
        return;
      }
      // A suspended, idle background page must not renew an unavailable lease
      // indefinitely and block a tab whose ringtone is working. Keep live
      // inbound/outbound calls intact; only release idle reception.
      if (tone.current?.context.state !== "running" && !call.current && !busyRef.current) {
        waitForSession("waiting");
        return;
      }
      refreshing = true;
      const confirmingActivation = activation.current;
      const requestedAt = Date.now();
      const available =
        registered &&
        tone.current?.context.state === "running" &&
        !busyRef.current &&
        !call.current;
      try {
        const renewToken = Date.now() - tokenAt > 180_000;
        const result = await api.current.keepSession({
          data: {
            sessionId,
            autoReconnect: true,
            available,
            renewToken,
          },
        });
        if (stopped) return;
        if (result.status !== "renewed") {
          waitForSession(result.status);
          return;
        }
        lastConfirmedActivation = confirmingActivation;
        // Use the request's start time conservatively. A delayed response must
        // not make an expired server lease look like a fresh connection.
        const until = requestedAt + FIRM_CALLBACK_LEASE_MS;
        if (available && until <= Date.now()) {
          fail(new Error("Incoming-call confirmation expired. Reconnecting automatically."));
          return;
        }
        setConfirmedUntil(available ? until : 0);
        window.clearTimeout(confirmationTimer);
        if (available) {
          confirmationTimer = window.setTimeout(() => {
            fail(new Error("Incoming calls could not be confirmed. Reconnecting automatically."));
          }, until - Date.now());
        }
        if (!stopped) setConnection("ready");
        if (!stopped && result.token) {
          device?.updateToken(result.token);
          tokenAt = Date.now();
        }
      } catch (reason) {
        fail(reason);
      } finally {
        refreshing = false;
        // If audio/busy state changed during the request, publish the latest
        // state immediately instead of leaving a silent tab available for 20s.
        if (refreshAgain) {
          refreshAgain = false;
          void heartbeat();
        }
      }
    };
    heartbeatRef.current = heartbeat;
    const clearCall = (ended: Call) => {
      if (call.current !== ended) return;
      tone.current?.stop();
      call.current = null;
      setCaller(null);
      setMuted(false);
      endedRef.current();
      if (stopped) cleanup();
      else void heartbeat();
    };
    void (async () => {
      const result = await api.current.startSession({
        data: { sessionId, takeOver: transferRequested, autoReconnect: true },
      });
      if (stopped) {
        release();
        return;
      }
      if (result.status !== "claimed") {
        waitForSession(result.status);
        return;
      }
      const { token } = result;
      tokenAt = Date.now();
      const sdk = await loadTwilioSdk();
      if (stopped) {
        release();
        return;
      }
      device = new sdk.Device(token) as unknown as Device;
      // Own ringtone: Silence must leave the pending call answerable.
      device.audio?.incoming(false);
      device.on("registered", () => {
        if (stopped) return;
        registered = true;
        void heartbeat();
      });
      device.on("unregistered", () => {
        if (!stopped)
          fail(new Error("The firm-call connection was interrupted. Retrying automatically."));
      });
      device.on("error", fail);
      device.on("tokenWillExpire", () => {
        tokenAt = 0;
        void heartbeat();
      });
      device.on("incoming", (incoming: Call) => {
        if (stopped || busyRef.current || call.current) {
          incoming.reject();
          return;
        }
        const fields = incoming.customParameters;
        const applicationId = fields.get("ApplicationId") || "";
        const callSid = fields.get("ParentCallSid") || "";
        if (!/^[0-9a-f-]{36}$/i.test(applicationId) || !/^CA[0-9a-f]{32}$/i.test(callSid)) {
          incoming.reject();
          return;
        }
        call.current = incoming;
        setCaller({
          applicationId,
          callSid,
          name: fields.get("CallerName") || "Firm callback",
          firmName: fields.get("FirmName") || "",
          phone: fields.get("CallerPhone") || "",
        });
        setPhase("ringing");
        setSilenced(false);
        setMuted(false);
        setSeconds(0);
        setError("");
        tone.current?.start();
        incoming.on("accept", () => {
          tone.current?.stop();
          setPhase("connected");
        });
        for (const event of ["cancel", "disconnect", "reject"])
          incoming.on(event, () => clearCall(incoming));
        incoming.on("error", (reason: Error) => {
          setError(reason.message);
          clearCall(incoming);
        });
        void heartbeat();
      });
      await device.register();
      if (stopped) return;
      interval = window.setInterval(() => void heartbeat(), 20_000);
    })().catch(fail);
    return () => {
      heartbeatRef.current = null;
      reconnectRef.current = null;
      cleanup();
    };
  }, [enabled, audioActivated, attempt]);

  useEffect(() => {
    if (
      !enabled ||
      !soundReady ||
      caller ||
      busy ||
      (connection !== "waiting" && connection !== "error")
    )
      return;
    // Closed/crashed tabs and brief network failures recover without another
    // button press. Only a fresh foreground interaction permits idle takeover.
    const timer = window.setTimeout(() => reconnectRef.current?.(), 5000);
    return () => window.clearTimeout(timer);
  }, [enabled, soundReady, caller, busy, connection, attempt]);

  useEffect(() => {
    void heartbeatRef.current?.();
  }, [busy]);
  useEffect(
    () => () => {
      tone.current?.stop();
      if (tone.current) tone.current.context.onstatechange = null;
      void tone.current?.context.close();
      tone.current = null;
    },
    [],
  );

  const silence = () => {
    tone.current?.stop();
    setSilenced(true);
  };
  const answer = async () => {
    const current = call.current;
    if (!current || busyRef.current) return;
    tone.current?.stop();
    setPhase("answering");
    try {
      await current.accept();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not answer. Check microphone access.",
      );
      if (call.current === current) setPhase("ringing");
    }
  };
  const hangUp = async () => {
    const current = call.current;
    if (!current) return;
    tone.current?.stop();
    if (current.status() === "pending") {
      try {
        await declineCall({
          data: { callSid: current.customParameters.get("ParentCallSid") || "" },
        });
        if (call.current === current) current.reject();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not decline this call.");
      }
    } else current.disconnect();
  };
  const toggleMute = () => {
    if (!call.current) return;
    const next = !call.current.isMuted();
    call.current.mute(next);
    setMuted(next);
  };
  return {
    caller,
    phase,
    connection,
    error: soundError || error,
    silenced,
    soundReady,
    busy,
    available:
      enabled &&
      connection === "ready" &&
      soundReady &&
      !busy &&
      !caller &&
      confirmedUntil > Date.now(),
    muted,
    seconds,
    answer,
    silence,
    hangUp,
    toggleMute,
    startReceiving: () => {
      activation.current += 1;
      takeOver.current = true;
      void enableSound();
      reconnectRef.current?.();
    },
  };
}
export type FirmCallbacks = ReturnType<typeof useFirmCallbacks>;
