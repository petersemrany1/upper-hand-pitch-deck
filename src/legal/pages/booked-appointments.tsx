// Ported from the Legal app (family-law-floater/src/routes/_authenticated/booked-appointments.tsx). Re-run the port script to refresh.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/legal/runtime/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  MoreHorizontal,
  Search,
  Phone,
  PhoneOff,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/legal/components/ui/dropdown-menu";
import { Input } from "@/legal/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import { supabase } from "@/legal/integrations/supabase/client";
import { markRefundedFn } from "@/legal/lib/appointments-admin.functions";
import {
  addAppointmentNoteFn,
  cancelAppointmentFn,
  clearConflictFn,
  disqualifyAppointmentFn,
  markNoShowFn,
  processConsultOutcomeFn,
  rescheduleAppointmentFn,
} from "@/legal/lib/firm-portal.functions";
import { FirmReminderSettings } from "@/legal/components/appointments/reminder-settings";
import { CallTodayCard } from "@/legal/components/appointments/call-today-card";
import {
  appointmentCallTask,
  appointmentTimestamp,
  consultationDay,
} from "@/legal/lib/appointment-call-list";
import { AttendanceDetail } from "@/legal/components/appointments/attendance-detail";
import {
  getAppointmentRemindersFn,
  recordAttendanceCallFn,
} from "@/legal/lib/appointment-reminders.functions";
import { localDate } from "@/legal/lib/appointment-reminders";
import type { ReminderJob } from "@/legal/lib/appointment-reminders";
import { useDialler } from "@/legal/hooks/use-dialler";
import { sydneyTodayISO } from "@/legal/lib/timezone";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { BookedAppointmentsPage as LegalPage };
export const Route = legalRoute({
  validateSearch: (search: Record<string, unknown>): { appointment?: string } =>
    typeof search["appointment"] === "string" && /^[0-9a-f-]{36}$/i.test(search["appointment"])
      ? { appointment: search["appointment"] }
      : {},
  head: () => ({
    meta: [
      { title: "Booked Appointments — Legal Group Portal" },
      { name: "description", content: "Consults booked with partner firms and their outcomes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookedAppointmentsPage,
});

type Appt = {
  id: string;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string;
  consult_mode: string | null;
  location_name: string | null;
  outcome: string | null;
  refund_status: string | null;
  refund_processed_at: string | null;
  conflict_status: string;
  chase_status: string | null;
  client_name: string | null;
  client_phone: string | null;
  notes: string | null;
  consult_summary: string | null;
  created_at: string;
  lead_id: string | null;
  firm_id: string | null;
  firms: { firm_name: string | null } | null;
  firm_lawyers: { name: string | null } | null;
  client_leads: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    deposit_paid_at: string | null;
    deposit_amount: number | null;
    stripe_payment_intent_id: string | null;
    sales_reps: { name: string | null } | null;
  } | null;
};

async function fetchAppointments(): Promise<Appt[]> {
  const { data, error } = await supabase
    .from("firm_appointments")
    .select(
      "id, appointment_date, appointment_time, status, consult_mode, location_name, outcome, refund_status, refund_processed_at, conflict_status, chase_status, client_name, client_phone, notes, consult_summary, created_at, lead_id, firm_id, firms(firm_name), firm_lawyers(name), client_leads(first_name, last_name, phone, deposit_paid_at, deposit_amount, stripe_payment_intent_id, sales_reps(name))",
    )
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Appt[];
}

type View =
  "today" | "upcoming" | "attention" | "past" | "all" | "calls" | "awaiting" | "confirmed";

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "grey" | "blue" | "green" | "amber" | "red";
}) {
  const cls = {
    grey: "bg-muted text-muted-foreground",
    blue: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    red: "bg-red-500/10 text-red-700",
  }[tone];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function clientName(a: Appt): string {
  return (
    a.client_name?.trim() ||
    [a.client_leads?.first_name, a.client_leads?.last_name].filter(Boolean).join(" ") ||
    "Unknown client"
  );
}
function isTest(a: Appt): boolean {
  return /\btest\b/i.test(clientName(a));
}
function deposit(a: Appt): {
  label: string;
  tone: "green" | "amber" | "grey";
  provider: "square" | "stripe" | "manual" | "none";
} {
  const l = a.client_leads;
  if (!l?.deposit_paid_at) return { label: "No deposit", tone: "grey", provider: "none" };
  const amt = `$${l.deposit_amount ?? 75}`;
  const id = l.stripe_payment_intent_id ?? "";
  if (!id) return { label: `${amt} manual`, tone: "amber", provider: "manual" };
  if (/^(pi_|ch_|cs_)/.test(id))
    return { label: `${amt} Stripe`, tone: "green", provider: "stripe" };
  return { label: `${amt} Square`, tone: "green", provider: "square" };
}
function outcomeChip(a: Appt): {
  label: string;
  tone: "grey" | "blue" | "green" | "amber" | "red";
} {
  if (a.status === "cancelled") return { label: "Cancelled", tone: "grey" };
  switch (a.outcome) {
    case "show":
      return { label: "Attended", tone: "green" };
    case "noshow":
      return { label: "No-show", tone: "red" };
    case "disqualified":
      return { label: "Disqualified", tone: "amber" };
    default:
      return { label: "Booked", tone: "blue" };
  }
}
function refundChip(a: Appt): { label: string; tone: "grey" | "green" | "amber" | "red" } | null {
  switch (a.refund_status) {
    case "refunded":
      return { label: "Refunded", tone: "green" };
    case "failed":
      return { label: "Refund failed", tone: "red" };
    case "manual":
      return { label: "Refund manually", tone: "amber" };
    default:
      return null;
  }
}
function needsAttention(a: Appt, today: string): boolean {
  if (a.status === "cancelled" || isTest(a)) return false;
  const past = Boolean(a.appointment_date && a.appointment_date < today);
  if (past && !a.outcome) return true;
  if (a.refund_status === "failed" || a.refund_status === "manual") return true;
  if (a.conflict_status === "conflict") return true;
  if (a.chase_status === "requested") return true;
  return false;
}
function fmtDate(d: string | null): string {
  if (!d) return "No date";
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BookedAppointmentsPage() {
  const qc = useQueryClient();
  const { appointment: selectedAppointment } = Route.useSearch();
  const dialler = useDialler();
  const [callingName, setCallingName] = useState("");
  const [view, setView] = useState<View>(selectedAppointment ? "all" : "calls");
  const [firm, setFirm] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showTests, setShowTests] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = sydneyTodayISO(now);

  const appts = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: fetchAppointments,
    refetchInterval: 60_000,
  });
  const reminders = useQuery({
    queryKey: ["appointment-attendance"],
    queryFn: () => getAppointmentRemindersFn(),
    refetchInterval: 30_000,
  });
  const attendanceByAppt = useMemo(
    () => new Map((reminders.data?.attendance ?? []).map((s) => [s.appointment_id, s])),
    [reminders.data],
  );
  const settingsByFirm = useMemo(
    () => new Map((reminders.data?.settings ?? []).map((s) => [s.firm_id, s])),
    [reminders.data],
  );
  const jobsByAppt = useMemo(() => {
    const m = new Map<string, ReminderJob[]>();
    for (const job of reminders.data?.jobs ?? [])
      m.set(job.appointment_id, [...(m.get(job.appointment_id) ?? []), job]);
    return m;
  }, [reminders.data]);
  const timezoneFor = (a: Appt) =>
    settingsByFirm.get(a.firm_id ?? "")?.timezone ?? "Australia/Sydney";
  const firmToday = (a: Appt) => localDate(now, timezoneFor(a));
  const tasksByAppt = useMemo(
    () =>
      new Map(
        (appts.data ?? []).map((a) => [
          a.id,
          appointmentCallTask({
            appointment: a,
            attendance: attendanceByAppt.get(a.id),
            settings: settingsByFirm.get(a.firm_id ?? ""),
            jobs: jobsByAppt.get(a.id) ?? [],
            now,
          }),
        ]),
      ),
    [appts.data, attendanceByAppt, settingsByFirm, jobsByAppt, now],
  );
  const needsCall = (a: Appt) => tasksByAppt.get(a.id)?.timing === "now";
  const overdueFor = (a: Appt) =>
    a.status === "booked" &&
    !a.outcome &&
    (jobsByAppt.get(a.id) ?? []).some(
      (j) =>
        j.booking_version === attendanceByAppt.get(a.id)?.booking_version &&
        ["failed", "uncertain"].includes(j.state),
    );
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    void qc.invalidateQueries({ queryKey: ["appointment-attendance"] });
  };
  const act = useMutation({
    mutationFn: async (job: () => Promise<unknown>) => job(),
    onSuccess: () => {
      toast.success("Done");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const run = (job: () => Promise<unknown>) => act.mutate(job);

  const firms = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of appts.data ?? [])
      if (a.firm_id && a.firms?.firm_name) m.set(a.firm_id, a.firms.firm_name);
    return Array.from(m.entries()).sort((x, y) => x[1].localeCompare(y[1]));
  }, [appts.data]);

  const scopedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (appts.data ?? []).filter(
      (a) =>
        (showTests || !isTest(a)) &&
        (!selectedAppointment || a.id === selectedAppointment) &&
        (firm === "all" || a.firm_id === firm) &&
        (!q ||
          `${clientName(a)} ${a.client_phone ?? ""} ${a.client_leads?.phone ?? ""} ${a.firms?.firm_name ?? ""} ${a.firm_lawyers?.name ?? ""}`
            .toLowerCase()
            .includes(q)),
    );
  }, [appts.data, search, showTests, selectedAppointment, firm]);
  const upcoming = (a: Appt) =>
    a.status === "booked" &&
    !a.outcome &&
    (appointmentTimestamp(a, timezoneFor(a)) ?? 0) > now.getTime();
  const goingToday = (a: Appt) => a.status !== "cancelled" && a.appointment_date === firmToday(a);
  const callNowCount = scopedRows.filter(needsCall).length;
  const laterCount = scopedRows.filter((a) => tasksByAppt.get(a.id)?.timing === "later").length;
  const attentionCount = scopedRows.filter((a) => needsAttention(a, today) || overdueFor(a)).length;
  const rows = scopedRows
    .filter((a) => {
      if (view === "calls") return Boolean(tasksByAppt.get(a.id));
      if (view === "today") return goingToday(a);
      if (view === "upcoming") return upcoming(a);
      if (view === "attention") return needsAttention(a, today) || overdueFor(a);
      if (view === "past")
        return (appointmentTimestamp(a, timezoneFor(a)) ?? Infinity) <= now.getTime();
      if (view === "awaiting")
        return upcoming(a) && attendanceByAppt.get(a.id)?.status === "awaiting";
      if (view === "confirmed")
        return upcoming(a) && attendanceByAppt.get(a.id)?.status === "confirmed";
      return true;
    })
    .sort((a, b) => {
      const timeA = appointmentTimestamp(a, timezoneFor(a)) ?? Infinity;
      const timeB = appointmentTimestamp(b, timezoneFor(b)) ?? Infinity;
      return view === "past" || view === "all" ? timeB - timeA : timeA - timeB;
    });
  const callClient = (a: Appt) => {
    setCallingName(clientName(a));
    void dialler.startCall({
      to: (a.client_phone || a.client_leads?.phone)!,
      leadId: a.lead_id!,
      repId: reminders.data?.repId ?? null,
    });
  };
  const recordCallOutcome = (a: Appt, outcome: "confirmed" | "no_answer" | "voicemail") =>
    run(() =>
      recordAttendanceCallFn({
        data: {
          appointmentId: a.id,
          version: attendanceByAppt.get(a.id)!.booking_version,
          outcome,
        },
      }),
    );
  const dashboardReady =
    Boolean(appts.data && reminders.data) && !appts.isError && !reminders.isError;

  // Group by date for scanning.
  const groups = useMemo(() => {
    const m = new Map<string, Appt[]>();
    for (const a of rows) {
      const k = a.appointment_date ?? "";
      (m.get(k) ?? m.set(k, []).get(k)!).push(a);
    }
    return Array.from(m.entries());
  }, [rows]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Booked Appointments
          </h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {appts.isFetching ? "Refreshing…" : `${rows.length} shown`}
        </p>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {now.toLocaleDateString("en-AU", {
          timeZone: "Australia/Sydney",
          weekday: "long",
          day: "numeric",
          month: "long",
        })}{" "}
        · Start with the clients who need a call.
      </p>
      {!selectedAppointment ? (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {(
            [
              [
                "calls",
                "Call today",
                callNowCount,
                laterCount
                  ? `${laterCount} more may need a call later today`
                  : "Clients to confirm by phone",
              ],
              [
                "today",
                "Going in today",
                scopedRows.filter(goingToday).length,
                "Today's consultations and times",
              ],
              [
                "upcoming",
                "Coming up",
                scopedRows.filter(upcoming).length,
                "All future consultations",
              ],
            ] as const
          ).map(([key, label, count, description]) => (
            <button
              key={key}
              aria-label={`${label} (${dashboardReady ? count : "loading"})`}
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`flex flex-col-reverse items-start justify-between gap-2 rounded-xl border p-3 text-left sm:flex-row sm:items-center sm:gap-3 sm:p-4 transition-colors ${view === key ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card hover:bg-muted/40"}`}
            >
              <span>
                <span className="block text-xs font-semibold sm:text-sm">{label}</span>
                <span className="mt-1 hidden text-xs text-muted-foreground sm:block">
                  {description}
                </span>
              </span>
              <span
                className={`text-2xl font-bold tabular-nums sm:text-3xl ${view === key ? "text-primary" : ""}`}
              >
                {dashboardReady ? count : "—"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {reminders.isError ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          Reminder settings could not load: {reminders.error.message}.{" "}
          <button type="button" className="underline" onClick={() => void reminders.refetch()}>
            Retry
          </button>
        </div>
      ) : null}
      {selectedAppointment ? (
        <p className="mt-4 text-sm">
          Showing the appointment from your alert.{" "}
          <Link to="/booked-appointments" search={{ biz: "legal", ...({}) } as never} className="text-primary underline">
            Show all appointments
          </Link>
        </p>
      ) : null}
      {dialler.status !== "idle" ? (
        <div
          className="sticky top-2 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-lg"
          role="status"
        >
          <Phone className="h-4 w-4 text-primary" />
          <span className="text-sm">
            {callingName} · {dialler.status} · {dialler.seconds}s
          </span>
          <Button variant="outline" size="sm" onClick={dialler.toggleMute}>
            {dialler.muted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="destructive" size="sm" onClick={dialler.hangUp}>
            <PhoneOff className="mr-1 h-4 w-4" /> End call
          </Button>
        </div>
      ) : null}
      <details
        key={view}
        open={view !== "calls"}
        className="mt-4 rounded-lg border bg-card px-3 py-2"
      >
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          Search & other views{firm !== "all" || search || showTests ? " · Filters applied" : ""}
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={firm} onValueChange={setFirm}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="All firms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All firms</SelectItem>
              {firms.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full min-w-0 sm:w-auto sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, phone, firm…"
              className="h-9 w-full pl-8 text-xs sm:w-64"
            />
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={showTests}
              onChange={(e) => setShowTests(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Show test bookings
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="More appointment views">
          {(
            [
              ["awaiting", "Waiting for a reply"],
              ["confirmed", "Confirmed"],
              ["attention", `Other follow-ups${attentionCount ? ` (${attentionCount})` : ""}`],
              ["past", "Past appointments"],
              ["all", "All appointments"],
            ] as [View, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </details>
      {view === "calls" ? (
        <section className="mt-6" aria-label="Today's call list">
          {!dashboardReady ? (
            <div role="status" className="rounded-xl border bg-card p-6 text-sm">
              {appts.isError || reminders.isError
                ? "We couldn't load the call list. Retry before relying on today's counts."
                : "Checking who needs a call…"}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold">
                  Call now <span className="text-muted-foreground">· {callNowCount}</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm they’re coming, then record the result below their name.
                </p>
              </div>
              {rows.filter((a) => tasksByAppt.get(a.id)?.timing === "now").length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border bg-card p-5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold">No calls due right now</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {laterCount
                        ? "Check the clients below when their call time arrives."
                        : "Check Going in today to see today's consultations."}
                    </p>
                  </div>
                </div>
              ) : null}
              {(["now", "later"] as const).map((timing) => {
                const items = rows.filter((a) => tasksByAppt.get(a.id)?.timing === timing);
                if (!items.length) return null;
                return (
                  <div key={timing}>
                    {timing === "later" ? (
                      <div className="mb-4 mt-7">
                        <h2 className="text-xl font-bold">Later today · {items.length}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Give them time to reply. Confirmed clients leave this list automatically.
                        </p>
                      </div>
                    ) : null}
                    <div className="grid items-start gap-4 lg:grid-cols-2">
                      {items.map((a) => (
                        <CallTodayCard
                          key={a.id}
                          id={a.id}
                          name={clientName(a)}
                          phone={a.client_phone || a.client_leads?.phone || null}
                          firm={[a.firms?.firm_name ?? "No firm assigned", a.consult_mode !== "zoom" ? a.location_name : null].filter(Boolean).join(" · ")}
                          lawyer={a.firm_lawyers?.name}
                          date={a.appointment_date!}
                          time={a.appointment_time!}
                          zoom={a.consult_mode === "zoom"}
                          timezone={timezoneFor(a)}
                          now={now}
                          task={tasksByAppt.get(a.id)!}
                          attendance={attendanceByAppt.get(a.id)}
                          jobs={jobsByAppt.get(a.id) ?? []}
                          onCall={
                            a.lead_id && (a.client_phone || a.client_leads?.phone)
                              ? () => callClient(a)
                              : undefined
                          }
                          onOutcome={(outcome) => recordCallOutcome(a, outcome)}
                          busy={act.isPending}
                          calling={dialler.status !== "idle"}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      ) : (
        <>
          <h2 className="mt-6 text-lg font-bold">
            {
              {
                today: "Going in today",
                upcoming: "Coming up",
                awaiting: "Waiting for a reply",
                confirmed: "Confirmed consultations",
                attention: "Other follow-ups",
                past: "Past appointments",
                all: "All appointments",
              }[view]
            }{" "}
            <span className="text-muted-foreground">· {rows.length}</span>
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border bg-card">
            {appts.isLoading ? (
              <p className="p-8 text-center text-xs text-muted-foreground">Loading…</p>
            ) : appts.error ? (
              <p className="p-8 text-center text-xs text-red-600">
                {(appts.error as Error).message}
              </p>
            ) : groups.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {view === "today"
                  ? "No consultations booked for today."
                  : "No appointments match this view."}
              </p>
            ) : (
              groups.map(([date, items]) => (
                <section key={date || "nodate"}>
                  <div
                    className={`border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${date === today ? "text-primary" : "text-muted-foreground"}`}
                  >
                    Consultations · {fmtDate(date || null)}
                    {date === today ? " · Today" : ""}
                  </div>
                  {items.map((a) => {
                    const dep = deposit(a);
                    const oc = outcomeChip(a);
                    const rf = refundChip(a);
                    const attention = needsAttention(a, today);
                    const done = Boolean(a.outcome) || a.status !== "booked";
                    return (
                      <div
                        key={a.id}
                        className={`grid grid-cols-[1fr_auto] items-start gap-3 border-b px-4 py-3 sm:grid-cols-[72px_1fr_auto] sm:items-center text-[13px] last:border-b-0 ${attention ? "bg-amber-500/[0.04]" : ""}`}
                      >
                        <div className="font-semibold tabular-nums">
                          {a.appointment_time ?? "—"}
                        </div>
                        <div className="order-3 col-span-2 min-w-0 sm:order-none sm:col-span-1">
                          <p className="mb-2 text-sm font-semibold text-primary">
                            {a.appointment_date
                              ? consultationDay(a.appointment_date, now, timezoneFor(a))
                              : "Date not set"}{" "}
                            · {a.appointment_time ?? "Time not set"} ·{" "}
                            {timezoneFor(a).replace("Australia/", "")} time
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold">{clientName(a)}</span>
                            {a.client_phone || a.client_leads?.phone ? (
                              <span className="text-muted-foreground">
                                {a.client_phone ?? a.client_leads?.phone}
                              </span>
                            ) : null}
                            <Chip label={oc.label} tone={oc.tone} />
                            <Chip label={dep.label} tone={dep.tone} />
                            {rf ? <Chip label={rf.label} tone={rf.tone} /> : null}
                            {a.conflict_status === "conflict" ? (
                              <Chip label="Conflict" tone="red" />
                            ) : null}
                            {a.chase_status === "requested" ? (
                              <Chip label="Chase requested" tone="amber" />
                            ) : null}
                            {attention && !rf && !a.outcome ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                <AlertTriangle className="h-3 w-3" /> Outcome not recorded
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-[12px] text-muted-foreground">
                            {a.firms?.firm_name ?? "No firm"}
                            {a.firm_lawyers?.name ? ` · ${a.firm_lawyers.name}` : ""}
                            {a.consult_mode !== "zoom" && a.location_name ? ` · ${a.location_name}` : ""}
                            {a.client_leads?.sales_reps?.name
                              ? ` · booked by ${a.client_leads.sales_reps.name}`
                              : ""}
                            {a.consult_summary
                              ? ` · “${a.consult_summary.slice(0, 90)}${a.consult_summary.length > 90 ? "…" : ""}”`
                              : ""}
                          </div>
                          <AttendanceDetail
                            attendance={attendanceByAppt.get(a.id)}
                            jobs={jobsByAppt.get(a.id) ?? []}
                            timezone={
                              settingsByFirm.get(a.firm_id ?? "")?.timezone ?? "Australia/Sydney"
                            }
                          />
                          {!done && attendanceByAppt.has(a.id) ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {a.lead_id && (a.client_phone || a.client_leads?.phone) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={dialler.status !== "idle"}
                                  onClick={() => callClient(a)}
                                >
                                  <Phone className="mr-1 h-3.5 w-3.5" /> Call now
                                </Button>
                              ) : null}
                              {(["confirmed", "no_answer", "voicemail"] as const).map((outcome) => (
                                <Button
                                  key={outcome}
                                  size="sm"
                                  variant="ghost"
                                  disabled={act.isPending}
                                  onClick={() =>
                                    run(() =>
                                      recordAttendanceCallFn({
                                        data: {
                                          appointmentId: a.id,
                                          version: attendanceByAppt.get(a.id)!.booking_version,
                                          outcome,
                                        },
                                      }),
                                    )
                                  }
                                >
                                  {
                                    {
                                      confirmed: "Confirmed by phone",
                                      no_answer: "No answer",
                                      voicemail: "Left voicemail",
                                    }[outcome]
                                  }
                                </Button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          {a.lead_id ? (
                            <Link
                              to="/sales-call" search={{ biz: "legal", ...({ lead: a.lead_id }) } as never}
                              className="hidden text-[12px] font-medium text-primary hover:underline sm:inline"
                            >
                              Open lead
                            </Link>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" size="sm" variant="ghost" aria-label="Actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {!done ? (
                                <>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      const summary =
                                        window.prompt("Attended — one-line summary (optional)") ??
                                        "";
                                      const signed = window.confirm(
                                        "Did the client sign with the firm? OK = yes, Cancel = no",
                                      );
                                      run(() =>
                                        processConsultOutcomeFn({
                                          data: { appointmentId: a.id, summary, signed },
                                        }),
                                      );
                                    }}
                                  >
                                    Mark attended
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      if (
                                        window.confirm(
                                          `Mark ${clientName(a)} as a no-show? The deposit is kept.`,
                                        )
                                      )
                                        run(() => markNoShowFn({ data: { appointmentId: a.id } }));
                                    }}
                                  >
                                    Mark no-show
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      const reason = window.prompt(
                                        "Disqualify — reason (the deposit is refunded)",
                                      );
                                      if (reason)
                                        run(() =>
                                          disqualifyAppointmentFn({
                                            data: { appointmentId: a.id, reason },
                                          }),
                                        );
                                    }}
                                  >
                                    Disqualify…
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      const date = window.prompt(
                                        "New date (YYYY-MM-DD)",
                                        a.appointment_date ?? "",
                                      );
                                      if (!date) return;
                                      const time = window.prompt(
                                        "New time (e.g. 10:00am)",
                                        a.appointment_time ?? "",
                                      );
                                      if (!time) return;
                                      run(() =>
                                        rescheduleAppointmentFn({
                                          data: { appointmentId: a.id, date, time },
                                        }),
                                      );
                                    }}
                                  >
                                    Reschedule…
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-700"
                                    onSelect={() => {
                                      if (window.confirm(`Cancel ${clientName(a)}'s appointment?`))
                                        run(() =>
                                          cancelAppointmentFn({ data: { appointmentId: a.id } }),
                                        );
                                    }}
                                  >
                                    Cancel appointment
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              ) : null}
                              {a.refund_status === "failed" || a.refund_status === "manual" ? (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    const ref =
                                      window.prompt(
                                        "Refund done — reference (Stripe refund id, bank ref, or how it was returned)",
                                      ) ?? "";
                                    run(() =>
                                      markRefundedFn({
                                        data: { appointmentId: a.id, reference: ref },
                                      }),
                                    );
                                  }}
                                >
                                  Mark refunded
                                </DropdownMenuItem>
                              ) : null}
                              {a.conflict_status === "conflict" ? (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    run(() => clearConflictFn({ data: { appointmentId: a.id } }))
                                  }
                                >
                                  Clear conflict
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onSelect={() => {
                                  const body = window.prompt("Add a note");
                                  if (body)
                                    run(() =>
                                      addAppointmentNoteFn({ data: { appointmentId: a.id, body } }),
                                    );
                                }}
                              >
                                Add note…
                              </DropdownMenuItem>
                              {a.lead_id ? (
                                <DropdownMenuItem asChild>
                                  <Link to="/sales-call" search={{ biz: "legal", ...({ lead: a.lead_id }) } as never}>
                                    Open lead in sales call
                                  </Link>
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))
            )}
          </div>
        </>
      )}
      <div className="mt-8 border-t pt-1">
        {" "}
        {reminders.data ? (
          <FirmReminderSettings settings={reminders.data.settings} firms={reminders.data.firms} />
        ) : null}
      </div>
    </main>
  );
}
