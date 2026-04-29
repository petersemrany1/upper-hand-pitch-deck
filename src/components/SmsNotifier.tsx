import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Global listener for inbound SMS. Shows a top-left toast on any page,
// click to jump straight into the matching thread on the Inbox page.
type InboundMessage = {
  id: string;
  thread_id: string;
  direction: string;
  body: string | null;
  from_number: string | null;
};

export function SmsNotifier() {
  const navigate = useNavigate();
  const location = useLocation();
  const locRef = useRef(location.pathname);
  useEffect(() => { locRef.current = location.pathname; }, [location.pathname]);

  // Lazy-init shared AudioContext (browsers require user gesture before first use)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playMessageTone = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();

      // Two-note "ding" — pleasant iMessage-style chime
      const now = ctx.currentTime;
      const notes = [
        { freq: 880, start: 0,    dur: 0.18 },  // A5
        { freq: 1318.5, start: 0.09, dur: 0.28 }, // E6
      ];
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        gain.gain.setValueAtTime(0.0001, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.18, now + n.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.02);
      }
    } catch {
      // ignore audio errors (e.g. autoplay blocked before first interaction)
    }
  };

  useEffect(() => {
    const ch = supabase
      .channel("global-sms-notifier")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sms_messages" },
        async (payload) => {
          const m = payload.new as InboundMessage;
          if (m.direction !== "inbound") return;

          // Always play the tone (even on the inbox page)
          playMessageTone();

          // Skip toast if already on the inbox page
          if (locRef.current === "/inbox") return;

          // Look up sender display
          const { data: thread } = await supabase
            .from("sms_threads")
            .select("phone, display_name, clinic:clinics(clinic_name)")
            .eq("id", m.thread_id)
            .maybeSingle();
          const t = thread as { phone: string; display_name: string | null; clinic: { clinic_name: string } | null } | null;
          const sender = t?.display_name || t?.clinic?.clinic_name || t?.phone || m.from_number || "Unknown";
          const preview = m.body?.trim() || "📷 Media message";

          toast(`New message from ${sender}`, {
            description: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
            position: "top-left",
            duration: 8000,
            action: {
              label: "Open",
              onClick: () => navigate({ to: "/inbox", search: { thread: m.thread_id } }),
            },
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [navigate]);

  return null;
}
