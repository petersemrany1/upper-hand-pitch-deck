import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Live numbers for the Numbers Game town: who's on the tools right now and
 * how they've gone this week, what booked today, how full each clinic's
 * tank is, failed refunds, and whether the Make.com automations look
 * healthy. The ad and money figures for the chosen range come from
 * getNumbersReport; this is the "now" layer.
 */

export type GameRep = {
  id: string;
  name: string;
  inSession: boolean;
  sessionStartedAt: string | null;
  hoursToday: number;
  callsToday: number;
  bookingsToday: number;
  hours7d: number;
  bookings7d: number;
};

export type GameClinicTank = {
  clinicId: string;
  name: string;
  city: string | null;
  packSize: number;
  delivered: number;
  owed: number;
  active: boolean;
  refundFails: number;
  refundNames: string[];
};

export type GameBooking = { leadId: string; repId: string | null; clinicId: string | null; at: string };

export type NumbersGameLive = {
  now: string;
  reps: GameRep[];
  yardLeads: number;
  todayBooked: number;
  todayShowed: number;
  bookingsToday: GameBooking[];
  tanks: GameClinicTank[];
  automationIssues: string[];
};

const ACTIONABLE = ["new", "no_answer", "callback_scheduled", "had_convo_chase_up", "intake"];
const SYDNEY = "Australia/Sydney";

function sydneyMidnightIso(now: Date): string {
  const ymd = now.toLocaleDateString("en-CA", { timeZone: SYDNEY });
  const local = new Date(now.toLocaleString("en-US", { timeZone: SYDNEY }));
  const offsetMs = now.getTime() - local.getTime();
  return new Date(new Date(`${ymd}T00:00:00`).getTime() + offsetMs).toISOString();
}

async function assertAdmin(claims: Record<string, unknown> | null | undefined) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = (claims?.email as string | undefined)?.toLowerCase();
  if (!email) throw new Error("Forbidden");
  const { data: me } = await supabaseAdmin.from("sales_reps").select("role").ilike("email", email).maybeSingle();
  if (me?.role !== "admin") throw new Error("Forbidden");
  return supabaseAdmin;
}

/** Sum session hours for one rep, clipping open sessions at now. */
function sessionHours(rows: { rep_id: string; started_at: string; ended_at: string | null }[], repId: string, now: Date): number {
  return rows
    .filter((s) => s.rep_id === repId)
    .reduce((sum, s) => {
      const end = s.ended_at ? new Date(s.ended_at).getTime() : now.getTime();
      return sum + Math.max(0, end - new Date(s.started_at).getTime()) / 3_600_000;
    }, 0);
}

