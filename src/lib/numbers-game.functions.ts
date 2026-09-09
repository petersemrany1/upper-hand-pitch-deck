import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Live numbers for the Numbers Game town: who's in the depot right now,
 * what's waiting in the yard, what's stuck, and how full each clinic's
 * tank is. The 30-day ad and money figures come from getNumbersReport;
 * this only covers the "today" layer.
 */

export type GameRep = {
  id: string;
  name: string;
  inSession: boolean;
  sessionStartedAt: string | null;
  hoursToday: number;
  callsToday: number;
  bookingsToday: number;
};

export type GameClinicTank = {
  clinicId: string;
  name: string;
  city: string | null;
  packSize: number;
  delivered: number;
  owed: number;
  active: boolean;
};

export type GameStuckLead = { id: string; name: string; minutes: number };

export type NumbersGameLive = {
  now: string;
  reps: GameRep[];
  yardLeads: number;
  overdueCallbacks: number;
  slowLeads: GameStuckLead[];
  todayBooked: number;
  todayShowed: number;
  tanks: GameClinicTank[];
};

const ACTIONABLE = ["new", "no_answer", "callback_scheduled", "had_convo_chase_up", "intake"];
const SYDNEY = "Australia/Sydney";

function sydneyMidnightIso(now: Date): string {
  const ymd = now.toLocaleDateString("en-CA", { timeZone: SYDNEY });
  // Work out the UTC instant of local midnight by asking what Sydney's offset is right now.
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

export const getNumbersGameLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NumbersGameLive> => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const now = new Date();
    const dayStart = sydneyMidnightIso(now);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const [reps, sessions, calls, bookedToday, showedToday, yard, overdue, newToday, clinics, packEcon] = await Promise.all([
      db.from("sales_reps").select("id, name, first_name, role, is_active").eq("is_active", true).in("role", ["rep", "admin"]),
      db.from("rep_sessions").select("rep_id, started_at, ended_at").gte("started_at", dayStart),
      db.from("call_records").select("rep_id, lead_id, called_at").gte("called_at", dayStart).eq("direction", "outbound"),
      db.from("meta_leads").select("id, rep_id").eq("status", "booked_deposit_paid").gte("updated_at", dayStart),
      db.from("clinic_appointments").select("id").in("outcome", ["show", "proceeded"]).gte("appointment_date", dayStart.slice(0, 10)),
      db.from("meta_leads").select("id", { count: "exact", head: true }).in("status", ACTIONABLE).or("lead_class.is.null,lead_class.neq.post_consult"),
      db.from("meta_leads").select("id", { count: "exact", head: true }).eq("status", "callback_scheduled").lt("callback_scheduled_at", hourAgo),
      db.from("meta_leads").select("id, first_name, last_name, created_at").gte("created_at", dayStart).lt("created_at", hourAgo).or("lead_class.is.null,lead_class.neq.post_consult"),
      db.from("partner_clinics").select("id, clinic_name, city, is_active"),
      db.rpc("clinic_pack_economics"),
    ]);

    // Reps: session state and today's activity.
    const sessionRows = sessions.data ?? [];
    const callRows = calls.data ?? [];
    const bookedRows = bookedToday.data ?? [];
    const repOut: GameRep[] = (reps.data ?? [])
      .filter((r) => r.role === "rep" || sessionRows.some((s) => s.rep_id === r.id))
      .map((r) => {
        const mine = sessionRows.filter((s) => s.rep_id === r.id);
        const open = mine.find((s) => !s.ended_at) ?? null;
        const hoursToday = mine.reduce((sum, s) => {
          const end = s.ended_at ? new Date(s.ended_at).getTime() : now.getTime();
          return sum + Math.max(0, end - new Date(s.started_at).getTime()) / 3_600_000;
        }, 0);
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
          hoursToday: Math.round(hoursToday * 10) / 10,
          callsToday,
          bookingsToday: bookedRows.filter((b) => b.rep_id === r.id).length,
        };
      });

    // New leads that have sat for over an hour with no call.
    const calledLeadIds = new Set(callRows.map((c) => c.lead_id).filter(Boolean));
    const slowLeads: GameStuckLead[] = (newToday.data ?? [])
      .filter((l) => !calledLeadIds.has(l.id))
      .map((l) => ({
        id: l.id,
        name: [l.first_name, l.last_name].filter(Boolean).join(" ").trim() || "Lead",
        minutes: Math.round((now.getTime() - new Date(l.created_at).getTime()) / 60_000),
      }));

    // Clinic tanks: current pack fill from the same economics the Numbers page uses.
    const econ = ((packEcon.data ?? []) as Record<string, unknown>[]);
    const clinicRows = clinics.data ?? [];
    const tanks: GameClinicTank[] = econ
      .map((r) => {
        const clinic = clinicRows.find((c) => c.id === r.clinic_id);
        const purchased = Number(r.shows_purchased ?? 0);
        const delivered = Number(r.shows_delivered ?? 0);
        return {
          clinicId: String(r.clinic_id),
          name: String(r.clinic_name ?? clinic?.clinic_name ?? "Clinic"),
          city: (r.city as string | null) ?? clinic?.city ?? null,
          packSize: purchased,
          delivered,
          owed: Number(r.shows_owed ?? Math.max(0, purchased - delivered)),
          active: clinic?.is_active ?? true,
        };
      })
      .filter((t) => t.active && t.packSize > 0);

    return {
      now: now.toISOString(),
      reps: repOut,
      yardLeads: yard.count ?? 0,
      overdueCallbacks: overdue.count ?? 0,
      slowLeads,
      todayBooked: bookedRows.length,
      todayShowed: (showedToday.data ?? []).length,
      tanks,
    };
  });
