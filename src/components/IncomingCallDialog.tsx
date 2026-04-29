import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { findLeadByPhone } from "@/utils/sales-call.functions";

// Global incoming-call alert. Shows a full-screen-ish modal with caller ID,
// matches the inbound number against meta_leads so the rep instantly sees
// WHO is calling (name, day, attempt count, previous notes), plays a
// ringtone, and exposes Accept / Reject buttons. Auto-mounted in the
// dashboard layout so it works on any page.

type MatchedLead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  day_number: number | null;
  status: string | null;
  call_notes: string | null;
  callback_scheduled_at: string | null;
  booking_date: string | null;
  booking_time: string | null;
  attempt_count: number;
};

function useRingtone(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        if (cancelled) return;

        let timer: number | null = null;
        const playRing = () => {
          const now = ctx.currentTime;
          [0, 0.4].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 480;
            const o2 = ctx.createOscillator();
            o2.frequency.value = 620;
            o2.connect(gain);
            osc.connect(gain);
            gain.gain.setValueAtTime(0.0001, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            o2.start(now + offset);
            osc.stop(now + offset + 0.32);
            o2.stop(now + offset + 0.32);
          });
        };
        playRing();
        timer = window.setInterval(playRing, 2000);
        stopRef.current = () => {
          if (timer !== null) window.clearInterval(timer);
          ctx.close().catch(() => { /* noop */ });
        };
      } catch (e) {
        console.warn("Ringtone unavailable", e);
      }
    };
    void start();
    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [active]);
}

export function IncomingCallDialog() {
  const { status, incomingFrom, answer, reject } = useTwilioDevice();
  const isRinging = status === "ringing-incoming";

  const [matched, setMatched] = useState<MatchedLead | null>(null);
  const [looking, setLooking] = useState(false);

  useRingtone(isRinging);

  // Lookup the caller against meta_leads the moment the phone rings
  useEffect(() => {
    if (!isRinging || !incomingFrom) {
      setMatched(null);
      return;
    }
    setLooking(true);
    setMatched(null);
    void findLeadByPhone({ data: { phone: incomingFrom } })
      .then((r) => {
        if (r.success && r.lead) setMatched(r.lead);
      })
      .catch(() => { /* noop */ })
      .finally(() => setLooking(false));
  }, [isRinging, incomingFrom]);

  // Browser notification (best effort) — include name if matched
  useEffect(() => {
    if (!isRinging) return;
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          const name = matched ? [matched.first_name, matched.last_name].filter(Boolean).join(" ") : null;
          new Notification("Incoming call", { body: name || incomingFrom || "Unknown caller" });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().catch(() => { /* noop */ });
        }
      }
    } catch { /* noop */ }
  }, [isRinging, incomingFrom, matched]);

  if (!isRinging) return null;

  const fullName = matched
    ? [matched.first_name, matched.last_name].filter(Boolean).join(" ") || "Unnamed lead"
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
        style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-500">
          {matched ? "📞 Lead calling back" : "Incoming call"}
        </div>

        {/* Name (or phone fallback) */}
        <div className="mb-1 text-2xl font-bold text-[#111111]">
          {fullName || incomingFrom || "Unknown caller"}
        </div>

        {/* Phone underneath name when matched */}
        {fullName && (
          <div className="mb-2 text-xs text-[#666]">{incomingFrom}</div>
        )}

        {/* Lead context badges */}
        {matched && (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
            {matched.day_number != null && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                Day {matched.day_number}
              </span>
            )}
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
              Attempt {matched.attempt_count + 1}
            </span>
            {matched.status && matched.status !== "new" && (
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700 border border-stone-200 capitalize">
                {matched.status}
              </span>
            )}
            {matched.booking_date && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                Booked {matched.booking_date}
              </span>
            )}
          </div>
        )}

        {/* Last call notes preview */}
        {matched?.call_notes && (
          <div
            className="mb-4 rounded-lg p-2.5 text-left text-[12px] text-[#333] leading-snug"
            style={{ background: "#fafaf9", border: "1px solid #ebebeb", maxHeight: 96, overflow: "hidden" }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-1">Last notes</div>
            {matched.call_notes.length > 220 ? matched.call_notes.slice(0, 220) + "…" : matched.call_notes}
          </div>
        )}

        {looking && !matched && (
          <div className="mb-4 text-xs text-[#888]">Looking up caller…</div>
        )}

        {!looking && !matched && (
          <div className="mb-4 text-sm text-[#111111]">Ringing…</div>
        )}

        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={reject}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-500 active:scale-95"
            aria-label="Reject call"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={answer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-500 active:scale-95 animate-pulse"
            aria-label="Answer call"
          >
            <Phone className="h-7 w-7" />
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-12 text-xs text-[#111111]">
          <span>Decline</span>
          <span>Answer</span>
        </div>
      </div>
    </div>
  );
}
