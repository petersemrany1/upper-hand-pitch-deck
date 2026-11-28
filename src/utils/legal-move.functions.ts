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
const userMap = z.record(z.string().uuid(), z.string().uuid());

/** Staff whose Legal login email differs from their portal login email. */
const SAME_PERSON: Record<string, string> = {
  "nina@bold-marketing.com.au": "sinclair.nina1@gmail.com",
};

/** Swap Legal login ids for the matching portal login ids (also inside lists). */
function remap(value: unknown, users: Record<string, string>): unknown {
  if (typeof value === "string") return users[value] ?? value;
  if (Array.isArray(value)) return value.map((v) => remap(v, users));
  return value;
}

/**
 * Legal staff sign in to the portal with their portal accounts, so the copied
 * records must point at portal login ids. Matches Legal logins to portal logins
 * by email; anyone without a portal account keeps their Legal id for now.
 */
export const legalUserMapFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { users: { id: string; email: string | null }[]; me?: string }) =>
    z
      .object({
        users: z.array(z.object({ id: z.string().uuid(), email: z.string().nullable() })).max(5000),
        me: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const portal = new Map<string, string>();
    for (let page = 1; ; page++) {
      const { data: res, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      for (const u of res.users) if (u.email) portal.set(u.email.trim().toLowerCase(), u.id);
      if (res.users.length < 1000) break;
    }
    const map: Record<string, string> = {};
    const matched: string[] = [];
    const unmatched: string[] = [];
    // The admin running the copy is signed in to both apps: their Legal login is
    // them, even when the two logins use different emails.
    const self = (context as { userId?: string }).userId;
    for (const u of data.users) {
      if (u.id === data.me && self) {
        map[u.id] = self;
        matched.push(u.email ?? u.id);
        continue;
      }
      const email = u.email?.trim().toLowerCase();
      const id = email ? portal.get(SAME_PERSON[email] ?? email) : undefined;
      // Two Legal logins can't share one portal login; the admin's own wins.
      if (id && !(data.me && data.users.some((x) => x.id === data.me) && id === self)) {
        map[u.id] = id;
        matched.push(u.email!);
      } else unmatched.push(u.email ?? u.id);
    }
    return { map, matched, unmatched };
  });

/** Upsert one batch of Legal rows. Deferred links are left empty until the second pass. */
export const importLegalRowsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { table: string; rows: Record<string, unknown>[]; pass: "rows" | "links" | "cleanup"; first?: boolean; users?: Record<string, string> }) =>
      z
        .object({
          table: tableName,
          rows: z.array(z.record(z.string(), z.unknown())).max(1000),
          pass: z.enum(["rows", "links", "cleanup"]),
          first: z.boolean().optional(),
          users: userMap.optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const spec = LEGAL_TABLES.find((t) => t.name === data.table)!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Keys the database numbers itself can't be copied, so re-runs would add
    // duplicates: those tables (only this copy of them) are refilled from scratch.
    const renumbered = spec.key.some((k) => spec.skip.includes(k));
    if (renumbered && data.pass === "rows" && data.first) {
      const { error } = await (supabaseAdmin.from(`legal_${data.table}` as never) as any)
        .delete()
        .not(spec.key[0], "is", null);
      if (error) throw new Error(`${data.table}: ${error.message}`);
    }
    if (!data.rows.length) return { written: 0 };
    const users = data.users ?? {};
    // Rows keyed by a login id (profiles, settings, progress) are copied under the
    // portal id. The "cleanup" pass, run last and children first, removes the
    // earlier copy still keyed by the Legal id, once nothing points at it.
    if (data.pass === "cleanup") {
      let removed = 0;
      for (const row of data.rows) {
        if (!spec.key.some((k) => typeof row[k] === "string" && users[row[k] as string])) continue;
        let q = (supabaseAdmin.from(`legal_${data.table}` as never) as any).delete();
        for (const k of spec.key) q = q.eq(k, row[k]);
        const { error } = await q;
        if (error) throw new Error(`${data.table}: ${error.message}`);
        removed++;
      }
      return { written: removed };
    }
    const shape = (row: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (spec.skip.includes(k)) continue;
        if (data.pass === "rows" && spec.deferred.includes(k)) out[k] = null;
        else if (data.pass === "links" && !spec.key.includes(k) && !spec.deferred.includes(k)) continue;
        else out[k] = v;
      }
      return out;
    };
    const rows = data.rows.map((original) =>
      shape(Object.fromEntries(Object.entries(original).map(([k, v]) => [k, remap(v, users)]))),
    );
    const stripped = data.rows.map(shape);
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
    if (renumbered) {
      const { error } = await (target as unknown as { insert: (r: unknown[]) => PromiseLike<{ error: { message: string } | null }> }).insert(rows);
      if (error) throw new Error(`${data.table}: ${error.message}`);
      return { written: rows.length };
    }
    // Rows that keep their Legal values go first, so a portal login id an earlier
    // copy gave the wrong row is freed before the right row takes it.
    const swapped = (i: number) => JSON.stringify(rows[i]) !== JSON.stringify(stripped[i]);
    const groups = [rows.filter((_, i) => !swapped(i)), rows.filter((_, i) => swapped(i))];
    for (const group of groups) {
      if (!group.length) continue;
      const { error } = await target.upsert(group, { onConflict: spec.key.join(",") });
      if (error) throw new Error(`${data.table}: ${error.message}`);
    }
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

const LEGAL_BUCKET_SETTINGS: Record<string, { fileSizeLimit?: number }> = {
  "firm-contracts": { fileSizeLimit: 26214400 },
  "firm-offers": {},
  "practice-call-recordings": {},
  "training-media": {},
};

/**
 * Creates the private legal- storage buckets here (if missing) and hands back
 * one-time upload links, so the browser can copy each Legal file straight
 * across. Existing files are replaced.
 */
export const legalStorageUploadLinksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { files: { bucket: string; name: string }[] }) =>
    z
      .object({
        files: z
          .array(z.object({ bucket: z.string().refine((b) => b in LEGAL_BUCKET_SETTINGS), name: z.string().min(1).max(1024) }))
          .max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw new Error(error.message);
    const have = new Set(existing.map((b) => b.id));
    for (const [bucket, opts] of Object.entries(LEGAL_BUCKET_SETTINGS)) {
      if (have.has(`legal-${bucket}`)) continue;
      const { error: e } = await supabaseAdmin.storage.createBucket(`legal-${bucket}`, { public: false, ...opts });
      if (e) throw new Error(`legal-${bucket}: ${e.message}`);
    }
    const links: { bucket: string; name: string; path: string; token: string }[] = [];
    for (const f of data.files) {
      const { data: link, error: e } = await supabaseAdmin.storage
        .from(`legal-${f.bucket}`)
        .createSignedUploadUrl(f.name, { upsert: true });
      if (e) throw new Error(`${f.bucket}/${f.name}: ${e.message}`);
      links.push({ bucket: f.bucket, name: f.name, path: link.path, token: link.token });
    }
    return { links };
  });

