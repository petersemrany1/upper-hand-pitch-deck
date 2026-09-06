import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Read-only ad-spend reporting + manual spend entry + clearing unresolved
// appointment outcomes. This module NEVER writes to meta_leads.

const RangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  location: z.string().nullable().optional(),
  excludePeter: z.boolean().optional(),
});

export type AdPerformanceRow = {
  ad_name: string;
  location: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  booked: number;
  showed: number;
  noshow: number;
  upcoming: number;
  needs_outcome: number;
  disqualified: number;
  unattributed: boolean;
  name_collision: boolean;
};

export type LocationSummaryRow = {
  location: string;
  spend: number;
  leads: number;
  booked: number;
  showed: number;
  noshow: number;
  upcoming: number;
  needs_outcome: number;
  disqualified: number;
};

export type MonthlyPoint = {
  month: string;
  location: string;
  spend: number;
  showed: number;
};

export type NeedsOutcomeRow = {
  appointment_id: string;
  patient_name: string;
  appointment_date: string | null;
  appointment_time: string | null;
  clinic_name: string | null;
};

export type SpendRow = {
  id: string;
  date: string;
  ad_id: string | null;
  ad_name: string;
  adset_name: string | null;
  campaign_name: string | null;
  location: string | null;
  spend_aud: number;
  impressions: number;
  clicks: number;
  source: string;
};

async function assertAdmin(claims: Record<string, unknown> | null | undefined) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = (claims?.email as string | undefined)?.toLowerCase();
  if (!email) throw new Error("Forbidden");
  const { data: me } = await supabaseAdmin
    .from("sales_reps")
    .select("role")
    .ilike("email", email)
    .maybeSingle();
  if (me?.role !== "admin") throw new Error("Forbidden");
  return supabaseAdmin;
}

export type LabourRow = {
  key: string;
  hours: number;
  hourly_cost: number;
  hours_missing_rate: number;
  hours_fallback: number;
  bookings: number;
  bonus_cost: number;
  bonus_missing_rate: number;
};

export type RevenueRow = { key: string; shows: number; revenue: number };

export type MoneyMonthPoint = {
  month: string;
  location: string;
  spend: number;
  showed: number;
  revenue: number;
  labour_cost: number;
  bonus_cost: number;
};

