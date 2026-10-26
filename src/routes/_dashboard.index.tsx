import { TodayBookingsCard } from "@/components/TodayBookingsCard";
import { loadDashboardBookingsToday, type DashboardBooking } from "@/lib/dashboard-bookings";
import "@/components/dashboard-overview.css";
import { conversionPercent } from "@/lib/leaderboard-metrics";
import { getDashboardConversion } from "@/utils/sales-call.functions";
import { MyBookingResults } from "@/components/MyBookingResults";
import { BookingPerformancePanel } from "@/components/BookingPerformancePanel";
import { ReportingPeriodSelect } from "@/components/ReportingPeriodSelect";
import { periodDates, periodInstants, type ReportingPeriod } from "@/lib/reporting-period";
import { isReturningLead } from "@/components/sales-call/status";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, ArrowRight, CalendarDays, Target, Users, Sparkles, Info } from "lucide-react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useAuth } from "@/hooks/useAuth";
import { useQuietRefresh } from "@/hooks/useQuietRefresh";
import { PickupRateCard } from "@/components/PickupRateCard";
import { APP_TIMEZONE, sydneyTodayISO } from "@/lib/timezone";
import { freeTrialCutoff, isFreeTrialBooking } from "@/lib/clinic-free-trial";
import { sendPackRenewalEmail } from "@/lib/pack-renewal.functions";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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

const CONV_GREEN = "#16a34a";
const CONV_ORANGE = "#f59e0b";
const CONV_RED = "#dc2626";

/** Leads → Bookings: target 20% (1 in 5). Green >=20, orange 10-20, red <10. */
function leadsConvColor(pct: number): string {
  if (pct >= 20) return CONV_GREEN;
  if (pct >= 10) return CONV_ORANGE;
  return CONV_RED;
}

/** Calls → Bookings: green >=60, orange 30-60, red <30. */
function connectsConvColor(pct: number): string {
  if (pct >= 60) return CONV_GREEN;
  if (pct >= 30) return CONV_ORANGE;
  return CONV_RED;
}

/** Convos → Sales: green >=70, orange 50-70, red <50. */
function convosConvColor(pct: number): string {
  if (pct >= 70) return CONV_GREEN;
  if (pct >= 50) return CONV_ORANGE;
  return CONV_RED;
}

const LEADS_CONV_TOOLTIP =
  "Leaderboard Booked ÷ Calls. Calls counts unique leads dialled per rep, including unsuccessful contacts. Test leads, pending calls and calls after deposit payment are excluded.";
const CONNECTS_CONV_TOOLTIP =
  "Leaderboard Booked ÷ (Short + Convos). A connection requires at least 15 seconds, or a manually confirmed connection. Repeat calls count once per lead and rep.";
const CONVOS_CONV_TOOLTIP =
  "Exactly the leaderboard Conv %: Booked ÷ Convos, rounded to a whole percent. Convos are connected calls lasting at least 2 minutes. Uses the same dates and exclusions.";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={text}
          role="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "1px solid #ccc",
            color: "#999",
            fontSize: 9,
            fontWeight: 700,
            marginLeft: 5,
            verticalAlign: "middle",
            cursor: "help",
            textTransform: "none",
            letterSpacing: 0,
            flexShrink: 0,
          }}
        >
          <Info size={10} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" style={{ maxWidth: 260, textAlign: "left" }}>
        <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.45, textTransform: "none", letterSpacing: 0 }}>
          {text}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function getGreeting(): string {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", hourCycle: "h23" }));
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-AU", {
    timeZone: APP_TIMEZONE,
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
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-").map((n) => parseInt(n, 10));
  return { year: y, month: m, day: d };
}

function timeZoneOffsetMs(utcDate: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcDate);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return zonedAsUtc - utcDate.getTime();
}

// Returns the UTC instant equivalent to local midnight in Sydney on the given Y/M/D.
function sydneyMidnightUTC(year: number, month: number, day: number): Date {
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const firstPass = new Date(utcMidnight.getTime() - timeZoneOffsetMs(utcMidnight, APP_TIMEZONE));
  return new Date(utcMidnight.getTime() - timeZoneOffsetMs(firstPass, APP_TIMEZONE));
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
  return new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: APP_TIMEZONE });
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
  campaign_name: string | null;
  raw_payload?: unknown;
  lead_class?: string | null;
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

