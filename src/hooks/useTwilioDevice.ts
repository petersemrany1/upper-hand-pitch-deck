import { useEffect, useRef, useState, useCallback } from "react";
import { Device, type Call } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "loading" | "ready" | "connecting" | "in-call" | "error";

function formatAUPhone(num: string): string {
  let cleaned = num.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  return "+61" + cleaned;
}

export function useTwilioDevice() {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);

  // Initialise Device once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        const { data, error: fnErr } = await supabase.functions.invoke("twilio-token", { body: {} });
        if (fnErr || !data?.token) throw new Error(fnErr?.message || "No token returned");
        if (cancelled) return;

        const device = new Device(data.token, {
          logLevel: 1,
          codecPreferences: ["opus" as never, "pcmu" as never],
        });

        device.on("registered", () => setStatus("ready"));
        device.on("error", (e: Error) => {
          console.error("Twilio Device error:", e);
          setError(e.message);
          setStatus("error");
        });
        device.on("tokenWillExpire", async () => {
          try {
            const { data: refreshed } = await supabase.functions.invoke("twilio-token", { body: {} });
            if (refreshed?.token) device.updateToken(refreshed.token);
          } catch (err) {
            console.error("Token refresh failed", err);
          }
        });

        await device.register();
        deviceRef.current = device;
      } catch (err) {
        console.error("Twilio init failed:", err);
        setError((err as Error).message);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        deviceRef.current?.destroy();
      } catch {}
      deviceRef.current = null;
    };
  }, []);

  const call = useCallback(async (phone: string) => {
    const device = deviceRef.current;
    if (!device) throw new Error("Device not ready");
    if (callRef.current) return;

    const formatted = formatAUPhone(phone);
    setStatus("connecting");

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
    conn.on("error", (e: Error) => {
      console.error("Call error:", e);
      setError(e.message);
      callRef.current = null;
      setActiveCallSid(null);
      setStatus("ready");
    });
  }, []);

  const hangup = useCallback(() => {
    callRef.current?.disconnect();
    callRef.current = null;
    setActiveCallSid(null);
    setStatus("ready");
  }, []);

  return { status, error, call, hangup, activeCallSid };
}
