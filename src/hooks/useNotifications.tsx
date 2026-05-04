import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Global "sticky until acknowledged" notifications: unread SMS threads and
// missed inbound calls. State lives at the dashboard root so badges in the
// sidebar, the top-bar bell, and the tab title all stay in sync.

export type UnreadThread = {
  thread_id: string;
  phone: string | null;
  display_name: string | null;
  clinic_name: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
};

export type MissedCall = {
  id: string;
  phone: string | null;
  clinic_id: string | null;
  clinic_name: string | null;
  lead_name: string | null;
  called_at: string;
};

type Ctx = {
  unreadThreads: UnreadThread[];
  unreadSmsCount: number;
  missedCalls: MissedCall[];
  missedCount: number;
  totalCount: number;
  acknowledgeMissed: (id: string) => void;
  acknowledgeAllMissed: () => void;
  refresh: () => void;
};

const NotificationsContext = createContext<Ctx | null>(null);

const ACK_KEY = "uh.missedCallsAcked.v1";

function loadAcked(): Set<string> {
  try {
    const raw = localStorage.getItem(ACK_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveAcked(set: Set<string>) {
  try {
    // Keep only most recent 500 to avoid unbounded growth.
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(ACK_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function digitsOnly(s: string | null | undefined): string {
  return (s || "").replace(/[^0-9]/g, "");
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadThreads, setUnreadThreads] = useState<UnreadThread[]>([]);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const ackedRef = useRef<Set<string>>(loadAcked());

  const fetchThreads = useCallback(async () => {
    const { data } = await supabase
      .from("sms_threads")
      .select("id, phone, display_name, unread_count, last_message_preview, last_message_at, clinic:clinics(clinic_name)")
      .gt("unread_count", 0)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(20);
    if (!data) return;
    setUnreadThreads(
      (data as unknown as Array<{
        id: string;
        phone: string | null;
        display_name: string | null;
        unread_count: number;
        last_message_preview: string | null;
        last_message_at: string | null;
        clinic: { clinic_name: string } | null;
      }>).map((t) => ({
        thread_id: t.id,
        phone: t.phone,
        display_name: t.display_name,
        clinic_name: t.clinic?.clinic_name ?? null,
        unread_count: t.unread_count,
        last_message_preview: t.last_message_preview,
        last_message_at: t.last_message_at,
      }))
    );
  }, []);

  const fetchMissed = useCallback(async () => {
    // Pull recent inbound calls; consider missed when duration is null/0 and
    // status is not in-progress / completed.
    const { data } = await supabase
      .from("call_records")
      .select("id, phone, status, duration, called_at, clinic_id, clinics(clinic_name)")
      .eq("direction", "inbound")
      .order("called_at", { ascending: false })
      .limit(50);
    if (!data) return;
    type Row = {
      id: string;
      phone: string | null;
      status: string | null;
      duration: number | null;
      called_at: string;
      clinic_id: string | null;
      clinics: { clinic_name: string } | null;
    };
    const rows = data as unknown as Row[];
    const acked = ackedRef.current;
    const missed = rows
      .filter((r) => {
        if (acked.has(r.id)) return false;
        if (r.duration && r.duration > 0) return false;
        const s = (r.status || "").toLowerCase();
        return s !== "in-progress" && s !== "completed";
      })
      .slice(0, 20);

    // Look up lead names by last 9 digits of phone.
    const tails = Array.from(
      new Set(missed.map((r) => digitsOnly(r.phone).slice(-9)).filter((t) => t.length >= 6))
    );
    const byTail = new Map<string, string>();
    if (tails.length > 0) {
      const { data: leads } = await supabase
        .from("meta_leads")
        .select("first_name, last_name, phone")
        .not("phone", "is", null);
      if (leads) {
        for (const l of leads as { first_name: string | null; last_name: string | null; phone: string | null }[]) {
          const t = digitsOnly(l.phone).slice(-9);
          if (t.length >= 6) {
            const name = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
            if (name && !byTail.has(t)) byTail.set(t, name);
          }
        }
      }
    }

    setMissedCalls(
      missed.map((r) => ({
        id: r.id,
        phone: r.phone,
        clinic_id: r.clinic_id,
        clinic_name: r.clinics?.clinic_name ?? null,
        lead_name: byTail.get(digitsOnly(r.phone).slice(-9)) ?? null,
        called_at: r.called_at,
      }))
    );
  }, []);

  const refresh = useCallback(() => {
    void fetchThreads();
    void fetchMissed();
  }, [fetchThreads, fetchMissed]);

  useEffect(() => {
    refresh();
    const ch1 = supabase
      .channel("global-notif-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_threads" }, () => void fetchThreads())
      .subscribe();
    const ch2 = supabase
      .channel("global-notif-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_records" }, () => void fetchMissed())
      .subscribe();
    const id = window.setInterval(refresh, 60_000);
    return () => {
      window.clearInterval(id);
      void supabase.removeChannel(ch1);
      void supabase.removeChannel(ch2);
    };
  }, [refresh, fetchThreads, fetchMissed]);

  const acknowledgeMissed = useCallback((id: string) => {
    ackedRef.current.add(id);
    saveAcked(ackedRef.current);
    setMissedCalls((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const acknowledgeAllMissed = useCallback(() => {
    for (const m of missedCalls) ackedRef.current.add(m.id);
    saveAcked(ackedRef.current);
    setMissedCalls([]);
  }, [missedCalls]);

  const unreadSmsCount = unreadThreads.reduce((s, t) => s + (t.unread_count || 0), 0);
  const missedCount = missedCalls.length;
  const totalCount = unreadSmsCount + missedCount;

  // Tab title + favicon dot — sticky awareness even when tab isn't focused.
  useEffect(() => {
    const baseTitle = "Upperhand Dashboard";
    document.title = totalCount > 0 ? `(${totalCount}) ${baseTitle}` : baseTitle;
  }, [totalCount]);

  useEffect(() => {
    setFaviconDot(totalCount > 0);
  }, [totalCount]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadThreads,
        unreadSmsCount,
        missedCalls,
        missedCount,
        totalCount,
        acknowledgeMissed,
        acknowledgeAllMissed,
        refresh,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Safe defaults so consumers don't crash if rendered outside provider.
    return {
      unreadThreads: [],
      unreadSmsCount: 0,
      missedCalls: [],
      missedCount: 0,
      totalCount: 0,
      acknowledgeMissed: () => {},
      acknowledgeAllMissed: () => {},
      refresh: () => {},
    };
  }
  return ctx;
}

// --- Favicon dot helper ---------------------------------------------------
let originalFaviconHref: string | null = null;
function setFaviconDot(active: boolean) {
  try {
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) return;
    if (originalFaviconHref === null) originalFaviconHref = link.href;
    if (!active) {
      link.href = originalFaviconHref;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      // Red dot top-right.
      ctx.beginPath();
      ctx.arc(size - 16, 16, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      try {
        link.href = canvas.toDataURL("image/png");
      } catch {
        // canvas tainted (cross-origin) — fall back to a plain red dot favicon.
        const fallback = document.createElement("canvas");
        fallback.width = size;
        fallback.height = size;
        const fctx = fallback.getContext("2d");
        if (!fctx) return;
        fctx.beginPath();
        fctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
        fctx.fillStyle = "#ef4444";
        fctx.fill();
        link.href = fallback.toDataURL("image/png");
      }
    };
    img.onerror = () => {
      // Fallback: solid red dot favicon.
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      link.href = canvas.toDataURL("image/png");
    };
    img.src = originalFaviconHref;
  } catch {
    // ignore
  }
}