export const getNumbersGameLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NumbersGameLive> => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const now = new Date();
    const dayStart = sydneyMidnightIso(now);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3_600_000).toISOString();
    const dayAgo = new Date(now.getTime() - 24 * 3_600_000).toISOString();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3_600_000).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 3_600_000).toLocaleDateString("en-CA", { timeZone: SYDNEY });

    const [reps, sessions, calls, bookedWeek, showedToday, yard, clinics, packEcon, refunds, leads24h, leads14d, spendYesterday, webhookErrors, reminders] = await Promise.all([
      db.from("sales_reps").select("id, name, first_name, role, is_active").eq("is_active", true).in("role", ["rep", "admin"]),
      db.from("rep_sessions").select("rep_id, started_at, ended_at").gte("started_at", weekAgo),
      db.from("call_records").select("rep_id, lead_id, called_at").gte("called_at", dayStart).eq("direction", "outbound"),
      db.from("meta_leads").select("id, rep_id, clinic_id, updated_at").eq("status", "booked_deposit_paid").gte("updated_at", weekAgo),
      db.from("clinic_appointments").select("id").in("outcome", ["show", "proceeded"]).gte("appointment_date", dayStart.slice(0, 10)),
      db.from("meta_leads").select("id", { count: "exact", head: true }).in("status", ACTIONABLE).or("lead_class.is.null,lead_class.neq.post_consult"),
      db.from("partner_clinics").select("id, clinic_name, city, is_active"),
      db.rpc("clinic_pack_economics"),
      db.from("clinic_appointments").select("clinic_id, patient_name, refund_status").in("refund_status", ["failed", "manual_required"]),
      db.from("meta_leads").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      db.from("meta_leads").select("id", { count: "exact", head: true }).gte("created_at", twoWeeksAgo),
      db.from("ad_spend_daily").select("spend_aud").eq("date", yesterday),
      db.from("error_logs").select("id, function_name, created_at").gte("created_at", dayAgo).or("function_name.ilike.%meta-leads%,function_name.ilike.%meta_leads%,function_name.ilike.%webhook%"),
      db.from("appointment_reminders").select("id, booking_date, booking_time, twentyfour_hour_sms_sent, status").gte("booking_date", dayStart.slice(0, 10)),
    ]);

    const sessionRows = sessions.data ?? [];
    const callRows = calls.data ?? [];
    const bookedRows = bookedWeek.data ?? [];
    const bookedToday = bookedRows.filter((b) => (b.updated_at ?? "") >= dayStart);

    const repOut: GameRep[] = (reps.data ?? [])
      .filter((r) => r.role === "rep" || sessionRows.some((s) => s.rep_id === r.id))
      .map((r) => {
        const todaySessions = sessionRows.filter((s) => s.started_at >= dayStart);
        const open = sessionRows.find((s) => s.rep_id === r.id && !s.ended_at) ?? null;
        // Collapse the instant redial: two dials to the same lead inside 90 seconds count once.
        const myCalls = callRows.filter((c) => c.rep_id === r.id).sort((a, b) => (a.called_at ?? "").localeCompare(b.called_at ?? ""));
        let callsToday = 0;
        let lastLead: string | null = null;
        let lastAt = 0;
        for (const c of myCalls) {
          const t = new Date(c.called_at ?? 0).getTime();
          if (c.lead_id && c.lead_id === lastLead && t - lastAt < 90_000) continue;
          callsToday += 1;
          lastLead = c.lead_id;
          lastAt = t;
        }
        return {
          id: r.id,
          name: r.first_name?.trim() || r.name.split(" ")[0] || r.name,
          inSession: Boolean(open),
          sessionStartedAt: open?.started_at ?? null,
          hoursToday: Math.round(sessionHours(todaySessions, r.id, now) * 10) / 10,
          callsToday,
          bookingsToday: bookedToday.filter((b) => b.rep_id === r.id).length,
          hours7d: Math.round(sessionHours(sessionRows, r.id, now) * 10) / 10,
          bookings7d: bookedRows.filter((b) => b.rep_id === r.id).length,
        };
      });

    // Clinic tanks: pack fill from the same economics the Numbers page uses, plus failed refunds.
    const econ = ((packEcon.data ?? []) as Record<string, unknown>[]);
    const clinicRows = clinics.data ?? [];
    const refundRows = refunds.data ?? [];
    const tanks: GameClinicTank[] = econ
      .map((r) => {
        const clinic = clinicRows.find((c) => c.id === r.clinic_id);
        const purchased = Number(r.shows_purchased ?? 0);
        const delivered = Number(r.shows_delivered ?? 0);
        const fails = refundRows.filter((f) => f.clinic_id === r.clinic_id);
        return {
          clinicId: String(r.clinic_id),
          name: String(r.clinic_name ?? clinic?.clinic_name ?? "Clinic"),
          city: (r.city as string | null) ?? clinic?.city ?? null,
          packSize: purchased,
          delivered,
          owed: Number(r.shows_owed ?? Math.max(0, purchased - delivered)),
          active: clinic?.is_active ?? true,
          refundFails: fails.length,
          refundNames: fails.map((f) => f.patient_name).filter(Boolean),
        };
      })
      .filter((t) => t.active && (t.packSize > 0 || t.refundFails > 0));

    // Make.com automations: leads webhook and the reminder texts.
    const issues: string[] = [];
    const leads24 = leads24h.count ?? 0;
    const perDay14 = (leads14d.count ?? 0) / 14;
    const spentYesterday = (spendYesterday.data ?? []).reduce((s, r) => s + Number(r.spend_aud ?? 0), 0);
    if (leads24 === 0 && perDay14 >= 1.5 && spentYesterday > 0) {
      issues.push(`no leads in 24 h while ads spent ${Math.round(spentYesterday)} yesterday (normally ${perDay14.toFixed(1)} a day)`);
    }
    const errs = (webhookErrors.data ?? []).length;
    if (errs > 0) issues.push(`${errs} lead webhook error${errs === 1 ? "" : "s"} in the last 24 h`);
    const overdueReminders = (reminders.data ?? []).filter((r) => {
      if (r.twentyfour_hour_sms_sent || r.status === "cancelled") return false;
      const when = new Date(`${r.booking_date}T${r.booking_time ?? "09:00"}:00+10:00`).getTime();
      const hoursAway = (when - now.getTime()) / 3_600_000;
      return hoursAway > 0 && hoursAway < 20;
    }).length;
    if (overdueReminders > 0) issues.push(`${overdueReminders} appointment${overdueReminders === 1 ? "" : "s"} inside 20 h with no reminder text sent`);

    return {
      now: now.toISOString(),
      reps: repOut,
      yardLeads: yard.count ?? 0,
      todayBooked: bookedToday.length,
      todayShowed: (showedToday.data ?? []).length,
      bookingsToday: bookedToday.map((b) => ({ leadId: b.id, repId: b.rep_id, clinicId: b.clinic_id, at: b.updated_at ?? now.toISOString() })),
      tanks,
      automationIssues: issues,
    };
  });
