import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trophy, Crown, Plus, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { inviteRep, getLeaderboard, ensureRepForEmail } from "@/utils/sales-call.functions";
import { analyseCallPatterns } from "@/utils/resend.functions";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/leaderboard")({
  component: LeaderboardPage,
});

type Range = "today" | "yesterday" | "week" | "lastweek" | "30d";
type Row = Awaited<ReturnType<typeof getLeaderboard>>["rows"][number];

/** Traffic-light colour for a rate metric, as a token expression. */
function rateTone(value: number, good: number, ok: number): string {
  if (value === 0) return "var(--text-primary)";
  if (value >= good) return "var(--pop-green)";
  if (value >= ok) return "var(--pop-amber)";
  return "var(--destructive)";
}

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
  useEffect(() => { void load();   }, [range]);

  // Realtime refresh on bookings/calls
  useRealtimeSubscription({ table: "call_records" }, () => void load());
  useRealtimeSubscription({ table: "meta_leads" }, () => void load());
  useRealtimeSubscription({ table: "appointment_reminders" }, () => void load());
  useRealtimeSubscription({ table: "clinic_appointments" }, () => void load());

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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/coach-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
  void analyseLast; // kept for parity with previous build (coach entry point)

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
    <div className="h-full overflow-y-auto bg-surface-page text-foreground">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-pop-amber" />
            <h1 className="type-h1">Leaderboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => void analysePatterns()} disabled={patternLoading}
              className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 disabled:opacity-60 bg-pop-purple-fill text-pop-purple border border-pop-purple">
              <Sparkles className="h-3.5 w-3.5" /> Call Patterns
            </button>
            <button onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 bg-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Add Rep
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 flex-wrap">
          {ranges.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-colors ${
                range === r.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-line hover:text-foreground"
              }`}>{r.label}</button>
          ))}
        </div>

        <div className="mt-4 rounded-lg overflow-hidden bg-surface-card border border-line">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface-card">
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
                  const holdColor = rateTone(r.holdRate, 60, 40);
                  const convColor = rateTone(r.conversion, 70, 50);
                  const avgBreakMin = r.breakGaps > 0 ? r.breakMinutes / r.breakGaps : 0;
                  const breakColor =
                    avgBreakMin === 0 ? "var(--text-primary)"
                    : avgBreakMin <= 1 ? "var(--pop-green)"
                    : avgBreakMin <= 3 ? "var(--pop-amber)"
                    : "var(--destructive)";
                  // Peter Semrany develops the app, so his Work/Break aren't real shift data — hide them.
                  const isPeter = (r.name ?? "").trim().toLowerCase() === "peter semrany";
                  return (
                    <tr key={r.id} className={`border-t border-line ${i === 0 ? "bg-pop-amber-fill/50" : ""}`}>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          {i === 0 ? <Crown className="h-4 w-4 text-pop-amber" /> : <span className="text-foreground">#{i + 1}</span>}
                          {i === 0 && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-pop-amber text-foreground">Leader</span>}
                        </div>
                      </Td>
                      <Td><span className="font-semibold text-foreground">{r.name}</span></Td>
                      <Td><span className="text-foreground tabular-nums">{r.calls}</span></Td>
                      <Td><span className="text-foreground tabular-nums">{r.notReached}</span></Td>
                      <Td><span className="text-foreground tabular-nums">{r.short}</span></Td>
                      <Td><span className="text-foreground tabular-nums">{r.convos}</span></Td>
                      <Td><span className="tabular-nums" style={{ color: holdColor }}>{r.holdRate}%</span></Td>
                      <Td><span className="tabular-nums" style={{ color: convColor }}>{r.conversion}%</span></Td>
                      <Td><span className={`font-bold tabular-nums ${r.bookings > 0 ? "text-pop-green" : "text-foreground"}`}>{r.bookings}</span></Td>
                      <Td><span className="text-foreground tabular-nums">{isPeter ? "—" : `${(r.workMinutes / 60).toFixed(1)}h`}</span></Td>
                      <Td><span className="tabular-nums" style={{ color: isPeter ? "var(--text-primary)" : breakColor }}>{isPeter ? "—" : (avgBreakMin > 0 ? `${avgBreakMin.toFixed(1)}m` : "—")}</span></Td>
                      <Td><span className={`tabular-nums ${r.bonus > 0 ? "text-pop-green" : "text-foreground"}`}>${r.bonus}</span></Td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-6 text-xs text-muted-foreground">No data for this range yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {patternOpen && (
          <div className="anim-rise-in mt-6 rounded-lg p-5 relative border border-pop-purple bg-gradient-to-b from-pop-purple-fill to-transparent">
            <button onClick={() => setPatternOpen(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-pop-purple" />
              <div className="text-sm font-bold text-foreground">Call Pattern Analysis</div>
              {patternLoading && <span className="text-[10px] text-muted-foreground">analysing…</span>}
            </div>
            <div className="text-sm leading-relaxed text-foreground">
              {patternLoading && !patternText && (
                <div className="type-small">
                  Analysing call transcripts — this takes about 10 seconds...
                </div>
              )}
              {patternText && patternText.split(/\n(?=\*\*\d\.)/).map((section, i) => {
                const lines = section.trim().split("\n");
                const headingLine = lines[0].replace(/\*\*/g, "").trim();
                const body = lines.slice(1).join("\n").trim();
                const isMissed = headingLine.toUpperCase().includes("MISSED");
                return (
                  <div key={i} className={`mb-6 pb-6 ${i < 4 ? "border-b border-line" : ""}`}>
                    <div className={`type-label mb-2 ${isMissed ? "text-primary" : "text-pop-purple"}`}>
                      {headingLine}
                    </div>
                    <div className="text-sm text-foreground leading-[1.9] whitespace-pre-wrap">
                      {body}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {coachOpen && (
          <div className="anim-rise-in mt-6 rounded-lg p-5 relative border border-primary bg-gradient-to-b from-pop-coral-fill to-transparent">
            <button onClick={() => setCoachOpen(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-sm font-bold">AI Coach Analysis</div>
              {coachLoading && <span className="text-[10px] text-muted-foreground">streaming…</span>}
            </div>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed font-[inherit]">{coachText || (coachLoading ? "Thinking…" : "")}</pre>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="anim-rise-in w-full max-w-sm rounded-lg p-5 bg-surface-card border border-line">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold">Add Rep</div>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs mb-3 text-muted-foreground">
              We'll send an email invite. They click the link, set their own password, then they're on the team.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={newRep.firstName} onChange={(e) => setNewRep({ ...newRep, firstName: e.target.value })} placeholder="First name"
                  className="w-full px-3 py-2 rounded-md text-sm bg-surface-soft border border-line text-foreground" />
                <input value={newRep.lastName} onChange={(e) => setNewRep({ ...newRep, lastName: e.target.value })} placeholder="Last name"
                  className="w-full px-3 py-2 rounded-md text-sm bg-surface-soft border border-line text-foreground" />
              </div>
              <input value={newRep.email} onChange={(e) => setNewRep({ ...newRep, email: e.target.value })} placeholder="Email" type="email"
                className="w-full px-3 py-2 rounded-md text-sm bg-surface-soft border border-line text-foreground" />
              <button onClick={() => void onAddRep()} disabled={inviting} className="w-full py-2 rounded-md text-xs font-bold disabled:opacity-60 bg-primary text-primary-foreground">
                {inviting ? "Sending…" : "Send Invite"}
              </button>
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
      <div className="flex items-center gap-1">
        {children}
        {info && (
          <span
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            className="relative cursor-help select-none text-[10px] text-muted-foreground"
          >
            ⓘ
            {show && (
              <span className="absolute top-full left-0 z-50 mt-1 w-60 whitespace-normal rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-background">
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