type PackRow = {
  clinic_id: string;
  pack_size: number;
  pack_type: string;
  date_paid: string | null;
  purchased_at: string;
};

type ApptRow = {
  is_free_trial?: boolean;
  clinic_id: string | null;
  outcome: string | null;
  disqualified_at: string | null;
  appointment_date: string;
  booked_at: string | null;
};

function DashboardHome() {
  const { ready: authReady, session, role } = useAuth();
  const isAdmin = role === "admin";
  useTwilioDevice(true);



  const [bookingsToday, setBookingsToday] = useState(0);
  const [todayBookings, setTodayBookings] = useState<DashboardBooking[] | null>(null);
  const [todayBookingsError, setTodayBookingsError] = useState(false);
  const [bookingsMonth, setBookingsMonth] = useState(0);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [clinicMap, setClinicMap] = useState<Map<string, ClinicInfo>>(new Map());
  const [leadClinicMap, setLeadClinicMap] = useState<Map<string, string | null>>(new Map());

  const [target, setTarget] = useState<number>(0);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [repsList, setRepsList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [repName, setRepName] = useState<string>("");

  const [packBreakdown, setPackBreakdown] = useState<Array<{ clinicId: string; clinicName: string; remaining: number; total: number }>>([]);
  const [renewalStep, setRenewalStep] = useState<null | { clinicId: string; clinicName: string; step: 1 | 2 }>(null);
  const [renewalSending, setRenewalSending] = useState(false);
  const [renewalToast, setRenewalToast] = useState<string | null>(null);

  // Conversion widget state
  type ConvPeriod = ReportingPeriod;
  const [convPeriod, setConvPeriod] = useState<ConvPeriod>("month");
  const [convStart, setConvStart] = useState(sydneyTodayISO());
  const [convEnd, setConvEnd] = useState(sydneyTodayISO());
  const [convRefresh, setConvRefresh] = useState(0);
  useEffect(() => { const refresh = () => { if (document.visibilityState === "visible") setConvRefresh(n => n + 1); }; const t = setInterval(refresh, 60000); window.addEventListener("focus", refresh); return () => { clearInterval(t); window.removeEventListener("focus", refresh); }; }, []);
  const [convCity, setConvCity] = useState<string>("");

  const loadData = useCallback(async () => {
    const todayIso = startOfToday().toISOString();
    const monthIso = startOfMonth().toISOString();

    let repId: string | null = null;
    if (session?.user?.email) {
      const { data: repRow, error: repError } = await supabase
        .from("sales_reps")
        .select("id, name")
        .ilike("email", session.user.email)
        .maybeSingle();
      if (repError) { setTodayBookingsError(true); console.warn("Dashboard refresh failed", repError); return; }
      repId = repRow?.id ?? null;
      if (repRow?.name) setRepName(repRow.name);
    }
    const scopeId = !isAdmin ? (repId ?? "00000000-0000-0000-0000-000000000000") : null;

    const bookingsTodayQ = loadDashboardBookingsToday(supabase, scopeId);
    const bookingsMonthQ = supabase.from("clinic_appointments")
      .select("id", { count: "exact", head: true })
      .gte("booked_at", monthIso).lt("booked_at", new Date().toISOString())
      .not("patient_name", "ilike", "%test%").not("patient_name", "ilike", "%demo%");
    if (scopeId) bookingsMonthQ.eq("booking_rep_id", scopeId);

    const newLeadsQ = supabase
      .from("meta_leads")
      .select("id, first_name, last_name, status, created_at, updated_at, callback_scheduled_at, phone, clinic_id, campaign_name, raw_payload, lead_class")
      .gte("created_at", todayIso)
      .order("created_at", { ascending: false })
      .limit(100);

    if (scopeId) newLeadsQ.eq("rep_id", scopeId);

    const newLeadsCountQ = supabase
      .from("meta_leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso);
    if (scopeId) newLeadsCountQ.eq("rep_id", scopeId);

    const { year: curYear, month: curMonth } = currentYearMonth();
    const targetQ = supabase
      .from("rep_booking_targets")
      .select("rep_id, target")
      .eq("year", curYear)
      .eq("month", curMonth);
    if (scopeId) targetQ.eq("rep_id", scopeId);

    const packsAllQ = isAdmin
      ? supabase.from("clinic_packs").select("clinic_id, pack_size, pack_type, date_paid, purchased_at")
      : Promise.resolve({ data: [] as PackRow[], error: null });
    const apptsAllQ = isAdmin
      ? supabase
          .from("clinic_appointments")
          .select("clinic_id, outcome, disqualified_at, appointment_date, booked_at, is_free_trial")
          .not("patient_name", "ilike", "%test%").not("patient_name", "ilike", "%demo%")
      : Promise.resolve({ data: [] as ApptRow[], error: null });

    const [bookingsTodayRes, bookingsMonthRes, newLeadsRes, newLeadsCountRes, clinicsRes, targetRes, repsRes, packsRes, apptsRes] =
      await Promise.all([
        bookingsTodayQ,
        bookingsMonthQ,
        newLeadsQ,
        newLeadsCountQ,
        supabase.from("partner_clinics").select("id, clinic_name, city"),
        targetQ,
        isAdmin
          ? supabase.from("sales_reps").select("id, name").eq("role", "rep").order("name")
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
        packsAllQ,
        apptsAllQ,
      ]);

    const refreshError = [bookingsTodayRes, bookingsMonthRes, newLeadsRes, newLeadsCountRes, clinicsRes, targetRes, repsRes, packsRes, apptsRes].find((result) => result.error)?.error;
    if (refreshError) {
      setTodayBookingsError(true);
      console.warn("Dashboard refresh failed; keeping previous figures", refreshError);
      return;
    }

    const targetRows = (targetRes.data ?? []) as Array<{ rep_id: string; target: number }>;
    setTarget(targetRows.reduce((sum, r) => sum + (Number(r.target) || 0), 0));
    if (isAdmin) {
      setRepsList(((repsRes.data ?? []) as Array<{ id: string; name: string }>) || []);
    }

    setBookingsToday(bookingsTodayRes.count ?? 0);
    setTodayBookings(bookingsTodayRes.data);
    setTodayBookingsError(false);
    setBookingsMonth(bookingsMonthRes.count ?? 0);

    const clinicsList = (clinicsRes.data ?? []) as ClinicInfo[];
    const cMap = new Map<string, ClinicInfo>();
    for (const c of clinicsList) {
      cMap.set(c.id, { id: c.id, clinic_name: c.clinic_name, city: c.city });
    }
    setClinicMap(cMap);

    const leadsArr = ((newLeadsRes.data ?? []) as Array<Lead & { clinic_id: string | null }>)
      .filter((l) => !isReturningLead(l.lead_class));
    setNewLeads(leadsArr);
    setNewLeadsCount(newLeadsCountRes.count ?? leadsArr.length);
    const lcm = new Map<string, string | null>();
    for (const l of leadsArr) lcm.set(l.id, l.clinic_id);
    setLeadClinicMap(lcm);

    if (isAdmin) {
      const packsRows = (packsRes.data ?? []) as PackRow[];
      const apptsRows = (apptsRes.data ?? []) as ApptRow[];
      const todayStr = sydneyTodayISO();
      // Free-trial packs and the bookings they covered sit outside the paid
      // balance, exactly as the clinic portal shows it.
      const packsByClinic = new Map<string, PackRow[]>();
      for (const p of packsRows) {
        const list = packsByClinic.get(p.clinic_id) ?? [];
        list.push(p);
        packsByClinic.set(p.clinic_id, list);
      }
      const cutoffByClinic = new Map<string, string | null>();
      for (const [clinicId, list] of packsByClinic) {
        cutoffByClinic.set(clinicId, freeTrialCutoff(list, todayStr));
      }
      const bookedByClinic = new Map<string, number>();
      for (const a of apptsRows) {
        if (!a.clinic_id) continue;
        if (a.disqualified_at || a.outcome === "disqualified" || a.outcome === "noshow") continue;
        if (a.is_free_trial || isFreeTrialBooking(a.booked_at, cutoffByClinic.get(a.clinic_id) ?? null)) continue;
        // Once a patient is sent through the slot is consumed, even if the
        // clinic never marked an outcome. Only an explicit no-show or a
        // disqualification (handled above) hands the slot back.
        bookedByClinic.set(a.clinic_id, (bookedByClinic.get(a.clinic_id) ?? 0) + 1);
      }
      const capacityByClinic = new Map<string, number>();
      for (const p of packsRows) {
        if (p.pack_type === "free_trial") continue;
        capacityByClinic.set(p.clinic_id, (capacityByClinic.get(p.clinic_id) ?? 0) + p.pack_size);
      }
      const breakdown: Array<{ clinicId: string; clinicName: string; remaining: number; total: number }> = [];
      for (const c of clinicsList) {
        const total = capacityByClinic.get(c.id) ?? 0;
        const booked = bookedByClinic.get(c.id) ?? 0;
        if (total === 0 && booked === 0) continue;
        const remaining = total - booked;
        breakdown.push({ clinicId: c.id, clinicName: c.clinic_name || "Unknown", remaining, total });
      }
      setPackBreakdown(breakdown);
    }
  }, [isAdmin, session?.user?.email]);

  useEffect(() => {
    if (!authReady || !session?.user?.id) return;
    void loadData();
    // Auto-refresh so new leads/bookings that arrive via webhooks show up
    // without needing a manual page reload.
    const onVisible = () => { if (document.visibilityState === "visible") void loadData(); };
    const interval = setInterval(onVisible, 60_000);
    const onFocus = onVisible;
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authReady, session?.user?.id, loadData]);

  // Quietly replace conversion figures after a successful background fetch.
  const loadConversion = useCallback(async () => {
    const range = periodInstants(convPeriod, convStart, convEnd);
    if (!range) throw new Error("Choose a valid start and end date.");
    const dates = periodDates(convPeriod, convStart, convEnd);
    return getDashboardConversion({ data: { range: "custom", from: dates?.start || "1900-01-01", to: dates?.end || sydneyTodayISO(), city: convCity || null } });
  }, [convPeriod, convStart, convEnd, convCity]);
  const { data: conversion, loading: convLoading, error: conversionError, reload: reloadConversion } = useQuietRefresh({
    queryKey: JSON.stringify([session?.user?.id, isAdmin, convPeriod, convStart, convEnd, convCity]),
    load: loadConversion, refreshKey: convRefresh, enabled: authReady && !!session,
  });
  const convError = !conversion && conversionError ? "Conversion rates could not be loaded." : "";
  const convLeadsTotal = conversion?.calls ?? 0;
  const convLeadsBooked = conversion?.bookings ?? 0;
  const convConnectedUnique = conversion?.connected ?? 0;
  const convConnectedBooked = conversion?.bookings ?? 0;
  const convConvosUnique = conversion?.convos ?? 0;
  const convConvosBooked = conversion?.bookings ?? 0;
  const conversionNotice = conversionError && (
    <p role="status" style={{ margin: "8px 20px", fontSize: 12, color: "#9a6700" }}>
      {conversion ? "Conversion rates could not update. Showing the last saved results." : "Conversion rates could not be loaded. Check the selected dates and try again."}
      {" "}<button onClick={reloadConversion} style={{ textDecoration: "underline" }}>Retry</button>
    </p>
  );

  // Campaign cities for the conversion filter (ad campaigns, not clinic cities).
  const cityOptions = ["Byron Bay", "Melbourne", "Perth", "Sydney"];

  const firstName = useMemo(() => {
    if (repName) return repName.split(/\s+/)[0];
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = (meta?.first_name as string | undefined) || (meta?.full_name as string | undefined);
    if (fromMeta) return String(fromMeta).split(" ")[0];
    return "there";
  }, [session, repName]);

  const targetPct = target > 0 ? Math.min(100, Math.round((bookingsMonth / target) * 100)) : 0;

  const leadsPct = conversionPercent(convLeadsBooked, convLeadsTotal) ?? 0;
  const connectsPct = conversionPercent(convConnectedBooked, convConnectedUnique) ?? 0;
  const convosPct = conversionPercent(convConvosBooked, convConvosUnique) ?? 0;

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

  // Derive the city/source a lead came from — Meta campaigns are named like
  // "Hair Transplant Melbourne", so strip the prefix. Fall back to the
  // assigned clinic's city if the campaign name isn't parseable.
  const leadSource = (l: Lead): string | null => {
    const camp = (l.campaign_name ?? "").trim();
    if (camp) {
      const cleaned = camp.replace(/^hair\s+transplant\s+/i, "").trim();
      if (cleaned) return cleaned;
    }
    // Website bookings nest their fields under raw_payload.raw_payload.location
    const rp = (l.raw_payload && typeof l.raw_payload === "object")
      ? (l.raw_payload as Record<string, unknown>)
      : null;
    const nested = rp && typeof rp.raw_payload === "object" && rp.raw_payload !== null
      ? (rp.raw_payload as Record<string, unknown>)
      : null;
    const loc =
      (typeof rp?.location === "string" ? rp.location : "") ||
      (typeof nested?.location === "string" ? nested.location : "");
    if (loc.trim()) return loc.trim();
    return leadLocation(l.id);
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
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={convCity}
                  onChange={(e) => setConvCity(e.target.value)}
                  style={{ fontSize: 12, padding: "6px 10px", border: "0.5px solid #e8e8e6", borderRadius: 8, background: "#fff", fontFamily: FONT, cursor: "pointer" }}
                >
                  <option value="">All cities</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ReportingPeriodSelect value={convPeriod} onChange={setConvPeriod} start={convStart} end={convEnd} onStart={setConvStart} onEnd={setConvEnd} />
              </div>
            </div>
            {conversionNotice}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
              <div style={{ padding: 20, borderRight: "0.5px solid #f0f0ee" }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>Leads called → Bookings<InfoTip text={LEADS_CONV_TOOLTIP} /></div>
                <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", color: convLeadsTotal > 0 ? leadsConvColor(leadsPct) : "#111", marginTop: 8, lineHeight: 1 }}>
                  {convLoading || convError ? "—" : `${leadsPct}%`}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>{convLoading ? "Loading…" : convError || `${convLeadsBooked} of ${convLeadsTotal} leads`}</div>
              </div>
              <div style={{ padding: 20, borderRight: "0.5px solid #f0f0ee" }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>Connections → Bookings<InfoTip text={CONNECTS_CONV_TOOLTIP} /></div>
                <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", color: convConnectedUnique > 0 ? connectsConvColor(connectsPct) : "#111", marginTop: 8, lineHeight: 1 }}>
                  {convLoading || convError ? "—" : `${connectsPct}%`}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>{convLoading ? "Loading…" : convError || `${convConnectedBooked} of ${convConnectedUnique} connects`}</div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>Convos → Sales<InfoTip text={CONVOS_CONV_TOOLTIP} /></div>
                <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", color: convConvosUnique > 0 ? convosConvColor(convosPct) : "#111", marginTop: 8, lineHeight: 1 }}>
                  {convLoading || convError ? "—" : `${convosPct}%`}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>{convLoading ? "Loading…" : convError || `${convConvosBooked} of ${convConvosUnique} convos`}</div>
              </div>
            </div>
          </Card>
          <BookingPerformancePanel compact />
          <MyBookingResults />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      <div className={`dashboard-overview-shell ${!isAdmin ? "personal" : ""}`}>
        <header className="dashboard-overview-heading">
          <div><div className="dashboard-breadcrumb">Workspace <span>/</span> Overview</div><h1>{isAdmin ? "Performance overview" : "Your performance"}<span>.</span></h1><p>{getGreeting()}, {firstName}. {isAdmin ? "Here’s how your team is tracking." : "Every call is a step towards your next booking."}</p></div>
          <div className="dashboard-heading-actions"><span><CalendarDays size={14} />{formatDate()}</span><Link to="/booked-appointments" className="dashboard-action-link">View appointments <ArrowUpRight size={15} /></Link></div>
        </header>

        <BookingPerformancePanel />

        <section className="dashboard-overview-card dashboard-conversion-card" aria-labelledby="dashboard-conversion-title">
          <div className="dashboard-card-heading"><div className="dashboard-heading-with-icon"><span className="dashboard-small-icon"><ArrowUpRight size={18} /></span><div><h2 id="dashboard-conversion-title">Lead & conversation conversion</h2><p>Understand each step from first contact to booking.</p></div></div>
            <div className="dashboard-filters"><select aria-label="Conversion city" value={convCity} onChange={e => setConvCity(e.target.value)}><option value="">All cities</option>{cityOptions.map(city => <option key={city}>{city}</option>)}</select><ReportingPeriodSelect value={convPeriod} onChange={setConvPeriod} start={convStart} end={convEnd} onStart={setConvStart} onEnd={setConvEnd} /></div>
          </div>
          {conversionNotice}
          <div className="dashboard-conversion-grid">
            {[
              {label: "Leads called → bookings", count: convLeadsTotal, booked: convLeadsBooked, percentage: leadsPct, detail: "unique leads called", tooltip: LEADS_CONV_TOOLTIP},
              {label: "Connections → bookings", count: convConnectedUnique, booked: convConnectedBooked, percentage: connectsPct, detail: "connected leads", tooltip: CONNECTS_CONV_TOOLTIP},
              {label: "Conversations → bookings", count: convConvosUnique, booked: convConvosBooked, percentage: convosPct, detail: "conversations", tooltip: CONVOS_CONV_TOOLTIP},
            ].map((metric, index) => <div key={metric.label} className="dashboard-conversion-stat"><div className="dashboard-conversion-label"><span className="dashboard-step-number">0{index + 1}</span>{metric.label}<InfoTip text={metric.tooltip} /></div><strong>{convLoading || convError || !metric.count ? "—" : <>{metric.percentage}<span>%</span></>}</strong><p>{convLoading ? "Loading…" : convError || `${metric.booked} bookings from ${metric.count} ${metric.detail}`}</p></div>)}
          </div>
        </section>

        {isAdmin ? <>
          <div className="dashboard-section-heading"><h2>Today, at a glance</h2><span>Bookings, new leads and your monthly goal</span></div>
          <TodayBookingsCard bookings={todayBookings} error={todayBookingsError} onRetry={() => { void loadData(); }} />
          <div className="dashboard-secondary-grid">
            <section className="dashboard-overview-card">
              <div className="dashboard-card-heading"><div className="dashboard-heading-with-icon"><span className="dashboard-small-icon"><Users size={17} /></span><div><h2>New leads today</h2><p>The latest opportunities for your team.</p></div></div><span className="dashboard-count-badge">{newLeadsCount}</span></div>
              <div className="dashboard-lead-list">{newLeads.length === 0 ? <div className="dashboard-empty"><Users size={22} /><p>No new leads yet today.</p><span>They’ll appear here as they come in.</span></div> : newLeads.map(lead => {
                const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "Unknown";
                return <Link key={lead.id} to="/sales-call" search={{ leadId: lead.id } as never} className="dashboard-lead-row"><span className="dashboard-lead-avatar">{initials(name)}</span><span className="dashboard-lead-info"><strong>{name}</strong><span>{leadSource(lead) || "New enquiry"}</span></span><time>{relativeTime(lead.created_at)}</time><ArrowUpRight size={13} /></Link>;
              })}</div>
              <Link to="/leads" className="dashboard-card-footer">View all leads <ArrowRight size={14} /></Link>
            </section>
            <section className="dashboard-overview-card dashboard-goal-card">
              <div className="dashboard-card-heading"><div className="dashboard-heading-with-icon"><span className="dashboard-small-icon"><Target size={18} /></span><div><h2>Monthly booking goal</h2><p>{monthYearLabel()}</p></div></div><button className="dashboard-text-button" onClick={() => setShowTargetModal(true)}>{target > 0 ? "Edit target" : "Set target"}<ArrowUpRight size={13} /></button></div>
              <div className="dashboard-goal-body"><div className="dashboard-goal-value"><strong>{bookingsMonth.toLocaleString()}</strong><span>{target > 0 ? `of ${target.toLocaleString()} bookings` : "bookings this month"}</span></div><div className="dashboard-goal-track" role={target > 0 ? "progressbar" : undefined} aria-label="Monthly booking target" aria-valuenow={target > 0 ? bookingsMonth : undefined} aria-valuemin={0} aria-valuemax={target > 0 ? Math.max(target, bookingsMonth) : undefined}><span style={{width: `${targetPct}%`}} /></div><div className="dashboard-goal-caption"><span>{target > 0 ? `${targetPct}% of monthly target` : "Set a target to track your progress"}</span><span>{target > 0 ? `${Math.max(0, target - bookingsMonth)} to go` : ""}</span></div><div className="dashboard-goal-note"><Sparkles size={15} /><span>{target > 0 && bookingsMonth >= target ? "Monthly booking target reached." : "Every booking moves the team forward."}</span></div></div>
            </section>
          </div>
          <div className="dashboard-secondary-grid dashboard-operations-grid">
            {packBreakdown.length > 0 && <section className="dashboard-overview-card"><div className="dashboard-card-heading"><div><h2>Clinic capacity</h2><p>Shows remaining across active clinic packs.</p></div><span className="dashboard-count-badge">{packBreakdown.reduce((sum, p) => sum + Math.max(0, p.remaining), 0)} to fill</span></div><div className="dashboard-capacity-list">{packBreakdown.filter(p => p.remaining !== 0).map(pack => <div className="dashboard-capacity-row" key={pack.clinicId}><span>{pack.clinicName}</span><span className={pack.remaining < 0 ? "over" : ""}>{pack.remaining < 0 ? `${Math.abs(pack.remaining)} over balance` : `${pack.remaining} shows remaining`}</span></div>)}</div></section>}
            <div className="dashboard-pickup"><PickupRateCard /></div>
          </div>
        </> : <MyBookingResults />}
      </div>

      {/* Pack renewal confirmation (2 steps) */}
      {renewalStep && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1100, fontFamily: FONT, padding: 16,
          }}
          onClick={() => !renewalSending && setRenewalStep(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16, padding: 28,
              maxWidth: 440, width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {renewalStep.step === 1 ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#111", letterSpacing: "-0.01em" }}>
                  Send pack renewal email?
                </div>
                <div style={{ fontSize: 14, color: "#666", marginTop: 10, lineHeight: 1.5 }}>
                  This will email <strong>{renewalStep.clinicName}</strong> to top up their pack. Continue?
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setRenewalStep(null)}
                    style={{ fontSize: 14, fontWeight: 500, color: "#666", background: "#f6f6f4", border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setRenewalStep({ ...renewalStep, step: 2 })}
                    style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "#111", border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#111", letterSpacing: "-0.01em" }}>
                  Are you sure?
                </div>
                <div style={{ fontSize: 14, color: "#666", marginTop: 10, lineHeight: 1.5 }}>
                  Final check — the renewal email will be sent to <strong>{renewalStep.clinicName}</strong> right now.
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                  <button
                    disabled={renewalSending}
                    onClick={() => setRenewalStep(null)}
                    style={{ fontSize: 14, fontWeight: 500, color: "#666", background: "#f6f6f4", border: 0, borderRadius: 8, padding: "10px 16px", cursor: renewalSending ? "not-allowed" : "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={renewalSending}
                    onClick={async () => {
                      setRenewalSending(true);
                      try {
                        const res = await sendPackRenewalEmail({ data: { clinicId: renewalStep.clinicId } });
                        setRenewalToast(`Sent to ${res.recipient}`);
                        setRenewalStep(null);
                      } catch (err) {
                        setRenewalToast(err instanceof Error ? err.message : "Send failed");
                      } finally {
                        setRenewalSending(false);
                        setTimeout(() => setRenewalToast(null), 5000);
                      }
                    }}
                    style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "#f4522d", border: 0, borderRadius: 8, padding: "10px 16px", cursor: renewalSending ? "not-allowed" : "pointer", opacity: renewalSending ? 0.6 : 1 }}
                  >
                    {renewalSending ? "Sending…" : "Yes, send now"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {renewalToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#111", color: "#fff", padding: "12px 18px", borderRadius: 10,
          fontSize: 14, fontFamily: FONT, zIndex: 1200, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          maxWidth: "90vw",
        }}>
          {renewalToast}
        </div>
      )}

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
