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

// All "today" / "this month" math is anchored to Australia/Sydney (project hard rule).
function sydneyParts(now: Date = new Date()): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-").map((n) => parseInt(n, 10));
  return { year: y, month: m, day: d };
}

// Returns the UTC instant equivalent to local midnight in Sydney on the given Y/M/D.
function sydneyMidnightUTC(year: number, month: number, day: number): Date {
  // Guess UTC midnight, then adjust by Sydney offset at that moment.
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const sydStr = guess.toLocaleString("en-US", { timeZone: "Australia/Sydney" });
  const sydAsLocal = new Date(sydStr);
  const offsetMs = sydAsLocal.getTime() - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

function startOfToday(): Date {
  const { year, month, day } = sydneyParts();
  return sydneyMidnightUTC(year, month, day);
}

function startOfMonth(): Date {
  const { year, month } = sydneyParts();
  return sydneyMidnightUTC(year, month, 1);
}

function monthYearLabel(): string {
  return new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "Australia/Sydney" });
}

function currentYearMonth(): { year: number; month: number } {
  const { year, month } = sydneyParts();
  return { year, month };
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


type ClinicInfo = { id: string; clinic_name: string | null; city: string | null };

function DashboardHome() {
  const { ready: authReady, session, role } = useAuth();
  const isAdmin = role === "admin";
  useTwilioDevice(true);



  const [bookingsToday, setBookingsToday] = useState(0);
  const [bookingsMonth, setBookingsMonth] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [clinicMap, setClinicMap] = useState<Map<string, ClinicInfo>>(new Map());
  const [leadClinicMap, setLeadClinicMap] = useState<Map<string, string | null>>(new Map());

  const [target, setTarget] = useState<number>(0);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [repsList, setRepsList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [repName, setRepName] = useState<string>("");

  const [packBreakdown, setPackBreakdown] = useState<Array<{ clinicName: string; remaining: number; total: number }>>([]);

  // Conversion widget state
  type ConvPeriod = "day" | "week" | "month" | "year" | "all";
  const [convPeriod, setConvPeriod] = useState<ConvPeriod>("month");
  const [convLeadsTotal, setConvLeadsTotal] = useState(0);     // leads created in period
  const [convLeadsBooked, setConvLeadsBooked] = useState(0);   // of those leads, how many are booked
  const [convConnectedUnique, setConvConnectedUnique] = useState(0); // unique leads we got through to (completed calls)
  const [convConnectedBooked, setConvConnectedBooked] = useState(0); // of those, how many are booked

  const loadData = useCallback(async () => {
    const todayIso = startOfToday().toISOString();
    const monthIso = startOfMonth().toISOString();

    let repId: string | null = null;
    if (session?.user?.email) {
      const { data: repRow } = await supabase
        .from("sales_reps")
        .select("id, name")
        .ilike("email", session.user.email)
        .maybeSingle();
      repId = repRow?.id ?? null;
      if (repRow?.name) setRepName(repRow.name);
    }
    const scopeId = !isAdmin ? (repId ?? "00000000-0000-0000-0000-000000000000") : null;

    const bookingsTodayQ = scopeId
      ? supabase
          .from("clinic_appointments")
          .select("id, patient_name, meta_leads!inner(rep_id)", { count: "exact", head: true })
          .gte("booked_at", todayIso)
          .eq("meta_leads.rep_id", scopeId)
          .not("patient_name", "ilike", "%test%")
      : supabase
          .from("clinic_appointments")
          .select("id, patient_name", { count: "exact", head: true })
          .gte("booked_at", todayIso)
          .not("patient_name", "ilike", "%test%");

    const bookingsMonthQ = scopeId
      ? supabase
          .from("clinic_appointments")
          .select("id, clinic_id, patient_name, meta_leads!inner(rep_id)")
          .gte("booked_at", monthIso)
          .eq("meta_leads.rep_id", scopeId)
          .not("patient_name", "ilike", "%test%")
      : supabase
          .from("clinic_appointments")
          .select("id, clinic_id, patient_name")
          .gte("booked_at", monthIso)
          .not("patient_name", "ilike", "%test%");


    const newLeadsQ = supabase
      .from("meta_leads")
      .select("id, first_name, last_name, status, created_at, updated_at, callback_scheduled_at, phone, clinic_id")
      .gte("created_at", todayIso)
      .order("created_at", { ascending: false })
      .limit(10);
    if (scopeId) newLeadsQ.eq("rep_id", scopeId);

    const { year: curYear, month: curMonth } = currentYearMonth();
    const targetQ = supabase
      .from("rep_booking_targets")
      .select("rep_id, target")
      .eq("year", curYear)
      .eq("month", curMonth);
    if (scopeId) targetQ.eq("rep_id", scopeId);

    const [bookingsTodayRes, bookingsMonthRes, newLeadsRes, clinicsRes, settingsRes, targetRes, repsRes] =
      await Promise.all([
        bookingsTodayQ,
        bookingsMonthQ,
        newLeadsQ,
        supabase.from("partner_clinics").select("id, clinic_name, city, price_per_booking"),
        supabase.from("app_settings").select("value").eq("key", "default_booking_price").maybeSingle(),
        targetQ,
        isAdmin
          ? supabase.from("sales_reps").select("id, name").eq("role", "rep").order("name")
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
      ]);

    const targetRows = (targetRes.data ?? []) as Array<{ rep_id: string; target: number }>;
    setTarget(targetRows.reduce((sum, r) => sum + (Number(r.target) || 0), 0));
    if (isAdmin) {
      setRepsList(((repsRes.data ?? []) as Array<{ id: string; name: string }>) || []);
    }

    setBookingsToday(bookingsTodayRes.count ?? 0);

    const monthBookings = (bookingsMonthRes.data ?? []) as { id: string; clinic_id: string | null }[];
    setBookingsMonth(monthBookings.length);

    const clinicsList = (clinicsRes.data ?? []) as Array<{ id: string; clinic_name: string | null; city: string | null; price_per_booking: number | null }>;
    const defaultPrice = Number((settingsRes.data?.value as unknown) ?? 800) || 800;
    const priceMap = new Map<string, number>();
    const cMap = new Map<string, ClinicInfo>();
    for (const c of clinicsList) {
      priceMap.set(c.id, Number(c.price_per_booking) || defaultPrice);
      cMap.set(c.id, { id: c.id, clinic_name: c.clinic_name, city: c.city });
    }
    setClinicMap(cMap);
    const revenue = monthBookings.reduce(
      (sum, b) => sum + (b.clinic_id ? (priceMap.get(b.clinic_id) ?? defaultPrice) : defaultPrice),
      0
    );
    setRevenueMonth(revenue);

    const leadsArr = (newLeadsRes.data ?? []) as Array<Lead & { clinic_id: string | null }>;
    setNewLeads(leadsArr);
    const lcm = new Map<string, string | null>();
    for (const l of leadsArr) lcm.set(l.id, l.clinic_id);
    setLeadClinicMap(lcm);
  }, [isAdmin, session?.user?.email]);

  useEffect(() => {
    if (!authReady || !session) return;
    void loadData();
  }, [authReady, session, loadData]);

  // Conversion widget data
  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    (async () => {
      let fromIso: string | null = null;
      const now = new Date();
      if (convPeriod === "day") {
        const d = new Date(now); d.setHours(0,0,0,0); fromIso = d.toISOString();
      } else if (convPeriod === "week") {
        const d = new Date(now); d.setDate(d.getDate() - 7); fromIso = d.toISOString();
      } else if (convPeriod === "month") {
        const d = new Date(now.getFullYear(), now.getMonth(), 1); fromIso = d.toISOString();
      } else if (convPeriod === "year") {
        const d = new Date(now.getFullYear(), 0, 1); fromIso = d.toISOString();
      }

      let repId: string | null = null;
      if (!isAdmin && session?.user?.email) {
        const { data: repRow } = await supabase
          .from("sales_reps").select("id").ilike("email", session.user.email).maybeSingle();
        repId = repRow?.id ?? null;
      }
      const scopeId = !isAdmin ? (repId ?? "00000000-0000-0000-0000-000000000000") : null;

      // Leads created in period (exclude test leads)
      const leadsQ = supabase
        .from("meta_leads")
        .select("id, status, rep_id, first_name, last_name")
        .not("first_name", "ilike", "%test%")
        .not("last_name", "ilike", "%test%");
      if (fromIso) leadsQ.gte("created_at", fromIso);
      if (scopeId) leadsQ.eq("rep_id", scopeId);

      // Connected calls (status=completed) in period
      const callsQ = supabase
        .from("call_records")
        .select("lead_id")
        .not("lead_id", "is", null)
        .eq("status", "completed");
      if (fromIso) callsQ.gte("called_at", fromIso);
      if (scopeId) callsQ.eq("rep_id", scopeId);

      const [leadsRes, callsRes] = await Promise.all([leadsQ, callsQ]);
      if (cancelled) return;

      const leadsRows = (leadsRes.data ?? []) as Array<{ id: string; status: string | null }>;
      const leadsTotal = leadsRows.length;
      const leadsBooked = leadsRows.filter(l => l.status === "booked_deposit_paid").length;

      const connectedLeadIds = Array.from(new Set(
        ((callsRes.data ?? []) as { lead_id: string | null }[])
          .map(c => c.lead_id).filter((v): v is string => !!v)
      ));
      let connectedBooked = 0;
      let connectedUniqueFiltered = 0;
      if (connectedLeadIds.length > 0) {
        const CHUNK = 200;
        for (let i = 0; i < connectedLeadIds.length; i += CHUNK) {
          const slice = connectedLeadIds.slice(i, i + CHUNK);
          // Pull lead rows in slice, exclude test, then count + count booked
          const { data: leadRows } = await supabase
            .from("meta_leads")
            .select("id, status, first_name, last_name")
            .in("id", slice)
            .not("first_name", "ilike", "%test%")
            .not("last_name", "ilike", "%test%");
          const rows = (leadRows ?? []) as Array<{ id: string; status: string | null }>;
          connectedUniqueFiltered += rows.length;
          connectedBooked += rows.filter(r => r.status === "booked_deposit_paid").length;
        }
      }

      if (cancelled) return;

      setConvLeadsTotal(leadsTotal);
      setConvLeadsBooked(leadsBooked);
      setConvConnectedUnique(connectedUniqueFiltered);
      setConvConnectedBooked(connectedBooked);

    })();
    return () => { cancelled = true; };
  }, [authReady, session, isAdmin, convPeriod]);

  const firstName = useMemo(() => {
    if (repName) return repName.split(/\s+/)[0];
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = (meta?.first_name as string | undefined) || (meta?.full_name as string | undefined);
    if (fromMeta) return String(fromMeta).split(" ")[0];
    return "there";
  }, [session, repName]);

  const targetPct = target > 0 ? Math.min(100, Math.round((bookingsMonth / target) * 100)) : 0;

  const leadsPct = convLeadsTotal > 0 ? Math.round((convLeadsBooked / convLeadsTotal) * 1000) / 10 : 0;
  const connectsPct = convConnectedUnique > 0 ? Math.round((convConnectedBooked / convConnectedUnique) * 1000) / 10 : 0;

  const confirmTarget = async () => {
    const n = Number(targetInput);
    if (!n || n <= 0) return;
    if (!selectedRepId) return;
    const { year, month } = currentYearMonth();
    const { error } = await supabase
      .from("rep_booking_targets")
      .upsert(
        { rep_id: selectedRepId, year, month, target: n },
        { onConflict: "rep_id,year,month" }
      );
    if (error) {
      console.error("Failed to save target", error);
      return;
    }
    setShowTargetModal(false);
    setTargetInput("");
    setSelectedRepId("");
    void loadData();
  };

  const leadLocation = (leadId: string): string | null => {
    const cid = leadClinicMap.get(leadId);
    if (!cid) return null;
    const c = clinicMap.get(cid);
    if (!c) return null;
    return c.city || c.clinic_name || null;
  };

  // Non-admin reps see a slim dashboard: bookings + bonus + conversion rates.
  if (authReady && session && role && role !== "admin") {
    const bonusToday = bookingsToday * 50;
    const bonusMonth = bookingsMonth * 50;
    return (
      <div style={{ background: "#f7f7f5", minHeight: "100%", fontFamily: FONT, padding: 24 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, color: "#111", letterSpacing: "-0.02em" }}>
              {getGreeting()}, {firstName}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{formatDate()}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard label="Bookings today" value={bookingsToday} valueColor="#111" sub={`$${bonusToday.toLocaleString()} earned`} />
            <StatCard label={`Bookings — ${monthYearLabel()}`} value={bookingsMonth} valueColor="#111" sub={`$${bonusMonth.toLocaleString()} earned`} />
          </div>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "0.5px solid #f0f0ee", flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
                Conversion rates
              </div>
              <select
                value={convPeriod}
                onChange={(e) => setConvPeriod(e.target.value as typeof convPeriod)}
                style={{ fontSize: 12, padding: "6px 10px", border: "0.5px solid #e8e8e6", borderRadius: 8, background: "#fff", fontFamily: FONT, cursor: "pointer" }}
              >
                <option value="day">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <div style={{ padding: 20, borderRight: "0.5px solid #f0f0ee" }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>Leads → Bookings</div>
                <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", color: "#111", marginTop: 8, lineHeight: 1 }}>
                  {leadsPct}%
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>{convLeadsBooked} of {convLeadsTotal} leads</div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>Calls → Bookings</div>
                <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", color: "#111", marginTop: 8, lineHeight: 1 }}>
                  {connectsPct}%
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>{convConnectedBooked} of {convConnectedUnique} connects</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }



  return (
    <div style={{ background: "#f7f7f5", minHeight: "100%", fontFamily: FONT, padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Top bar */}
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "#111", letterSpacing: "-0.02em" }}>
            {getGreeting()}, {firstName}
          </div>
          <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{formatDate()}</div>
        </div>

        {/* Stats strip — bookings today + bookings this month */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <StatCard
            label="Bookings Today"
            value={bookingsToday}
            valueColor="#f4522d"
            sub=""
            borderLeft="3px solid #f4522d"
          />
          <StatCard
            label={`Bookings — ${monthYearLabel()}`}
            value={bookingsMonth}
            valueColor="#111"
            sub=""
          />
        </div>

        {/* Conversion rate — leads→bookings and calls→bookings */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "0.5px solid #f0f0ee", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>Conversion</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>How leads and calls convert into bookings</div>
            </div>
            <div style={{ display: "flex", gap: 4, background: "#f4f4f2", padding: 4, borderRadius: 8 }}>
              {(["day","week","month","year","all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setConvPeriod(p)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: 0,
                    borderRadius: 6,
                    cursor: "pointer",
                    background: convPeriod === p ? "#fff" : "transparent",
                    color: convPeriod === p ? "#111" : "#888",
                    boxShadow: convPeriod === p ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    fontFamily: FONT,
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div style={{ padding: "20px", textAlign: "center", borderRight: "0.5px solid #f0f0ee" }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: "#16a34a", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {convLeadsTotal > 0 ? `${leadsPct}%` : "—"}
              </div>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginTop: 8 }}>
                Leads to Bookings
              </div>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                {convLeadsBooked} / {convLeadsTotal} leads
              </div>
            </div>
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: "#f4522d", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {convConnectedUnique > 0 ? `${connectsPct}%` : "—"}
              </div>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginTop: 8 }}>
                Connects to Sales
              </div>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                {convConnectedBooked} / {convConnectedUnique} connected
              </div>
            </div>
          </div>
        </Card>

        {/* Two column row — admins see New leads today + Bookings/target. */}
        <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 16 }}>
          {isAdmin && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "0.5px solid #f0f0ee" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>New leads today</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{newLeads.length} today</div>
              </div>
              <div>
                {newLeads.length === 0 ? (
                  <div style={{ padding: 20, fontSize: 13, color: "#999" }}>No new leads yet.</div>
                ) : (
                  newLeads.map((l) => {
                    const name = `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Unknown";
                    const loc = leadLocation(l.id);
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
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#111", fontWeight: 500 }}>{name}</div>
                          {loc && (
                            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{loc}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#ccc", minWidth: 60, textAlign: "right" }}>
                          {relativeTime(l.created_at)}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
                Revenue — {monthYearLabel()}
              </div>
              {isAdmin ? (
                <>
                  <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: "#111", marginTop: 8, lineHeight: 1 }}>
                    ${revenueMonth.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: "#999", marginTop: 6 }}>
                    From {bookingsMonth} booking{bookingsMonth === 1 ? "" : "s"}
                    {target > 0 ? ` · target ${target}/mo` : ""}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: "#16a34a", marginTop: 8, lineHeight: 1 }}>
                    ${(bookingsMonth * 50).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: "#999", marginTop: 6 }}>
                    {bookingsMonth} booking{bookingsMonth === 1 ? "" : "s"} · $50 bonus each
                    {target > 0 ? ` · target ${target}/mo` : ""}
                  </div>
                </>
              )}
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
              Set booking target for {monthYearLabel()}
            </div>
            <div style={{ fontSize: 13, color: "#999", marginTop: 8 }}>
              Choose a rep and their monthly booking target. The dashboard sums all reps' targets.
            </div>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              style={{
                marginTop: 20,
                width: "100%",
                padding: "12px 14px",
                fontSize: 15,
                border: "0.5px solid #e8e8e6",
                borderRadius: 8,
                outline: "none",
                fontFamily: FONT,
                background: "#fff",
              }}
            >
              <option value="">Select a rep…</option>
              {repsList.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
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
              disabled={!Number(targetInput) || Number(targetInput) <= 0 || !selectedRepId}
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
                cursor: Number(targetInput) > 0 && selectedRepId ? "pointer" : "not-allowed",
                opacity: Number(targetInput) > 0 && selectedRepId ? 1 : 0.5,
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
      {sub ? <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>{sub}</div> : null}
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
    case "had_convo_no_sale":
      return { label: "No Sale", bg: "#fce7f3", fg: "#be185d" };
    case "no_answer":
      return { label: "Retry", bg: "#fef3c7", fg: "#a16207" };
    case "new":
    default:
      return { label: "New", bg: "#dbeafe", fg: "#1d4ed8" };
  }
}
