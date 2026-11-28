// Replays the Hair migrations (including the applied legal_ parts) locally,
// then runs docs/legal-switch-over/1-hair-switch-on.sql and checks it: every
// legal_ trigger on, the live-update tables published, three timed jobs.
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { replay } from "./replay.mjs";

const files = (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort().map((f) => "supabase/migrations/" + f);
const { db } = await replay(files, { quiet: true, keepGoing: true });
const off = (await db.query("SELECT count(*)::int n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname LIKE 'legal\\_%' AND NOT t.tgisinternal AND t.tgenabled='D'")).rows[0].n;
console.log("legal triggers off before:", off);
await db.exec(await readFile("docs/legal-switch-over/1-hair-switch-on.sql", "utf8"));
const stillOff = (await db.query("SELECT count(*)::int n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname LIKE 'legal\\_%' AND NOT t.tgisinternal AND t.tgenabled='D'")).rows[0].n;
assert.equal(stillOff, 0, "some legal_ triggers still off");
const pub = (await db.query("SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename LIKE 'legal\\_%'")).rows.map((r) => r.tablename);
assert.equal(pub.length, 6, "live-update tables: " + pub.join(","));
const jobs = (await db.query("SELECT * FROM cron.job")).rows;
console.log("timed jobs:", jobs.map((j) => j.jobname ?? JSON.stringify(j)).join(", "));
console.log("OK: triggers on:", off, "| published:", pub.join(", "));
