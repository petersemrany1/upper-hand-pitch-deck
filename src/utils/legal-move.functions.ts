import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEGAL_TABLES, LEGAL_TABLE_NAMES } from "@/legal/move/manifest";

// Copies Legal Group records into the legal_ tables of this database while the
// Legal app is being moved in (docs/legal-move-plan.md). Admin only. Rows are
// read from the Legal database in the browser with the admin's Legal sign-in
// and written here with the service role; Legal triggers stay disabled, so
// copying never sends texts, reminders or webhooks.

async function assertAdmin(supabase: { rpc: (fn: "is_admin_user") => PromiseLike<{ data: unknown; error: { message: string } | null }> }) {
  const { data, error } = await supabase.rpc("is_admin_user");
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Admins only");
}

const tableName = z.string().refine((t) => LEGAL_TABLE_NAMES.has(t), "Unknown Legal table");

/** Upsert one batch of Legal rows. Deferred links are left empty until the second pass. */
export const importLegalRowsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: string; rows: Record<string, unknown>[]; pass: "rows" | "links" }) =>
    z
      .object({
        table: tableName,
        rows: z.array(z.record(z.string(), z.unknown())).max(1000),
        pass: z.enum(["rows", "links"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const spec = LEGAL_TABLES.find((t) => t.name === data.table)!;
    if (!data.rows.length) return { written: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (spec.skip.includes(k)) continue;
        if (data.pass === "rows" && spec.deferred.includes(k)) out[k] = null;
        else if (data.pass === "links" && !spec.key.includes(k) && !spec.deferred.includes(k)) continue;
        else out[k] = v;
      }
      return out;
    });
    const target = supabaseAdmin.from(`legal_${data.table}` as never) as unknown as {
      upsert: (rows: unknown[], opts: { onConflict: string }) => PromiseLike<{ error: { message: string } | null }>;
    };
    if (data.pass === "links") {
      // Only rows that actually have a link need the second pass.
      const linked = rows.filter((r) => spec.deferred.some((c) => r[c] != null));
      if (!linked.length) return { written: 0 };
      for (const r of linked) {
        const patch = Object.fromEntries(spec.deferred.map((c) => [c, r[c]]));
        let q = (supabaseAdmin.from(`legal_${data.table}` as never) as any).update(patch);
        for (const k of spec.key) q = q.eq(k, r[k]);
        const { error } = await q;
        if (error) throw new Error(`${data.table}: ${error.message}`);
      }
      return { written: linked.length };
    }
    const { error } = await target.upsert(rows, { onConflict: spec.key.join(",") });
    if (error) throw new Error(`${data.table}: ${error.message}`);
    return { written: rows.length };
  });

/** Row counts of every legal_ table here, to compare with the Legal database. */
export const legalCopyCountsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const counts: Record<string, number | string> = {};
    for (const t of LEGAL_TABLES) {
      const { count, error } = await (supabaseAdmin.from(`legal_${t.name}` as never) as any).select("*", {
        count: "exact",
        head: true,
      });
      counts[t.name] = error ? `error: ${error.message}` : (count ?? 0);
    }
    return counts;
  });
