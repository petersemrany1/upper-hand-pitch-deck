// Isolated PostgreSQL validation: no production patients or emails.
// PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-invoice-migration.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const nina = "00000000-0000-4000-8000-000000000001",
  bec = "00000000-0000-4000-8000-000000000002",
  lead = "00000000-0000-4000-8000-000000000003";
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE TABLE sales_reps(id uuid PRIMARY KEY,name text,email text,role text,is_active boolean,allowed_tabs text[]);
CREATE TABLE meta_leads(id uuid PRIMARY KEY,rep_id uuid,status text,deposit_paid_at timestamptz,updated_at timestamptz,first_name text,last_name text);
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY,lead_id uuid,booked_at timestamptz);
CREATE TABLE call_records(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),rep_id uuid,called_at timestamptz);
CREATE FUNCTION current_sales_rep_id() RETURNS uuid LANGUAGE sql AS $$ SELECT '${nina}'::uuid $$;
CREATE FUNCTION has_sales_role(text[]) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
INSERT INTO sales_reps VALUES('${nina}','Nina Sinclair','sinclair.nina1@gmail.com','rep',true,ARRAY['sales_portal']),('${bec}','Bec Example','bec@example.test','rep',true,null);
INSERT INTO meta_leads VALUES('${lead}','${nina}','booked_deposit_paid',now(),now(),'Fixture','Person');
`);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20260519090953_174ba2c7-bc14-4b27-8b8a-c2a6278ffe3f.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20261004090000_rep_invoices.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
assert.equal(
  (
    await one(
      "select hourly_rate_cents from rep_invoice_config where rep_id=$1",
      [nina],
    )
  ).hourly_rate_cents,
  2500,
);
assert.equal(
  (
    await one(
      "select hourly_rate_cents from rep_invoice_config where rep_id=$1",
      [bec],
    )
  ).hourly_rate_cents,
  3500,
);
assert.equal(
  (
    await one("select verified from rep_booking_earnings where lead_id=$1", [
      lead,
    ])
  ).verified,
  false,
);
await db.exec(
  `update meta_leads set status='new',rep_id='${bec}';update meta_leads set status='booked_deposit_paid';`,
);
assert.equal(
  (
    await one("select rep_id from rep_booking_earnings where lead_id=$1", [
      lead,
    ])
  ).rep_id,
  nina,
);
await db.exec(
  `insert into meta_leads values(gen_random_uuid(),'${bec}','new',null,now(),'New','Fixture');update meta_leads set status='booked_deposit_paid' where status='new';`,
);
assert.equal(
  (await one("select count(*)::int n from rep_booking_earnings where verified"))
    .n,
  1,
);
const action = async (a) =>
  (await one("select rep_invoice_session_action($1,$2) result", [nina, a]))
    .result;
await action("start");
await action("heartbeat");
await db.exec(
  `insert into call_records(rep_id,called_at) values('${nina}',clock_timestamp())`,
);
await action("end");
assert.equal(
  (await one("select close_reason from rep_sessions limit 1")).close_reason,
  "explicit",
);
await action("start");
await db.exec(
  "update rep_sessions set last_seen_at=now()-interval '10 minutes' where ended_at is null",
);
await action("heartbeat");
await action("end");
assert.equal(
  (await one("select count(*)::int n from rep_sessions where connection_gap"))
    .n,
  1,
);
await action("start");
await action("start");
assert.equal(
  (
    await one(
      "select count(*)::int n from rep_sessions where close_reason='abandoned'",
    )
  ).n,
  1,
);
await action("end");
const dates = await one(
  "select (now() at time zone 'Australia/Perth')::date::text as work_date",
);
const claim = {
  number: "TEST-1",
  from: dates.work_date,
  to: dates.work_date,
  hours: 1,
  bookings: 1,
  hourlyRate: 25,
  bookingRate: 50,
  total: 75,
};
const submit = async (id, c, hash) =>
  (
    await one("select submit_rep_invoice($1,$2,$3,$4,$5) evidence", [
      id,
      nina,
      JSON.stringify(c),
      `${id}.pdf`,
      hash,
    ])
  ).evidence;
let e = await submit("00000000-0000-4000-8000-000000000010", claim, "hash1");
assert.equal(e.duplicates.length, 0);
assert.equal(e.sessions.length, 4);
assert.equal(e.hourly_rate_cents, 2500);
assert.equal(new Date(e.period_start).getUTCHours(), 16);
e = await submit(
  "00000000-0000-4000-8000-000000000011",
  { ...claim, number: "TEST-2" },
  "hash2",
);
assert.equal(e.duplicates.length, 1);
assert.equal(
  (
    await one(
      "select has_function_privilege('authenticated','submit_rep_invoice(uuid,uuid,jsonb,text,text)','EXECUTE') ok",
    )
  ).ok,
  false,
);
assert.equal(
  (
    await one(
      "select has_function_privilege('authenticated','rep_invoice_session_action(uuid,text)','EXECUTE') ok",
    )
  ).ok,
  false,
);
assert.equal(
  (
    await one(
      "select count(*)::int n from pg_policies where tablename='rep_sessions' and cmd in ('INSERT','UPDATE')",
    )
  ).n,
  0,
);
assert.equal(
  (await one("select public from storage.buckets where id='rep-invoices'"))
    .public,
  false,
);
// More than a PostgREST page of bookings must still be included in a snapshot.
await db.exec(
  `INSERT INTO rep_booking_earnings SELECT gen_random_uuid(),'${nina}',now(),'Bulk fixture',true FROM generate_series(1,1100)`,
);
e = await submit(
  "00000000-0000-4000-8000-000000000012",
  { ...claim, number: "TEST-3" },
  "hash3",
);
assert.equal(e.bookings.length, 1101);
await db.exec(
  `INSERT INTO rep_booking_earnings VALUES(gen_random_uuid(),null,now(),'Unknown owner',false)`,
);
e = await submit(
  "00000000-0000-4000-8000-000000000013",
  { ...claim, number: "TEST-4" },
  "hash4",
);
assert.equal(e.unattributed_bookings, true);
// The authenticated role cannot insert approvals or edit session timestamps.
await db.exec(
  `GRANT SELECT,INSERT,UPDATE ON rep_invoices,rep_sessions TO authenticated; SET ROLE authenticated;`,
);
assert.equal((await one("select count(*)::int n from rep_invoices")).n, 4);
await assert.rejects(
  db.exec(`INSERT INTO rep_sessions(rep_id) VALUES('${nina}')`),
);
await db.exec(`UPDATE rep_sessions SET ended_at=now()+interval '100 hours'`);
await db.exec("RESET ROLE");
assert.equal(
  (
    await one(
      "select count(*)::int n from rep_sessions where ended_at>now()+interval '1 hour'",
    )
  ).n,
  0,
);
console.log(
  "PASS: migration, rates, legacy review, immutable booking credit, repeat status transitions, heartbeat gaps, abandoned sessions, WA boundaries, duplicate invoices, private storage and server-only writes.",
);
await db.close();
