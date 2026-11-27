// Checks the Legal export functions against a local replay of the Legal schema.
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { replay } from "./replay.mjs";

const r = await replay([`${homedir()}/Documents/GitHub/family-law-floater/supabase/migrations`], { quiet: true, keepGoing: true });
const db = r.db;
await db.exec("RESET session_replication_role");
await db.exec(await readFile("supabase/legal/portal_migration_export.sql", "utf8"));
await db.exec("CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='1'$$");
const q = async (sql, p) => (await db.query(sql, p)).rows[0];
let denied = false;
try { await q("SELECT public.portal_schema_export() AS s"); } catch { denied = true; }
if (!denied) throw new Error("non-admin was allowed");
await db.exec("SET test.admin = '1'");
const s = (await q("SELECT public.portal_schema_export() AS s")).s;
const counts = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v === "object" ? Object.keys(v).length : v]));
console.log(counts);
const t = (await q("SELECT public.portal_table_export('sales_reps', 0, 5) AS t")).t;
console.log("sales_reps page:", t.length, Object.keys(t[0] ?? {}).slice(0, 6));
try { await q("SELECT public.portal_table_export('pg_authid') AS t"); throw new Error("allowed bad table"); } catch (e) { if (e.message === "allowed bad table") throw e; }
console.log("auth users:", (await q("SELECT public.portal_auth_users_export(0) AS u")).u.length);
console.log("ok");
