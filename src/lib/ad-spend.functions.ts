import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Read-only ad-spend reporting + manual spend entry + clearing unresolved
// appointment outcomes. This module NEVER writes to meta_leads.

const RangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  location: z.string().nullable().optional(),
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

export const getNumbersReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RangeSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.claims as Record<string, unknown>);
    const from = data.from ?? null;
    const to = data.to ?? null;
    const location = data.location && data.location.length > 0 ? data.location : null;

    const [perf, locs, monthly, sync] = await Promise.all([
      db.rpc("ad_performance", { p_from: from, p_to: to, p_location: location }),
      db.rpc("ad_location_summary", { p_from: from, p_to: to }),
      db.rpc("ad_cost_per_show_monthly", { p_from: from, p_to: to }),
      db.from("ad_spend_sync_state").select("*").eq("id", 1).maybeSingle(),
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

    return {
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
    const patch: Record<string, unknown> = { outcome: data.outcome };
    if (data.outcome === "disqualified") {
      patch.disqualified_at = new Date().toISOString();
      patch.disqualified_reason = "Marked from Numbers page";
    }
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
