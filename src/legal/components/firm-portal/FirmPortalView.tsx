// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmPortalView.tsx). Re-run the port script to refresh.
import { FirmOffices, useFirmOffices } from "./FirmOffices";
import { chosenOfficeId, type AppointmentOffice } from "@/legal/lib/firm-offices";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ClipboardList,
  CalendarDays,
  List as ListIcon,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  CalendarClock,
  BookOpen,
  CirclePlay,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/legal/integrations/supabase/client";
import { sydneyTodayISO } from "@/legal/lib/timezone";
import { collectPages } from "@/legal/lib/collect-pages";
import {
  generateSlots,
  summarizeDay,
  dayOfWeekSunFirst,
  ymdLocal,
  effectiveHoursFor,
  holidayLabelFor,
  DAY_NAMES,
  DAY_SHORT,
  type TradingHours,
  type BlockedSlot,
  type Slot,
  type AvailabilityOverride,
} from "@/legal/lib/slot-generation";
import {
  directlyBlocked,
  makeAvailabilityBlock,
  matchingBlockIds,
  type BlockRepeat,
} from "@/legal/lib/availability-blocks";
import { TEST_FIRM_ID } from "@/legal/lib/firm-portal-credits";
import { deduplicateNoShows, isNoShowAppointment } from "@/legal/lib/firm-no-shows";
import { FirmPackBalanceCard } from "@/legal/components/firm-portal/FirmPackBalanceCard";
import { FirmProfileTab } from "@/legal/components/firm-portal/FirmProfileTab";
import {
  processConsultOutcomeFn,
  markNoShowFn,
  deleteTestAppointmentFn,
  requestChaseFn,
  resolveChaseFn,
  flagConflictFn,
  clearConflictFn,
  cancelAppointmentFn,
  disqualifyAppointmentFn,
  rescheduleAppointmentFn,
  addAppointmentNoteFn,
  availableSlotsFn,
} from "@/legal/lib/firm-portal.functions";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { Checkbox } from "@/legal/components/ui/checkbox";
import "./firm-portal.css";
import { FirmAvailabilityPanel } from "./FirmAvailabilityPanel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/legal/components/ui/dialog";

export type ChaseStatus = "requested" | "rebooked" | "not_proceeding" | "no_answer" | "voicemail";
export type ConflictStatus = "pending" | "flagged" | "clear" | "conflict" | "cleared";

export type FirmAppointment = AppointmentOffice & {
  consult_mode?: string | null;
  id: string;
  firm_id: string;
  lead_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  ex_partner_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: "booked" | "cancelled";
  conflict_status: ConflictStatus;
  conflict_reason: string | null;
  conflict_flagged_at: string | null;
  conflict_resolved_at: string | null;
  intel_notes: string | null;
  notes: string | null;
  outcome: "show" | "noshow" | "signed" | "disqualified" | null;
  consult_summary: string | null;
  disqualified_reason?: string | null;
  disqualified_at?: string | null;
  disqualified_by?: string | null;
  chase_status?: ChaseStatus | null;
  chase_requested_at?: string | null;
  chase_note?: string | null;
  chase_result_at?: string | null;
};

export const CHASE_LABELS: Record<ChaseStatus, string> = {
  requested: "Bold following up",
  rebooked: "Bold: rebooked",
  not_proceeding: "Bold: not proceeding",
  no_answer: "Bold: no answer",
  voicemail: "Bold: voicemail left",
};

export const CHASE_CLASSES: Record<ChaseStatus, string> = {
  requested: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  rebooked: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  not_proceeding: "bg-muted text-muted-foreground border-border",
  no_answer: "bg-destructive/10 text-destructive border-destructive/30",
  voicemail: "bg-primary/10 text-primary border-primary/30",
};

const OUTCOME_META: Record<string, { label: string; classes: string }> = {
  upcoming: { label: "Upcoming", classes: "bg-primary/10 text-primary border-primary/30" },
  show: { label: "Showed up", classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  noshow: { label: "No show", classes: "bg-destructive/10 text-destructive border-destructive/30" },
  signed: { label: "Signed", classes: "bg-violet-500/10 text-violet-500 border-violet-500/30" },
  disqualified: { label: "Disqualified", classes: "bg-muted text-muted-foreground border-border" },
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function PortalSkeleton() {
  return (
    <div className="p-6" aria-busy="true" aria-live="polite">
      <div className="mb-4 flex flex-wrap gap-2.5">
        <SkeletonBlock className="h-9 w-44" />
        <SkeletonBlock className="h-9 w-36" />
        <SkeletonBlock className="h-9 w-36" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-muted px-4 py-2.5">
          <SkeletonBlock className="h-3 w-24" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 border-b border-border px-4 py-4 last:border-0"
          >
            <SkeletonBlock className="h-10 w-10 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <SkeletonBlock className="h-3.5 w-1/2" />
              <SkeletonBlock className="h-3 w-1/3" />
            </div>
            <SkeletonBlock className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6" role="alert">
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="mb-2 text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          Couldn't load your portal
        </div>
        <div className="mb-6 text-sm leading-relaxed text-muted-foreground">{message}</div>
        <Button onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    </div>
  );
}

function AppointmentsEmptyState({
  variant,
  tab,
}: {
  variant: "no-filter-match" | "empty-tab" | "empty-all";
  tab: "upcoming" | "past" | "noshow" | "disqualified";
}) {
  const tabLabel =
    tab === "upcoming"
      ? "upcoming appointments"
      : tab === "past"
        ? "past appointments"
        : tab === "noshow"
          ? "no-shows"
          : "disqualified clients";
  const title =
    variant === "no-filter-match"
      ? "No matching appointments"
      : variant === "empty-tab"
        ? `No ${tabLabel}`
        : "No appointments yet";
  const body =
    variant === "no-filter-match"
      ? "Try clearing your filters or picking a different date range."
      : variant === "empty-tab"
        ? tab === "upcoming"
          ? "You're all caught up — nothing booked in yet. New bookings will appear here automatically."
          : `Nothing in ${tabLabel} right now.`
        : "When clients are booked in, they'll appear here so you can manage them.";
  return (
    <div className="px-8 py-14 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CalendarClock className="h-7 w-7 text-primary" />
      </div>
      <div className="mb-1.5 text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </div>
      <div className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</div>
    </div>
  );
}

function ymd(d: Date) {
  return ymdLocal(d);
}

function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year ?? 1970, (month || 1) - 1, day || 1);
}

/** Times are stored either as "16:00" or "4:00pm" — handle both. */
function parseTimeParts(t: string | null | undefined): { h: number; min: string } | null {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec((t ?? "").trim());
  if (!m) return null;
  let h = parseInt(m[1] ?? "0", 10);
  const suffix = m[3]?.toLowerCase();
  if (suffix === "pm" && h < 12) h += 12;
  if (suffix === "am" && h === 12) h = 0;
  return { h, min: m[2] ?? "00" };
}

function parseAppointmentDateTime(dateStr: string, timeStr: string | null | undefined) {
  const base = parseDateOnly(dateStr);
  const parts = parseTimeParts(timeStr);
  if (parts) base.setHours(parts.h, Number(parts.min), 0, 0);
  return base;
}

function fmtTime(t: string) {
  const parts = parseTimeParts(t);
  if (!parts) return t;
  const ampm = parts.h >= 12 ? "pm" : "am";
  const h = parts.h % 12 || 12;
  return `${h}:${parts.min}${ampm}`;
}

