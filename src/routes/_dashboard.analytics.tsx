import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Phone, MessageSquare, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RepPerformancePanel, type OverallReport } from "@/components/RepPerformancePanel";

export const Route = createFileRoute("/_dashboard/analytics")({
  component: AnalyticsPage,
});

type Range = "today" | "week" | "month" | "all";

type CallAnalysis = {
  no_sale_reasons?: string[];
  pain_points?: string[];
  dream_outcomes?: string[];
  recurring_phrases?: string[];
  engagement_hooks?: string[];
  call_outcome?: string | null;
};

type Row = {
  id: string;
  called_at: string;
  duration: number | null;
  call_analysis: CallAnalysis | null;
};

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "30 Days" },
  { key: "all", label: "All Time" },
];

function rangeStart(r: Range): Date | null {
  const now = new Date();
  if (r === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (r === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (r === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("month");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // Rep performance analyser state
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [perfFrom, setPerfFrom] = useState<string>("");
  const [perfTo, setPerfTo] = useState<string>("");
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState<string | null>(null);
  const [perfReport, setPerfReport] = useState<OverallReport | null>(null);
  const [perfLoadingCount, setPerfLoadingCount] = useState(0);

  useEffect(() => {
    (async () => {
      // Pull distinct rep_ids present in call_records, then join to sales_reps for names
      const { data: callReps } = await supabase
        .from("call_records")
        .select("rep_id")
        .not("rep_id", "is", null)
        .limit(5000);
      const ids = Array.from(new Set((callReps ?? []).map((r: any) => r.rep_id).filter(Boolean)));
      if (ids.length === 0) {
        setReps([]);
        return;
      }
      const { data: repRows } = await supabase
        .from("sales_reps")
        .select("id, name")
        .in("id", ids);
      const list = (repRows ?? []).map((r: any) => ({ id: r.id, name: r.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setReps(list);
    })();
  }, []);

  const runRepAnalysis = async () => {
    if (!selectedRepId) return;
    setPerfOpen(true);
    setPerfLoading(true);
    setPerfError(null);
    setPerfReport(null);

    // Count eligible calls up-front so we can show "Reviewing X calls…"
    try {
      let cq = supabase
        .from("call_records")
        .select("id", { count: "exact", head: true })
        .eq("rep_id", selectedRepId)
        .gt("duration_seconds", 60)
        .not("call_analysis->>transcript", "is", null);
      if (perfFrom) cq = cq.gte("called_at", new Date(perfFrom).toISOString());
      if (perfTo) {
        const end = new Date(perfTo);
        end.setHours(23, 59, 59, 999);
        cq = cq.lte("called_at", end.toISOString());
      }
      const { count } = await cq;
      setPerfLoadingCount(count ?? 0);
    } catch {
      setPerfLoadingCount(0);
    }

    try {
      const { data, error } = await supabase.functions.invoke("analyse-rep-performance", {
        body: { repId: selectedRepId, dateFrom: perfFrom || null, dateTo: perfTo || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPerfReport(data.overall as OverallReport);
    } catch (err) {
      setPerfError((err as Error).message || "Analysis failed");
    } finally {
      setPerfLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("call_records")
        .select("id, called_at, duration, call_analysis")
        .not("lead_id", "is", null)
        .is("clinic_id", null);

      const start = rangeStart(range);
      if (start) q = q.gte("called_at", start.toISOString());

      const { data, error } = await q.order("called_at", { ascending: false }).limit(5000);
      if (cancelled) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const stats = useMemo(() => {
    const total = rows.length;
    const conversations = rows.filter((r) => (r.duration ?? 0) > 120).length;
    const bookings = rows.filter((r) => r.call_analysis?.call_outcome === "Booked").length;
    const analysed = rows.filter((r) => !!r.call_analysis).length;
    const conv = conversations > 0 ? Math.round((bookings / conversations) * 100) : 0;
    return { total, conversations, bookings, analysed, conv };
  }, [rows]);

  const NO_SALE_BLOCKLIST = [
    "no answer",
    "voicemail",
    "not available",
    "not reached",
    "not reachable",
    "unanswered",
    "missed",
    "call back",
    "called back",
    "calling back",
    "couldn't talk",
    "couldnt talk",
    "can't talk",
    "cant talk",
    "busy",
    "driving",
    "at work",
    "in a meeting",
    "bad time",
    "wrong time",
    "another time",
    "not a good time",
    "asked to call",
    "didn't pick up",
    "didnt pick up",
    "hung up",
    "no response",
    "unreachable",
  ];

  const PHRASES_BLOCKLIST = [
    "yeah",
    "sort of",
    "kind of",
    "you know",
    "deposit payment",
    "address",
    "location",
    "bank",
    "stripe",
    "payment link",
  ];

  const TIME_TOKENS = /\b(am|pm|a\.m\.|p\.m\.|o'clock|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|yesterday|morning|afternoon|evening|tonight|next|last|this)\b/g;

  const TRAILING_FRAGMENT_WORDS = new Set([
    "the","a","an","and","or","but","to","of","with","for","in","on","at","by","from","as","is","be","been","being","that","this","than","then","so","if","when","while","about","into","over","up","down","out","off","because","my","your","their","our","his","her","its",
  ]);

  const FILLER_WORDS = new Set([
    "really","very","just","actually","quite","pretty","somewhat","maybe","perhaps","probably","basically","literally","honestly","obviously","definitely","totally","completely","extremely","like","also","too","still","even","ever","always","often","sometimes","much","many","lot","lots","bit","little","whole","entire","general","generally","mostly","particular","particularly","specifically","overall","essentially",
  ]);

  const LEADING_FILLER = new Set([
    "they","he","she","it","we","i","patient","client","customer","caller","person","the","a","an","this","that","there","here","well","so","ok","okay","um","uh","also","and","but","because","since","as","when","while","really","just","very",
  ]);

  const trimTrailingFragments = (v: string): string => {
    const parts = v.split(" ").filter(Boolean);
    while (parts.length > 0 && TRAILING_FRAGMENT_WORDS.has(parts[parts.length - 1])) {
      parts.pop();
    }
    return parts.join(" ");
  };

  // Summarise to a one-line label: keep meaning, drop filler, end on a real word.
  const summariseItem = (s: string, maxWords = 7): string => {
    let v = s.toLowerCase().trim();
    v = v.replace(/b\s*[\/&]\s*a\b/g, "before and after");
    v = v.replace(/before\s*[\/&]\s*after/g, "before and after");
    v = v.replace(/\bbefores?\s+and\s+afters?\b/g, "before and after");
    v = v.replace(/\bafter\s+pic(?:ture|s)?s?\b/g, "after photos");
    v = v.replace(/\bafter\s+images?\b/g, "after photos");
    v = v.replace(/\bphotos?\b/g, "photos");
    v = v.replace(/\bpic(?:ture)?s?\b/g, "photos");
    v = v.replace(/\bimages?\b/g, "photos");
    v = v.replace(/\([^)]*\)/g, " ");
    v = v.replace(/\$[\d,.]+(?:k|m)?/g, " ");
    v = v.replace(/[\d]+[\d,.\-:]*/g, " ");
    v = v.replace(TIME_TOKENS, " ");
    v = v.replace(/[^\w\s'-]/g, " ");
    v = v.replace(/\s+/g, " ").trim();

    let parts = v.split(" ").filter(Boolean);
    while (parts.length > 0 && LEADING_FILLER.has(parts[0])) parts.shift();
    parts = parts.filter((w) => !FILLER_WORDS.has(w));

    if (parts.length <= maxWords) {
      return trimTrailingFragments(parts.join(" "));
    }
    let kept = parts.slice(0, maxWords);
    // If trimming would leave a connector at the end, extend by one meaningful word.
    while (
      kept.length < parts.length &&
      kept.length < maxWords + 2 &&
      TRAILING_FRAGMENT_WORDS.has(kept[kept.length - 1])
    ) {
      kept.push(parts[kept.length]);
    }
    return trimTrailingFragments(kept.join(" "));
  };

  const cleanItem = (s: string): string => summariseItem(s, 6);
  const cleanItemDream = (s: string): string => summariseItem(s, 7);

  const aggregate = (
    field: keyof CallAnalysis,
    opts?: { blocklist?: string[]; minCount?: number; groupByFirstWords?: number; cleaner?: (s: string) => string },
  ): { label: string; count: number }[] => {
    const cleaner = opts?.cleaner ?? cleanItem;
    const items: string[] = [];
    rows.forEach((r) => {
      const arr = r.call_analysis?.[field];
      if (!Array.isArray(arr)) return;
      arr.forEach((v) => {
        if (typeof v !== "string") return;
        const original = v.toLowerCase();
        const normalized = cleaner(v);
        if (!normalized) return;
        if (normalized.split(" ").length < 2) return;
        if (opts?.blocklist && opts.blocklist.some((b) => normalized.includes(b) || original.includes(b))) return;
        items.push(normalized);
      });
    });

    const score = (s: string) => {
      const w = s.split(" ").length;
      if (w >= 3 && w <= 6) return w;
      return 100 + Math.abs(w - 5);
    };
    const groups = new Map<string, { count: number; best: string }>();
    items.forEach((it) => {
      const key = opts?.groupByFirstWords
        ? it.split(" ").slice(0, opts.groupByFirstWords).join(" ")
        : it;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, { count: 1, best: it });
      } else {
        existing.count += 1;
        if (score(it) < score(existing.best)) existing.best = it;
      }
    });

    const min = opts?.minCount ?? 1;
    return Array.from(groups.values())
      .filter((g) => g.count >= min)
      .map((g) => ({ label: g.best, count: g.count }))
      .sort((a, b) => b.count - a.count);
  };

  const noReasons = useMemo(() => aggregate("no_sale_reasons", { blocklist: NO_SALE_BLOCKLIST, groupByFirstWords: 2 }), [rows]);
  const pains = useMemo(() => aggregate("pain_points", { groupByFirstWords: 2 }), [rows]);
  const dreams = useMemo(() => aggregate("dream_outcomes", { cleaner: cleanItemDream, groupByFirstWords: 2 }), [rows]);
  const hooks = useMemo(() => aggregate("engagement_hooks", { minCount: 2, groupByFirstWords: 2 }), [rows]);
  const phrases = useMemo(() => aggregate("recurring_phrases", { blocklist: PHRASES_BLOCKLIST }), [rows]);

  const hourBuckets = (filter: (r: Row) => boolean) => {
    const buckets = new Array(24).fill(0) as number[];
    rows.filter(filter).forEach((r) => {
      const d = new Date(r.called_at);
      buckets[d.getHours()] += 1;
    });
    return buckets.map((count, hour) => ({ label: formatHour(hour), count }));
  };

  const pickupHours = useMemo(() => hourBuckets((r) => (r.duration ?? 0) > 0), [rows]);
  const bookingHours = useMemo(
    () => hourBuckets((r) => r.call_analysis?.call_outcome === "Booked"),
    [rows],
  );

  return (
    <div className="min-h-full md:h-full md:overflow-y-auto bg-[#f7f7f5] px-6 py-10 md:px-10 md:py-12" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Patient Call Intelligence
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                What patients are actually saying on the phone.
              </p>
            </div>
          </div>

          <div className="inline-flex bg-white rounded-lg border border-border p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className="px-3 py-1.5 text-xs font-bold rounded-md transition-colors"
                style={{
                  background: range === r.key ? "#f4522d" : "transparent",
                  color: range === r.key ? "#fff" : "var(--muted-foreground)",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rep performance analyser row */}
        <div className="bg-white rounded-xl border border-border p-3 mb-6 flex flex-col md:flex-row md:items-center gap-2">
          <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground md:mr-2 shrink-0">
            Coach a Rep
          </div>
          <select
            value={selectedRepId}
            onChange={(e) => setSelectedRepId(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-[#f4522d]/30 min-w-[160px]"
          >
            <option value="">All Reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={perfFrom}
            onChange={(e) => setPerfFrom(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-[#f4522d]/30"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={perfTo}
            onChange={(e) => setPerfTo(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-[#f4522d]/30"
            aria-label="To date"
          />
          <button
            onClick={runRepAnalysis}
            disabled={!selectedRepId || perfLoading}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#f4522d", color: "#fff" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyse Rep Performance
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatCard icon={<Phone className="w-4 h-4" />} label="Total Calls" value={stats.total} />
          <StatCard icon={<MessageSquare className="w-4 h-4" />} label="Conversations" value={stats.conversations} hint=">2 min" />
          <StatCard icon={<Calendar className="w-4 h-4" />} label="Bookings" value={stats.bookings} />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Conv. rate" value={`${stats.conv}%`} hint="of answered calls" />
          <StatCard icon={<Sparkles className="w-4 h-4" />} label="Analysed" value={stats.analysed} />
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <BarSection title="Why people are saying no" data={noReasons} accent="#ef4444" />
            <BarSection title="Main pain points" data={pains} accent="#f59e0b" />
            <BarSection title="Dream outcomes" data={dreams} accent="#10b981" />
            <BarSection title="What's keeping people on the phone" data={hooks} accent="#3b82f6" />
            <PhrasesSection title="What you're hearing the most" data={phrases} />
            <HourSection title="Best pickup times" data={pickupHours} accent="#8b5cf6" />
            <HourSection title="Best booking times" data={bookingHours} accent="#f4522d" />
          </div>
        )}
      </div>

      <RepPerformancePanel
        open={perfOpen}
        loading={perfLoading}
        loadingCount={perfLoadingCount}
        error={perfError}
        repName={reps.find((r) => r.id === selectedRepId)?.name ?? ""}
        dateFrom={perfFrom}
        dateTo={perfTo}
        overall={perfReport}
        onClose={() => setPerfOpen(false)}
      />
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-foreground">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-border p-5">
      <h2 className="text-sm font-bold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
      No data in this range yet.
    </div>
  );
}

function BarSection({ title, data, accent }: { title: string; data: { label: string; count: number }[]; accent: string }) {
  const top = data.slice(0, 8);
  const max = top[0]?.count ?? 1;
  return (
    <SectionShell title={title}>
      {top.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2.5">
          {top.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground truncate pr-2">{d.label}</span>
                <span className="text-muted-foreground font-medium">{d.count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(d.count / max) * 100}%`, background: accent }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function PhrasesSection({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const top = data.slice(0, 24);
  const max = top[0]?.count ?? 1;
  const palette = ["#fef3c7", "#fde68a", "#fed7aa", "#fecaca", "#ddd6fe", "#bae6fd", "#bbf7d0"];
  return (
    <SectionShell title={title}>
      {top.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-wrap gap-2">
          {top.map((d, i) => {
            const scale = 0.85 + (d.count / max) * 0.6;
            return (
              <span
                key={d.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-foreground"
                style={{
                  background: palette[i % palette.length],
                  fontSize: `${scale * 12}px`,
                  fontWeight: 600,
                }}
              >
                {d.label}
                <span className="text-muted-foreground font-normal">×{d.count}</span>
              </span>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function HourSection({ title, data, accent }: { title: string; data: { label: string; count: number }[]; accent: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const hasData = data.some((d) => d.count > 0);
  return (
    <SectionShell title={title}>
      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="flex items-end gap-1" style={{ height: 140 }}>
          {data.map((d) => {
            const pct = (d.count / max) * 100;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: d.count > 0 ? `${Math.max(pct, 4)}%` : 0,
                      background: accent,
                    }}
                    title={`${d.label}: ${d.count}`}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
