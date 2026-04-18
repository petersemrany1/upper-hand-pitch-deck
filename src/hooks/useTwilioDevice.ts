import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logFrontendError, extractErrorMessage } from "@/utils/log-frontend-error";

// Click-to-call wrapper. Keeps the same surface as the old browser-SDK hook so
// existing UIs (`status`, `dialerStatus`, `error`, `call`, `hangup`, `retry`,
// `activeCallSid`) keep working without changes.
//
// Flow:
//   1. `call(phone)` POSTs to the `initiate-call` edge function.
//   2. Twilio rings Peter's phone (+61418214953) first.
//   3. When Peter answers, Twilio bridges him to the clinic number.
//   4. We poll `call_records` for the parent CallSid until the status moves
//      out of `initiated` so the UI can show "Connected" / "Completed".

type Status = "idle" | "loading" | "ready" | "connecting" | "in-call" | "error";
type DialerStatus = "connecting" | "ready" | "failed";

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 5 * 60_000;

export function useTwilioDevice() {
  const [status, setStatus] = useState<Status>("ready");
  const [dialerStatus] = useState<DialerStatus>("ready"); // no SDK to register — always ready
  const [error, setError] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollStartedAtRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const beginPolling = useCallback((callSid: string) => {
    stopPolling();
    pollStartedAtRef.current = Date.now();

    pollTimerRef.current = window.setInterval(async () => {
      if (Date.now() - pollStartedAtRef.current > POLL_MAX_MS) {
        stopPolling();
        setStatus("ready");
        setActiveCallSid(null);
        return;
      }

      const { data } = await supabase
        .from("call_records")
        .select("status, duration")
        .eq("twilio_call_sid", callSid)
        .maybeSingle();

      if (!data) return;
      const s = (data.status || "").toLowerCase();

      if (s === "in-progress" || s === "answered") {
        setStatus("in-call");
      } else if (
        s === "completed" ||
        s === "no-answer" ||
        s === "busy" ||
        s === "failed" ||
        s === "canceled"
      ) {
        stopPolling();
        setStatus("ready");
        setActiveCallSid(null);
        if (s !== "completed") {
          setError(`Call ${s.replace("-", " ")}.`);
        }
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const call = useCallback(async (phone: string) => {
    setError(null);
    setStatus("connecting");

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("initiate-call", {
        body: { clinicPhone: phone },
      });

      if (fnErr || !data?.success || !data?.callSid) {
        const msg = data?.error || fnErr?.message || "Failed to start call";
        setStatus("error");
        setError(msg);
        await logFrontendError("initiate-call", `Click-to-call failed: ${msg}`, {
          phone,
          fnError: fnErr ? { message: fnErr.message } : null,
          responseData: data ?? null,
          stepsToReproduce: `User clicked Call for ${phone}; initiate-call edge function rejected the request.`,
        });
        throw new Error(msg);
      }

      setActiveCallSid(data.callSid);
      beginPolling(data.callSid);
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to start call");
      setStatus("error");
      setError(msg);
      throw err instanceof Error ? err : new Error(msg);
    }
  }, [beginPolling]);

  const hangup = useCallback(() => {
    // No active media stream to drop on the client. The PSTN call between Peter
    // and the clinic continues until either party hangs up. We just reset UI.
    stopPolling();
    setActiveCallSid(null);
    setStatus("ready");
  }, [stopPolling]);

  const retry = useCallback(() => {
    setError(null);
    setStatus("ready");
  }, []);

  return { status, dialerStatus, error, call, hangup, retry, activeCallSid };
}
