// Applies the generated Legal schema on top of a local replay of the Hair
// migrations, then checks the result: every Legal object exists under its
// legal_ name, nothing Hair-side was touched, and Legal policies still work.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { replay } from "./replay.mjs";

const file = process.argv[2] ?? ".legal-move/legal_schema.sql";
import { withoutHelpers } from "./generate-schema.mjs";
const schema = withoutHelpers(JSON.parse(await readFile(process.argv[3] ?? ".legal-move/schema.json", "utf8")));
import { readdir } from "node:fs/promises";
const hairOnly = (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql") && !/_legal_/.test(f)).sort().map((f) => "supabase/migrations/" + f);
const r = await replay(hairOnly, { quiet: true, keepGoing: true });
const db = r.db;
const before = (await db.query("SELECT count(*)::int n FROM pg_class WHERE relnamespace='public'::regnamespace AND relname NOT LIKE 'legal\\_%'")).rows[0].n;
const sql = (await readFile(file, "utf8")).replace(/CREATE EXTENSION[^;]*;/gi, "");
try {
  await db.exec(sql);
} catch (e) {
  // Find the failing statement by running in chunks.
  const parts = [];
  let cur = [], inBody = false;
  for (const line of sql.split("\n")) {
    if (!inBody && /^(CREATE |ALTER |GRANT |REVOKE |INSERT |SET |RESET )/.test(line) && cur.length) { parts.push(cur.join("\n")); cur = []; }
    cur.push(line);
    if (((line.match(/\$function\$/g) ?? []).length) % 2 === 1) inBody = !inBody;
  }
  parts.push(cur.join("\n"));
  const db2 = (await replay(hairOnly, { quiet: true, keepGoing: true })).db;
  for (const p of parts) {
    try { await db2.exec(p); } catch (err) { console.error("FAILED:", err.message, "\n", p.slice(0, 600)); process.exit(1); }
  }
  throw e;
}
const after = (await db.query("SELECT count(*)::int n FROM pg_class WHERE relnamespace='public'::regnamespace AND relname NOT LIKE 'legal\\_%'")).rows[0].n;
assert.equal(after, before, "Hair objects changed");
const tables = (await db.query("SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname LIKE 'legal\\_%'")).rows.map((r) => r.relname);
for (const t of schema.tables) assert.ok(tables.includes("legal_" + t.name), "missing table " + t.name);
const fns = (await db.query("SELECT DISTINCT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'legal\\_%'")).rows.map((r) => r.proname);
for (const f of schema.functions) assert.ok(fns.includes("legal_" + f.name), "missing function " + f.name);
const pol = (await db.query("SELECT count(*)::int n FROM pg_policies WHERE tablename LIKE 'legal\\_%'")).rows[0].n;
assert.equal(pol, schema.policies.filter((p) => p.schemaname === "public").length, "policy count");
const enabled = (await db.query("SELECT count(*)::int n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname LIKE 'legal\\_%' AND NOT t.tgisinternal AND t.tgenabled <> 'D'")).rows[0].n;
assert.equal(enabled, 0, "a Legal trigger is enabled");
// No Legal function body may still reference an un-prefixed Legal table.
const bad = [];
const tnames = new Set(schema.tables.map((t) => t.name));
for (const { proname, src } of (await db.query("SELECT proname, prosrc src FROM pg_proc WHERE proname LIKE 'legal\\_%'")).rows) {
  for (const m of src.matchAll(/\bpublic\.([a-z_][a-z0-9_]*)/g)) if (tnames.has(m[1])) bad.push(`${proname} -> public.${m[1]}`);
}
assert.deepEqual(bad, [], "unprefixed table references");
console.log(`ok: ${tables.length} tables, ${fns.length} functions, ${pol} policies; Hair objects unchanged (${before})`);
