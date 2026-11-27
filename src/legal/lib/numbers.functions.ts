// Ported from the Legal app (family-law-floater/src/lib/numbers.functions.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import { addDays } from "./reporting-period";
import { sydneyTodayISO } from "./timezone";
import { spendReportingCutoff } from "./spend-reporting-cutoff";
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) => Number.isFinite(Date.parse(d + "T12:00:00Z")) && addDays(d, 0) === d,
    "Invalid calendar date",
  );
const range = z
  .object({
    from: day.nullable().optional(),
    to: day.nullable().optional(),
    location: z.string().nullable().optional(),
    excludePeter: z.boolean().optional(),
  })
  .refine((r) => !r.from || !r.to || r.from <= r.to, "From must be before To");
const admin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const { data, error } = await context.supabase.rpc("is_admin_user");
    if (error || data !== true) throw new Error("Admins only");
    return next();
  });
export const getNumbersReport = createServerFn({ method: "POST" })
  .middleware([admin])
  .inputValidator(range)
  .handler(async ({ data }) => {
    const { loadReportingData, readAll } = await import("./reporting-data.server");
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { makeNumbersReport } = await import("./numbers");
    const [records, spend, rates, sync, corrections] = await Promise.all([
      loadReportingData({ includeInbound: true }),
      readAll("ad_spend_daily"),
      supabaseAdmin.from("reporting_rep_rates").select("*"),
      supabaseAdmin.from("ad_spend_sync_state").select("*").eq("id", 1).single(),
      readAll("reporting_hour_overrides"),
    ]);
    if (rates.error || sync.error)
      throw new Error(
        "Reporting setup is incomplete. Apply the legal reporting migration before opening Numbers.",
      );
    const coverage: string[] = [];
    for (let offset = 0; ; offset += 500) {
      const r = await supabaseAdmin
        .from("ad_spend_coverage")
        .select("date")
        .order("date")
        .range(offset, offset + 499);
      if (r.error) throw r.error;
      coverage.push(...r.data.map((r) => r.date));
      if (r.data.length < 500) break;
    }
    const expectedStart =
        data.from ??
        [
          ...records.leads.map((l) => sydneyTodayISO(new Date(l.created_at))),
          ...spend.map((s) => s.date),
        ].sort()[0] ??
        sydneyTodayISO(),
      requestedEnd = data.to && data.to < sydneyTodayISO() ? data.to : sydneyTodayISO();
    const days = new Set(coverage);
    const expectedEnd = spendReportingCutoff(
      requestedEnd,
      sydneyTodayISO(),
      days,
      sync.data.last_synced_at,
    );
    const report = makeNumbersReport(
      records,
      spend,
      rates.data,
      { ...data, to: expectedEnd },
      new Date(),
      corrections,
    );
    if (expectedEnd < requestedEnd)
      report.warnings.unshift(
        `Reporting through ${expectedEnd}, the latest imported day. Today's activity will appear after the morning spend refresh.`,
      );
    let missing = 0;
    for (let d = expectedStart; d <= expectedEnd; d = addDays(d, 1)) if (!days.has(d)) missing++;
    if (missing)
      report.warnings.unshift(
        `${missing} days in this range have no verified Meta coverage. Cost figures are incomplete until they are synced.`,
      );
    const manual = spend.filter(
      (s) =>
        s.source === "manual" &&
        days.has(s.date) &&
        (!data.from || s.date >= data.from) &&
        (!data.to || s.date <= data.to),
    );
    if (manual.length)
      report.warnings.push(
        `${manual.length} manual spend entries overlap verified Meta days. Review them to avoid counting the same cost twice.`,
      );
    if (sync.data.last_status === "error")
      report.warnings.unshift(
        sync.data.last_message ??
          "The latest Meta sync failed. Showing the last successful import.",
      );
    return {
      ...report,
      syncState: sync.data,
      manualSyncAvailable: !!(
        legalEnv["LEGAL_META_ACCESS_TOKEN"] || legalEnv["META_ACCESS_TOKEN"]
      ),
      reportingRange: { from: expectedStart, to: expectedEnd },
      coverageComplete: expectedStart <= expectedEnd && missing === 0 && !!sync.data.last_synced_at,
      rates: rates.data,
      reps: records.reps
        .filter((r) => r.is_active)
        .map((r) => ({ id: r.id, name: r.name ?? "Unnamed rep" })),
      spendRows: spend.filter(
        (s) => (!data.from || s.date >= data.from) && (!data.to || s.date <= data.to),
      ),
    };
  });
export const syncLegalMetaSpend = createServerFn({ method: "POST" })
  .middleware([admin])
  .inputValidator(
    z
      .object({ from: day, to: day })
      .refine(
        (r) => r.from <= r.to && r.to <= sydneyTodayISO() && r.to <= addDays(r.from, 366),
        "Choose up to one year ending no later than today",
      ),
  )
  .handler(async ({ data }) => {
    const { syncMetaSpend } = await import("./meta-spend.server");
    return syncMetaSpend(data.from, data.to);
  });
export const saveReportingRate = createServerFn({ method: "POST" })
  .middleware([admin])
  .inputValidator(
    z.object({
      rep_id: z.string().uuid(),
      hourly_rate: z.number().min(0).max(10000).nullable(),
      booking_bonus: z.number().min(0).max(10000).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reporting_rep_rates").upsert(data);
    if (error) throw error;
    return { ok: true };
  });
export const saveManualSpend = createServerFn({ method: "POST" })
  .middleware([admin])
  .inputValidator(
    z.object({
      date: day,
      ad_name: z.string().trim().min(1).max(300),
      spend_aud: z.number().min(0).max(10000000),
      location: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ad_spend_daily")
      .insert({ ...data, source: "manual" });
    if (error) throw error;
    return { ok: true };
  });
export const deleteManualSpend = createServerFn({ method: "POST" })
  .middleware([admin])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { data: removed, error } = await supabaseAdmin
      .from("ad_spend_daily")
      .delete()
      .eq("id", data.id)
      .eq("source", "manual")
      .select("id");
    if (error) throw error;
    if (!removed?.length) throw new Error("Only manual entries can be removed");
    return { ok: true };
  });

export const saveReportingHours = createServerFn({ method: "POST" })
  .middleware([admin])
  .inputValidator(
    z.object({
      rep_id: z.string().uuid(),
      work_date: day,
      hours: z.number().min(0).max(24),
      note: z.string().trim().min(1).max(400),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("reporting_hour_overrides")
      .upsert({ ...data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });
