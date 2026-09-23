import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WEBSITE_LABEL, pipelineKey, pipelineOf, type Pipeline } from "@/components/numbers/model";

// ---- Sydney day boundaries, correct through daylight saving. The SQL cuts
// leads by (created_at AT TIME ZONE 'Australia/Sydney')::date; anything we
// filter here must draw the same line, and a fixed "+10:00" is an hour out
// from October to April.
const SYD = "Australia/Sydney";
function sydneyDayStart(day: string): string {
  for (const off of ["+11:00", "+10:00"]) {
    const iso = `${day}T00:00:00${off}`;
    const parts = new Intl.DateTimeFormat("en-AU", { timeZone: SYD, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit" }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    if (`${get("year")}-${get("month")}-${get("day")}` === day && get("hour") === "00") return iso;
  }
  return `${day}T00:00:00+10:00`;
}
function sydneyDayEnd(day: string): string {
  const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1);
  const next = d.toISOString().slice(0, 10);
  return new Date(new Date(sydneyDayStart(next)).getTime() - 1000).toISOString();
}

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

export type PackEconomicsRow = {
  clinic_id: string;
  clinic_name: string;
  city: string | null;
  shows_purchased: number;
  shows_paid_purchased: number;
  shows_free_purchased: number;
  amount_paid_ex_gst: number;
  packs_missing_amount: number;
  shows_delivered: number;
  free_shows_delivered: number;
  effective_rate: number | null;
  paid_rate: number | null;
  shows_owed: number;
  value_owed: number;
  over_delivered: number;
  list_rate: number;
};

export type MoneyMonthPoint = {
  month: string;
  location: string;
  spend: number;
  showed: number;
  revenue: number;
  labour_cost: number;
  bonus_cost: number;
};

/** Calls per lead (and the latest), from the call log. Test leads never have a rep, so they fall out with the rest. */
async function callCountsByLead(
  db: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  from: string | undefined,
): Promise<Map<string, { calls: number; last: string | null }>> {
  const out = new Map<string, { calls: number; last: string | null }>();
  const page = 1000;
  for (let i = 0; i < 100; i += 1) {
    let q = db.from("call_records").select("id, lead_id, called_at").not("lead_id", "is", null).order("called_at", { ascending: true }).order("id", { ascending: true }).range(i * page, i * page + page - 1);
    if (from) q = q.gte("called_at", sydneyDayStart(from));
    const { data, error } = (await q) as { data: { lead_id: string; called_at: string | null }[] | null; error: { message: string } | null };
    if (error) throw new Error(`call_records: ${error.message}`);
    for (const c of data ?? []) {
      const cur = out.get(c.lead_id) ?? { calls: 0, last: null };
      cur.calls += 1;
      if (c.called_at && (!cur.last || c.called_at > cur.last)) cur.last = c.called_at;
      out.set(c.lead_id, cur);
    }
    if (!data || data.length < page) break;
  }
  return out;
}

/** Where every lead in the range sits in the calling pipeline, per ad. Same cohort as ad_performance. */
async function pipelinesByAd(
  db: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  from: string | undefined,
  to: string | undefined,
  location: string | undefined,
): Promise<Record<string, Pipeline>> {
  const rows: { lead_id: string; ad_name: string | null; status: string | null; unattributed: boolean; is_booked: boolean }[] = [];
  const page = 1000;
  for (let i = 0; i < 50; i += 1) {
    let q = db.from("ad_lead_outcomes").select("lead_id, ad_name, status, unattributed, is_booked, location").order("created_at", { ascending: true }).order("lead_id", { ascending: true }).range(i * page, i * page + page - 1);
    if (from) q = q.gte("created_at", sydneyDayStart(from));
    if (to) q = q.lte("created_at", sydneyDayEnd(to));
    if (location) q = q.ilike("location", location);
    const { data, error } = (await q) as { data: typeof rows | null; error: { message: string } | null };
    if (error) throw new Error(`ad_lead_outcomes: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  const calls = await callCountsByLead(db, from);
  const byAd = new Map<string, { status: string | null; calls: number; booked: boolean }[]>();
  for (const r of rows) {
    const k = pipelineKey(r.ad_name ?? "", r.unattributed);
    const list = byAd.get(k) ?? [];
    list.push({ status: r.status, calls: calls.get(r.lead_id)?.calls ?? 0, booked: !!r.is_booked });
    byAd.set(k, list);
  }
  const out: Record<string, Pipeline> = {};
  for (const [k, list] of byAd) out[k] = pipelineOf(list);
  return out;
}

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

    const [perf, perfAll, locs, monthly, sync, labLoc, labAd, revLoc, revAd, moneyMonth, labLocP, labAdP, moneyMonthP, packEcon] = await Promise.all([
      db.rpc("ad_performance", { p_from: from, p_to: to, p_location: location }),
      // Unfiltered: every lead and every spend row in the window, city or not.
      // "All cities" is measured against this so nothing can fall out of it.
      location ? db.rpc("ad_performance", { p_from: from, p_to: to, p_location: undefined }) : Promise.resolve(null),
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
      rpc("clinic_pack_economics", {}),
    ]);
    // Anything that is not the money figures must never take the page down.
    const warnings: string[] = [];
    let pipelines: Record<string, Pipeline> = {};
    try { pipelines = await pipelinesByAd(db as unknown as { from: (t: string) => any }, from, to, location); } // eslint-disable-line @typescript-eslint/no-explicit-any
    catch (e) { warnings.push(`The "Called" column could not be worked out: ${(e as Error).message}`); }


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

    // How far back the spend data goes, and whether any day has the same ad
    // recorded twice (a hand-entered row next to a Meta row double counts).
    const [spendFirst, spendLast, spendKeys] = await Promise.all([
      db.from("ad_spend_daily").select("date").order("date", { ascending: true }).limit(1).maybeSingle(),
      db.from("ad_spend_daily").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
      db.from("ad_spend_daily").select("date, ad_name, source").limit(5000),
    ]);
    const seen = new Map<string, number>();
    for (const r of spendKeys.data ?? []) {
      const k = `${r.date}|${String(r.ad_name).trim().toLowerCase()}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    const spendDuplicates = Array.from(seen.values()).filter((n) => n > 1).length;

    // Leads and spend are the page; without them there is nothing to show.
    // Labour, revenue and the monthly chart degrade to a warning instead.
    const fatal = perf.error ?? (perfAll && perfAll.error) ?? locs.error;
    if (fatal) throw new Error(`Report query failed: ${fatal.message}`);
    const soft = (label: string, r: { error: { message: string } | null } | null) => { if (r?.error) warnings.push(`${label} could not be loaded (${r.error.message}); those figures are blank.`); };
    soft("Labour", labLoc); soft("Labour by ad", labAd); soft("Revenue", revLoc); soft("Revenue by ad", revAd); soft("Monthly figures", moneyMonth); soft("Monthly cost per show", monthly);
    if (data.excludePeter && !peterId) warnings.push("Could not find Peter's rep record, so his pay is still counted in labour.");
    if (peterId && (labLocP.error || labAdP.error || moneyMonthP.error)) warnings.push("Peter's own labour could not be separated out, so his pay is still counted in labour.");
    const peterExcluded = peterId !== null && !labLocP.error && !labAdP.error;
    const num = (v: unknown) => Number(v ?? 0);
    // Whatever the window holds that no city claims: leads with no city on them
    // and spend on campaigns that name no city. It goes into one "Website" row
    // so the All-cities total is the whole window, never just the cities.
    const perfRows = ((perfAll ?? perf).data ?? []) as unknown as AdPerformanceRow[];
    const locRows = ((locs.data ?? []) as unknown as LocationSummaryRow[]).filter((r) => r.location);
    const FUNNEL = ["spend", "leads", "booked", "showed", "noshow", "upcoming", "needs_outcome", "disqualified"] as const;
    const remainder = Object.fromEntries(FUNNEL.map((k) => [k, Math.max(0, perfRows.reduce((s, r) => s + num(r[k]), 0) - locRows.reduce((s, r) => s + num(r[k]), 0))])) as Record<(typeof FUNNEL)[number], number>;
    const websiteRow: LocationSummaryRow | null = FUNNEL.some((k) => remainder[k] > 0) ? { location: WEBSITE_LABEL, ...remainder } : null;
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
      peterExcluded,
      spendCoverage: {
        from: (spendFirst.data?.date as string | undefined) ?? null,
        to: (spendLast.data?.date as string | undefined) ?? null,
      },
      spendDuplicates,
      labourByLocation: labourLocRows,
      labourByAd: labourAdRows,
      revenueByLocation: mapRevenue(revLoc.data),
      revenueByAd: mapRevenue(revAd.data),
      moneyMonthly: moneyMonthRows,
      packEconomics: ((packEcon.data ?? []) as Record<string, unknown>[]).map((r) => ({
        clinic_id: String(r.clinic_id ?? ""),
        clinic_name: String(r.clinic_name ?? ""),
        city: (r.city as string | null) ?? null,
        shows_purchased: num(r.shows_purchased),
        shows_paid_purchased: num(r.shows_paid_purchased),
        shows_free_purchased: num(r.shows_free_purchased),
        amount_paid_ex_gst: num(r.amount_paid_ex_gst),
        packs_missing_amount: num(r.packs_missing_amount),
        shows_delivered: num(r.shows_delivered),
        free_shows_delivered: num(r.free_shows_delivered),
        effective_rate: r.effective_rate == null ? null : num(r.effective_rate),
        paid_rate: r.paid_rate == null ? null : num(r.paid_rate),
        shows_owed: num(r.shows_owed),
        value_owed: num(r.value_owed),
        over_delivered: num(r.over_delivered),
        list_rate: num(r.list_rate),
      })) as PackEconomicsRow[],
      ads: ((perf.data ?? []) as unknown as AdPerformanceRow[]).map((r) => ({
        ...r,
        spend: Number(r.spend ?? 0),
      })),
      pipelines,
      locations: [...locRows.map((r) => ({ ...r, spend: Number(r.spend ?? 0) })), ...(websiteRow ? [websiteRow] : [])],
      warnings,
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

    if (data.from) q = q.gte("created_at", sydneyDayStart(data.from));
    if (data.to) q = q.lte("created_at", sydneyDayEnd(data.to));

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    // How many times each lead has been called, so the list can say who is still to call.
    const calls = await callCountsByLead(db as unknown as { from: (t: string) => any }, data.from ?? undefined); // eslint-disable-line @typescript-eslint/no-explicit-any
    return (rows ?? []).map((r) => { const c = r.lead_id ? calls.get(r.lead_id) : undefined; return { ...r, calls: c?.calls ?? 0, last_called_at: c?.last ?? null }; });
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

    // An attended or disqualified consult means the $75 booking fee goes back
    // to the patient. This used to write the outcome only, which silently
    // skipped the refund whenever it was recorded from this page.
    if (data.outcome === "show" || data.outcome === "disqualified") {
      const { settleAppointmentRefund } = await import("@/utils/consult-outcome.functions");
      const refund = await settleAppointmentRefund(
        data.appointmentId,
        data.outcome === "disqualified"
          ? "Disqualified at consultation — booking fee refund"
          : "Attended consultation — booking fee refund",
        "setAppointmentOutcomeFromNumbers",
      );
      return { ok: true, refund };
    }
    return { ok: true, refund: null };
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
    const { locationFromCampaign } = await import("@/lib/meta-spend.server");
    const location = locationFromCampaign(campaign);
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

    // The table's unique index is on (date, COALESCE(ad_id, ad_name)), which
    // an upsert cannot name, so find any hand-entered row for this day and ad
    // ourselves and update it. Re-entering a day must never add a second row.
    const { data: existing, error: findErr } = await db
      .from("ad_spend_daily")
      .select("id")
      .eq("date", row.date)
      .eq("source", "manual")
      .ilike("ad_name", row.ad_name)
      .limit(1);
    if (findErr) throw new Error(findErr.message);
    if (existing && existing.length > 0) {
      const { error } = await db.from("ad_spend_daily").update(row).eq("id", existing[0].id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing[0].id };
    }
    const { data: ins, error: e2 } = await db.from("ad_spend_daily").insert([row]).select("id").single();
    if (e2) throw new Error(e2.message);
    return { ok: true, id: ins.id };
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

export type ClinicOption = { id: string; clinic_name: string; city: string | null };

export type ClinicPackRow = {
  id: string;
  clinic_id: string;
  pack_name: string | null;
  pack_size: number;
  amount_paid_ex_gst: number | null;
  date_paid: string | null;
  pack_type: string;
  free_shows_included: number;
  notes: string | null;
  purchased_at: string;
  status: string;
};

export const listClinicPacks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const [packs, clinics] = await Promise.all([
      db
        .from("clinic_packs")
        .select("id, clinic_id, pack_name, pack_size, amount_paid_ex_gst, date_paid, pack_type, free_shows_included, notes, purchased_at, status")
        .order("purchased_at", { ascending: false }),
      db.from("partner_clinics").select("id, clinic_name, city").order("clinic_name"),
    ]);
    if (packs.error) throw new Error(packs.error.message);
    if (clinics.error) throw new Error(clinics.error.message);
    return {
      packs: (packs.data ?? []).map((r) => ({
        ...r,
        amount_paid_ex_gst: r.amount_paid_ex_gst == null ? null : Number(r.amount_paid_ex_gst),
      })) as ClinicPackRow[],
      clinics: (clinics.data ?? []) as ClinicOption[],
    };
  });

const PackUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  clinic_id: z.string().uuid(),
  pack_name: z.string().nullable().optional(),
  pack_size: z.number().int().min(0),
  amount_paid_ex_gst: z.number().min(0).nullable().optional(),
  date_paid: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  pack_type: z.enum(["paid", "free_trial", "guarantee_credit", "goodwill"]),
  free_shows_included: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const upsertClinicPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PackUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const row = {
      clinic_id: data.clinic_id,
      pack_name: data.pack_name?.trim() || null,
      pack_size: data.pack_size,
      amount_paid_ex_gst: data.amount_paid_ex_gst ?? null,
      date_paid: data.date_paid || null,
      pack_type: data.pack_type,
      free_shows_included: data.free_shows_included ?? 0,
      notes: data.notes?.trim() || null,
    };
    if (data.id) {
      const { error } = await db.from("clinic_packs").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await db
      .from("clinic_packs")
      .insert([{ ...row, status: "active" }])
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted?.id ?? null };
  });

export const deleteClinicPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const { error } = await db.from("clinic_packs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BackfillSchema = z.object({
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Admin-triggered Meta spend pull for a date range (used to fill the gap
// before the nightly sync existed). Same code path as the webhook.
export const backfillMetaSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BackfillSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.claims as Record<string, unknown>);
    const { syncMetaSpend } = await import("@/lib/meta-spend.server");
    return syncMetaSpend({ since: data.since, until: data.until });
  });

// Admin data-quality audit for the Numbers page (see numbers-audit.server.ts).
export const runNumbersDataAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const { runNumbersAudit } = await import("@/lib/numbers-audit.server");
    return runNumbersAudit(db as unknown as Parameters<typeof runNumbersAudit>[0], {
      accessToken: process.env.META_ACCESS_TOKEN,
      accountId: process.env.META_AD_ACCOUNT_ID,
    });
  });
