// Builds one Hair-database migration that recreates the Legal database layout
// (from the Legal portal_schema_export() snapshot) with every Legal table,
// view, function, type, sequence, index, constraint and storage bucket
// prefixed, so nothing clashes with the Hair app's own objects.
//
//   node scripts/legal-move/generate-schema.mjs .legal-move/schema.json > supabase/migrations/<ts>_legal_schema.sql
//
// Triggers are created DISABLED: the copy runs in shadow mode until switch-over
// (see docs/legal-move-plan.md), so importing records never fires Legal's
// follow-up texts, reminders or webhooks. Cron jobs are not created here.
import { readFileSync } from "node:fs";

export const PREFIX = "legal_";
export const BUCKET_PREFIX = "legal-";

/** Names that are also column names: only rename them where they're called as functions. */
const CALL_ONLY = new Set(["can_manage_firm_pipeline", "can_view_team_clients"]);

/** Helpers added to the Legal database only for this move; never copied. */
export const MOVE_HELPERS = new Set([
  "portal_schema_export",
  "portal_table_export",
  "portal_auth_users_export",
  "portal_leaderboard_source",
]);

/** The snapshot minus the move helpers. */
export function withoutHelpers(schema) {
  return { ...schema, functions: schema.functions.filter((f) => !MOVE_HELPERS.has(f.name)) };
}

