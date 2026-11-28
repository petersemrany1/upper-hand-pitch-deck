import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WEBSITE_LABEL, pipelineOf, type Pipeline } from "@/components/numbers/model";

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
function reportingWindow(data: { from?: string | null; to?: string | null; location?: string | null }) {
  const next = data.to ? new Date(data.to + "T00:00:00Z") : null;
  if (next) next.setUTCDate(next.getUTCDate() + 1);
  return {
    from: data.from || undefined, to: data.to || undefined, city: data.location || undefined,
    start: data.from ? sydneyDayStart(data.from) : undefined,
    endExclusive: next ? sydneyDayStart(next.toISOString().slice(0, 10)) : undefined,
  };
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
  ad_key?: string;
  ad_id?: string | null;
  adset_name?: string | null;
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

/**
 * Calls per lead (and the latest), from the call log. Test leads never have a
 * rep, so they fall out with the rest. With leadIds, only those leads' calls
 * are read (the drill-down); otherwise every call since `from`, fetched a few
 * pages at a time in parallel rather than one page after another.
 */
async function callCountsByLead(
  db: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  from: string | undefined,
  leadIds?: string[],
): Promise<Map<string, { calls: number; last: string | null }>> {
  const out = new Map<string, { calls: number; last: string | null }>();
  const page = 1000;
  type CallRow = { lead_id: string; called_at: string | null };
  type Page = { data: CallRow[] | null; error: { message: string } | null; count?: number | null };
  const add = (rows: CallRow[] | null) => {
    for (const c of rows ?? []) {
      const cur = out.get(c.lead_id) ?? { calls: 0, last: null };
      cur.calls += 1;
      if (c.called_at && (!cur.last || c.called_at > cur.last)) cur.last = c.called_at;
      out.set(c.lead_id, cur);
    }
  };
  const query = (i: number, ids?: string[], count = false) => {
    let q = db.from("call_records").select("id, lead_id, called_at", count ? { count: "exact" } : undefined)
      .not("lead_id", "is", null).order("called_at", { ascending: true }).order("id", { ascending: true })
      .range(i * page, i * page + page - 1);
    if (from) q = q.gte("called_at", sydneyDayStart(from));
    if (ids) q = q.in("lead_id", ids);
    return q as Promise<Page>;
  };
  const check = (r: Page) => { if (r.error) throw new Error(`call_records: ${r.error.message}`); return r; };

  if (leadIds) {
    for (let j = 0; j < leadIds.length; j += 100) {
      const ids = leadIds.slice(j, j + 100);
      for (let i = 0; i < 100; i += 1) {
        const r = check(await query(i, ids));
        add(r.data);
        if (!r.data || r.data.length < page) break;
      }
    }
    return out;
  }

  const first = check(await query(0, undefined, true));
  add(first.data);
  if (!first.data || first.data.length < page) return out;
  const pages = Math.min(100, Math.ceil((first.count ?? 0) / page));
  let i = 1;
  for (; i < pages; i += 6) {
    const batch = await Promise.all(Array.from({ length: Math.min(6, pages - i) }, (_, k) => query(i + k)));
    for (const r of batch) add(check(r).data);
  }
  // Calls logged after the count was taken: carry on one page at a time.
  for (; i < 100; i += 1) {
    const r = check(await query(i));
    add(r.data);
    if (!r.data || r.data.length < page) break;
  }
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

    const { readAdActivity } = await import("./numbers-ad-report.server");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    // Everything below is independent, so it all runs at once. The call log
    // and the unresolved-outcome list used to wait for the rest to finish,
    // which added several seconds to every load. Only what the page shows is
    // fetched: the per-ad labour/revenue and the monthly series had no reader.
    const [activity, perfAll, locs, sync, labLoc, revLoc, labLocP, packEcon, callsResult, unresolvedResult] = await Promise.all([
      readAdActivity(db, reportingWindow(data)),
      // Unfiltered: every lead and every spend row in the window, city or not.
      // "All cities" is measured against this so nothing can fall out of it.
      location ? db.rpc("ad_performance", { p_from: from, p_to: to, p_location: undefined }) : Promise.resolve(null),
      db.rpc("ad_location_summary", { p_from: from, p_to: to }),
      db.from("ad_spend_sync_state").select("*").eq("id", 1).maybeSingle(),
      rpc("labour_by_key", { p_from: from, p_to: to, p_mode: "location" }),
      rpc("revenue_by_key", { p_from: from, p_to: to, p_mode: "location" }),
      peterId ? rpc("labour_by_key", { p_from: from, p_to: to, p_mode: "location", p_rep: peterId }) : Promise.resolve({ data: null, error: null }),
      rpc("clinic_pack_economics", {}),
      callCountsByLead(db, from).then((calls) => ({ calls, error: null as Error | null }), (error: Error) => ({ calls: null, error })),
      // Unresolved outcomes: past-dated appointments with no outcome recorded.
      db
        .from("clinic_appointments")
        .select("id, patient_name, appointment_date, appointment_time, clinic_id")
        .is("outcome", null)
        .lt("appointment_date", today)
        .order("appointment_date", { ascending: false })
        .limit(200),
    ]);
    // Anything that is not the money figures must never take the page down.
    const warnings: string[] = [];
    let pipelines: Record<string, Pipeline> = {};
    if (callsResult.calls) {
      const calls = callsResult.calls;
      pipelines = Object.fromEntries([...activity.members].map(([key, leads]) => [key,
        pipelineOf(leads.map(l => ({ status: l.status, calls: calls.get(l.lead_id)?.calls ?? 0, booked: !!l.is_booked }))),
      ]));
    } else {
      warnings.push(`The "Called" column could not be worked out: ${callsResult.error?.message ?? "unknown error"}`);
    }

    const unresolved = unresolvedResult.data;
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

    // Leads and spend are the page; without them there is nothing to show.
    // Labour, revenue and the monthly chart degrade to a warning instead.
    const fatal = perfAll?.error ?? locs.error;
    if (fatal) throw new Error(`Report query failed: ${fatal.message}`);
    const soft = (label: string, r: { error: { message: string } | null } | null) => { if (r?.error) warnings.push(`${label} could not be loaded (${r.error.message}); those figures are blank.`); };
    soft("Labour", labLoc); soft("Revenue", revLoc);
    if (data.excludePeter && !peterId) warnings.push("Could not find Peter's rep record, so his pay is still counted in labour.");
    if (peterId && labLocP.error) warnings.push("Peter's own labour could not be separated out, so his pay is still counted in labour.");
    const peterExcluded = peterId !== null && !labLocP.error;
    const num = (v: unknown) => Number(v ?? 0);
    // Whatever the window holds that no city claims: leads with no city on them
    // and spend on campaigns that name no city. It goes into one "Website" row
    // so the All-cities total is the whole window, never just the cities.
    const perfRows = (perfAll?.data ?? activity.ads) as unknown as AdPerformanceRow[];
    const locRows = ((locs.data ?? []) as unknown as LocationSummaryRow[]).filter((r) => r.location);
    const FUNNEL = ["spend", "leads", "booked", "showed", "noshow", "upcoming", "needs_outcome", "disqualified"] as const;
    const remainder = Object.fromEntries(FUNNEL.map((k) => {
      const diff = perfRows.reduce((s, r) => s + num(r[k]), 0) - locRows.reduce((s, r) => s + num(r[k]), 0);
      return [k, Math.max(0, k === "spend" ? Math.round(diff * 100) / 100 : diff)];
    })) as Record<(typeof FUNNEL)[number], number>;
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
    const labourLocRows = subLabour(mapLabour(labLoc.data), labLocP.data);

    return {
      peterExcluded,
      spendCoverage: activity.spendCoverage,
      spendDuplicates: activity.spendDuplicates,
      spendPartialDays: activity.spendPartialDays,
      labourByLocation: labourLocRows,
      revenueByLocation: mapRevenue(revLoc.data),
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
      ads: activity.ads,
      pipelines,
      locations: [...locRows.map((r) => ({ ...r, spend: Number(r.spend ?? 0) })), ...(websiteRow ? [websiteRow] : [])],
      warnings,
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
  adKey: z.string().min(1),
});

export const listAdLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AdLeadsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const { readAdActivity } = await import("./numbers-ad-report.server");
    const { members } = await readAdActivity(db, reportingWindow(data));
    const leads = members.get(data.adKey) ?? [];
    if (!leads.length) return [];
    const rows = [];
    for (let i = 0; i < leads.length; i += 100) {
      const { data: details, error } = await db.from("ad_lead_outcomes")
        .select("lead_id, created_at, first_name, last_name, phone, status, location, appointment_date, outcome, is_booked, is_showed, is_noshow, is_upcoming, needs_outcome, is_disqualified")
        .in("lead_id", leads.slice(i, i + 100).map(l => l.lead_id));
      if (error) throw new Error(error.message);
      rows.push(...(details ?? []));
    }
    rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    // How many times each lead has been called, so the list can say who is still to call.
    const calls = await callCountsByLead(db, data.from ?? undefined, leads.map((l) => l.lead_id));
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
    // Every row in the range, a page at a time: a flat 500-row cap silently
    // dropped the oldest entries once the table grew past it.
    const rows: Record<string, unknown>[] = [];
    for (let lo = 0; lo < 20000; lo += 1000) {
      let q = db
        .from("ad_spend_daily")
        .select("*")
        .order("date", { ascending: false })
        .order("id", { ascending: true })
        .range(lo, lo + 999);
      if (data.from) q = q.gte("date", data.from);
      if (data.to) q = q.lte("date", data.to);
      const { data: page, error } = await q;
      if (error) throw new Error(error.message);
      rows.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    return rows.map((r) => ({ ...r, spend_aud: Number(r.spend_aud) })) as SpendRow[];
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
