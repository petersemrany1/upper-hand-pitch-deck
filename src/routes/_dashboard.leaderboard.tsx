import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trophy, Crown, Plus, Bot, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { inviteRep, getLeaderboard, ensureRepForEmail } from "@/utils/sales-call.functions";
import { analyseCallPatterns } from "@/utils/resend.functions";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/leaderboard")({
  component: LeaderboardPage,
});

const C = {
  bg: "#f7f7f5", card: "#ffffff", line: "#ebebeb", text: "#111111", muted: "#111111",
  coral: "#f4522d", green: "#16a34a", amber: "#f59e0b", red: "#ef4444", gold: "#fbbf24",
};
// Backwards-compat alias used in a few inline styles below
const BLUE = "#f4522d";

type Range = "today" | "yesterday" | "week" | "lastweek" | "30d";
type Row = Awaited<ReturnType<typeof getLeaderboard>>["rows"][number];

function LeaderboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("today");
  const [rows, setRows] = useState<Row[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRep, setNewRep] = useState({ firstName: "", lastName: "", email: "" });
  const [inviting, setInviting] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachText, setCoachText] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [patternText, setPatternText] = useState("");
  const [patternLoading, setPatternLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    const r = await getLeaderboard({ data: { range } });
    if (r.success) setRows(r.rows);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [range]);

  // Realtime refresh on bookings/calls
  useEffect(() => {
    const ch = supabase.channel("leaderboard-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_records" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "meta_leads" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [range]);

  const onAddRep = async () => {
    if (!newRep.firstName.trim() || !newRep.lastName.trim() || !newRep.email.trim()) {
      toast.error("First name, last name and email required"); return;
    }
    setInviting(true);
    const r = await inviteRep({ data: newRep });
    setInviting(false);
    if (r.success) {
      toast.success(`Invite sent to ${newRep.email}`);
      setNewRep({ firstName: "", lastName: "", email: "" });
      setShowAdd(false); void load();
    } else toast.error(r.error);
  };

  const analyseLast = async () => {
    if (!user?.email) { toast.error("Not signed in"); return; }
    const repRes = await ensureRepForEmail({ data: { email: user.email } });
    if (!repRes.success || !repRes.rep) { toast.error("Rep not found"); return; }

    // Find most recent lead with notes that this rep touched (fall back to any latest)
    const { data: leads } = await supabase.from("meta_leads")
      .select("call_notes, updated_at, rep_id")
      .not("call_notes", "is", null)
      .order("updated_at", { ascending: false }).limit(20);
    const own = (leads ?? []).find((l) => l.rep_id === repRes.rep!.id) ?? leads?.[0];
    const notes = (own?.call_notes ?? "").trim();
    if (!notes) { toast.error("No call notes found yet"); return; }

    setCoachOpen(true); setCoachText(""); setCoachLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController(); abortRef.current = ac;

    try {
      const res = await fetch("/api/coach-stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }), signal: ac.signal,
      });
      if (!res.ok || !res.body) { toast.error("Coach failed"); setCoachLoading(false); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setCoachText((t) => t + dec.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("Coach error");
    } finally { setCoachLoading(false); }
  };

  const analysePatterns = async () => {
    setPatternOpen(true); setPatternText(""); setPatternLoading(true);
    try {
      const r = await analyseCallPatterns({ data: { range } });
      if (r.success) {
        setPatternText(r.text);
      } else {
        setPatternText(`Analysis failed — ${r.error}`);
      }
    } catch {
      setPatternText("Analysis failed — try again.");
    } finally {
      setPatternLoading(false);
    }
  };

  const ranges: { key: Range; label: string }[] = [
    { key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This Week" }, { key: "lastweek", label: "Last Week" },
    { key: "30d", label: "30 Days" },
  ];
  

  return (
    <div className="h-full overflow-y-auto" style={{ background: C.bg, color: C.text }}>
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6" style={{ color: C.gold }} />
            <h1 className="text-2xl font-bold">Leaderboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => void analysePatterns()} disabled={patternLoading}
              className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 disabled:opacity-60"
              style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6", border: "1px solid #8b5cf6" }}>
              <Sparkles className="h-3.5 w-3.5" /> Call Patterns
            </button>
            <button onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2"
              style={{ background: BLUE, color: "#111111" }}>
              <Plus className="h-3.5 w-3.5" /> Add Rep
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 flex-wrap">
          {ranges.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className="px-3 py-1.5 text-xs font-bold rounded-md"
              style={{
                background: range === r.key ? BLUE : "transparent",
                color: range === r.key ? "#fff" : C.muted,
                border: `1px solid ${range === r.key ? BLUE : C.line}`,
              }}>{r.label}</button>
          ))}
        </div>

        <div className="mt-4 rounded-lg overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider" style={{ color: C.muted, background: "#ffffff" }}>
                  <Th>Rank</Th>
                  <Th>Rep</Th>
                  <Th info="Twilio call attempts recorded in this period.">Calls</Th>
                  <Th info="Twilio calls with no connected duration.">Not Reached</Th>
                  <Th info="Connected Twilio calls under 2 minutes.">Short</Th>
                  <Th info="Connected Twilio calls lasting 2 minutes or more.">Convos</Th>
                  <Th info="Of everyone who picked up, % that stayed for a real conversation (2min+).">Hold %</Th>
                  <Th info="Bookings as a percentage of real conversations (Booked ÷ Convos).">Conv %</Th>
                  <Th info="Internal deposit-paid bookings confirmed in this period.">Booked</Th>
                  <Th info="Total shift time from first call to last call of the day.">Work</Th>
                  <Th info="Average time between calls during the shift. Green = under 1 min, amber = 1–3 min, red = 3+ min.">Break</Th>
                  <Th info="Bookings × $50.">Bonus</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const holdColor = r.holdRate === 0 ? "#111" : r.holdRate >= 60 ? C.green : r.holdRate >= 40 ? C.amber : C.red;
                  const convColor = r.conversion === 0 ? "#111" : r.conversion >= 70 ? C.green : r.conversion >= 50 ? C.amber : "#111";
                  const avgBreakMin = r.breakGaps > 0 ? r.breakMinutes / r.breakGaps : 0;
                  const breakColor = avgBreakMin === 0 ? "#111" : avgBreakMin <= 1 ? C.green : avgBreakMin <= 3 ? C.amber : C.red;
                  // Peter Semrany develops the app, so his Work/Break aren't real shift data — hide them.
                  const isPeter = (r.name ?? "").trim().toLowerCase() === "peter semrany";
                  return (
                    <tr key={r.id} className="border-t" style={{ borderColor: C.line, background: i === 0 ? "rgba(251,191,36,0.05)" : "transparent" }}>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          {i === 0 ? <Crown className="h-4 w-4" style={{ color: C.gold }} /> : <span style={{ color: "#111" }}>#{i + 1}</span>}
                          {i === 0 && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: C.gold, color: "#111" }}>Leader</span>}
                        </div>
                      </Td>
                      <Td><span className="font-semibold" style={{ color: "#111" }}>{r.name}</span></Td>
                      <Td><span style={{ color: "#111" }}>{r.calls}</span></Td>
                      <Td><span style={{ color: "#111" }}>{r.notReached}</span></Td>
                      <Td><span style={{ color: "#111" }}>{r.short}</span></Td>
                      <Td><span style={{ color: "#111" }}>{r.convos}</span></Td>
                      <Td><span style={{ color: holdColor }}>{r.holdRate}%</span></Td>
                      <Td><span style={{ color: convColor }}>{r.conversion}%</span></Td>
                      <Td><span className="font-bold" style={{ color: r.bookings > 0 ? C.green : "#111" }}>{r.bookings}</span></Td>
                      <Td><span style={{ color: "#111" }}>{isPeter ? "—" : `${(r.workMinutes / 60).toFixed(1)}h`}</span></Td>
                      <Td><span style={{ color: isPeter ? "#111" : breakColor }}>{isPeter ? "—" : (avgBreakMin > 0 ? `${avgBreakMin.toFixed(1)}m` : "—")}</span></Td>
                      <Td><span style={{ color: r.bonus > 0 ? C.green : "#111" }}>${r.bonus}</span></Td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-6 text-xs" style={{ color: C.muted }}>No data for this range yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {patternOpen && (
          <div className="mt-6 rounded-lg p-5 relative" style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.06), transparent)", border: "1px solid #8b5cf6" }}>
            <button onClick={() => setPatternOpen(false)} className="absolute top-3 right-3" style={{ color: C.muted }}>
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" style={{ color: "#8b5cf6" }} />
              <div className="text-sm font-bold" style={{ color: "#111" }}>Call Pattern Analysis</div>
              {patternLoading && <span className="text-[10px]" style={{ color: "#888" }}>analysing…</span>}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: "#111", fontFamily: "inherit" }}>
              {patternLoading && !patternText && (
                <div style={{ color: "#888", fontSize: 13 }}>
                  Analysing call transcripts — this takes about 10 seconds...
                </div>
              )}
              {patternText && patternText.split(/\n(?=\*\*\d\.)/).map((section, i) => {
                const lines = section.trim().split("\n");
                const headingLine = lines[0].replace(/\*\*/g, "").trim();
                const body = lines.slice(1).join("\n").trim();
                const isMissed = headingLine.toUpperCase().includes("MISSED");
                return (
                  <div key={i} style={{
                    marginBottom: 24,
                    paddingBottom: 24,
                    borderBottom: i < 4 ? "0.5px solid #ebebeb" : "none",
                  }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: isMissed ? "#f4522d" : "#8b5cf6",
                      marginBottom: 8,
                    }}>
                      {headingLine}
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: "#111",
                      lineHeight: 1.9,
                      whiteSpace: "pre-wrap",
                    }}>
                      {body}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {coachOpen && (
          <div className="mt-6 rounded-lg p-5 relative" style={{ background: "linear-gradient(180deg, rgba(45,107,228,0.06), transparent)", border: `1px solid ${BLUE}` }}>
            <button onClick={() => setCoachOpen(false)} className="absolute top-3 right-3" style={{ color: C.muted }}>
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" style={{ color: BLUE }} />
              <div className="text-sm font-bold">AI Coach Analysis</div>
              {coachLoading && <span className="text-[10px]" style={{ color: C.muted }}>streaming…</span>}
            </div>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "inherit" }}>{coachText || (coachLoading ? "Thinking…" : "")}</pre>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold">Add Rep</div>
              <button onClick={() => setShowAdd(false)} style={{ color: C.muted }}><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs mb-3" style={{ color: C.muted }}>
              We'll send an email invite. They click the link, set their own password, then they're on the team.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={newRep.firstName} onChange={(e) => setNewRep({ ...newRep, firstName: e.target.value })} placeholder="First name"
                  className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${C.line}`, color: C.text }} />
                <input value={newRep.lastName} onChange={(e) => setNewRep({ ...newRep, lastName: e.target.value })} placeholder="Last name"
                  className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${C.line}`, color: C.text }} />
              </div>
              <input value={newRep.email} onChange={(e) => setNewRep({ ...newRep, email: e.target.value })} placeholder="Email" type="email"
                className="w-full px-3 py-2 rounded-md text-sm" style={{ background: "#f9f9f9", border: `1px solid ${C.line}`, color: C.text }} />
              <button onClick={() => void onAddRep()} disabled={inviting} className="w-full py-2 rounded-md text-xs font-bold disabled:opacity-60"
                style={{ background: BLUE, color: "#fff" }}>{inviting ? "Sending…" : "Send Invite"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, info }: { children: React.ReactNode; info?: string }) {
  const [show, setShow] = useState(false);
  return (
    <th className="text-left px-3 py-2.5 font-semibold relative">
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {children}
        {info && (
          <span
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            style={{ cursor: "help", fontSize: 10, color: "#aaa", userSelect: "none", position: "relative" }}
          >
            ⓘ
            {show && (
              <span style={{
                position: "absolute", top: "100%", left: 0, zIndex: 50,
                background: "#111", color: "#fff", fontSize: 11,
                padding: "5px 10px", borderRadius: 6, whiteSpace: "normal",
                fontWeight: 400, textTransform: "none", letterSpacing: 0,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)", width: 240, marginTop: 4,
              }}>
                {info}
              </span>
            )}
          </span>
        )}
      </div>
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) { return <td className="px-3 py-3">{children}</td>; }