export function FirmPortalView({
  firmId,
  firmName,
  isAdmin = false,
}: {
  firmId: string;
  firmName: string;
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<"appointments" | "availability" | "profile">("appointments");
  const [appts, setAppts] = useState<FirmAppointment[]>([]);
  const [tradingHours, setTradingHours] = useState<TradingHours[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<FirmAppointment | null>(null);
  const [firmState, setFirmState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (refresh === 0) setLoading(true);
      setLoadError(null);
      try {
        const results = await Promise.all([
          collectPages((from, to) =>
            supabase
              .from("firm_appointments")
              .select("*")
              .eq("firm_id", firmId)
              .order("appointment_date")
              .order("id")
              .range(from, to),
          ).then((data) => ({ data, error: null })),
          supabase
            .from("firm_trading_hours")
            // "*" rather than a column list: slot_times may not exist until the
            // migration has run, and the portal must still load without it.
            .select("*")
            .eq("firm_id", firmId),
          collectPages((from, to) =>
            supabase
              .from("firm_blocked_slots")
              .select(
                "id, date, start_time, end_time, reason, is_recurring, recur_pattern, recur_day_of_week, recur_days_of_week, recur_day_of_month, recur_nth_week, recur_until, excluded_dates",
              )
              .eq("firm_id", firmId)
              .order("id")
              .range(from, to),
          ).then((data) => ({ data, error: null })),
          collectPages((from, to) =>
            supabase
              .from("firm_availability")
              .select("id, override_date, override_type, start_time, end_time")
              .eq("firm_id", firmId)
              .order("id")
              .range(from, to),
          ).then((data) => ({ data, error: null })),
          supabase.from("firms").select("state").eq("id", firmId).maybeSingle(),
        ]);
        if (cancelled) return;
        const [
          { data: a, error: aErr },
          { data: th, error: thErr },
          { data: bs, error: bsErr },
          { data: ov, error: ovErr },
          { data: firm, error: firmErr },
        ] = results;
        const firstErr = aErr || thErr || bsErr || ovErr || firmErr;
        if (firstErr) throw new Error(firstErr.message);
        setAppts((a ?? []) as unknown as FirmAppointment[]);
        setTradingHours(
          (th ?? []).map((h) => ({
            day_of_week: h.day_of_week,
            open_time: String(h.open_time ?? "09:00"),
            close_time: String(h.close_time ?? "17:00"),
            is_closed: !h.is_open,
            consult_duration_mins: Number(h.consult_duration_mins ?? 60) || 60,
            slot_times: ((h as { slot_times?: string[] | null }).slot_times ?? null) as
              string[] | null,
          })),
        );
        setBlockedSlots((bs ?? []) as unknown as BlockedSlot[]);
        setOverrides((ov ?? []) as unknown as AvailabilityOverride[]);
        setFirmState((firm as { state?: string | null } | null)?.state ?? null);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Something went wrong loading your portal.");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firmId, refresh]);

  const reload = () => setRefresh((n) => n + 1);

  useEffect(() => {
    if (selected) {
      const fresh = appts.find((a) => a.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appts]);

  return (
    <div className="bold-portal firm-portal-ui portal-workspace">
      <div className="portal-page-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="portal-eyebrow">Your workspace</p>
          <a
            href="/portal-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CirclePlay className="h-4 w-4" aria-hidden="true" />
            Watch portal guide
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">
          {firmName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your consultations and keep your calendar up to date.
        </p>
      </div>
      {!loading && !loadError && (
        <FirmPackBalanceCard
          firmId={firmId}
          isAdmin={isAdmin}
          refreshKey={refresh}
          appointments={appts}
        />
      )}
      <div className="px-4 pb-5 sm:px-6"><FirmOffices key={firmId} firmId={firmId} canEdit={isAdmin} /></div>
      <div className="portal-main-nav">
        <div className="flex gap-1">
          <TabBtn
            active={tab === "appointments"}
            onClick={() => setTab("appointments")}
            icon={<ClipboardList className="h-4 w-4" />}
          >
            Appointments
          </TabBtn>
          <TabBtn
            active={tab === "availability"}
            onClick={() => setTab("availability")}
            icon={<CalendarDays className="h-4 w-4" />}
          >
            Availability
          </TabBtn>
          {isAdmin && (
            <TabBtn
              active={tab === "profile"}
              onClick={() => setTab("profile")}
              icon={<BookOpen className="h-4 w-4" />}
            >
              Firm Profile
            </TabBtn>
          )}
        </div>
      </div>

      {loading ? (
        <PortalSkeleton />
      ) : loadError ? (
        <PortalErrorCard message={loadError} onRetry={reload} />
      ) : tab === "profile" ? (
        isAdmin ? (
          <FirmProfileTab firmId={firmId} />
        ) : null
      ) : tab === "appointments" ? (
        <AppointmentsTab
          appts={appts}
          tradingHours={tradingHours}
          blockedSlots={blockedSlots}
          overrides={overrides}
          firmId={firmId}
          firmState={firmState}
          isAdmin={isAdmin}
          onChange={reload}
          onSelect={setSelected}
        />
      ) : (
        <FirmAvailabilityPanel firmId={firmId} onChange={reload} />
      )}

      <div className="p-4 text-center text-xs text-muted-foreground">Bold · Partner portal</div>

      {selected && (
        <AppointmentDetailModal
          key={selected.id}
          appt={selected}
          appointments={appts}
          onSelect={setSelected}
          onUpdate={(updated) =>
            setAppts((rows) => rows.map((a) => (a.id === updated.id ? updated : a)))
          }
          onDelete={(id) => setAppts((rows) => rows.filter((a) => a.id !== id))}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onChange={() => reload()}
        />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-2 py-4 sm:flex-none sm:px-5 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {children}
    </button>
  );
}

/* ============== APPOINTMENTS TAB ============== */

function AppointmentsTab({
  appts,
  tradingHours,
  blockedSlots,
  overrides,
  firmId,
  firmState,
  isAdmin,
  onChange,
  onSelect,
}: {
  appts: FirmAppointment[];
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  overrides: AvailabilityOverride[];
  firmId: string;
  firmState: string | null;
  isAdmin: boolean;
  onChange: () => void;
  onSelect: (a: FirmAppointment) => void;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showAdd, setShowAdd] = useState(false);
  const [officeFilter, setOfficeFilter] = useState("all");
  const offices = useFirmOffices(firmId);
  const officeOptions = new Map((offices.data ?? []).map((office) => [office.id, office.name]));
  for (const appt of appts) if (appt.location_id && !officeOptions.has(appt.location_id)) officeOptions.set(appt.location_id, appt.location_name ?? "Previous office");
  const visibleAppts = officeFilter === "all" ? appts : appts.filter((appt) => officeFilter === "zoom" ? appt.consult_mode === "zoom" : appt.consult_mode !== "zoom" && appt.location_id === officeFilter);


  return (
    <div className="portal-appointments">
      <div className="portal-section-heading">
        <div className="flex flex-wrap items-center gap-2">
          <div className="portal-view-switch inline-flex flex-wrap rounded-lg border border-border bg-card p-0.5">
            <ViewToggleBtn
              active={view === "list"}
              onClick={() => setView("list")}
              icon={<ListIcon className="h-3.5 w-3.5" />}
            >
              List
            </ViewToggleBtn>
            <ViewToggleBtn
              active={view === "calendar"}
              onClick={() => setView("calendar")}
              icon={<CalendarIcon className="h-3.5 w-3.5" />}
            >
              Calendar
            </ViewToggleBtn>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">Office
            <select aria-label="Filter appointments by office" className="rounded-md border bg-card px-3 py-2" value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)}>
              <option value="all">All offices</option>
              {[...officeOptions].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              <option value="zoom">Zoom</option>
            </select>
          </label>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add appointment
            </Button>
          )}
        </div>
      </div>

      {view === "list" ? (
        <ListView appts={visibleAppts} onSelect={onSelect} isAdmin={isAdmin} />
      ) : (
        <CalendarView
          appts={visibleAppts}
          tradingHours={tradingHours}
          blockedSlots={blockedSlots}
          overrides={overrides}
          firmState={firmState}
          onSelect={onSelect}
        />
      )}

      {showAdd && isAdmin && (
        <AddAppointmentModal
          firmId={firmId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function ViewToggleBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {children}
    </button>
  );
}

/* ---------- LIST VIEW ---------- */
function ListView({
  appts,
  onSelect,
  isAdmin,
}: {
  appts: FirmAppointment[];
  onSelect: (a: FirmAppointment) => void;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"upcoming" | "past" | "noshow" | "disqualified">("upcoming");
  const [query, setQuery] = useState("");

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dow = today.getDay();
  const daysToEndOfWeek = dow === 0 ? 0 : 7 - dow;
  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + daysToEndOfWeek);
  const endOfNextWeek = new Date(endOfThisWeek);
  endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);

  const now = new Date();
  const isNoShow = isNoShowAppointment;
  const listedAppts = deduplicateNoShows(appts);
  const isDisqualified = (a: FirmAppointment) => a.outcome === "disqualified";
  const isPastAppointment = (a: FirmAppointment) =>
    Boolean(a.outcome) ||
    a.status === "cancelled" ||
    parseAppointmentDateTime(a.appointment_date, a.appointment_time) < now;

  const q = query.trim().toLowerCase();
  const filtered = listedAppts.filter((a) => {
    const noShow = isNoShow(a);
    const disq = isDisqualified(a);
    const isPast = isPastAppointment(a);
    if (tab === "upcoming" && (isPast || noShow || disq)) return false;
    if (tab === "past" && (!isPast || noShow || disq)) return false;
    if (tab === "noshow" && !noShow) return false;
    if (tab === "disqualified" && !disq) return false;
    if (!isAdmin && tab === "disqualified") return false;
    if (q) {
      const hay = `${a.client_name ?? ""} ${a.client_phone ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const cmp = a.appointment_date.localeCompare(b.appointment_date);
    if (cmp !== 0) return tab === "upcoming" ? cmp : -cmp;
    const ta = parseTimeParts(a.appointment_time);
    const tb = parseTimeParts(b.appointment_time);
    return (ta ? ta.h * 60 + Number(ta.min) : 0) - (tb ? tb.h * 60 + Number(tb.min) : 0);
  });

  type Bucket =
    | "Today"
    | "Tomorrow"
    | "This week"
    | "Next week"
    | "Later"
    | "Past"
    | "No shows"
    | "Disqualified";
  const bucketOf = (appt: FirmAppointment): Bucket => {
    if (tab === "noshow") return "No shows";
    if (tab === "disqualified") return "Disqualified";
    if (tab === "past" || isPastAppointment(appt)) return "Past";
    const d = startOfDay(parseDateOnly(appt.appointment_date));
    if (d < today) return "Past";
    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (d <= endOfThisWeek) return "This week";
    if (d <= endOfNextWeek) return "Next week";
    return "Later";
  };
  const order: Bucket[] =
    tab === "noshow"
      ? ["No shows"]
      : tab === "disqualified"
        ? ["Disqualified"]
        : tab === "past"
          ? ["Past"]
          : ["Today", "Tomorrow", "This week", "Next week", "Later"];
  const groups = new Map<Bucket, FirmAppointment[]>();
  for (const a of sorted) {
    const b = bucketOf(a);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)?.push(a);
  }

  const noShowCount = listedAppts.filter(isNoShow).length;
  const disqualifiedCount = appts.filter(isDisqualified).length;
  const upcomingCount = appts.filter(
    (a) => !isPastAppointment(a) && !isNoShow(a) && !isDisqualified(a),
  ).length;
  const pastCount = appts.filter(
    (a) => isPastAppointment(a) && !isNoShow(a) && !isDisqualified(a),
  ).length;

  return (
    <div>
      <div className="portal-list-toolbar">
        <div className="portal-view-switch inline-flex flex-wrap rounded-lg border border-border bg-card p-0.5">
          <ViewToggleBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")} icon={null}>
            Upcoming ({upcomingCount})
          </ViewToggleBtn>
          <ViewToggleBtn active={tab === "past"} onClick={() => setTab("past")} icon={null}>
            Past ({pastCount})
          </ViewToggleBtn>
          <ViewToggleBtn active={tab === "noshow"} onClick={() => setTab("noshow")} icon={null}>
            No shows ({noShowCount})
          </ViewToggleBtn>
          {isAdmin && (
            <ViewToggleBtn
              active={tab === "disqualified"}
              onClick={() => setTab("disqualified")}
              icon={null}
            >
              Disqualified ({disqualifiedCount})
            </ViewToggleBtn>
          )}
        </div>

        <Input
          type="text"
          aria-label="Search appointments by name or phone"
          placeholder="Search name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-40 flex-1 basis-52 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {sorted.length === 0 ? (
          <AppointmentsEmptyState
            tab={tab}
            variant={
              appts.length === 0 ? "empty-all" : query.trim() ? "no-filter-match" : "empty-tab"
            }
          />
        ) : (
          order
            .filter((b) => groups.has(b))
            .map((bucket) => {
              const rows = groups.get(bucket) ?? [];
              return (
                <div key={bucket}>
                  <div className="flex items-center justify-between border-b border-border bg-muted px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-foreground">
                    <span>{bucket}</span>
                    <span className="font-semibold text-muted-foreground">{rows.length}</span>
                  </div>
                  {rows.map((a) => {
                    const c = OUTCOME_META[a.outcome ?? "upcoming"] ?? OUTCOME_META["upcoming"]!;
                    const d = parseDateOnly(a.appointment_date);
                    return (
                      <button
                        key={a.id}
                        onClick={() => onSelect(a)}
                        className="grid w-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 border-b border-border p-4 text-left last:border-0 hover:bg-muted/50 sm:grid-cols-[4rem_minmax(0,1fr)_auto]"
                      >
                        <div className={`rounded-lg border px-2 py-2 text-center ${c.classes}`}>
                          <div className="text-xl font-bold leading-none">{d.getDate()}</div>
                          <div className="text-[10px] font-semibold uppercase">
                            {MONTHS[d.getMonth()]?.slice(0, 3)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-semibold text-foreground">
                            {a.client_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {fmtTime(a.appointment_time)} · {a.client_phone || "no phone"}
                            <span className="mt-1 block font-medium text-foreground">{a.consult_mode === "zoom" ? "Zoom" : a.location_name || "Office not recorded"}</span>
                          </div>
                        </div>
                        <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-1.5 sm:col-start-auto sm:justify-end">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.classes}`}
                          >
                            {c.label}
                          </span>
                          {a.conflict_status === "flagged" && (
                            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                              Conflict flagged
                            </span>
                          )}
                          {a.chase_status && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CHASE_CLASSES[a.chase_status]}`}
                            >
                              {CHASE_LABELS[a.chase_status]}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

/* ---------- CALENDAR VIEW ---------- */

function CalendarView({
  appts,
  tradingHours,
  blockedSlots,
  overrides,
  firmState,
  onSelect,
}: {
  appts: FirmAppointment[];
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  overrides: AvailabilityOverride[];
  firmState: string | null;
  onSelect: (a: FirmAppointment) => void;
}) {
  const [view, setView] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const monthLabel = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
  const days = useMemo(() => buildMonthGrid(view), [view]);

  const apptsByDate = useMemo(() => {
    const map = new Map<string, FirmAppointment[]>();
    for (const a of appts) {
      const arr = map.get(a.appointment_date) ?? [];
      arr.push(a);
      map.set(a.appointment_date, arr);
    }
    return map;
  }, [appts]);

  const todayStr = ymd(new Date());
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const selectedAppointments = [...(apptsByDate.get(selectedDay) ?? [])].sort(
    (a, b) =>
      parseAppointmentDateTime(a.appointment_date, a.appointment_time).getTime() -
      parseAppointmentDateTime(b.appointment_date, b.appointment_time).getTime(),
  );
  const changeMonth = (offset: number) => {
    const next = new Date(view.getFullYear(), view.getMonth() + offset, 1);
    setView(next);
    setSelectedDay(ymd(next));
  };
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            ‹
          </Button>
          <h2 className="text-sm font-semibold sm:text-base">{monthLabel}</h2>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            ›
          </Button>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center">
          {DAY_SHORT.map((d) => (
            <div key={d} className="text-xs text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const dateStr = ymd(d);
            const summary = summarizeDay(d, tradingHours, blockedSlots, [], overrides, firmState);
            const count = apptsByDate.get(dateStr)?.length ?? 0;
            return (
              <button
                key={dateStr}
                aria-label={`${d.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}, ${count} appointments`}
                aria-pressed={selectedDay === dateStr}
                aria-current={dateStr === todayStr ? "date" : undefined}
                onClick={() => setSelectedDay(dateStr)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border py-2 text-sm ${selectedDay === dateStr ? "border-primary bg-primary text-primary-foreground" : dateStr === todayStr ? "border-primary bg-primary/5" : summary.closed ? "border-transparent bg-muted text-muted-foreground" : "border-border bg-card hover:bg-muted"}`}
              >
                <span>{d.getDate()}</span>
                <span
                  className={`h-1 w-1 rounded-full ${count ? "bg-current" : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Tap a date to see appointments. A dot means there is a booking.
        </p>
        <Button
          variant="ghost"
          className="mt-2"
          onClick={() => {
            setView(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            setSelectedDay(todayStr);
          }}
        >
          Back to today
        </Button>
      </div>
      <section
        aria-label="Selected day appointments"
        className="min-w-0 rounded-xl border bg-card p-4 sm:p-5"
      >
        <h2 className="font-semibold">
          {parseDateOnly(selectedDay).toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {selectedAppointments.length} appointments
        </p>
        {selectedAppointments.length === 0 ? (
          <p className="rounded-lg bg-muted p-5 text-sm text-muted-foreground">
            No appointments on this day. Choose another date.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedAppointments.map((a) => {
              const meta = OUTCOME_META[a.outcome ?? "upcoming"] ?? OUTCOME_META["upcoming"]!;
              return (
                <button
                  key={a.id}
                  onClick={() => onSelect(a)}
                  className="w-full rounded-xl border p-4 text-left hover:bg-muted/50"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {fmtTime(a.appointment_time)}
                  </span>
                  <span className="mt-1 block break-words font-semibold">{a.client_name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{a.consult_mode === "zoom" ? "Zoom" : a.location_name || "Office not recorded"}</span>
                  <span
                    className={`mt-2 inline-block rounded-full border px-2 py-1 text-xs ${meta.classes}`}
                  >
                    {a.status === "cancelled" ? "Cancelled" : meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const first = new Date(monthStart);
  first.setDate(1);
  // Match the Sunday-first DAY_SHORT column headings.
  const dow = first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < dow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ============== NOTES TRAIL ============== */

type ApptNote = {
  id: string;
  appointment_id: string;
  firm_id: string;
  author_type: "admin" | "firm";
  author_name: string | null;
  body: string;
  created_at: string;
};

function NotesTrail({ appointmentId, isAdmin }: { appointmentId: string; isAdmin: boolean }) {
  const addAppointmentNote = useServerFn(addAppointmentNoteFn);
  const [notes, setNotes] = useState<ApptNote[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("firm_appointment_notes")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false });
    if (!error) setNotes((data ?? []) as unknown as ApptNote[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const addNote = async () => {
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const authorName =
      (userRes?.user?.user_metadata?.["full_name"] as string | undefined) ??
      userRes?.user?.email ??
      undefined;
    try {
      await addAppointmentNote({
        data: { appointmentId, body, ...(authorName ? { authorName } : {}) },
      });
      setDraft("");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const fmtStamp = (iso: string) =>
    new Date(iso).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="mb-3.5 border-t border-border pt-3.5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Notes trail
      </div>

      <div className="mb-2.5 flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isAdmin ? "Add an admin note…" : "Add a firm note…"}
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void addNote()} disabled={saving || !draft.trim()}>
            {saving ? "Adding…" : "Add note"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-1.5" aria-busy="true">
          <SkeletonBlock className="h-2.5 w-3/5" />
          <SkeletonBlock className="h-2.5 w-2/5" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-xs italic text-muted-foreground">No notes yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => {
            const isAdminNote = n.author_type === "admin";
            return (
              <div
                key={n.id}
                className={`rounded-lg border p-2.5 ${isAdminNote ? "border-amber-500/30 bg-amber-500/5" : "border-primary/30 bg-primary/5"}`}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                      isAdminNote ? "bg-amber-500" : "bg-primary"
                    }`}
                  >
                    {isAdminNote ? "Admin" : "Firm"}
                  </span>
                  {n.author_name && (
                    <span className="text-[11px] font-semibold">{n.author_name}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {fmtStamp(n.created_at)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============== CHASE SECTION ============== */

function ChaseSection({
  appt,
  isAdmin,
  onChange,
}: {
  appt: FirmAppointment;
  isAdmin: boolean;
  onChange: () => void;
}) {
  const requestChase = useServerFn(requestChaseFn);
  const resolveChase = useServerFn(resolveChaseFn);
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const status = appt.chase_status ?? null;

  const resolve = async (result: "rebooked" | "not_proceeding" | "no_answer" | "voicemail") => {
    setSaving(true);
    try {
      await resolveChase({ data: { appointmentId: appt.id, result } });
      toast.success("Updated");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (status) {
    return (
      <div className={`mt-3.5 rounded-lg border p-3 ${CHASE_CLASSES[status]}`}>
        <div className="text-xs font-bold">{CHASE_LABELS[status]}</div>
        {appt.chase_note && (
          <div className="mt-1 whitespace-pre-wrap text-xs">“{appt.chase_note}”</div>
        )}
        {appt.chase_requested_at && (
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            Requested{" "}
            {new Date(appt.chase_requested_at).toLocaleString("en-AU", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}
        {isAdmin && status === "requested" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void resolve("rebooked")}
            >
              Rebooked
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void resolve("not_proceeding")}
            >
              Not proceeding
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void resolve("no_answer")}
            >
              No answer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void resolve("voicemail")}
            >
              Voicemail
            </Button>
          </div>
        )}
      </div>
    );
  }

  const submit = async () => {
    setSaving(true);
    try {
      await requestChase({
        data: { appointmentId: appt.id, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      toast.success("Bold has been asked to chase");
      setExpanded(false);
      setNote("");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3.5">
      {!expanded ? (
        <Button variant="outline" className="w-full" onClick={() => setExpanded(true)}>
          Ask Bold to chase
        </Button>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-2 text-xs font-semibold">Ask Bold to chase this client</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 2000))}
            placeholder="Anything we should know? (optional)"
            rows={3}
          />
          <div className="mt-2.5 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setExpanded(false);
                setNote("");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void submit()}>
              {saving ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============== APPOINTMENT DETAIL MODAL ============== */

function AppointmentDetailModal({
  appt,
  appointments,
  onSelect,
  isAdmin,
  onClose,
  onChange,
  onUpdate,
  onDelete,
}: {
  appt: FirmAppointment;
  appointments: FirmAppointment[];
  onSelect: (appt: FirmAppointment) => void;
  isAdmin: boolean;
  onClose: () => void;
  onChange: () => void;
  onUpdate: (appt: FirmAppointment) => void;
  onDelete: (id: string) => void;
}) {
  const markNoShow = useServerFn(markNoShowFn);
  const deleteTestAppointment = useServerFn(deleteTestAppointmentFn);
  const [deleting, setDeleting] = useState(false);
  const clearConflict = useServerFn(clearConflictFn);
  const cancelAppointment = useServerFn(cancelAppointmentFn);
  const disqualifyAppointment = useServerFn(disqualifyAppointmentFn);
  const processConsultOutcome = useServerFn(processConsultOutcomeFn);

  const [outcomeMode, setOutcomeMode] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [savingShow, setSavingShow] = useState(false);
  const c = OUTCOME_META[appt.outcome ?? "upcoming"] ?? OUTCOME_META["upcoming"]!;
  const noShowHistory = appt.lead_id
    ? appointments
        .filter(
          (a) => a.lead_id === appt.lead_id && a.firm_id === appt.firm_id && isNoShowAppointment(a),
        )
        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
    : [];

  const isUpcoming =
    !appt.outcome &&
    appt.status !== "cancelled" &&
    parseAppointmentDateTime(appt.appointment_date, appt.appointment_time) >= new Date();

  /** One-click "they turned up" — saves the outcome and refunds the deposit. */
  const markShowed = async () => {
    setSavingShow(true);
    try {
      await processConsultOutcome({ data: { appointmentId: appt.id, signed: false } });
      toast.success("Marked as showed up");
      onChange();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingShow(false);
    }
  };

  const noShow = async () => {
    const previous = appt;
    onUpdate({ ...appt, outcome: "noshow" });
    onClose();
    const notification = toast.loading("Saving no-show…");
    try {
      await markNoShow({ data: { appointmentId: appt.id } });
      toast.success("Marked as no-show", { id: notification });
    } catch (e) {
      onUpdate(previous);
      toast.error(e instanceof Error ? e.message : "Could not save. Appointment restored.", {
        id: notification,
      });
    }
  };

  const deleteDemo = async () => {
    if (
      !confirm(
        "Delete this test appointment? This permanently removes it from Test Family Law Firm.",
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteTestAppointment({ data: { appointmentId: appt.id } });
      onDelete(appt.id);
      onClose();
      toast.success("Test appointment deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete test appointment");
    } finally {
      setDeleting(false);
    }
  };

  const markClear = async () => {
    try {
      await clearConflict({ data: { appointmentId: appt.id } });
      toast.success("Marked clear");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const cancelAppt = async () => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await cancelAppointment({ data: { appointmentId: appt.id } });
      toast.success("Appointment cancelled");
      onChange();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const disqualify = async () => {
    const reason = window.prompt(
      `Disqualify ${appt.client_name}?\n\nReason (required — will be logged):`,
      "",
    );
    if (reason == null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }
    try {
      await disqualifyAppointment({ data: { appointmentId: appt.id, reason: trimmed } });
      toast.success("Marked disqualified");
      onChange();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-1 break-words pr-6 text-xl font-semibold">{appt.client_name}</div>
      <div className="mb-2 text-xs text-muted-foreground">
        {new Date(appt.appointment_date).toLocaleDateString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}{" "}
        · {fmtTime(appt.appointment_time)}
        {appt.consult_mode === "zoom" ? " · Zoom" : appt.location_name ? ` · ${appt.location_name}` : ""}
      </div>
      {appt.consult_mode !== "zoom" && appt.location_name && <section className="my-4 space-y-2 rounded-xl border p-4 text-sm" aria-label="Booked office directions">
        <h3 className="font-semibold">{appt.location_name} office</h3>
        <p>{appt.location_address}</p>
        {appt.location_parking_info && <p className="whitespace-pre-line"><strong>Parking: </strong>{appt.location_parking_info}</p>}
        {appt.location_nearby_landmarks && <p className="whitespace-pre-line"><strong>Getting here: </strong>{appt.location_nearby_landmarks}</p>}
        {appt.location_address && <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.location_address)}`}>Open map</a>}
      </section>}
      {appt.client_phone && (
        <a
          href={`tel:${appt.client_phone}`}
          className="mb-1 block text-sm font-medium text-primary"
        >
          {appt.client_phone}
        </a>
      )}
      {appt.client_email && (
        <a
          href={`mailto:${appt.client_email}`}
          className="mb-2.5 block break-all text-sm font-medium text-primary"
        >
          {appt.client_email}
        </a>
      )}
      <div
        className={`mb-3.5 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.classes}`}
      >
        {c.label}
      </div>

      {isNoShowAppointment(appt) && noShowHistory.length > 1 && (
        <details className="mb-3.5 rounded-lg border border-border p-3 text-xs">
          <summary className="cursor-pointer font-semibold">
            Booking history · counted as 1 no-show client
          </summary>
          <p className="mt-2 text-muted-foreground">
            These missed bookings belong to the same client. Select a booking to view its notes.
          </p>
          <ul className="mt-2 space-y-1">
            {noShowHistory.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="text-primary underline"
                  disabled={a.id === appt.id}
                  onClick={() => onSelect(a)}
                >
                  {parseDateOnly(a.appointment_date).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {fmtTime(a.appointment_time)}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {appt.intel_notes && (
        <div className="mb-3.5 rounded-lg bg-primary/5 p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Client intel
          </div>
          <div className="whitespace-pre-wrap text-xs leading-relaxed">{appt.intel_notes}</div>
        </div>
      )}

      {appt.consult_summary && (
        <div className="mb-3.5 rounded-lg bg-primary/5 p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Consult summary
          </div>
          <div className="whitespace-pre-wrap text-xs leading-relaxed">{appt.consult_summary}</div>
        </div>
      )}

      {appt.outcome === "disqualified" && appt.disqualified_reason && (
        <div className="mb-3.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            Disqualified by admin
          </div>
          <div className="whitespace-pre-wrap text-xs leading-relaxed">
            {appt.disqualified_reason}
          </div>
        </div>
      )}

      {/* Conflict check */}
      <div className="mb-3.5 rounded-lg border border-border p-3">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conflict check
        </div>
        <div className="mb-2 text-xs">
          Ex-partner: <span className="font-medium">{appt.ex_partner_name || "—"}</span>
        </div>
        {appt.conflict_status === "flagged" ? (
          <div className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
            Conflict flagged — Bold is reviewing
            {appt.conflict_reason && (
              <div className="mt-1 whitespace-pre-wrap italic">“{appt.conflict_reason}”</div>
            )}
            {isAdmin && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void markClear()}>
                  Mark clear
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void cancelAppt()}>
                  Cancel appointment
                </Button>
              </div>
            )}
          </div>
        ) : isUpcoming && appt.conflict_status === "pending" ? (
          <Button size="sm" variant="outline" onClick={() => setFlagMode(true)}>
            Flag conflict
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground">No conflict flagged.</div>
        )}
      </div>

      <NotesTrail appointmentId={appt.id} isAdmin={isAdmin} />

      <ChaseSection appt={appt} isAdmin={isAdmin} onChange={onChange} />

      {!appt.outcome && appt.status !== "cancelled" && (
        <div className="mt-3.5 flex flex-col gap-2">
          <button
            onClick={() => void markShowed()}
            disabled={savingShow}
            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-left text-sm font-semibold text-primary disabled:opacity-60"
          >
            ✅ Showed up
          </button>
          <button
            onClick={() => setOutcomeMode(true)}
            className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-sm font-semibold text-primary"
          >
            Showed up + add notes / signed
          </button>
          <button
            onClick={() => void noShow()}
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-left text-sm font-semibold text-destructive"
          >
            ❌ No show
          </button>
          <button
            onClick={() => setRescheduleMode(true)}
            className="rounded-lg border border-border bg-muted px-3 py-2.5 text-left text-sm font-semibold"
          >
            📅 Reschedule
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3.5">
          {appt.outcome !== "disqualified" && (
            <Button variant="outline" size="sm" onClick={() => void disqualify()}>
              Disqualify client
            </Button>
          )}
          {appt.status !== "cancelled" && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => void cancelAppt()}
            >
              Cancel appointment
            </Button>
          )}
        </div>
      )}


      {appt.firm_id === TEST_FIRM_ID && (
        <Button
          variant="outline"
          className="mt-4 w-full text-destructive"
          disabled={deleting}
          onClick={() => void deleteDemo()}
        >
          {deleting ? "Deleting…" : "Delete test appointment"}
        </Button>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {outcomeMode && (
        <ConsultOutcomeModal
          appt={appt}
          onClose={() => setOutcomeMode(false)}
          onSaved={() => {
            setOutcomeMode(false);
            onChange();
            onClose();
          }}
        />
      )}
      {rescheduleMode && (
        <RescheduleModal
          appt={appt}
          onClose={() => setRescheduleMode(false)}
          onSaved={() => {
            setRescheduleMode(false);
            onChange();
            onClose();
          }}
        />
      )}
      {flagMode && (
        <FlagConflictModal
          appt={appt}
          onClose={() => setFlagMode(false)}
          onSaved={() => {
            setFlagMode(false);
            onChange();
          }}
        />
      )}
    </ModalShell>
  );
}

function FlagConflictModal({
  appt,
  onClose,
  onSaved,
}: {
  appt: FirmAppointment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const flagConflict = useServerFn(flagConflictFn);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }
    setSaving(true);
    try {
      await flagConflict({ data: { appointmentId: appt.id, reason: trimmed } });
      toast.success("Conflict flagged");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bold-portal firm-portal-ui portal-dialog z-[80]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Flag a conflict</DialogTitle>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the potential conflict…"
          rows={4}
        />
        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Flag conflict"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConsultOutcomeModal({
  appt,
  onClose,
  onSaved,
}: {
  appt: FirmAppointment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const processConsultOutcome = useServerFn(processConsultOutcomeFn);
  const [summary, setSummary] = useState(appt.consult_summary ?? "");
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await processConsultOutcome({
        data: {
          appointmentId: appt.id,
          ...(summary.trim() ? { summary: summary.trim() } : {}),
          signed,
        },
      });
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bold-portal firm-portal-ui portal-dialog z-[80]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>
            How did the appointment go?
          </DialogTitle>
        </DialogHeader>
        <div className="mb-1 text-xs text-muted-foreground">
          {appt.client_name} ·{" "}
          {new Date(appt.appointment_date).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          })}
        </div>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Notes about the consult…"
          rows={4}
          className="mb-3"
        />
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={signed} onCheckedChange={(v) => setSigned(v === true)} />
          <span className="text-sm">The client signed today</span>
        </label>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleModal({
  appt,
  onClose,
  onSaved,
}: {
  appt: FirmAppointment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const rescheduleAppointment = useServerFn(rescheduleAppointmentFn);
  const loadSlots = useServerFn(availableSlotsFn);
  const [date, setDate] = useState<string>(appt.appointment_date);
  const timeInit = parseTimeParts(appt.appointment_time);
  const [time, setTime] = useState<string>(
    timeInit ? `${String(timeInit.h).padStart(2, "0")}:${timeInit.min}` : "09:00",
  );
  const [locationId, setLocationId] = useState(appt.location_id ?? null);
  const offices = useFirmOffices(appt.firm_id);
  const selectedOffice = chosenOfficeId(offices.data ?? [], locationId);
  const [saving, setSaving] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotError, setSlotError] = useState("");
  const [slotRetry, setSlotRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSlotError("");
    setSlots([]);
    loadSlots({ data: { firmId: appt.firm_id, date, ignoreAppointmentId: appt.id } })
      .then((values) => {
        if (!cancelled) setSlots(values.filter((slot) => slot.available));
      })
      .catch(() => {
        if (!cancelled) setSlotError("Could not load available times. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appt.firm_id, appt.id, date, loadSlots, slotRetry]);

  const oldLabel = `${new Date(appt.appointment_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} ${fmtTime(appt.appointment_time)}`;

  const save = async () => {
    if (!date || !time || loadingSlots || !slots.some((slot) => slot.time === time)) {
      toast.error("Pick a date and time");
      return;
    }
    setSaving(true);
    try {
      await rescheduleAppointment({ data: { appointmentId: appt.id, date, time, ...(locationId !== (appt.location_id ?? null) ? { locationId: selectedOffice } : {}) } });
      toast.success("Rescheduled");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bold-portal firm-portal-ui portal-dialog z-[80]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>
            Reschedule appointment
          </DialogTitle>
        </DialogHeader>
        <div className="mb-3 text-xs text-muted-foreground">
          {appt.client_name} · currently {oldLabel}
        </div>
        <div className="flex flex-col gap-3">
          {appt.consult_mode !== "zoom" && <FirmOffices firmId={appt.firm_id} selectedId={selectedOffice} onSelect={setLocationId} disabled={saving} />}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              New date
            </span>
            <Input
              type="date"
              value={date}
              min={sydneyTodayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              New time
            </span>
            <select
              aria-label="New time"
              className="h-10 rounded-md border border-border bg-background px-3"
              value={slots.some((slot) => slot.time === time) ? time : ""}
              disabled={loadingSlots || saving}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="">
                {loadingSlots ? "Loading available times…" : "Select an available time"}
              </option>
              {slots.map((slot) => (
                <option value={slot.time} key={slot.time}>
                  {slot.label}
                </option>
              ))}
            </select>
          </label>
          {slotError ? (
            <p role="alert">
              {slotError} <button onClick={() => setSlotRetry((n) => n + 1)}>Retry</button>
            </p>
          ) : (
            !loadingSlots &&
            slots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No times available on this date. Choose another day.
              </p>
            )
          )}
        </div>
        <div className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Reminder SMSes re-send for the new time.
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || loadingSlots || !slots.some((slot) => slot.time === time)}
          >
            {saving ? "Saving…" : "Save new date"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== AVAILABILITY TAB ============== */

type PendingRange = { startTime: string; endTime: string; alreadyBlocked: boolean };

function AvailabilityTab({
  tradingHours,
  blockedSlots,
  overrides,
  appts,
  firmId,
  firmState,
  isAdmin: _isAdmin,
  onChange,
}: {
  tradingHours: TradingHours[];
  blockedSlots: BlockedSlot[];
  overrides: AvailabilityOverride[];
  appts: FirmAppointment[];
  firmId: string;
  firmState: string | null;
  isAdmin: boolean;
  onChange: () => void;
}) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMonth, setViewMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const pointerType = useRef("mouse");

  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingRange | null>(null);

  const month = viewMonth.getMonth();
  const year = viewMonth.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Match the Sunday-first DAY_SHORT column headings.
  const offset = new Date(year, month, 1).getDay();

  const selectedDow = dayOfWeekSunFirst(selectedDate);
  const selectedDateStr = ymd(selectedDate);
  const baseTH = tradingHours.find((t) => t.day_of_week === selectedDow);
  const selectedOverride = overrides.find((o) => o.override_date === selectedDateStr);
  const selectedTH = effectiveHoursFor(selectedDate, tradingHours, overrides, firmState);
  const existingAppts = useMemo(
    () =>
      appts
        .filter((a) => a.status !== "cancelled" && a.outcome !== "disqualified")
        .map((a) => ({
          appointment_date: a.appointment_date,
          appointment_time: a.appointment_time,
          client_name: a.client_name,
        })),
    [appts],
  );
  const slots: Slot[] = useMemo(
    () =>
      generateSlots(
        selectedDate,
        tradingHours,
        blockedSlots,
        existingAppts,
        overrides,
        firmState,
      ).map((slot) => ({
        ...slot,
        blocked: directlyBlocked(blockedSlots, selectedDate, slot.time),
      })),
    [selectedDate, tradingHours, blockedSlots, existingAppts, overrides, firmState],
  );

  const [openDayModal, setOpenDayModal] = useState(false);

  const recurring = useMemo(
    () =>
      blockedSlots
        .filter((b) => b.is_recurring)
        .sort((a, b) => {
          const ad = a.recur_day_of_week ?? 0;
          const bd = b.recur_day_of_week ?? 0;
          if (ad !== bd) return ad - bd;
          return a.start_time.localeCompare(b.start_time);
        }),
    [blockedSlots],
  );

  const rangeIndices = (): [number, number] | null => {
    if (dragStart == null || dragEnd == null) return null;
    return [Math.min(dragStart, dragEnd), Math.max(dragStart, dragEnd)];
  };
  const inDragRange = (i: number) => {
    const r = rangeIndices();
    return !!r && i >= r[0] && i <= r[1];
  };

  const onSlotPointerDown = (i: number, slot: Slot) => {
    if (slot.booked) return;
    setDragStart(i);
    setDragEnd(i);
  };
  const onSlotPointerEnter = (i: number) => {
    if (dragStart == null) return;
    setDragEnd(i);
  };

  useEffect(() => {
    if (dragStart == null) return;
    const handler = () => {
      const r = rangeIndices();
      if (!r) {
        setDragStart(null);
        setDragEnd(null);
        return;
      }
      const [a, b] = r;
      const first = slots[a];
      const last = slots[b];
      if (!first || !last) {
        setDragStart(null);
        setDragEnd(null);
        return;
      }
      for (let i = a; i <= b; i++) {
        if (slots[i]?.booked) {
          setDragStart(null);
          setDragEnd(null);
          toast.error("Selection includes a booked appointment");
          return;
        }
      }
      const dur = selectedTH?.consult_duration_mins ?? 15;
      const parts = last.time.split(":").map(Number);
      const lh = parts[0] ?? 0;
      const lm = parts[1] ?? 0;
      const endMin = lh * 60 + lm + dur;
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      const allBlocked = slots.slice(a, b + 1).every((s) => s.blocked);
      setPending({ startTime: first.time, endTime, alreadyBlocked: allBlocked });
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener("pointerup", handler);
    return () => window.removeEventListener("pointerup", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragStart, dragEnd, slots, selectedTH]);

  const unblockRange = async (
    startTime: string,
    endTime: string,
    repeat: BlockRepeat,
    until: string,
  ) => {
    const ids = matchingBlockIds(blockedSlots, selectedDateStr, startTime, endTime, repeat, until);
    if (!ids.length) throw new Error("No matching blocks found. Refresh and try again.");
    const { error } = await supabase
      .from("firm_blocked_slots")
      .delete()
      .eq("firm_id", firmId)
      .in("id", ids);
    if (error) throw new Error(error.message);
    toast.success("Selected time blocks removed");
    onChange();
  };

  const closeWholeDay = async () => {
    if (!selectedTH || selectedTH.is_closed) return;
    try {
      const allBlocked = slots.length > 0 && slots.every((s) => s.blocked);
      if (allBlocked) {
        if (
          !confirm(
            "Reopen this day? Matching recurring blocks will be removed for their entire series.",
          )
        )
          return;
        await unblockRange(selectedTH.open_time, selectedTH.close_time, "none", selectedDateStr);
      } else {
        const { error } = await supabase.from("firm_blocked_slots").insert({
          firm_id: firmId,
          date: selectedDateStr,
          start_time: selectedTH.open_time,
          end_time: selectedTH.close_time,
          is_recurring: false,
        });
        if (error) throw new Error(error.message);
        onChange();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this day");
    }
  };

  const removeOpenOverride = async () => {
    if (!selectedOverride) return;
    const { error } = await supabase
      .from("firm_availability")
      .delete()
      .eq("override_date", selectedDateStr)
      .eq("firm_id", firmId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Day closed again");
    onChange();
  };

  const baseClosed = !baseTH || baseTH.is_closed;
  const isClosedDay = !selectedTH || selectedTH.is_closed;
  const allBlocked = !isClosedDay && slots.length > 0 && slots.every((s) => s.blocked);

  return (
    <div className="grid min-w-0 gap-5 py-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* LEFT — calendar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous month"
            onClick={() =>
              setViewMonth((d) => {
                const n = new Date(d);
                n.setMonth(n.getMonth() - 1);
                return n;
              })
            }
          >
            ‹
          </Button>
          <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            {MONTHS[month]} {year}
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next month"
            onClick={() =>
              setViewMonth((d) => {
                const n = new Date(d);
                n.setMonth(n.getMonth() + 1);
                return n;
              })
            }
          >
            ›
          </Button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_SHORT.map((d) => (
            <div
              key={d}
              className="p-1 text-center text-[10px] font-semibold text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => (
            <div key={`o${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const date = new Date(year, month, day);
            const summary = summarizeDay(
              date,
              tradingHours,
              blockedSlots,
              existingAppts,
              overrides,
              firmState,
            );
            const dateStr = ymd(date);
            const isSelected = dateStr === ymd(selectedDate);
            const isToday = dateStr === ymd(today);
            let cls = "border-border bg-card";
            if (summary.closed) cls = "border-border bg-muted text-muted-foreground";
            else if (summary.allBlocked)
              cls = "border-destructive/50 bg-destructive/10 text-destructive";
            else if (summary.someBlocked)
              cls = "border-amber-500/50 bg-amber-500/10 text-amber-600";
            if (isSelected || isToday) cls += " ring-2 ring-primary";
            return (
              <button
                key={day}
                aria-label={date.toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(date)}
                className={`rounded-lg border py-2.5 text-sm font-semibold ${cls}`}
              >
                {day}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-1.5 text-[11px] text-muted-foreground">
          <LegendDot className="border-border bg-muted" label="Firm closed" />
          <LegendDot className="border-amber-500/50 bg-amber-500/10" label="Some slots blocked" />
          <LegendDot className="border-destructive/50 bg-destructive/10" label="Fully closed" />
          <LegendDot className="border-primary bg-card" label="Today / selected" />
        </div>
        <div className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Contact Bold to change weekly hours.
        </div>
      </div>

      {/* RIGHT — slot editor */}
      <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Editing
            </div>
            <div className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {DAY_SHORT[selectedDow]} {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}{" "}
              {selectedDate.getFullYear()}
            </div>
          </div>
          {!isClosedDay && !selectedOverride && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive"
              onClick={() => void closeWholeDay()}
            >
              {allBlocked ? "Reopen day" : "Close whole day"}
            </Button>
          )}
          {selectedOverride?.override_type === "open" && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive"
              onClick={() => void removeOpenOverride()}
            >
              Close again
            </Button>
          )}
        </div>

        {isClosedDay ? (
          (() => {
            const holidayName = holidayLabelFor(selectedDate, overrides, firmState);
            return (
              <div
                className={`rounded-lg border p-6 text-center ${holidayName ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-muted"}`}
              >
                {holidayName ? (
                  <>
                    <div className="mb-1.5 text-sm font-bold text-amber-600">
                      Public holiday — {holidayName}
                    </div>
                    <div className="mb-3.5 text-xs text-muted-foreground">
                      Your firm is closed by default on public holidays. You can choose to open this
                      day if you'll be trading.
                    </div>
                    <Button onClick={() => setOpenDayModal(true)}>Open this day</Button>
                  </>
                ) : (
                  <>
                    <div className="mb-3.5 text-sm text-muted-foreground">
                      Your firm is normally closed on{" "}
                      <strong className="text-foreground">{DAY_NAMES[selectedDow]}s</strong>.
                    </div>
                    {baseClosed ? (
                      <Button onClick={() => setOpenDayModal(true)}>Open this day</Button>
                    ) : (
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        Contact Bold to change your weekly trading hours.
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()
        ) : (
          <>
            <div className="grid select-none grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s, i) => {
                const dragging = inDragRange(i);
                let cls = "border-border bg-card";
                if (s.booked) cls = "border-primary/40 bg-primary/10 text-primary";
                else if (s.blocked)
                  cls = "border-destructive/40 bg-destructive/10 text-destructive";
                if (dragging && !s.booked)
                  cls = "border-2 border-destructive bg-destructive/20 text-destructive";
                return (
                  <button
                    key={s.time}
                    onPointerDown={(e) => {
                      pointerType.current = e.pointerType;
                      if (e.pointerType === "mouse") {
                        e.preventDefault();
                        onSlotPointerDown(i, s);
                      }
                    }}
                    onPointerEnter={() => onSlotPointerEnter(i)}
                    onPointerCancel={() => {
                      setDragStart(null);
                      setDragEnd(null);
                    }}
                    onClick={(e) => {
                      if (pointerType.current === "mouse" && e.detail !== 0) return;
                      const end =
                        hhmmToMinLocal(s.time) + (selectedTH?.consult_duration_mins ?? 15);
                      setPending({
                        startTime: s.time,
                        endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
                        alreadyBlocked: s.blocked,
                      });
                    }}
                    aria-label={`${s.label}, ${s.booked ? "booked" : s.blocked ? "unavailable, tap to reopen" : !s.available ? "consultation overlaps time off, tap to block this time" : "available, tap to block"}`}
                    disabled={s.booked}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2.5 text-sm font-semibold ${cls} ${s.booked ? "opacity-85" : ""}`}
                  >
                    <span>{s.label}</span>
                    {!s.available && !s.blocked && !s.booked && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        Overlaps time off
                      </span>
                    )}
                    {s.booked && s.clientName && (
                      <span className="text-[10px] font-medium opacity-80">
                        {s.clientName.split(" ")[0]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg bg-primary/5 p-3.5 text-xs leading-relaxed">
              <strong>Manage time off:</strong> Tap a time to block or reopen it. On a computer,
              drag across times to select a range ({fmtTime(selectedTH!.open_time)}–
              {fmtTime(selectedTH!.close_time)}). You can repeat the block daily, weekly or monthly.
            </div>
          </>
        )}

        <RecurringBlocks recurring={recurring} firmId={firmId} onChange={onChange} />
      </div>

      {pending && (
        <BlockRangeModal
          startTime={pending.startTime}
          endTime={pending.endTime}
          startDate={selectedDateStr}
          alreadyBlocked={pending.alreadyBlocked}
          firmId={firmId}
          onClose={() => setPending(null)}
          onUnblock={async (repeat, until) => {
            await unblockRange(pending.startTime, pending.endTime, repeat, until);
            setPending(null);
          }}
          onSaved={() => {
            setPending(null);
            onChange();
          }}
        />
      )}

      {openDayModal && (
        <OpenDayModal
          dateStr={selectedDateStr}
          dayName={DAY_NAMES[selectedDow] ?? ""}
          firmId={firmId}
          onClose={() => setOpenDayModal(false)}
          onSaved={() => {
            setOpenDayModal(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function hhmmToMinLocal(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return 0;
  return parseInt(m[1] ?? "0", 10) * 60 + parseInt(m[2] ?? "0", 10);
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3.5 w-3.5 rounded border ${className}`} />
      {label}
    </div>
  );
}

function BlockRangeModal({
  startTime,
  endTime,
  startDate,
  alreadyBlocked,
  firmId,
  onClose,
  onUnblock,
  onSaved,
}: {
  startTime: string;
  endTime: string;
  startDate: string;
  alreadyBlocked: boolean;
  firmId: string;
  onClose: () => void;
  onUnblock: (repeat: BlockRepeat, until: string) => Promise<void>;
  onSaved: () => void;
}) {
  type Repeat = "none" | "daily" | "weekly" | "monthly";
  const [repeat, setRepeat] = useState<Repeat>("none");
  const defaultUntil = useMemo(() => {
    const parts = startDate.split("-").map(Number);
    const dt = new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
    dt.setMonth(dt.getMonth() + 3);
    return ymdLocal(dt);
  }, [startDate]);
  const [until, setUntil] = useState<string>(defaultUntil);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const row = makeAvailabilityBlock(firmId, startDate, startTime, endTime, repeat, until);
      const { error } = await supabase.from("firm_blocked_slots").insert(row);
      if (error) throw new Error(error.message);
      toast.success(repeat === "none" ? "Time blocked" : "Repeating time block saved");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save time block");
    } finally {
      setSaving(false);
    }
  };

  const unblock = async () => {
    setSaving(true);
    try {
      if (repeat !== "none" && (!until || until < startDate))
        throw new Error("Choose a valid end date");
      await onUnblock(repeat, until);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unblock time");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const hh = h ?? 0;
    const ap = hh >= 12 ? "pm" : "am";
    const hh12 = hh % 12 || 12;
    return `${hh12}:${String(m ?? 0).padStart(2, "0")}${ap}`;
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bold-portal firm-portal-ui portal-dialog z-[80]">
        {alreadyBlocked ? (
          <>
            <DialogHeader>
              <DialogTitle>Unblock this range?</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              {fmt(startTime)}–{fmt(endTime)} will be reopened. If this time belongs to a recurring
              block, its entire series will be removed. For older repeated blocks, select daily,
              weekly or monthly below.
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(["none", "daily", "weekly", "monthly"] as Repeat[]).map((r) => (
                <Button
                  key={r}
                  variant={repeat === r ? "default" : "outline"}
                  onClick={() => setRepeat(r)}
                >
                  {r === "none" ? "This block" : r}
                </Button>
              ))}
            </div>
            {repeat !== "none" && (
              <Input
                aria-label="Unblock through date"
                type="date"
                min={startDate}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            )}
            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void unblock()}>
                {saving ? "Unblocking…" : "Unblock"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Block time off</DialogTitle>
            </DialogHeader>
            <div className="mb-3 text-sm text-muted-foreground">
              <strong className="text-foreground">
                {fmt(startTime)} – {fmt(endTime)}
              </strong>{" "}
              on {startDate}
            </div>

            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Repeat
            </div>
            <div className="mb-3.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(["none", "daily", "weekly", "monthly"] as Repeat[]).map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={repeat === r ? "default" : "outline"}
                  onClick={() => setRepeat(r)}
                >
                  {r === "none" ? "Just once" : r}
                </Button>
              ))}
            </div>

            {repeat !== "none" && (
              <>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Until
                </div>
                <Input
                  type="date"
                  value={until}
                  min={startDate}
                  onChange={(e) => setUntil(e.target.value)}
                  className="mb-2"
                />
                <div className="mb-3.5 text-[11px] text-muted-foreground">
                  One block per{" "}
                  {repeat === "daily" ? "day" : repeat === "weekly" ? "week" : "month"} until{" "}
                  {until}. Closed days are skipped.
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Block time"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function describeRecurring(r: BlockedSlot): string {
  const time = `${fmtTime(r.start_time)}–${fmtTime(r.end_time)}`;
  const pattern = r.recur_pattern ?? "weekly";
  const until = r.recur_until ? ` (until ${r.recur_until})` : "";

  if (pattern === "daily") return `Every day · ${time}${until}`;

  if (pattern === "weekly") {
    const days =
      r.recur_days_of_week && r.recur_days_of_week.length > 0
        ? r.recur_days_of_week
        : r.recur_day_of_week != null
          ? [r.recur_day_of_week]
          : [];
    const sorted = [...days].sort((a, b) => a - b);
    const label =
      sorted.length === 7
        ? "Every day"
        : sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)
          ? "Weekdays"
          : sorted.length === 2 && sorted.includes(0) && sorted.includes(6)
            ? "Weekends"
            : `Every ${sorted.map((d) => DAY_SHORT[d]).join(", ")}`;
    return `${label} · ${time}${until}`;
  }

  if (pattern === "monthly_date") {
    const d = r.recur_day_of_month ?? 1;
    const suf =
      d % 10 === 1 && d !== 11
        ? "st"
        : d % 10 === 2 && d !== 12
          ? "nd"
          : d % 10 === 3 && d !== 13
            ? "rd"
            : "th";
    return `Monthly on the ${d}${suf} · ${time}${until}`;
  }

  if (pattern === "monthly_nth_dow") {
    const nth = r.recur_nth_week ?? 1;
    const nthLabel = nth === 5 ? "last" : (["1st", "2nd", "3rd", "4th"][nth - 1] ?? `${nth}th`);
    const dayName = DAY_NAMES[r.recur_day_of_week ?? 0];
    return `Monthly on the ${nthLabel} ${dayName} · ${time}${until}`;
  }

  return `${time}${until}`;
}

type AddPattern = "daily" | "weekly" | "monthly_date" | "monthly_nth_dow";

function RecurringBlocks({
  recurring,
  firmId,
  onChange,
}: {
  recurring: BlockedSlot[];
  firmId: string;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [pattern, setPattern] = useState<AddPattern>("weekly");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([0]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [nthWeek, setNthWeek] = useState<number>(1);
  const [nthDow, setNthDow] = useState<number>(0);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [until, setUntil] = useState<string>("");

  const resetForm = () => {
    setPattern("weekly");
    setWeeklyDays([0]);
    setDayOfMonth(1);
    setNthWeek(1);
    setNthDow(0);
    setStart("12:00");
    setEnd("13:00");
    setUntil("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("firm_blocked_slots").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange();
  };

  const toggleDay = (d: number) => {
    setWeeklyDays((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b),
    );
  };

  const save = async () => {
    if (start >= end) {
      toast.error("End time must be after start time");
      return;
    }

    const row: {
      firm_id: string;
      date: string;
      start_time: string;
      end_time: string;
      is_recurring: true;
      recur_pattern: AddPattern;
      recur_until: string | null;
      recur_day_of_week: number | null;
      recur_days_of_week: number[] | null;
      recur_day_of_month: number | null;
      recur_nth_week: number | null;
    } = {
      firm_id: firmId,
      // Recurring rows still need an anchor date; recurrence drives matching.
      date: sydneyTodayISO(),
      start_time: start,
      end_time: end,
      is_recurring: true,
      recur_pattern: pattern,
      recur_until: until || null,
      recur_day_of_week: null,
      recur_days_of_week: null,
      recur_day_of_month: null,
      recur_nth_week: null,
    };

    if (pattern === "weekly") {
      if (weeklyDays.length === 0) {
        toast.error("Pick at least one weekday");
        return;
      }
      row.recur_days_of_week = weeklyDays;
      row.recur_day_of_week = weeklyDays[0] ?? 0;
    } else if (pattern === "monthly_date") {
      if (dayOfMonth < 1 || dayOfMonth > 31) {
        toast.error("Day of month must be 1–31");
        return;
      }
      row.recur_day_of_month = dayOfMonth;
    } else if (pattern === "monthly_nth_dow") {
      row.recur_nth_week = nthWeek;
      row.recur_day_of_week = nthDow;
    }

    const { error } = await supabase.from("firm_blocked_slots").insert(row);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdding(false);
    resetForm();
    onChange();
  };

  const sortedRecurring = [...recurring].sort((a, b) => {
    const pa = a.recur_pattern ?? "weekly";
    const pb = b.recur_pattern ?? "weekly";
    if (pa !== pb) return pa.localeCompare(pb);
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-sm font-semibold">Recurring blocks</div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            + Add recurring block
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-3 rounded-lg border border-border bg-muted p-3.5">
          <div className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">Repeats</div>
          <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(
              [
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["monthly_date", "Monthly (date)"],
                ["monthly_nth_dow", "Monthly (nth day)"],
              ] as [AddPattern, string][]
            ).map(([p, label]) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={pattern === p ? "default" : "outline"}
                onClick={() => setPattern(p)}
              >
                {label}
              </Button>
            ))}
          </div>

          {pattern === "weekly" && (
            <div className="mb-3">
              <div className="mb-1.5 text-[11px] font-bold uppercase text-muted-foreground">
                On days
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAY_SHORT.map((d, i) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={weeklyDays.includes(i) ? "default" : "outline"}
                    onClick={() => toggleDay(i)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {pattern === "monthly_date" && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm">On the</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value || "1", 10))}
                className="w-16"
              />
              <span className="text-sm">of each month</span>
            </div>
          )}

          {pattern === "monthly_nth_dow" && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm">On the</span>
              <select
                value={nthWeek}
                onChange={(e) => setNthWeek(parseInt(e.target.value, 10))}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                <option value={1}>1st</option>
                <option value={2}>2nd</option>
                <option value={3}>3rd</option>
                <option value={4}>4th</option>
                <option value={5}>Last</option>
              </select>
              <select
                value={nthDow}
                onChange={(e) => setNthDow(parseInt(e.target.value, 10))}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-sm">of each month</span>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm">From</span>
            <Input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-auto"
            />
            <span className="text-sm">to</span>
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-auto"
            />
            <span className="ml-2 text-sm">Until (optional)</span>
            <Input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="w-auto"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={() => void save()}>
              Save recurring block
            </Button>
          </div>
        </div>
      )}

      {sortedRecurring.length === 0 && !adding ? (
        <div className="text-xs italic text-muted-foreground">
          No recurring blocks — e.g. add a daily lunch break.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sortedRecurring.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2"
            >
              <span className="text-xs font-medium">{describeRecurring(r)}</span>
              <button
                onClick={() => r.id && void remove(r.id)}
                title="Remove"
                className="p-1 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============== ADD APPOINTMENT (admin) ============== */

function AddAppointmentModal({
  firmId,
  onClose,
  onSaved,
}: {
  firmId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [locationId, setLocationId] = useState<string | null>(null);
  const offices = useFirmOffices(firmId);
  const selectedOffice = chosenOfficeId(offices.data ?? [], locationId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [exPartner, setExPartner] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !date || !time || !selectedOffice || offices.isPending || offices.isError) {
      toast.error("Name, office, date and time are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("firm_appointments").insert({
      firm_id: firmId,
      location_id: selectedOffice,
      client_name: name.trim(),
      client_phone: phone.trim() || null,
      client_email: email.trim() || null,
      ex_partner_name: exPartner.trim() || null,
      appointment_date: date,
      appointment_time: time,
      intel_notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Appointment added");
    onSaved();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bold-portal firm-portal-ui portal-dialog z-[80]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Add appointment</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[65vh] flex-col gap-2.5 overflow-y-auto">
          <FirmOffices firmId={firmId} selectedId={selectedOffice} onSelect={setLocationId} disabled={saving} />
          <Input
            placeholder="Client name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Ex-partner full name"
            value={exPartner}
            onChange={(e) => setExPartner(e.target.value)}
          />
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              aria-label="Appointment date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 w-full"
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="min-w-0 w-full"
            />
          </div>
          <Textarea
            placeholder="Intel notes (visible to firm)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Add appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== OPEN DAY MODAL ============== */

function OpenDayModal({
  dateStr,
  dayName,
  firmId,
  onClose,
  onSaved,
}: {
  dateStr: string;
  dayName: string;
  firmId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (start >= end) {
      toast.error("End time must be after start time");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("firm_availability").insert({
      firm_id: firmId,
      override_date: dateStr,
      override_type: "open",
      start_time: start,
      end_time: end,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Day opened");
    onSaved();
  };

  const prettyDate = new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bold-portal firm-portal-ui portal-dialog z-[80]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Open this day</DialogTitle>
        </DialogHeader>
        <div className="mb-3 text-xs text-muted-foreground">
          {prettyDate} — normally closed ({dayName}s)
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm">Open from</span>
          <Input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-auto"
          />
          <span className="text-sm">to</span>
          <Input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="mb-3 text-xs leading-relaxed text-muted-foreground">
          This opens bookings for this one day only. Your normal weekly hours are unchanged.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Open day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== SHARED MODAL SHELL ============== */

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        ref={contentRef}
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className="bold-portal firm-portal-ui portal-dialog z-[70] block"
      >
        <DialogTitle className="sr-only">Appointment details</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