export const getNumbersReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RangeSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const from = data.from ?? undefined;
    const to = data.to ?? undefined;
    const location = data.location && data.location.length > 0 ? data.location : undefined;
    // New reporting RPCs are not in the generated types yet.
    const rpc = (fn: string, args: Record<string, unknown>) =>
      (db as unknown as {
        rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
      }).rpc(fn, args);

    // Optional: subtract one rep's (Peter's) labour + bonus from every key so
    // the owner can view costs with their own pay removed.
    let peterId: string | null = null;
    if (data.excludePeter) {
      const { data: peter } = await db
        .from("sales_reps")
        .select("id")
        .ilike("name", "%peter%semrany%")
        .limit(1)
        .maybeSingle();
      peterId = peter?.id ?? null;
    }

    const [perf, locs, monthly, sync, labLoc, labAd, revLoc, revAd, moneyMonth, labLocP, labAdP, moneyMonthP] = await Promise.all([
      db.rpc("ad_performance", { p_from: from, p_to: to, p_location: location }),
      db.rpc("ad_location_summary", { p_from: from, p_to: to }),
      db.rpc("ad_cost_per_show_monthly", { p_from: from, p_to: to }),
      db.from("ad_spend_sync_state").select("*").eq("id", 1).maybeSingle(),
      rpc("labour_by_key", { p_from: from, p_to: to, p_mode: "location" }),
      rpc("labour_by_key", { p_from: from, p_to: to, p_mode: "ad" }),
      rpc("revenue_by_key", { p_from: from, p_to: to, p_mode: "location" }),
      rpc("revenue_by_key", { p_from: from, p_to: to, p_mode: "ad" }),
      rpc("money_monthly", { p_from: from, p_to: to }),
      peterId ? rpc("labour_by_key", { p_from: from, p_to: to, p_mode: "location", p_rep: peterId }) : Promise.resolve({ data: null, error: null }),
      peterId ? rpc("labour_by_key", { p_from: from, p_to: to, p_mode: "ad", p_rep: peterId }) : Promise.resolve({ data: null, error: null }),
      peterId ? rpc("money_monthly", { p_from: from, p_to: to, p_rep: peterId }) : Promise.resolve({ data: null, error: null }),
    ]);


    // Unresolved outcomes: past-dated appointments with no outcome recorded.
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    const { data: unresolved } = await db
      .from("clinic_appointments")
      .select("id, patient_name, appointment_date, appointment_time, clinic_id")
      .is("outcome", null)
      .lt("appointment_date", today)
      .order("appointment_date", { ascending: false })
      .limit(200);

    const clinicIds = Array.from(
      new Set((unresolved ?? []).map((a) => a.clinic_id).filter(Boolean)),
    ) as string[];
    const clinicNames = new Map<string, string>();
    if (clinicIds.length > 0) {
      const { data: clinics } = await db
        .from("partner_clinics")
        .select("id, clinic_name")
        .in("id", clinicIds);
      for (const c of clinics ?? []) clinicNames.set(c.id, c.clinic_name);
    }

    const firstErr =
      perf.error ?? locs.error ?? monthly.error ?? labLoc.error ?? labAd.error ??
      revLoc.error ?? revAd.error ?? moneyMonth.error;
    if (firstErr) throw new Error(`Report query failed: ${firstErr.message}`);

    const num = (v: unknown) => Number(v ?? 0);
    const mapLabour = (rows: unknown): LabourRow[] =>
      ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
        key: String(r.key ?? ""),
        hours: num(r.hours),
        hourly_cost: num(r.hourly_cost),
        hours_missing_rate: num(r.hours_missing_rate),
        hours_fallback: num(r.hours_fallback),
        bookings: num(r.bookings),
        bonus_cost: num(r.bonus_cost),
        bonus_missing_rate: num(r.bonus_missing_rate),
      }));
    const mapRevenue = (rows: unknown): RevenueRow[] =>
      ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
        key: String(r.key ?? ""),
        shows: num(r.shows),
        revenue: num(r.revenue),
      }));

    // Subtract Peter-only rows from the all-reps rows when the toggle is on.
    const subLabour = (base: LabourRow[], sub: unknown): LabourRow[] => {
      const subMap = new Map(
        mapLabour(sub).map((r) => [r.key.toLowerCase(), r]),
      );
      return base.map((r) => {
        const s = subMap.get(r.key.toLowerCase());
        if (!s) return r;
        return {
          key: r.key,
          hours: r.hours - s.hours,
          hourly_cost: r.hourly_cost - s.hourly_cost,
          hours_missing_rate: r.hours_missing_rate - s.hours_missing_rate,
          hours_fallback: r.hours_fallback - s.hours_fallback,
          bookings: r.bookings - s.bookings,
          bonus_cost: r.bonus_cost - s.bonus_cost,
          bonus_missing_rate: r.bonus_missing_rate - s.bonus_missing_rate,
        };
      });
    };
    const subMoney = (base: MoneyMonthPoint[], sub: unknown): MoneyMonthPoint[] => {
      const subRows = ((sub ?? []) as Record<string, unknown>[]);
      const subMap = new Map(
        subRows.map((r) => [`${r.month}|${String(r.location ?? "").toLowerCase()}`, r]),
      );
      return base.map((r) => {
        const s = subMap.get(`${r.month}|${r.location.toLowerCase()}`) as Record<string, unknown> | undefined;
        if (!s) return r;
        return {
          ...r,
          labour_cost: r.labour_cost - num(s.labour_cost),
          bonus_cost: r.bonus_cost - num(s.bonus_cost),
        };
      });
    };

    const labourLocRows = subLabour(mapLabour(labLoc.data), labLocP.data);
    const labourAdRows = subLabour(mapLabour(labAd.data), labAdP.data);
    const moneyMonthRows = subMoney(
      ((moneyMonth.data ?? []) as Record<string, unknown>[]).map((r) => ({
        month: String(r.month ?? ""),
        location: String(r.location ?? ""),
        spend: num(r.spend),
        showed: num(r.showed),
        revenue: num(r.revenue),
        labour_cost: num(r.labour_cost),
        bonus_cost: num(r.bonus_cost),
      })) as MoneyMonthPoint[],
      moneyMonthP.data,
    );

    return {
      peterExcluded: peterId !== null,
      labourByLocation: labourLocRows,
      labourByAd: labourAdRows,
      revenueByLocation: mapRevenue(revLoc.data),
      revenueByAd: mapRevenue(revAd.data),
      moneyMonthly: moneyMonthRows,
      ads: ((perf.data ?? []) as unknown as AdPerformanceRow[]).map((r) => ({
        ...r,
        spend: Number(r.spend ?? 0),
      })),
      locations: ((locs.data ?? []) as unknown as LocationSummaryRow[]).map((r) => ({
        ...r,
        spend: Number(r.spend ?? 0),
      })),
      monthly: ((monthly.data ?? []) as unknown as MonthlyPoint[]).map((r) => ({
        ...r,
        spend: Number(r.spend ?? 0),
      })),

      needsOutcome: (unresolved ?? []).map((a) => ({
        appointment_id: a.id,
        patient_name: a.patient_name,
        appointment_date: a.appointment_date,
        appointment_time: a.appointment_time,
        clinic_name: a.clinic_id ? clinicNames.get(a.clinic_id) ?? null : null,
      })) as NeedsOutcomeRow[],
      syncState: sync.data
        ? {
            last_synced_at: sync.data.last_synced_at,
            last_status: sync.data.last_status,
            last_message: sync.data.last_message,
            rows_upserted: sync.data.rows_upserted,
          }
        : null,
    };
  });