/** Files in each legal- bucket here, to compare with the Legal app. */
export const legalStorageCountsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: Record<string, string[]> = {};
    for (const bucket of Object.keys(LEGAL_BUCKET_SETTINGS)) out[bucket] = await listAll(supabaseAdmin.storage.from(`legal-${bucket}`), "");
    return out;
  });

type Lister = { list: (path: string, opts: { limit: number }) => PromiseLike<{ data: { name: string; id: string | null }[] | null; error: { message: string } | null }> };

/** Every file path in a bucket (folders have no id and are walked). */
export async function listAll(bucket: Lister, prefix: string): Promise<string[]> {
  const { data, error } = await bucket.list(prefix, { limit: 1000 });
  if (error) return [];
  const out: string[] = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) out.push(path);
    else out.push(...(await listAll(bucket, path)));
  }
  return out;
}

/**
 * Switch-over: gives each Legal law-firm login a portal login with the same
 * email (no password, nothing sent). The next copy then points the firm's
 * records at it, and staff send each firm its "set your password" email from
 * the firm portal setup button. Existing portal logins are reused.
 */
export const legalCreateFirmLoginsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { users: { id: string; email: string | null }[] }) =>
    z.object({ users: z.array(z.object({ id: z.string().uuid(), email: z.string().nullable() })).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = new Set<string>();
    for (let page = 1; ; page++) {
      const { data: res, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      for (const u of res.users) if (u.email) existing.add(u.email.trim().toLowerCase());
      if (res.users.length < 1000) break;
    }
    const created: string[] = [];
    const reused: string[] = [];
    const failed: string[] = [];
    for (const u of data.users) {
      const email = u.email?.trim().toLowerCase();
      if (!email) continue;
      if (existing.has(email)) {
        reused.push(email);
        continue;
      }
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { legal_firm_login: true },
      });
      if (error) failed.push(`${email}: ${error.message}`);
      else {
        created.push(email);
        existing.add(email);
      }
    }
    return { created, reused, failed };
  });
