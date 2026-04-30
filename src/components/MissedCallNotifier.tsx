import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Global listener for inbound missed calls. Pops a top-left toast on any page
// (especially the sales-call window) so Peter knows immediately when a lead
// rings back. Click "Call back" jumps to the dashboard where the missed call
// list lives.

type CallRow = {
  id: string;
  direction: string;
  status: string | null;
  duration: number | null;
  phone: string | null;
  clinic_id: string | null;
};

export function MissedCallNotifier() {
  const navigate = useNavigate();
  const location = useLocation();
  const locRef = useRef(location.pathname);
  useEffect(() => { locRef.current = location.pathname; }, [location.pathname]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const playRing = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      const notes = [
        { freq: 660, start: 0, dur: 0.22 },
        { freq: 880, start: 0.12, dur: 0.32 },
      ];
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        gain.gain.setValueAtTime(0.0001, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.2, now + n.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.02);
      }
    } catch {
      // ignore
    }
  };

  const handleRow = async (row: CallRow) => {
    if (row.direction !== "inbound") return;
    // Consider it missed if no duration AND status is not in-progress / completed
    const s = (row.status || "").toLowerCase();
    const answered = (row.duration && row.duration > 0) || s === "in-progress" || s === "completed";
    if (answered) return;
    if (seenRef.current.has(row.id)) return;
    seenRef.current.add(row.id);

    let label = row.phone || "Unknown";
    if (row.clinic_id) {
      const { data } = await supabase
        .from("clinics")
        .select("clinic_name")
        .eq("id", row.clinic_id)
        .maybeSingle();
      if (data?.clinic_name) label = data.clinic_name;
    }

    playRing();
    toast(`📞 Missed call from ${label}`, {
      description: row.phone || undefined,
      position: "top-left",
      duration: 10000,
      action: {
        label: "View",
        onClick: () => navigate({ to: "/" }),
      },
    });
  };

  useEffect(() => {
    const ch = supabase
      .channel("global-missed-call-notifier")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_records" },
        (payload) => { void handleRow(payload.new as CallRow); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_records" },
        (payload) => { void handleRow(payload.new as CallRow); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
