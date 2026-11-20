// Isolated PostgreSQL; no patient data or network calls.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sql = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE meta_leads(id uuid PRIMARY KEY,lead_id text,phone text,email text,status text DEFAULT 'new',previous_lead_id uuid,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),call_notes text,booking_date date,booking_time text,deposit_paid_at timestamptz,stripe_payment_intent_id text,callback_scheduled_at timestamptz);
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lead_id uuid,appointment_date date,outcome text,deposit_amount numeric);
CREATE FUNCTION normalize_phone(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(coalesce($1,''),'[^0-9]','','g') $$;
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
`);
await db.exec(sql('20260731012457_a8d06029-32a3-4a3d-baec-384e0e9ef7b5'));
await db.exec(sql('20260618111126_7350968d-4537-4166-82d6-31f25ad19c9c'));
const insert = async(n,phone,extra={}) => {
  const fields={id:uid(n),phone,created_at:`2026-11-20T00:${String(n).padStart(2,'0')}:00Z`,...extra};
  const keys=Object.keys(fields);
  await db.query(`INSERT INTO meta_leads (${keys.join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(fields));
};
const row = async n => (await db.query('SELECT * FROM meta_leads WHERE id=$1',[uid(n)])).rows[0];
await insert(1,'+61400000001');
await db.query('INSERT INTO clinic_appointments(lead_id,appointment_date,deposit_amount) VALUES($1,current_date+7,75)',[uid(1)]);
await db.query("UPDATE meta_leads SET status='booked_deposit_paid',deposit_paid_at=now(),booking_date=current_date+7,booking_time='14:00' WHERE id=$1",[uid(1)]);
const original=await row(1);
const appointmentBefore=(await db.query('SELECT * FROM clinic_appointments')).rows;
await insert(2,'0400000001',{callback_scheduled_at:new Date().toISOString(),call_notes:'Retain these notes'});
assert.equal((await row(2)).status,'new'); // Reproduces Nina's stale duplicate.
assert.equal((await row(2)).lead_class,'booked_active');
await assert.rejects(db.query("UPDATE meta_leads SET status='booked_deposit_paid' WHERE id=$1",[uid(2)]),/no clinic appointment exists/);
const migration=sql('20261120030000_retain_booked_repeat_enquiries');
await db.exec(migration);
let duplicate=await row(2);
assert.equal(duplicate.status,'dropped');
assert.equal(duplicate.superseded_by_lead_id,uid(1));
assert.equal(duplicate.callback_scheduled_at,null);
assert.equal(duplicate.call_notes,'Retain these notes');
assert.equal(duplicate.deposit_paid_at,null);
assert.equal(duplicate.booking_date,null);
assert.deepEqual(await row(1),original);
assert.deepEqual((await db.query('SELECT * FROM clinic_appointments')).rows,appointmentBefore);
await db.exec(migration);
assert.deepEqual(await row(2),duplicate); // Idempotent backfill, including timestamps.
await db.exec('SET ROLE authenticated');
await insert(3,'61400000001');
await insert(4,'0400 000 001');
for (const n of [3,4]) {
  const r=await row(n);
  assert.equal(r.status,'dropped');assert.equal(r.lead_class,'booked_active');
  assert.equal(r.superseded_by_lead_id,uid(1));assert.equal(r.deposit_paid_at,null);
}
await insert(5,'0400000005');await insert(6,'+61400000005');
assert.equal((await row(5)).lead_class,'new');
assert.equal((await row(6)).lead_class,'returning');assert.equal((await row(6)).status,'new');
await db.exec('RESET ROLE');
await db.query("UPDATE clinic_appointments SET appointment_date=current_date-1,outcome='show' WHERE lead_id=$1",[uid(1)]);
await insert(7,'0400000001');
assert.equal((await row(7)).lead_class,'post_consult');
assert.equal((await row(7)).status,'dropped');assert.equal((await row(7)).superseded_by_lead_id,uid(1));
// Blacklist status survives even if the older class trigger classifies the phone.
await insert(8,'0400000001',{status:'blacklisted'});
assert.equal((await row(8)).status,'blacklisted');
// Existing payment/appointment owners are never treated as unpaid duplicates.
await insert(9,'0400000001',{status:'booked_deposit_paid',deposit_paid_at:new Date().toISOString()});
assert.equal((await row(9)).status,'booked_deposit_paid');
await db.query("UPDATE meta_leads SET lead_class='booked_active' WHERE id=$1",[uid(1)]);
const owner=await row(1);await db.exec(migration);assert.deepEqual(await row(1),owner);
assert.equal((await row(8)).status,'blacklisted');
// Corrupt cycles terminate; don't attach an unrelated enquiry or invent a sale.
await insert(10,'0400000010');await insert(11,'0400000011');
await db.query('UPDATE meta_leads SET previous_lead_id=$2 WHERE id=$1',[uid(10),uid(11)]);
await db.query('UPDATE meta_leads SET previous_lead_id=$2 WHERE id=$1',[uid(11),uid(10)]);
assert.equal((await db.query('SELECT meta_lead_booking_owner($1) id',[uid(10)])).rows[0].id,null);
assert.equal((await db.query("SELECT count(*)::int n FROM meta_leads")).rows[0].n,11);
assert.equal((await db.query("SELECT has_function_privilege('anon','meta_lead_booking_owner(uuid)','EXECUTE') ok")).rows[0].ok,false);
assert.equal((await db.query("SELECT has_function_privilege('authenticated','meta_lead_booking_owner(uuid)','EXECUTE') ok")).rows[0].ok,true);
await db.close();
console.log('PASS: reproduced duplicate/booking guard, backfill and replay, multi-enquiry chains, authenticated inserts, callbacks, history/payment/appointment preservation, attended/returning/blacklist cases, cycles and privileges.');
