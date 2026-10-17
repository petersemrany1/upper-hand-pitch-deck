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
await db.exec("ALTER TABLE clinic_appointments ADD COLUMN clinic_id uuid");
await db.exec(migration("20261003020000_sales_rescheduling.sql").split("-- Restrictive policies")[0]);
await db.exec(migration("20261015010000_appointment_confirmation_calls.sql"));
const sql=migration("20261016010000_confirmation_callbacks.sql");
await db.exec(sql);await db.exec(sql);
const actor=async(n,email,role="authenticated")=>{
 await db.exec("RESET ROLE");await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:uid(n),email,role})]);await db.exec("SET ROLE "+role);
};
let version="2026-10-15T00:00:00.123456Z";
const schedule=(request,expected=null,date="2100-01-02",time=null,note="Needs to rebook",id=30,v=version)=>db.query("select schedule_confirmation_callback($1,$2,$3,$4,$5,$6,$7) id",[uid(id),uid(request),v,expected===null?null:uid(expected),date,time,note]);
const done=(callback,id=30)=>db.query("select complete_confirmation_callback($1,$2)",[uid(id),uid(callback)]);
const state=async(id)=>(await db.query("select status from appointment_confirmation_callbacks where id=$1",[uid(id)])).rows[0]?.status;
const before=(await db.query("select row_to_json(a) value from clinic_appointments a where id=$1",[uid(30)])).rows[0].value;
await actor(2,"a@fixture.test");
await schedule(100);await schedule(100);
assert.equal((await db.query("select count(*) n from appointment_confirmation_callbacks")).rows[0].n,1);
await assert.rejects(schedule(100,null,"2100-01-03"),/Request already used/);
await assert.rejects(schedule(101,null,"2100-01-02",null,"Wrong owner",31),/access/);
await assert.rejects(schedule(101,100,"2100-01-02",null,"stale",30,"2026-10-15T00:00:00.123Z"),/changed/);
await assert.rejects(schedule(101,100,"2000-01-01"),/future/);
await assert.rejects(schedule(101,100,"2100-01-02","24:00"),/future/);
await assert.rejects(schedule(101,100,"2100-01-02","11:00:30"),/future/);
await assert.rejects(schedule(101,100,"2100-01-02",null,"x".repeat(1001)),/1000/);
await assert.rejects(schedule(101),/callback changed/);
await schedule(101,100,"2100-01-03","11:00","After work");
assert.equal(await state(100),"replaced");assert.equal(await state(101),"pending");
await assert.rejects(schedule(102,100),/callback changed/);
await assert.rejects(done(100),/callback changed/);
await assert.rejects(db.query("update appointment_confirmation_callbacks set status='done'"),/permission denied/);
await assert.rejects(db.query("delete from appointment_confirmation_callbacks"),/permission denied/);
await actor(3,"b@fixture.test");assert.equal((await db.query("select count(*) n from appointment_confirmation_callbacks")).rows[0].n,0);await assert.rejects(done(101),/access/);
for(const [id,email] of [[4,"caller@fixture.test"],[5,"a@fixture.test"]]){await actor(id,email);await assert.rejects(schedule(103),/access/);assert.equal((await db.query("select count(*) n from appointment_confirmation_callbacks")).rows[0].n,0);}
await actor(1,"admin@fixture.test");assert.equal((await db.query("select count(*) n from appointment_confirmation_callbacks")).rows[0].n,2);
await db.exec("RESET ROLE");
assert.deepEqual((await db.query("select row_to_json(a) value from clinic_appointments a where id=$1",[uid(30)])).rows[0].value,before);
assert.equal((await db.query("select status from appointment_reminders where appointment_id=$1",[uid(30)])).rows[0].status,"confirmed");
// Simulate time passing without an appointment edit. Old callbacks do not expire.
await db.query("update appointment_confirmation_callbacks set callback_date='2000-01-01' where id=$1",[uid(101)]);
await db.query("update clinic_appointments set outcome='no_show',updated_at=now() where id=$1",[uid(30)]);
await actor(2,"a@fixture.test");assert.equal(await state(101),"pending");await done(101);await done(101);assert.equal(await state(101),"done");
await db.exec("RESET ROLE");await db.query("update clinic_appointments set outcome=null,updated_at=$1 where id=$2",[version,uid(30)]);
await actor(2,"a@fixture.test");await schedule(102);
// A failed reschedule rolls back the callback completion together with the booking.
await db.exec("RESET ROLE;BEGIN");await db.query("update clinic_appointments set appointment_date='2100-01-04' where id=$1",[uid(30)]);assert.equal(await state(102),"rescheduled");await db.exec("ROLLBACK");assert.equal(await state(102),"pending");
await db.exec("RESET ROLE");await db.query("update clinic_appointments set appointment_date='2100-01-04',updated_at='2026-10-16T00:00:00Z' where id=$1",[uid(30)]);
assert.equal(await state(102),"rescheduled");
// Same request cannot recreate the callback after the reschedule.
await actor(2,"a@fixture.test");await schedule(102);assert.equal(await state(102),"rescheduled");
version="2026-10-16T00:00:00Z";await schedule(103);
await db.query("select record_appointment_confirmation($1,$2,$3,'no_answer',null,null)",[uid(30),uid(200),version]);assert.equal(await state(103),"pending");
await db.query("select record_appointment_confirmation($1,$2,$3,'confirmed',null,null)",[uid(30),uid(201),version]);assert.equal(await state(103),"confirmed");
await schedule(104);await done(103);assert.equal(await state(104),"pending");
await db.exec("RESET ROLE;SET ROLE anon");await assert.rejects(schedule(105),/permission denied/);await assert.rejects(done(104),/permission denied/);
console.log("PASS: callback migration replay, owner/admin access, clinic/caller exclusion, RLS, unchanged booking/reminder/deposit, optional time, stale edit protection, idempotent retries, overdue persistence, reschedule rollback and automatic completion.");
await db.close();
