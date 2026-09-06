import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Rep hours (auto-calculated from call timestamps), manual overrides and
// per-rep effective-dated rates. Read-only on call_records / meta_leads /
// clinic_appointments — the only writes here are to rep_rates and
// rep_hour_overrides.

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const RangeSchema = z.object({
  from: DateStr.nullable().optional(),
  to: DateStr.nullable().optional(),
});

export type RepDayRow = {
  rep_id: string;
  rep_name: string;
  work_date: string;
  calls: number;
  first_call: string | null;
  last_call: string | null;
  calc_hours: number;
  override_hours: number | null;
  override_note: string | null;
  effective_hours: number;
  hourly_rate: number | null;
  booking_bonus: number | null;
  has_rate: boolean;
  bookings: number;
  bookings_unresolved: number;
  hourly_cost: number | null;
  bonus_cost: number | null;
  flag_long: boolean;
  flag_sparse: boolean;
  flag_no_location: boolean;
};

export type RepRateRow = {
  id: string;
  rep_id: string;
  rep_name: string | null;
  hourly_rate: number | null;
  booking_bonus: number | null;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
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

type LooseDb = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export const getRepHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RangeSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = (await assertAdmin(context.claims as Record<string, unknown>)) as unknown as LooseDb;
    const [report, rates, reps] = await Promise.all([
      db.rpc("rep_hours_report", { p_from: data.from ?? undefined, p_to: data.to ?? undefined }),
      db.from("rep_rates").select("*").order("effective_from", { ascending: false }),
      db.from("sales_reps").select("id, name, is_active").order("name"),
    ]);
    if (report.error) throw new Error(report.error.message);

    const repList = ((reps.data ?? []) as Array<{ id: string; name: string; is_active: boolean }>).map(
      (r) => ({ id: r.id, name: r.name, is_active: r.is_active }),
    );
    const nameById = new Map(repList.map((r) => [r.id, r.name]));

    const days: RepDayRow[] = ((report.data ?? []) as Record<string, unknown>[]).map((r) => ({
      rep_id: String(r.rep_id ?? ""),
      rep_name: String(r.rep_name ?? "(unknown rep)"),
      work_date: String(r.work_date ?? ""),
      calls: Number(r.calls ?? 0),
      first_call: (r.first_call as string | null) ?? null,
      last_call: (r.last_call as string | null) ?? null,
      calc_hours: Number(r.calc_hours ?? 0),
      override_hours: n(r.override_hours),
      override_note: (r.override_note as string | null) ?? null,
      effective_hours: Number(r.effective_hours ?? 0),
      hourly_rate: n(r.hourly_rate),
      booking_bonus: n(r.booking_bonus),
      has_rate: Boolean(r.has_rate),
      bookings: Number(r.bookings ?? 0),
      bookings_unresolved: Number(r.bookings_unresolved ?? 0),
      hourly_cost: n(r.hourly_cost),
      bonus_cost: n(r.bonus_cost),
      flag_long: Boolean(r.flag_long),
      flag_sparse: Boolean(r.flag_sparse),
      flag_no_location: Boolean(r.flag_no_location),
    }));

    return {
      days,
      reps: repList,
      rates: ((rates.data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        rep_id: String(r.rep_id),
        rep_name: nameById.get(String(r.rep_id)) ?? null,
        hourly_rate: n(r.hourly_rate),
        booking_bonus: n(r.booking_bonus),
        effective_from: String(r.effective_from),
        effective_to: (r.effective_to as string | null) ?? null,
        note: (r.note as string | null) ?? null,
      })) as RepRateRow[],
    };
  });

const RateSchema = z.object({
  id: z.string().uuid().optional(),
  rep_id: z.string().uuid(),
  hourly_rate: z.number().min(0).nullable().optional(),
  booking_bonus: z.number().min(0).nullable().optional(),
  effective_from: DateStr,
  effective_to: DateStr.nullable().optional(),
  note: z.string().max(400).nullable().optional(),
});

export const saveRepRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = (await assertAdmin(context.claims as Record<string, unknown>)) as unknown as LooseDb;
    const row = {
      rep_id: data.rep_id,
      hourly_rate: data.hourly_rate ?? null,
      booking_bonus: data.booking_bonus ?? null,
      effective_from: data.effective_from,
      effective_to: data.effective_to ?? null,
      note: data.note ?? null,
    };
    if (data.id) {
      const { error } = await db.from("rep_rates").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await db.from("rep_rates").insert([row]).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id as string };
  });

export const deleteRepRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = (await assertAdmin(context.claims as Record<string, unknown>)) as unknown as LooseDb;
    const { error } = await db.from("rep_rates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const OverrideSchema = z.object({
  rep_id: z.string().uuid(),
  work_date: DateStr,
  hours: z.number().min(0).max(24),
  note: z.string().max(400).nullable().optional(),
});

export const saveHourOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => OverrideSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = (await assertAdmin(context.claims as Record<string, unknown>)) as unknown as LooseDb;
    const { error } = await db
      .from("rep_hour_overrides")
      .upsert(
        [{ rep_id: data.rep_id, work_date: data.work_date, hours: data.hours, note: data.note ?? null }],
        { onConflict: "rep_id,work_date" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearHourOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ rep_id: z.string().uuid(), work_date: DateStr }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = (await assertAdmin(context.claims as Record<string, unknown>)) as unknown as LooseDb;
    const { error } = await db
      .from("rep_hour_overrides")
      .delete()
      .eq("rep_id", data.rep_id)
      .eq("work_date", data.work_date);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
