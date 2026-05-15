import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Phone as PhoneIcon, X, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { updateLeadStatus, clearBooking } from "@/utils/sales-call.functions";
import { sendClinicHandoverEmail } from "@/utils/resend.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/booked-appointments")({
  component: BookedAppointmentsPage,
});

type Reminder = {
  id: string;
  lead_id: string | null;
  booking_date: string | null;
  booking_time: string | null;
  doctor_name: string | null;
  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_phone: string | null;
  three_day_sms_sent: boolean;
  three_day_sms_sent_at: string | null;
  twentyfour_hour_sms_sent: boolean;
  twentyfour_hour_sms_sent_at: string | null;
  status: string;
  created_at: string;
};

type Lead = { id: string; rep_id: string | null; last_name: string | null; first_name: string | null };

const COLOR = {
  bg: "#f7f7f5",
  card: "#ffffff",
  border: "#e8e8e6",
  text: "#111111",
  muted: "#aaaaaa",
  coral: "#f4522d",
  coralBg: "#fff1ee",
  amber: "#b45309",
  amberBg: "#fffbeb",
  green: "#059669",
  greenBg: "#ecfdf5",
  red: "#dc2626",
  redBg: "#fef2f2",
  grey: "#6b6b6b",
  greyBg: "#f3f3f3",
};

const cardStyle: React.CSSProperties = {
  background: COLOR.card,
  border: `0.5px solid ${COLOR.border}`,
  borderRadius: 14,
  boxShadow: "none",
};

