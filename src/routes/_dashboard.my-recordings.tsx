import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileAudio, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";
import { formatSydney } from "@/lib/timezone";

export const Route = createFileRoute("/_dashboard/my-recordings")({
  component: MyRecordingsPage,
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;

type CallRow = {
  id: string;
  called_at: string;
  duration_seconds: number | null;
  duration: number | null;
  recording_url: string;
  lead_id: string | null;
  phone: string | null;
  outcome: string | null;
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function MyRecordingsPage() {
  const repId = useCurrentRepId();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionToken(data.session?.access_token ?? "");
    });
  }, []);

  useEffect(() => {
    if (!repId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("call_records")
        .select("id, called_at, duration_seconds, duration, recording_url, lead_id, phone, outcome")
        .eq("rep_id", repId)
        .not("recording_url", "is", null)
        .order("called_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        console.error("my-recordings load failed", error);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as CallRow[];
      setCalls(rows);

      const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))] as string[];
      if (leadIds.length > 0) {
        const names: Record<string, string> = {};
        for (let i = 0; i < leadIds.length; i += 100) {
          const chunk = leadIds.slice(i, i + 100);
          const { data: leads } = await supabase
            .from("meta_leads")
            .select("id, first_name, last_name")
            .in("id", chunk);
          for (const l of leads ?? []) {
            const full = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
            if (full) names[l.id as string] = full;
          }
        }
        if (!cancelled) setLeadNames(names);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [repId]);

  const proxied = (url: string): string => {
    if (!sessionToken) return "";
    const base = import.meta.env.VITE_SUPABASE_URL;
    return `${base}/functions/v1/twilio-recording?url=${encodeURIComponent(url)}&token=${encodeURIComponent(sessionToken)}`;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((c) => {
      const name = (c.lead_id ? leadNames[c.lead_id] : "") ?? "";
      return (
        name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.outcome ?? "").toLowerCase().includes(q) ||
        formatSydney(c.called_at, { day: "numeric", month: "short" }).toLowerCase().includes(q)
      );
    });
  }, [calls, leadNames, query]);

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f5", minHeight: "100%" }}>
      <div style={{ padding: "32px 28px", maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <FileAudio className="h-5 w-5" style={{ color: "#f4522d" }} />
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#111", margin: 0 }}>My Recordings</h1>
        </div>
        <p style={{ fontSize: 13, color: "#6b6b6b", margin: "0 0 20px" }}>
          Every recorded call you've made, newest first. Listen only — recordings can't be downloaded.
        </p>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search className="h-4 w-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9b9b9b" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone or outcome…"
            style={{
              width: "100%", padding: "9px 12px 9px 34px", fontSize: 13, color: "#111",
              background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 8, outline: "none",
            }}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b6b6b", fontSize: 13, padding: "40px 0", justifyContent: "center" }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your recordings…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6b6b6b", fontSize: 13, padding: "40px 0" }}>
            {calls.length === 0 ? "No recorded calls yet." : "No recordings match your search."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((c) => {
              const name = (c.lead_id ? leadNames[c.lead_id] : null) || c.phone || "Unknown";
              const open = openId === c.id;
              return (
                <div
                  key={c.id}
                  style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : c.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b6b6b", marginTop: 2 }}>
                        {formatSydney(c.called_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                      </div>
                    </div>
                    {c.outcome && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 999, flexShrink: 0,
                        background: "#f5f5f5", color: "#6b6b6b", textTransform: "capitalize",
                      }}>
                        {c.outcome.replace(/_/g, " ")}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "#6b6b6b", flexShrink: 0, minWidth: 56, textAlign: "right" }}>
                      {formatDuration(c.duration_seconds ?? c.duration)}
                    </span>
                    <span style={{ color: "#9b9b9b", fontSize: 12, flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }}>›</span>
                  </button>
                  {open && (
                    <div style={{ padding: "0 16px 14px", borderTop: "0.5px solid #f0f0f0" }}>
                      <audio
                        controls
                        controlsList="nodownload"
                        preload="none"
                        src={proxied(c.recording_url)}
                        style={{ width: "100%", marginTop: 12, height: 40 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
