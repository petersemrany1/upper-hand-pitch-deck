import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [
      { title: "Dashboard" },
      { name: "description", content: "Your sales dashboard." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
      },
    ],
  }),
});

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthYearLabel(): string {
  return new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function targetKey(): string {
  const d = new Date();
  return `booking_target_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  callback_scheduled_at: string | null;
  phone: string | null;
};

type CallRow = {
  id: string;
  lead_id: string | null;
  duration: number | null;
  duration_seconds: number | null;
  called_at: string;
  outcome: string | null;
  phone: string | null;
};

type SmsRow = {
  id: string;
  body: string | null;
  from_number: string | null;
  created_at: string;
  direction: string;
};

type PipelineCounts = {
  new: number;
  callback: number;
  retry: number;
  had_convo: number;
  booked: number;
};

function DashboardHome() {
  const { ready: authReady, session, role } = useAuth();
  const isAdmin = role === "admin";
  // Boot Twilio device (kept from existing dashboard)
  useTwilioDevice(true);

  const [callsToday, setCallsToday] = useState(0);
  const [holdRate, setHoldRate] = useState(0);
  const [bookingsToday, setBookingsToday] = useState(0);
  const [bookingsMonth, setBookingsMonth] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [pipeline, setPipeline] = useState<PipelineCounts>({
    new: 0, callback: 0, retry: 0, had_convo: 0, booked: 0,
  });
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [overdueCallbacks, setOverdueCallbacks] = useState(0);
  const [missedCalls, setMissedCalls] = useState<CallRow[]>([]);
  const [unreadSms, setUnreadSms] = useState<SmsRow[]>([]);
  const [missedOpen, setMissedOpen] = useState(false);

  const [target, setTarget] = useState<number>(0);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  // Load target from localStorage on mount. Only admins are prompted to set it;
  // reps just consume the value the admin saved.
  useEffect(() => {
    const stored = localStorage.getItem(targetKey());
    if (stored && Number(stored) > 0) {
      setTarget(Number(stored));
    } else if (isAdmin) {
      setShowTargetModal(true);
    }
  }, [isAdmin]);

  const loadData = useCallback(async () => {
    const todayIso = startOfToday().toISOString();
    const monthIso = startOfMonth().toISOString();
    const nowIso = new Date().toISOString();

    const [callsRes, bookingsTodayRes, bookingsMonthRes, pipelineRes, newLeadsRes, overdueRes, missedRes, smsRes, clinicsRes, settingsRes] =
      await Promise.all([
        supabase
          .from("call_records")
          .select("id, lead_id, duration, duration_seconds, called_at, outcome, phone")
          .gte("called_at", todayIso),
        supabase
          .from("meta_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "booked_deposit_paid")
          .gte("updated_at", todayIso),
        supabase
          .from("meta_leads")
          .select("id, clinic_id")
          .eq("status", "booked_deposit_paid")
          .gte("updated_at", monthIso),
        supabase.from("meta_leads").select("status"),
        supabase
          .from("meta_leads")
          .select("id, first_name, last_name, status, created_at, updated_at, callback_scheduled_at, phone")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("meta_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "callback_scheduled")
          .lt("callback_scheduled_at", nowIso),
        supabase
          .from("call_records")
          .select("id, lead_id, duration, duration_seconds, called_at, outcome, phone")
          .gte("called_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .or("outcome.ilike.%missed%,outcome.ilike.%no_answer%,outcome.ilike.%no answer%")
          .order("called_at", { ascending: false })
          .limit(20),
        supabase
          .from("sms_messages")
          .select("id, body, from_number, created_at, direction")
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("partner_clinics").select("id, price_per_booking"),
        supabase.from("app_settings").select("value").eq("key", "default_booking_price").maybeSingle(),
      ]);

    const calls = (callsRes.data ?? []) as CallRow[];
    const uniqueLeads = new Set(calls.map((c) => c.lead_id).filter(Boolean));
    const heldCount = calls.filter((c) => {
      const d = c.duration_seconds ?? c.duration ?? 0;
      return d > 120;
    }).length;
    const totalUnique = uniqueLeads.size;
    setCallsToday(totalUnique);
    setHoldRate(totalUnique > 0 ? Math.round((heldCount / totalUnique) * 100) : 0);

    setBookingsToday(bookingsTodayRes.count ?? 0);

    const monthBookings = (bookingsMonthRes.data ?? []) as { id: string; clinic_id: string | null }[];
    setBookingsMonth(monthBookings.length);

    const defaultPrice = Number((settingsRes.data?.value as unknown) ?? 800) || 800;
    const priceMap = new Map<string, number>();
    for (const c of (clinicsRes.data ?? []) as { id: string; price_per_booking: number | null }[]) {
      priceMap.set(c.id, Number(c.price_per_booking) || defaultPrice);
    }
    const revenue = monthBookings.reduce(
      (sum, b) => sum + (b.clinic_id ? (priceMap.get(b.clinic_id) ?? defaultPrice) : defaultPrice),
      0
    );
    setRevenueMonth(revenue);

    const counts: PipelineCounts = { new: 0, callback: 0, retry: 0, had_convo: 0, booked: 0 };
    for (const row of (pipelineRes.data ?? []) as { status: string | null }[]) {
      const s = row.status ?? "";
      if (s === "new") counts.new++;
      else if (s === "callback_scheduled") counts.callback++;
      else if (s === "had_convo_chase_up" || s === "no_answer") {
        if (s === "no_answer") counts.retry++;
        else counts.had_convo++;
      } else if (s === "booked_deposit_paid") counts.booked++;
    }
    setPipeline(counts);

    setNewLeads((newLeadsRes.data ?? []) as Lead[]);
    setOverdueCallbacks(overdueRes.count ?? 0);
    setMissedCalls((missedRes.data ?? []) as CallRow[]);
    setUnreadSms((smsRes.data ?? []) as SmsRow[]);
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    void loadData();
  }, [authReady, session, loadData]);

  const firstName = useMemo(() => {
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = (meta?.first_name as string | undefined) || (meta?.full_name as string | undefined);
    if (fromMeta) return String(fromMeta).split(" ")[0];
    const email = session?.user?.email ?? "";
    return email.split("@")[0].split(/[._]/)[0].replace(/^\w/, (c) => c.toUpperCase()) || "there";
  }, [session]);

  const bonus = bookingsToday * 50;
  const targetPct = target > 0 ? Math.min(100, Math.round((bookingsMonth / target) * 100)) : 0;

  const confirmTarget = () => {
    const n = Number(targetInput);
    if (!n || n <= 0) return;
    localStorage.setItem(targetKey(), String(n));
    setTarget(n);
    setShowTargetModal(false);
    setTargetInput("");
  };

  const missedItems = useMemo(() => {
    const items: Array<{ id: string; name: string; type: "call" | "sms"; time: string }> = [];
    for (const c of missedCalls) {
      items.push({ id: `c-${c.id}`, name: c.phone || "Unknown", type: "call", time: c.called_at });
    }
    for (const s of unreadSms) {
      items.push({ id: `s-${s.id}`, name: s.from_number || "Unknown", type: "sms", time: s.created_at });
    }
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [missedCalls, unreadSms]);

  const missedCount = missedItems.length;

  return (
    <div style={{ background: "#f7f7f5", minHeight: "100%", fontFamily: FONT, padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, color: "#111", letterSpacing: "-0.02em" }}>
              {getGreeting()}, {firstName}
            </div>
            <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{formatDate()}</div>
          </div>
          {overdueCallbacks > 0 && (
            <div
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCallbacks} callback{overdueCallbacks === 1 ? "" : "s"} overdue
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <StatCard
            label="Bookings Today"
            value={bookingsToday}
            valueColor="#f4522d"
            sub={bonus > 0 ? `$${bonus} bonus earned` : "$0 bonus earned"}
            borderLeft="3px solid #f4522d"
          />
          <StatCard
            label="Calls Today"
            value={callsToday}
            valueColor="#111"
            sub={`${callsToday} unique lead${callsToday === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Hold Rate"
            value={`${holdRate}%`}
            valueColor="#16a34a"
            sub="past 2 minutes"
          />
        </div>

        {/* Pipeline */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>Pipeline</div>
            <Link to="/sales-call" style={{ fontSize: 13, color: "#f4522d", fontWeight: 500 }}>
              Open call sheet →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderTop: "0.5px solid #f0f0ee" }}>
            <PipelineCol label="New" value={pipeline.new} color="#3b82f6" />
            <PipelineCol label="Callback" value={pipeline.callback} color="#f4522d" />
            <PipelineCol label="Retry" value={pipeline.retry} color="#f59e0b" />
            <PipelineCol label="Had Convo" value={pipeline.had_convo} color="#8b5cf6" />
            <PipelineCol label="Booked" value={pipeline.booked} color="#16a34a" />
          </div>
        </Card>

        {/* Two column row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "0.5px solid #f0f0ee" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>New leads today</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>{newLeads.length} from Meta</div>
            </div>
            <div>
              {newLeads.length === 0 ? (
                <div style={{ padding: 20, fontSize: 13, color: "#999" }}>No new leads yet.</div>
              ) : (
                newLeads.map((l) => {
                  const name = `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Unknown";
                  const badge = statusBadge(l.status);
                  return (
                    <Link
                      key={l.id}
                      to="/sales-call"
                      search={{ leadId: l.id } as never}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 20px",
                        borderBottom: "0.5px solid #f6f6f4",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#fff1ee",
                          color: "#f4522d",
                          fontSize: 12,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {initials(name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#111", fontWeight: 500 }}>{name}</div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.fg,
                        }}
                      >
                        {badge.label}
                      </span>
                      <div style={{ fontSize: 11, color: "#ccc", minWidth: 60, textAlign: "right" }}>
                        {relativeTime(l.created_at)}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
                Bookings — {monthYearLabel()}
              </div>
              <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: "#111", marginTop: 8, lineHeight: 1 }}>
                {bookingsMonth}
              </div>
              <div style={{ fontSize: 14, color: "#111", fontWeight: 600, marginTop: 6 }}>
                ${revenueMonth.toLocaleString()} revenue
              </div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                Target: {target || 0} / month
              </div>
              {target > 0 ? (
                <>
                  <div
                    style={{
                      marginTop: 16,
                      background: "#f0f0ee",
                      height: 5,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${targetPct}%`,
                        background: "#f4522d",
                        height: "100%",
                        borderRadius: 4,
                        transition: "width 300ms",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "#f4522d", fontWeight: 500, marginTop: 8 }}>
                    {targetPct}% of target
                  </div>
                </>
              ) : isAdmin ? (
                <button
                  onClick={() => setShowTargetModal(true)}
                  style={{ marginTop: 16, fontSize: 13, color: "#f4522d", fontWeight: 500, background: "none", border: 0, cursor: "pointer", padding: 0 }}
                >
                  Set target →
                </button>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Missed / SMS panel */}
        <Card>
          <button
            onClick={() => setMissedOpen((o) => !o)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              background: "none",
              border: 0,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f4522d" }} />
              <span style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                Missed calls & unread SMS
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#f4522d", fontWeight: 600 }}>{missedCount}</span>
              <ChevronDown
                className="h-4 w-4"
                style={{
                  color: "#aaa",
                  transform: missedOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 200ms",
                }}
              />
            </div>
          </button>
          {missedOpen && (
            <div style={{ borderTop: "0.5px solid #f0f0ee" }}>
              {missedItems.length === 0 ? (
                <div style={{ padding: 20, fontSize: 13, color: "#999" }}>Nothing missed. Nice work.</div>
              ) : (
                missedItems.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      borderBottom: "0.5px solid #f6f6f4",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#fff1ee",
                        color: "#f4522d",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {initials(it.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#111", fontWeight: 500 }}>{it.name}</div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: it.type === "call" ? "#fef2f2" : "#eff6ff",
                        color: it.type === "call" ? "#b91c1c" : "#1d4ed8",
                      }}
                    >
                      {it.type === "call" ? "Missed call" : "SMS reply"}
                    </span>
                    <div style={{ fontSize: 11, color: "#ccc", minWidth: 60, textAlign: "right" }}>
                      {relativeTime(it.time)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Target modal */}
      {showTargetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            fontFamily: FONT,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 600, color: "#111", letterSpacing: "-0.01em" }}>
              What's your booking target for {monthYearLabel()}?
            </div>
            <div style={{ fontSize: 13, color: "#999", marginTop: 8 }}>
              You can update this anytime in settings.
            </div>
            <input
              type="number"
              min={1}
              autoFocus
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmTarget();
              }}
              placeholder="e.g. 30"
              style={{
                marginTop: 20,
                width: "100%",
                padding: "12px 14px",
                fontSize: 16,
                border: "0.5px solid #e8e8e6",
                borderRadius: 8,
                outline: "none",
                fontFamily: FONT,
              }}
            />
            <button
              onClick={confirmTarget}
              disabled={!Number(targetInput) || Number(targetInput) <= 0}
              style={{
                marginTop: 16,
                width: "100%",
                background: "#f4522d",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "12px",
                fontSize: 14,
                fontWeight: 600,
                cursor: Number(targetInput) > 0 ? "pointer" : "not-allowed",
                opacity: Number(targetInput) > 0 ? 1 : 0.5,
                fontFamily: FONT,
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e8e8e6",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor,
  sub,
  borderLeft,
}: {
  label: string;
  value: number | string;
  valueColor: string;
  sub: string;
  borderLeft?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e8e8e6",
        borderLeft: borderLeft ?? "0.5px solid #e8e8e6",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 40,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: valueColor,
          marginTop: 8,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>{sub}</div>
    </div>
  );
}

function PipelineCol({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: "20px 16px",
        textAlign: "center",
        borderRight: "0.5px solid #f0f0ee",
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 600, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div
        style={{
          fontSize: 10,
          color: "#999",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 600,
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function statusBadge(status: string | null): { label: string; bg: string; fg: string } {
  switch (status) {
    case "booked_deposit_paid":
      return { label: "Booked", bg: "#dcfce7", fg: "#15803d" };
    case "callback_scheduled":
      return { label: "Callback", bg: "#fef3c7", fg: "#a16207" };
    case "had_convo_chase_up":
      return { label: "Chase", bg: "#f3e8ff", fg: "#7e22ce" };
    case "no_answer":
      return { label: "Retry", bg: "#fef3c7", fg: "#a16207" };
    case "new":
    default:
      return { label: "New", bg: "#dbeafe", fg: "#1d4ed8" };
  }
}
