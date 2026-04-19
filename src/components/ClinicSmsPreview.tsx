import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Shows the most recent SMS preview for a clinic and a link to open the full
// thread in the Inbox. Falls back to a "Send first SMS" CTA when there's no
// thread yet but a phone number is on file.

type Props = {
  clinicId: string;
  clinicPhone: string | null;
};

type LatestMsg = {
  threadId: string;
  body: string | null;
  direction: string;
  createdAt: string;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ClinicSmsPreview({ clinicId, clinicPhone }: Props) {
  const [latest, setLatest] = useState<LatestMsg | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: thread } = await supabase
        .from("sms_threads")
        .select("id")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (cancelled) return;
      if (!thread?.id) {
        setThreadId(null);
        setLatest(null);
        setLoading(false);
        return;
      }
      setThreadId(thread.id);
      const { data: msg } = await supabase
        .from("sms_messages")
        .select("body, direction, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (msg) {
        setLatest({ threadId: thread.id, body: msg.body, direction: msg.direction, createdAt: msg.created_at });
      } else {
        setLatest(null);
      }
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [clinicId]);

  return (
    <div className="rounded-lg p-4" style={{ background: "#111114", border: "1px solid #1f1f23" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase font-bold" style={{ color: "#2D6BE4", letterSpacing: "0.15em" }}>LATEST SMS</div>
        {(threadId || clinicPhone) && (
          <Link
            to="/inbox"
            search={threadId ? { thread: threadId } : { phone: clinicPhone ?? undefined }}
            className="inline-flex items-center gap-1 text-[10px] font-semibold hover:underline"
            style={{ color: "#2D6BE4" }}
          >
            Open in Inbox <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {loading && <p className="text-xs" style={{ color: "#444" }}>Loading…</p>}

      {!loading && !latest && !clinicPhone && (
        <p className="text-xs" style={{ color: "#444" }}>No phone on file.</p>
      )}

      {!loading && !latest && clinicPhone && (
        <Link
          to="/inbox"
          search={{ phone: clinicPhone }}
          className="flex items-center gap-2 text-xs hover:underline"
          style={{ color: "#888" }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Send first SMS to {clinicPhone}
        </Link>
      )}

      {!loading && latest && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "#555" }}>
            {latest.direction === "outbound" ? "You" : "Them"} · {fmtTime(latest.createdAt)}
          </div>
          <p className="text-xs line-clamp-2" style={{ color: "#ccc" }}>
            {latest.body || "(media)"}
          </p>
        </div>
      )}
    </div>
  );
}
