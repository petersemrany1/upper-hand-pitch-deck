import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const migration = name => readFileSync(new URL("../supabase/migrations/"+name,import.meta.url),"utf8");
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role;
CREATE TABLE sales_reps(id uuid PRIMARY KEY,name text,email text,role text,is_active boolean DEFAULT true);
CREATE TABLE clinic_portal_users(id uuid,clinic_id uuid);
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY,booking_rep_id uuid,updated_at timestamptz NOT NULL,appointment_date date,appointment_time text,patient_phone text,outcome text,disqualified_at timestamptz,deposit_amount numeric);
CREATE VIEW booking_rep_attribution AS SELECT id appointment_id,booking_rep_id rep_id FROM clinic_appointments;
CREATE TABLE appointment_reminders(id uuid PRIMARY KEY,appointment_id uuid,status text);
INSERT INTO sales_reps(id,name,email,role) VALUES
('${uid(1)}','Admin','admin@fixture.test','admin'),
('${uid(2)}','Rep A','a@fixture.test','rep'),
('${uid(3)}','Rep B','b@fixture.test','rep'),
('${uid(4)}','Caller','caller@fixture.test','caller');
INSERT INTO clinic_portal_users VALUES('${uid(5)}','${uid(10)}');
INSERT INTO clinic_appointments VALUES
('${uid(30)}','${uid(2)}','2026-10-15T00:00:00.123456Z','2100-01-01','09:30','0400 000 000',null,null,75),
('${uid(31)}','${uid(3)}','2026-10-15T00:00:00.123456Z','2100-01-01','11:30','0400000001',null,null,75);
INSERT INTO appointment_reminders VALUES('${uid(40)}','${uid(30)}','confirmed'),('${uid(41)}','${uid(31)}','confirmed');
`);
// Reuse the real actor/ownership functions; tests do not replace authorization with stubs.
await db.exec(migration("20261003020000_sales_rescheduling.sql").split("-- Restrictive policies")[0]);
const sql = migration("20261015010000_appointment_confirmation_calls.sql");
await db.exec(sql); await db.exec(sql);
const actor=async(n,email,role="authenticated")=>{
 await db.exec("RESET ROLE");
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:uid(n),email,role})]);
 await db.exec("SET ROLE "+role);
};
let version="2026-10-15T00:00:00.123456Z";
const record=(id,request,kind,note=null,body=null,v=version)=>db.query("select record_appointment_confirmation($1,$2,$3,$4,$5,$6) id",[uid(id),uid(request),v,kind,note,body]);
const count=async()=>Number((await db.query("select count(*) n from appointment_confirmation_events")).rows[0].n);
await actor(2,"a@fixture.test");
await record(30,100,"no_answer","Call back after lunch");
assert.equal(await count(),1);
await record(30,100,"no_answer","Call back after lunch"); assert.equal(await count(),1);
await assert.rejects(record(30,100,"confirmed","Call back after lunch"),/Request already used/);
await assert.rejects(record(31,101,"confirmed"),/access/);
await assert.rejects(record(30,101,"confirmed",null,null,"2026-10-15T00:00:00.123Z"),/changed/);
await assert.rejects(record(30,101,"invalid"),/Invalid confirmation/);
await assert.rejects(record(30,101,"confirmed","x".repeat(1001)),/1000/);
await assert.rejects(record(30,101,"sms",null," "),/1–1600/);
await assert.rejects(record(30,101,"sms",null,"x".repeat(1601)),/1–1600/);
const first=(await record(30,102,"sms",null,"Hi Alex, here is your address.")).rows[0].id;
const second=(await record(30,103,"sms",null,"Another tab draft")).rows[0].id;
assert.equal(first,second); assert.equal(await count(),2);
const sms=(await db.query("select * from appointment_confirmation_events where kind='sms'")).rows[0];
assert.equal(sms.sms_phone,"+61400000000");assert.equal(sms.sms_status,"pending");assert.equal(sms.actor_name,"Rep A");
await assert.rejects(db.query("update appointment_confirmation_events set sms_status='accepted'"),/permission denied/);
await assert.rejects(db.query("delete from appointment_confirmation_events"),/permission denied/);
await actor(3,"b@fixture.test");assert.equal(await count(),0);
await actor(4,"caller@fixture.test");assert.equal(await count(),0);await assert.rejects(record(30,104,"confirmed"),/access/);
await actor(5,"a@fixture.test");assert.equal(await count(),0);await assert.rejects(record(30,104,"confirmed"),/access/);
await actor(1,"admin@fixture.test");assert.equal(await count(),2);
assert.equal((await record(30,102,"sms",null,"Hi Alex, here is your address.")).rows[0].id,first);
await assert.rejects(record(30,100,"no_answer","Call back after lunch"),/Request already used/);
await record(31,104,"confirmed");assert.equal(await count(),3);
await db.exec("RESET ROLE");
const appointment=(await db.query("select * from clinic_appointments where id=$1",[uid(30)])).rows[0];
assert.equal(appointment.outcome,null);assert.equal(appointment.deposit_amount,"75");
assert.equal((await db.query("select status from appointment_reminders where appointment_id=$1",[uid(30)])).rows[0].status,"confirmed");
// A changed booking keeps history, and can receive one new text for its new revision.
await db.query("update clinic_appointments set updated_at=$1,appointment_date='2100-01-02' where id=$2",["2026-10-16T00:00:00Z",uid(30)]);
await actor(2,"a@fixture.test");
await assert.rejects(record(30,105,"confirmed"),/changed/);
version="2026-10-16T00:00:00Z";
await record(30,106,"sms",null,"Your new details");assert.equal(await count(),3);
await record(30,107,"confirmed");assert.equal(await count(),4);
// Inactive bookings fail without altering patient or attendance data.
for (const update of ["outcome='showed'","outcome=null,disqualified_at=now()","disqualified_at=null,appointment_date='2000-01-01'"]) {
 await db.exec("RESET ROLE"); await db.exec(`update clinic_appointments set ${update} where id='${uid(30)}'`);
 await actor(2,"a@fixture.test"); await assert.rejects(record(30,108,"confirmed"),/no longer awaiting/);
}
await db.exec("RESET ROLE");
await db.exec(`update clinic_appointments set appointment_date='2100-01-01' where id='${uid(30)}';update appointment_reminders set status='cancelled' where appointment_id='${uid(30)}'`);
await actor(2,"a@fixture.test");await assert.rejects(record(30,108,"confirmed"),/no longer awaiting/);
await db.exec("RESET ROLE");
await db.exec(`update appointment_reminders set status='confirmed' where appointment_id='${uid(30)}';update clinic_appointments set patient_phone='invalid' where id='${uid(30)}'`);
await actor(2,"a@fixture.test");await assert.rejects(record(30,108,"sms",null,"Hello"),/valid phone/);
await db.exec("RESET ROLE");await db.exec("SET ROLE anon");
await assert.rejects(record(30,108,"confirmed"),/permission denied/);
console.log("PASS: confirmation migration replay, real role/ownership checks, private history, immutable attendance/deposit, revision checks, idempotency, duplicate-text prevention and inactive-booking validation.");
await db.close();