const AdLeadsSchema = RangeSchema.extend({
  adName: z.string().min(1),
  unattributed: z.boolean().optional(),
});

export const listAdLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AdLeadsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    let q = db
      .from("ad_lead_outcomes")
      .select(
        "lead_id, created_at, first_name, last_name, phone, status, location, appointment_date, outcome, is_booked, is_showed, is_noshow, is_upcoming, needs_outcome, is_disqualified",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.unattributed) q = q.eq("unattributed", true);
    else q = q.eq("ad_name", data.adName).eq("unattributed", false);

    if (data.from) q = q.gte("created_at", `${data.from}T00:00:00+10:00`);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59+10:00`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const OutcomeSchema = z.object({
  appointmentId: z.string().uuid(),
  outcome: z.enum(["show", "noshow", "disqualified"]),
});

// Writes clinic_appointments.outcome only. Never touches meta_leads.
export const setAppointmentOutcomeFromNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => OutcomeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const patch =
      data.outcome === "disqualified"
        ? {
            outcome: data.outcome,
            disqualified_at: new Date().toISOString(),
            disqualified_reason: "Marked from Numbers page",
          }
        : { outcome: data.outcome };
    const { error } = await db
      .from("clinic_appointments")
      .update(patch)
      .eq("id", data.appointmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SpendUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ad_name: z.string().min(1),
  adset_name: z.string().nullable().optional(),
  campaign_name: z.string().nullable().optional(),
  spend_aud: z.number().min(0),
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
});

export const listSpendRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RangeSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    let q = db
      .from("ad_spend_daily")
      .select("*")
      .order("date", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("date", data.from);
    if (data.to) q = q.lte("date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ ...r, spend_aud: Number(r.spend_aud) })) as SpendRow[];
  });

export const upsertManualSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SpendUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const campaign = data.campaign_name?.trim() || null;
    const location = campaign
      ? campaign.replace(/^hair\s+transplant\s+/i, "").trim() || null
      : null;
    const row = {
      date: data.date,
      ad_name: data.ad_name.trim(),
      adset_name: data.adset_name?.trim() || null,
      campaign_name: campaign,
      location,
      spend_aud: data.spend_aud,
      impressions: data.impressions ?? 0,
      clicks: data.clicks ?? 0,
      source: "manual",
    };

    if (data.id) {
      const { error } = await db.from("ad_spend_daily").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    const { data: inserted, error } = await db
      .from("ad_spend_daily")
      .upsert([row], { onConflict: "date,ad_name", ignoreDuplicates: false })
      .select("id");
    if (error) {
      // Fall back to a plain insert if the composite conflict target is not usable.
      const { data: ins, error: e2 } = await db
        .from("ad_spend_daily")
        .insert([row])
        .select("id")
        .single();
      if (e2) throw new Error(e2.message);
      return { ok: true, id: ins.id };
    }
    return { ok: true, id: inserted?.[0]?.id ?? null };
  });

export const deleteSpendRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const { error } = await db.from("ad_spend_daily").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