function todayInSydney(): Date {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  return new Date(s + "T00:00:00");
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function parseBookingDate(d: string): Date {
  return new Date(d + "T00:00:00");
}

function fmtDay(d: string): string {
  return parseBookingDate(d).toLocaleDateString("en-AU", { day: "numeric" });
}
function fmtMonth(d: string): string {
  return parseBookingDate(d).toLocaleDateString("en-AU", { month: "short" }).toUpperCase();
}
function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${m} ${ampm}`;
}
function fmtSendDate(d: string, daysBefore: number): string {
  const date = parseBookingDate(d);
  date.setDate(date.getDate() - daysBefore);
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
// Returns the send date as a comparable Date (3pm Sydney on booking_date - daysBefore)
function sendDateAt3pm(d: string, daysBefore: number): Date {
  const date = parseBookingDate(d);
  date.setDate(date.getDate() - daysBefore);
  date.setHours(15, 0, 0, 0);
  return date;
}

type Filter = "all" | "week" | "month" | "past";

const ENABLED_KEY = "booked_appointments_enabled";

function BookedAppointmentsPage() {
  const [rows, setRows] = useState<Reminder[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [pastOpen, setPastOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Reminder | null>(null);
  const [editHandover, setEditHandover] = useState<Reminder | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(ENABLED_KEY) !== "false";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
    }
  }, [enabled]);

  // Twilio device for placing calls
  const twilio = useTwilioDevice(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointment_reminders")
      .select("*")
      .order("booking_date", { ascending: true });
    if (error) {
      toast.error("Failed to load appointments");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Reminder[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.lead_id).filter(Boolean))) as string[];
    if (ids.length > 0) {
      const { data: ld } = await supabase
        .from("meta_leads")
        .select("id, rep_id, first_name, last_name")
        .in("id", ids);
      const map: Record<string, Lead> = {};
      for (const l of ld ?? []) map[l.id] = l as Lead;
      setLeads(map);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const today = todayInSydney();

  const stats = useMemo(() => {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const sevenAhead = new Date(today); sevenAhead.setDate(today.getDate() + 7);

    let thisMonth = 0, thisWeek = 0, showed = 0, noShow = 0;
    for (const r of rows) {
      if (!r.booking_date) continue;
      const d = parseBookingDate(r.booking_date);
      const inMonth = d >= startOfMonth && d <= endOfMonth;
      if (inMonth && r.status === "showed_up") showed++;
      if (inMonth && r.status === "no_show") noShow++;
      if (r.status === "confirmed") {
        if (inMonth) thisMonth++;
        if (d >= today && d <= sevenAhead) thisWeek++;
      }
    }
    return { thisMonth, thisWeek, showed, noShow };
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const sevenAhead = new Date(today); sevenAhead.setDate(today.getDate() + 7);
    return rows.filter((r) => {
      if (!r.booking_date) return false;
      const d = parseBookingDate(r.booking_date);
      if (filter === "week") return d >= today && d <= sevenAhead;
      if (filter === "month") return d >= startOfMonth && d <= endOfMonth;
      if (filter === "past") return d < today;
      return true;
    });
  }, [rows, filter]);

  const grouped = useMemo(() => {
    const todayTomorrow: Reminder[] = [];
    const upcoming: Reminder[] = [];
    const pastCancelled: Reminder[] = [];
    for (const r of filtered) {
      if (!r.booking_date) { pastCancelled.push(r); continue; }
      const d = parseBookingDate(r.booking_date);
      const diff = daysBetween(new Date(today), new Date(d));
      if (r.status === "cancelled" || r.status === "no_show" || r.status === "showed_up" || diff < 0) {
        pastCancelled.push(r);
      } else if (diff <= 1) {
        todayTomorrow.push(r);
      } else {
        upcoming.push(r);
      }
    }
    return { todayTomorrow, upcoming, pastCancelled };
  }, [filtered]);

  const onCall = (r: Reminder) => {
    if (!r.patient_phone) { toast.error("No phone number"); return; }
    const params: Record<string, string> = {};
    if (r.lead_id) params.leadId = r.lead_id;
    void twilio.call(r.patient_phone, params);
  };

  const onCancel = async (r: Reminder) => {
    setBusy(r.id);
    const upd = await supabase
      .from("appointment_reminders")
      .update({ status: "cancelled" })
      .eq("id", r.id);
    if (upd.error) { setBusy(null); toast.error("Cancel failed"); return; }
    if (r.lead_id) {
      await updateLeadStatus({ data: { leadId: r.lead_id, status: "cancelled" } });
      await clearBooking({ data: { leadId: r.lead_id } });
    }
    setBusy(null);
    setConfirmCancel(null);
    toast.success("Appointment cancelled");
    void load();
  };

  const onNoShow = async (r: Reminder) => {
    setBusy(r.id);
    const upd = await supabase
      .from("appointment_reminders")
      .update({ status: "no_show" })
      .eq("id", r.id);
    if (upd.error) { setBusy(null); toast.error("Failed"); return; }
    if (r.lead_id) {
      await updateLeadStatus({ data: { leadId: r.lead_id, status: "no_show" } });
    }
    setBusy(null);
    toast.success("Marked as no-show");
    void load();
  };

  const onShowedUp = async (r: Reminder) => {
    setBusy(r.id);
    const upd = await supabase
      .from("appointment_reminders")
      .update({ status: "showed_up" })
      .eq("id", r.id);
    if (upd.error) { setBusy(null); toast.error("Failed"); return; }
    setBusy(null);
    toast.success("Marked as showed up");
    void load();
  };

  return (
    <div style={{ background: COLOR.bg, height: "100vh", overflowY: "auto", fontFamily: "'DM Sans', system-ui, sans-serif", color: COLOR.text }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>Booked Appointments</h1>
            <p style={{ fontSize: 13, color: COLOR.grey }}>
              Track confirmed bookings and automated SMS reminders
            </p>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            style={{
              fontSize: 12, fontWeight: 500,
              padding: "8px 14px", borderRadius: 999,
              background: enabled ? COLOR.greenBg : COLOR.greyBg,
              color: enabled ? COLOR.green : COLOR.grey,
              border: `0.5px solid ${enabled ? COLOR.green : COLOR.border}`,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {enabled ? "● Enabled — Click to disable" : "○ Disabled — Click to enable"}
          </button>
        </div>

        {!enabled ? (
          <div style={{ ...cardStyle, padding: 60, textAlign: "center" }}>
            <p style={{ fontSize: 10, letterSpacing: "0.08em", color: COLOR.muted, textTransform: "uppercase", marginBottom: 8 }}>
              Page disabled
            </p>
            <p style={{ fontSize: 14, color: COLOR.grey }}>
              The Booked Appointments page is turned off. Click the button above to re-enable.
            </p>
          </div>
        ) : (
          <>


        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="This Month" value={stats.thisMonth} />
          <StatCard label="This Week" value={stats.thisWeek} />
          <StatCard label="Showed Up" value={stats.showed} />
          <StatCard label="No Shows" value={stats.noShow} accent={COLOR.red} />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {([
            ["all", "All"],
            ["week", "This Week"],
            ["month", "This Month"],
            ["past", "Past"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                fontSize: 12, fontWeight: 500,
                padding: "8px 14px", borderRadius: 999,
                background: filter === k ? COLOR.coral : COLOR.card,
                color: filter === k ? "#fff" : COLOR.text,
                border: `0.5px solid ${filter === k ? COLOR.coral : COLOR.border}`,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ ...cardStyle, padding: 40, textAlign: "center", color: COLOR.muted }}>Loading...</div>
        ) : (
          <>
            <Section title="Today & Tomorrow" rows={grouped.todayTomorrow} renderCard={(r) => (
              <Card key={r.id} r={r} today={today} onCall={onCall} onCancel={() => setConfirmCancel(r)} onNoShow={onNoShow} onShowedUp={onShowedUp} onEditHandover={() => setEditHandover(r)} busy={busy === r.id} />
            )} />

            <Section title="Upcoming" rows={grouped.upcoming} renderCard={(r) => (
              <Card key={r.id} r={r} today={today} onCall={onCall} onCancel={() => setConfirmCancel(r)} onNoShow={onNoShow} onShowedUp={onShowedUp} onEditHandover={() => setEditHandover(r)} busy={busy === r.id} />
            )} />

            {/* Past & Cancelled — collapsible */}
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => setPastOpen((v) => !v)}
                style={{
                  fontSize: 10, fontWeight: 600, color: COLOR.muted,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  padding: 0, marginBottom: 12,
                }}
              >
                Past & Cancelled ({grouped.pastCancelled.length})
                {pastOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {pastOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {grouped.pastCancelled.length === 0 ? (
                    <div style={{ ...cardStyle, padding: 20, textAlign: "center", color: COLOR.muted, fontSize: 13 }}>None</div>
                  ) : grouped.pastCancelled.map((r) => (
                    <Card key={r.id} r={r} today={today} onCall={onCall} onCancel={() => setConfirmCancel(r)} onNoShow={onNoShow} onShowedUp={onShowedUp} onEditHandover={() => setEditHandover(r)} busy={busy === r.id} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
          </>
        )}
      </div>


      {/* Cancel confirmation */}
      {confirmCancel && (
        <div
          onClick={() => setConfirmCancel(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ ...cardStyle, padding: 24, maxWidth: 400, width: "90%" }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Cancel this appointment?</h3>
            <p style={{ fontSize: 13, color: COLOR.grey, marginBottom: 20 }}>
              This will stop any remaining SMS reminders.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmCancel(null)}
                style={{
                  fontSize: 13, padding: "8px 14px", borderRadius: 8,
                  background: COLOR.card, border: `0.5px solid ${COLOR.border}`, cursor: "pointer",
                }}
              >
                Keep
              </button>
              <button
                onClick={() => onCancel(confirmCancel)}
                disabled={busy === confirmCancel.id}
                style={{
                  fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 8,
                  background: COLOR.coral, color: "#fff", border: "none",
                  cursor: busy === confirmCancel.id ? "wait" : "pointer",
                  opacity: busy === confirmCancel.id ? 0.6 : 1,
                }}
              >
                Cancel appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {editHandover && (
        <EditHandoverModal
          reminder={editHandover}
          onClose={() => setEditHandover(null)}
          onSent={() => { setEditHandover(null); void load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: COLOR.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: accent ?? COLOR.text, letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, rows, renderCard }: { title: string; rows: Reminder[]; renderCard: (r: Reminder) => React.ReactNode }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: COLOR.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(renderCard)}
      </div>
    </div>
  );
}

function Card({
  r, today, onCall, onCancel, onNoShow, onShowedUp, onEditHandover, busy,
}: {
  r: Reminder;
  today: Date;
  onCall: (r: Reminder) => void;
  onCancel: () => void;
  onNoShow: (r: Reminder) => void;
  onShowedUp: (r: Reminder) => void;
  onEditHandover: () => void;
  busy: boolean;
}) {
  const d = r.booking_date ? parseBookingDate(r.booking_date) : null;
  const diff = d ? daysBetween(new Date(today), new Date(d)) : null;

  let leftBorder = COLOR.green;
  let faded = false;
  if (r.status === "cancelled" || r.status === "no_show" || r.status === "showed_up") {
    leftBorder = COLOR.muted; faded = true;
  } else if (diff === 0) leftBorder = COLOR.coral;
  else if (diff === 1) leftBorder = COLOR.amber;

  let daysLabel = "";
  let daysColor = COLOR.green;
  if (diff !== null) {
    if (diff === 0) { daysLabel = "Today"; daysColor = COLOR.coral; }
    else if (diff === 1) { daysLabel = "Tomorrow"; daysColor = COLOR.amber; }
    else if (diff > 1) { daysLabel = `In ${diff} days`; daysColor = COLOR.green; }
    else { daysLabel = `${Math.abs(diff)} days ago`; daysColor = COLOR.grey; }
  }

  const statusBadge = (() => {
    if (r.status === "cancelled") return { label: "Cancelled", bg: COLOR.greyBg, fg: COLOR.grey };
    if (r.status === "no_show") return { label: "No Show", bg: COLOR.redBg, fg: COLOR.red };
    if (r.status === "showed_up") return { label: "Showed Up", bg: COLOR.greenBg, fg: COLOR.green };
    return { label: "Confirmed", bg: COLOR.greenBg, fg: COLOR.green };
  })();

  const isPastOrToday = diff !== null && diff <= 0;
  const isFinalised = r.status === "cancelled" || r.status === "no_show" || r.status === "showed_up";
  const showOutcomeButtons = isPastOrToday && r.status === "confirmed";

  const fullName = [r.patient_first_name, r.patient_last_name].filter(Boolean).join(" ") || "Unknown";

  return (
    <div style={{
      ...cardStyle,
      borderLeft: `3px solid ${leftBorder}`,
      padding: 16,
      opacity: faded ? 0.65 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
        {/* Date block */}
        <div style={{ minWidth: 72, textAlign: "center", paddingRight: 16, borderRight: `0.5px solid ${COLOR.border}` }}>
          {r.booking_date ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {fmtDay(r.booking_date)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: COLOR.muted, letterSpacing: "0.08em", marginTop: 4 }}>
                {fmtMonth(r.booking_date)}
              </div>
              {r.booking_time && (
                <div style={{ fontSize: 12, fontWeight: 500, color: COLOR.coral, marginTop: 8 }}>
                  {fmtTime(r.booking_time)}
                </div>
              )}
            </>
          ) : <div style={{ fontSize: 12, color: COLOR.muted }}>No date</div>}
        </div>

        {/* Middle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {fullName}
          </div>
          <div style={{ fontSize: 12, color: COLOR.grey, marginTop: 2 }}>
            {r.doctor_name ? `Dr ${r.doctor_name}` : "—"}
          </div>
          <div style={{ fontSize: 12, color: COLOR.grey, marginTop: 2 }}>
            {r.patient_phone || "—"}
          </div>

          {/* Reminders row */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <ReminderPill
              kind="3day"
              status={r.status}
              sent={r.three_day_sms_sent}
              bookingDate={r.booking_date}
            />
            <ReminderPill
              kind="24h"
              status={r.status}
              sent={r.twentyfour_hour_sms_sent}
              bookingDate={r.booking_date}
            />
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {!isFinalised && (
            <button
              onClick={() => onCall(r)}
              style={{
                fontSize: 12, fontWeight: 500, color: "#fff",
                background: COLOR.coral, border: "none", borderRadius: 8,
                padding: "8px 14px", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <PhoneIcon size={12} /> Call Now
            </button>
          )}

          {showOutcomeButtons ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => onShowedUp(r)}
                disabled={busy}
                style={{
                  fontSize: 11, fontWeight: 500, color: "#fff",
                  background: COLOR.green, border: "none", borderRadius: 8,
                  padding: "6px 12px", cursor: busy ? "wait" : "pointer",
                }}
              >
                ✓ Showed Up
              </button>
              <button
                onClick={() => onNoShow(r)}
                disabled={busy}
                style={{
                  fontSize: 11, fontWeight: 500, color: COLOR.red,
                  background: COLOR.card, border: `0.5px solid ${COLOR.red}`, borderRadius: 8,
                  padding: "6px 12px", cursor: busy ? "wait" : "pointer",
                }}
              >
                ✗ No Show
              </button>
            </div>
          ) : !isFinalised ? (
            <button
              onClick={onCancel}
              disabled={busy}
              style={{
                fontSize: 11, color: COLOR.grey,
                background: COLOR.card, border: `0.5px solid ${COLOR.border}`, borderRadius: 8,
                padding: "6px 12px", cursor: busy ? "wait" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              <X size={11} /> Cancel
            </button>
          ) : null}

          <button
            onClick={onEditHandover}
            style={{
              fontSize: 11, color: COLOR.grey,
              background: COLOR.card, border: `0.5px solid ${COLOR.border}`, borderRadius: 8,
              padding: "6px 12px", cursor: "pointer",
            }}
          >
            ✎ Edit handover
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${COLOR.border}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: daysColor }}>
          {daysLabel}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 999,
          background: statusBadge.bg, color: statusBadge.fg,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {statusBadge.label}
        </div>
      </div>
    </div>
  );
}

function ReminderPill({
  kind, status, sent, bookingDate,
}: {
  kind: "3day" | "24h";
  status: string;
  sent: boolean;
  bookingDate: string | null;
}) {
  const label = kind === "3day" ? "3-day SMS" : "24hr SMS";
  if (status === "cancelled" || status === "no_show" || status === "showed_up") {
    return (
      <span style={{ fontSize: 11, color: COLOR.muted, background: COLOR.greyBg, padding: "3px 8px", borderRadius: 6 }}>
        — {label}
      </span>
    );
  }
  if (sent) {
    return (
      <span style={{ fontSize: 11, color: COLOR.green, background: COLOR.greenBg, padding: "3px 8px", borderRadius: 6 }}>
        ✓ {label} sent
      </span>
    );
  }
  const daysBefore = kind === "3day" ? 3 : 1;
  if (!bookingDate) {
    return (
      <span style={{ fontSize: 11, color: COLOR.muted, background: COLOR.greyBg, padding: "3px 8px", borderRadius: 6 }}>
        — {label}
      </span>
    );
  }
  const sendAt = sendDateAt3pm(bookingDate, daysBefore);
  const sendDateStr = fmtSendDate(bookingDate, daysBefore);
  const now = new Date();
  if (sendAt.getTime() < now.getTime()) {
    return (
      <span style={{ fontSize: 11, color: COLOR.red, background: COLOR.redBg, padding: "3px 8px", borderRadius: 6 }}>
        ⚠ Missed — should have sent {sendDateStr}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, color: COLOR.amber, background: COLOR.amberBg, padding: "3px 8px", borderRadius: 6 }}>
      ⏳ {label} — sends {sendDateStr} 3pm
    </span>
  );
}

function EditHandoverModal({
  reminder,
  onClose,
  onSent,
}: {
  reminder: Reminder;
  onClose: () => void;
  onSent: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [clinicEmail, setClinicEmail] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [leadInfo, setLeadInfo] = useState<{
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    funding_preference: string | null;
    finance_eligible: boolean | null;
    call_notes: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (!reminder.lead_id) {
          toast.error("This appointment isn't linked to a lead — can't resend.");
          onClose();
          return;
        }

        // Lead details
        const { data: lead } = await supabase
          .from("meta_leads")
          .select("first_name,last_name,email,phone,funding_preference,finance_eligible,call_notes,clinic_id,status")
          .eq("id", reminder.lead_id)
          .maybeSingle();

        // Clinic appointment snapshot (intel_notes is the exact text sent last time)
        const { data: appt } = await supabase
          .from("clinic_appointments")
          .select("id, clinic_id, intel_notes")
          .eq("lead_id", reminder.lead_id)
          .maybeSingle();

        const cId = (appt?.clinic_id as string | null) ?? (lead?.clinic_id as string | null) ?? null;

        let cName = "";
        let cEmail: string | null = null;
        if (cId) {
          const { data: clinic } = await supabase
            .from("partner_clinics")
            .select("clinic_name,email")
            .eq("id", cId)
            .maybeSingle();
          cName = (clinic?.clinic_name as string | null) ?? "";
          cEmail = (clinic?.email as string | null) ?? null;
        }

        if (!alive) return;
        setClinicId(cId);
        setClinicName(cName);
        setClinicEmail(cEmail);
        setLeadInfo({
          first_name: lead?.first_name ?? null,
          last_name: lead?.last_name ?? null,
          email: lead?.email ?? null,
          phone: lead?.phone ?? null,
          funding_preference: lead?.funding_preference ?? null,
          finance_eligible: lead?.finance_eligible ?? null,
          call_notes: lead?.call_notes ?? null,
        });
        setNotes((appt?.intel_notes as string | null) ?? lead?.call_notes ?? "");
        const status = ((lead?.status as string | null) ?? "").toLowerCase();
        setDepositPaid(status.includes("deposit_paid"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reminder.lead_id, onClose]);

  const onResend = async () => {
    if (!reminder.lead_id || !leadInfo) return;
    if (!clinicEmail) {
      toast.error("No clinic email on file — add one in Partner Clinics first.");
      return;
    }
    if (!notes.trim()) {
      toast.error("Patient Intel can't be empty.");
      return;
    }
    setSending(true);
    const r = await sendClinicHandoverEmail({
      data: {
        leadId: reminder.lead_id,
        clinicId,
        firstName: leadInfo.first_name ?? "",
        lastName: leadInfo.last_name ?? "",
        email: leadInfo.email,
        phone: leadInfo.phone,
        callNotes: notes,
        fundingPreference: leadInfo.funding_preference,
        financeEligible: leadInfo.finance_eligible,
        bookingDate: reminder.booking_date ?? "",
        bookingTime: reminder.booking_time ?? "",
        clinicName,
        clinicEmail,
        doctorName: reminder.doctor_name,
        depositPaid,
      },
    });
    setSending(false);
    if (r.success) {
      toast.success("Handover email re-sent ✓");
      onSent();
    } else {
      toast.error(`Resend failed: ${r.error ?? "unknown error"}`);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...cardStyle, padding: 24, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Edit & resend handover email</h3>
        <p style={{ fontSize: 12, color: COLOR.grey, marginBottom: 18 }}>
          Edits to Patient Intel will overwrite the saved snapshot and the clinic will receive a new email.
        </p>

        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: COLOR.muted }}>Loading…</div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: COLOR.grey, marginBottom: 14, lineHeight: 1.6 }}>
              <div><b>To:</b> {clinicEmail ?? <span style={{ color: COLOR.red }}>No clinic email on file</span>} {clinicName ? `(${clinicName})` : ""}</div>
              <div><b>Patient:</b> {[leadInfo?.first_name, leadInfo?.last_name].filter(Boolean).join(" ") || "—"}</div>
              <div><b>Appointment:</b> {reminder.booking_date} {reminder.booking_time} {reminder.doctor_name ? `— Dr ${reminder.doctor_name}` : ""}</div>
            </div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLOR.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Patient Intel
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              style={{
                width: "100%", padding: 12, fontSize: 14, lineHeight: 1.5,
                border: `0.5px solid ${COLOR.border}`, borderRadius: 8,
                background: "#fafafa", color: COLOR.text, resize: "vertical",
                fontFamily: "inherit",
              }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={depositPaid}
                onChange={(e) => setDepositPaid(e.target.checked)}
              />
              <span>Deposit paid ($75)</span>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button
                onClick={onClose}
                disabled={sending}
                style={{
                  fontSize: 13, padding: "8px 14px", borderRadius: 8,
                  background: COLOR.card, border: `0.5px solid ${COLOR.border}`,
                  cursor: sending ? "wait" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={onResend}
                disabled={sending || !clinicEmail}
                style={{
                  fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 8,
                  background: COLOR.coral, color: "#fff", border: "none",
                  cursor: sending || !clinicEmail ? "wait" : "pointer",
                  opacity: sending || !clinicEmail ? 0.6 : 1,
                }}
              >
                {sending ? "Sending…" : "Resend handover email"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