export function makeRewriter(schema) {
  const names = new Set([
    ...schema.tables.map((t) => t.name),
    ...schema.views.map((v) => v.name),
    ...schema.functions.map((f) => f.name),
    ...schema.types.map((t) => t.name),
    ...schema.sequences,
  ]);
  const buckets = new Set(schema.buckets.map((b) => b.id));
  const word = /[A-Za-z_][A-Za-z0-9_$]*/y;

  /** Rename Legal identifiers in SQL text, leaving prose, comments and page paths alone. */
  function rewrite(sql) {
    let out = "";
    let i = 0;
    const n = sql.length;
    while (i < n) {
      const ch = sql[i];
      // Line comment
      if (ch === "-" && sql[i + 1] === "-") {
        const end = sql.indexOf("\n", i);
        const stop = end === -1 ? n : end;
        out += sql.slice(i, stop);
        i = stop;
        continue;
      }
      // Block comment
      if (ch === "/" && sql[i + 1] === "*") {
        const end = sql.indexOf("*/", i + 2);
        const stop = end === -1 ? n : end + 2;
        out += sql.slice(i, stop);
        i = stop;
        continue;
      }
      // Single-quoted string ('' escapes)
      if (ch === "'") {
        let j = i + 1;
        while (j < n) {
          if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
          else if (sql[j] === "'") break;
          else j++;
        }
        const body = sql.slice(i + 1, j);
        out += "'" + rewriteString(body) + "'";
        i = j + 1;
        continue;
      }
      // Double-quoted identifier
      if (ch === '"') {
        const j = sql.indexOf('"', i + 1);
        const ident = sql.slice(i + 1, j);
        out += names.has(ident) && !CALL_ONLY.has(ident) ? `"${PREFIX}${ident}"` : sql.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      // Identifier
      if (/[A-Za-z_]/.test(ch) && !/[A-Za-z0-9_$]/.test(sql[i - 1] ?? "")) {
        word.lastIndex = i;
        const m = word.exec(sql);
        const w = m[0];
        const prev = sql.slice(0, i).trimEnd();
        const qualifiedBy = /([A-Za-z_][A-Za-z0-9_]*|")\s*\.$/.exec(prev);
        const schemaQual = qualifiedBy ? qualifiedBy[1] : null;
        const after = sql.slice(i + w.length);
        let rename = names.has(w) && (schemaQual === null || schemaQual === "public");
        if (rename && CALL_ONLY.has(w)) rename = /^\s*\(/.test(after);
        // Column/alias references like r.firms are not table names.
        if (schemaQual && schemaQual !== "public") rename = false;
        out += rename ? PREFIX + w : w;
        i += w.length;
        continue;
      }
      out += ch;
      i++;
    }
    return out;
  }

  /** Inside strings: exact names (TG_TABLE_NAME checks, regclass casts), dynamic SQL, bucket ids. */
  function rewriteString(body) {
    if (names.has(body) && !CALL_ONLY.has(body)) return PREFIX + body;
    if (buckets.has(body)) return BUCKET_PREFIX + body;
    // public.x inside dynamic SQL; also "FROM x"/"INTO x"/"UPDATE x"/"JOIN x" style statements.
    let s = body.replace(/\bpublic\.([a-z_][a-z0-9_]*)\b/g, (m, x) => (names.has(x) ? `public.${PREFIX}${x}` : m));
    s = s.replace(
      /\b(FROM|INTO|UPDATE|JOIN|TABLE|ON)(\s+)([a-z_][a-z0-9_]*)\b/gi,
      (m, kw, sp, x) => (names.has(x) && !CALL_ONLY.has(x) ? `${kw}${sp}${PREFIX}${x}` : m),
    );
    return s;
  }

  return { rewrite, names, buckets };
}

const PRIVS = { r: "SELECT", a: "INSERT", w: "UPDATE", d: "DELETE", D: "TRUNCATE", x: "REFERENCES", t: "TRIGGER" };
const ROLES = new Set(["anon", "authenticated", "service_role"]);

function tableGrants(name, acl) {
  if (!acl) return [];
  const out = [`REVOKE ALL ON public.${name} FROM anon, authenticated;`];
  for (const entry of acl) {
    const [grantee, rest] = entry.split("=");
    if (!ROLES.has(grantee)) continue;
    const letters = rest.split("/")[0];
    const privs = [...letters].map((l) => PRIVS[l]).filter(Boolean);
    if (privs.length) out.push(`GRANT ${privs.join(", ")} ON public.${name} TO ${grantee};`);
  }
  // Lovable Cloud requires every table to carry a grant: server-only tables get the service role.
  if (out.length === 1) out.push(`GRANT ALL ON public.${name} TO service_role;`);
  return out;
}

function functionGrants(sig, acl) {
  if (!acl) return [];
  const out = [`REVOKE ALL ON FUNCTION ${sig} FROM PUBLIC, anon, authenticated;`];
  for (const entry of acl) {
    const [grantee, rest] = entry.split("=");
    if (!ROLES.has(grantee) || !rest.split("/")[0].includes("X")) continue;
    out.push(`GRANT EXECUTE ON FUNCTION ${sig} TO ${grantee};`);
  }
  return out;
}

const q = (s) => `"${s.replace(/"/g, '""')}"`;

export function generate(schema) {
  const { rewrite } = makeRewriter(schema);
  const P = (n) => PREFIX + n;
  const L = [];
  const emit = (...lines) => L.push(...lines);

  emit(
    "-- Legal Group app layout, recreated inside the Upper Hand database.",
    "-- Generated by scripts/legal-move/generate-schema.mjs from the Legal",
    "-- portal_schema_export() snapshot. Do not edit by hand: re-generate.",
    "-- Every object is prefixed legal_ (buckets legal-); triggers start disabled",
    "-- and no cron jobs are created, so nothing runs until switch-over.",
    "",
    "",
  );

  emit("-- Types and sequences");
  for (const t of schema.types) {
    if (t.kind === "e")
      emit(`CREATE TYPE public.${P(t.name)} AS ENUM (${t.labels.map((l) => `'${l.replace(/'/g, "''")}'`).join(", ")});`);
    else emit(`CREATE DOMAIN public.${P(t.name)} AS ${rewrite(t.domain_type)};`);
  }
  for (const s of schema.sequences) emit(`CREATE SEQUENCE public.${P(s)};`);
  emit("");

  emit("-- Tables");
  for (const t of schema.tables) {
    const cols = t.columns.map((c) => {
      let def = `  ${q(c.name)} ${rewrite(c.type)}`;
      if (c.identity === "a") def += " GENERATED ALWAYS AS IDENTITY";
      else if (c.identity === "d") def += " GENERATED BY DEFAULT AS IDENTITY";
      else if (c.generated === "s") def += ` GENERATED ALWAYS AS (${rewrite(c.default)}) STORED`;
      else if (c.default != null) def += ` DEFAULT ${rewrite(c.default)}`;
      if (c.not_null) def += " NOT NULL";
      return def;
    });
    // Each table's grants travel with it (Lovable checks grants per file).
    const rls = [
      t.rls ? `ALTER TABLE public.${P(t.name)} ENABLE ROW LEVEL SECURITY;` : "",
      t.force_rls ? `ALTER TABLE public.${P(t.name)} FORCE ROW LEVEL SECURITY;` : "",
    ].filter(Boolean);
    emit(`CREATE TABLE public.${P(t.name)} (\n${cols.join(",\n")}\n);\n${[...tableGrants(P(t.name), t.acl), ...rls].join("\n")}`);
  }
  for (const s of schema.sequences) {
    const owner = schema.tables.find((t) => t.columns.some((c) => (c.default ?? "").includes(`'${s}'`)));
    const col = owner?.columns.find((c) => (c.default ?? "").includes(`'${s}'`));
    if (owner) emit(`ALTER SEQUENCE public.${P(s)} OWNED BY public.${P(owner.name)}.${q(col.name)};`);
  }
  emit("");


  emit("-- Functions");
  for (const f of schema.functions) emit(rewrite(f.def).trim() + ";", "");
  for (const f of schema.functions) emit(...functionGrants(`public.${P(f.name)}(${rewrite(f.args)})`, f.acl));
  emit("");

  emit("-- Keys and constraints (primary/unique first, then checks, then foreign keys)");
  const order = { p: 0, u: 1, x: 2, c: 3, t: 4, f: 5 };
  const cons = [...schema.constraints].sort((a, b) => order[a.type] - order[b.type]);
  for (const c of cons) {
    if (c.type === "n" || c.type === "t") continue; // constraint triggers come with the triggers
    // Lovable Cloud forbids new foreign keys to auth.users. Legal rows keep their
    // Legal user ids; people are matched to Upper Hand accounts at switch-over.
    if (c.type === "f" && /REFERENCES auth\./.test(c.def)) {
      emit(`-- skipped (Cloud rule): ${c.table} ${c.name} ${c.def}`);
      continue;
    }
    const table = c.table.replace(/^public\./, "");
    emit(`ALTER TABLE public.${P(table)} ADD CONSTRAINT ${q(P(c.name))} ${rewrite(c.def)};`);
  }
  emit("");

  emit("-- Indexes");
  for (const ix of schema.indexes) {
    const def = rewrite(ix.def).replace(/INDEX (\S+) ON/, (m, name) => `INDEX ${q(P(name.replace(/"/g, "")))} ON`);
    emit(def + ";");
  }
  emit("");

  emit("-- Views");
  for (const v of schema.views) {
    const opts = v.options?.length ? ` WITH (${v.options.join(", ")})` : "";
    emit(`CREATE VIEW public.${P(v.name)}${opts} AS`, rewrite(v.def).trim().replace(/;$/, "") + ";");
    emit(...tableGrants(P(v.name), v.acl));
  }
  emit("");

  emit("-- Row-level security and policies");
  for (const p of schema.policies.filter((p) => p.schemaname === "public")) {
    const roles = (Array.isArray(p.roles) ? p.roles : String(p.roles).replace(/[{}]/g, "").split(",")).join(", ");
    let sql = `CREATE POLICY ${q(p.policyname)} ON public.${P(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${roles}`;
    if (p.qual) sql += ` USING (${rewrite(p.qual)})`;
    if (p.with_check) sql += ` WITH CHECK (${rewrite(p.with_check)})`;
    emit(sql + ";");
  }
  emit("");

  emit("-- Triggers (created disabled; enabled at switch-over)");
  for (const t of schema.triggers) {
    if (t.table.startsWith("auth.")) continue; // Legal sign-up hook: handled at switch-over.
    const table = t.table.replace(/^public\./, "");
    const def = rewrite(t.def);
    const name = /TRIGGER\s+("?)([^\s"]+)\1/.exec(def)[2];
    emit(def + ";", `ALTER TABLE public.${P(table)} DISABLE TRIGGER ${q(name)};`);
  }
  emit("");

  return L.join("\n") + "\n";
}

/** Storage buckets and their policies. Lovable's migration tool rejects bucket
 * rows, so buckets are created with its storage tool and only the policies go
 * in a migration (generate-storage). */
export function generateStorage(schema) {
  const { rewrite } = makeRewriter(schema);
  const P = (n) => PREFIX + n;
  const L = [];
  const emit = (...lines) => L.push(...lines);
  emit("-- Storage buckets and their policies");
  for (const b of schema.buckets) {
    const mimes = b.allowed_mime_types ? `ARRAY[${b.allowed_mime_types.map((m) => `'${m}'`).join(", ")}]` : "NULL";
    emit(
      `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('${BUCKET_PREFIX}${b.id}', '${BUCKET_PREFIX}${b.name}', ${b.public}, ${b.file_size_limit ?? "NULL"}, ${mimes}) ON CONFLICT (id) DO NOTHING;`,
    );
  }
  // storage.objects is shared with the Hair app: scope every Legal rule to
  // Legal buckets so a restrictive Legal rule can never limit Hair files.
  const legalOnly = `bucket_id LIKE '${BUCKET_PREFIX}%'`;
  const scope = (expr, restrictive) =>
    restrictive ? `(NOT (${legalOnly})) OR (${rewrite(expr)})` : `(${legalOnly}) AND (${rewrite(expr)})`;
  for (const p of schema.policies.filter((p) => p.schemaname === "storage")) {
    const roles = (Array.isArray(p.roles) ? p.roles : String(p.roles).replace(/[{}]/g, "").split(",")).join(", ");
    const restrictive = p.permissive === "RESTRICTIVE";
    let sql = `CREATE POLICY ${q(P(p.policyname))} ON storage.${p.tablename} AS ${p.permissive} FOR ${p.cmd} TO ${roles}`;
    if (p.qual) sql += ` USING (${scope(p.qual, restrictive)})`;
    if (p.with_check) sql += ` WITH CHECK (${scope(p.with_check, restrictive)})`;
    emit(sql + ";");
  }
  emit("", "RESET check_function_bodies;");
  return L.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const storage = args.includes("--storage");
  const schema = JSON.parse(readFileSync(args.find((a) => !a.startsWith("--")) ?? ".legal-move/schema.json", "utf8"));
  const clean = withoutHelpers(schema);
  const out = storage ? generateStorage(clean) : generate(clean);
  const split = args.indexOf("--split");
  if (split === -1) process.stdout.write(out);
  else {
    // --split <path prefix>: writes <prefix>_01.sql, _02.sql, …
    const prefix = args[split + 1];
    const { writeFileSync } = await import("node:fs");
    const files = pack(out);
    files.forEach((f, i) => writeFileSync(`${prefix}_${String(i + 1).padStart(2, "0")}.sql`, f));
    console.error(`${files.length} files, largest ${Math.max(...files.map((f) => f.length))} bytes`);
  }
}

/** Split generated SQL into statements (function bodies kept whole). */
export function statements(sql) {
  const parts = [];
  let cur = [];
  let inBody = false;
  for (const line of sql.split("\n")) {
    // A table's own grants stay in the same piece as the table.
    const tableGrant = /^(GRANT |REVOKE |ALTER TABLE \S+ (ENABLE|FORCE) ROW LEVEL)/.test(line) && /^CREATE TABLE /.test(cur[0] ?? "");
    if (!inBody && !tableGrant && /^(CREATE |ALTER |GRANT |REVOKE |INSERT |SET |RESET |-- )/.test(line) && cur.length) {
      parts.push(cur.join("\n"));
      cur = [];
    }
    cur.push(line);
    if ((line.match(/\$function\$/g) ?? []).length % 2 === 1) inBody = !inBody;
  }
  if (cur.length) parts.push(cur.join("\n"));
  return parts.map((p) => p.trim()).filter((p) => p && !/^(SET|RESET) check_function_bodies/.test(p));
}

/** Pack statements, in order, into files of at most `max` bytes. */
export function pack(sql, max = 40_000) {
  const files = [];
  let cur = "";
  for (const s of statements(sql)) {
    if (cur && cur.length + s.length + 1 > max) {
      files.push(cur);
      cur = "";
    }
    cur += s + "\n";
  }
  if (cur) files.push(cur);
  return files.map(
    (body, i) =>
      `-- Legal Group layout, part ${i + 1} of ${files.length}. Generated by scripts/legal-move/generate-schema.mjs; apply in order.\nSET check_function_bodies = false;\n\n${body}\nRESET check_function_bodies;\n`,
  );
}
