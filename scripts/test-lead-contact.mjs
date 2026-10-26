// Isolated PostgreSQL: no live contacts, credentials or messages.
// PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-lead-contact.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = (name) => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('email',current_setting('fixture.email',true)) $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.user',true),'')::uuid $$;
CREATE TABLE sales_reps(id uuid PRIMARY KEY,email text,role text,is_active boolean DEFAULT true);
CREATE TABLE clinic_portal_users(id uuid PRIMARY KEY);
CREATE TABLE meta_leads(id uuid PRIMARY KEY,first_name text,last_name text,phone text,updated_at timestamptz DEFAULT now());
CREATE TABLE partner_clinics(id uuid PRIMARY KEY,clinic_name text,state text,city text);
CREATE TABLE partner_doctors(id uuid PRIMARY KEY,clinic_id uuid,name text,is_active boolean,conducts_consultations boolean,title text);
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY,lead_id uuid,booking_rep_id uuid,clinic_id uuid,doctor_id uuid,doctor_name text,patient_name text,patient_phone text,appointment_date date,appointment_time text,booked_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),outcome text,disqualified_at timestamptz);
CREATE TABLE appointment_reminders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lead_id uuid,patient_first_name text,patient_last_name text,patient_phone text,doctor_name text,booking_date date,booking_time time,status text,booked_at timestamptz,updated_at timestamptz DEFAULT now(),schedule_changed_at timestamptz DEFAULT now(),three_day_sms_sent boolean DEFAULT false,twentyfour_hour_sms_sent boolean DEFAULT false,three_day_sms_sent_at timestamptz,twentyfour_hour_sms_sent_at timestamptz);
CREATE TABLE sms_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),direction text,to_number text,from_number text,twilio_message_sid text UNIQUE,status text,sent_at timestamptz,created_at timestamptz DEFAULT now());
CREATE FUNCTION has_sales_role(text[]) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM sales_reps WHERE email=auth.jwt()->>'email' AND role=ANY($1)) $$;
INSERT INTO sales_reps VALUES ('${uid(1)}','owner@example.test','rep',true),('${uid(2)}','other@example.test','rep',true),('${uid(3)}','admin@example.test','admin',true),('${uid(4)}','inactive@example.test','rep',false);
INSERT INTO partner_clinics VALUES ('${uid(5)}','Fixture Clinic','WA','Perth');
INSERT INTO meta_leads VALUES ('${uid(10)}','Fixture','Person','0400000000',now());
INSERT INTO clinic_appointments(id,lead_id,booking_rep_id,clinic_id,patient_name,patient_phone,appointment_date,appointment_time) VALUES('${uid(11)}','${uid(10)}','${uid(1)}','${uid(5)}','Fixture Person','0400000000',current_date+7,'10:00');
INSERT INTO appointment_reminders(lead_id,patient_phone,booking_date,booking_time,status,three_day_sms_sent) VALUES('${uid(10)}','0400000000',current_date+7,'10:00','confirmed',true);
`);
// Exercise the actual deployed ownership functions and reminder sync trigger.
const access = migration('20261003020000_sales_rescheduling');
await db.exec(access.slice(access.indexOf('CREATE OR REPLACE FUNCTION public.booking_sales_actor()'), access.indexOf('-- Restrictive policies')));
await db.exec(migration('20261003010000_link_and_safe_patient_reminders'));
await db.exec('CREATE TRIGGER clinic_appointments_sync_reminder AFTER UPDATE ON clinic_appointments FOR EACH ROW EXECUTE FUNCTION sync_reminder_on_reschedule();');
const sql = migration('20261026020000_save_lead_contact');
await db.exec(sql); await db.exec(sql);
await db.exec(migration('20261023010000_clinic_reminder_confirmation'));
const actor = async (email) => db.query("select set_config('fixture.email',$1,false)", [email]);
const contact = async (id = uid(10)) => (await db.query('select id,first_name,last_name,phone from meta_leads where id=$1',[id])).rows[0];
const save = async (patch={}, expected=null, id=uid(10)) => {
  expected ??= await contact(id);
  const next={...expected,...patch};
  return (await db.query('select save_lead_contact($1,$2,$3,$4,$5,$6,$7) contact',[id,next.first_name,next.last_name,next.phone,expected.first_name,expected.last_name,expected.phone])).rows[0].contact;
};
const snapshot = async () => (await db.query(`select to_jsonb(l) lead,to_jsonb(a) appointment,to_jsonb(r) reminder from meta_leads l join clinic_appointments a on a.lead_id=l.id join appointment_reminders r on r.appointment_id=a.id where l.id=$1`,[uid(10)])).rows[0];
assert.equal((await db.query("select has_function_privilege('anon','save_lead_contact(uuid,text,text,text,text,text,text)','EXECUTE') ok")).rows[0].ok,false);
assert.equal((await db.query("select has_function_privilege('authenticated','save_lead_contact(uuid,text,text,text,text,text,text)','EXECUTE') ok")).rows[0].ok,true);
for (const email of ['other@example.test','inactive@example.test','unknown@example.test']) {
  await actor(email); await assert.rejects(save({first_name:'Mario'}),/own bookings|Sales access/);
}
await actor('owner@example.test');
for (const phone of ['', 'abc','0411','041111111111','0411111111 ext 5','+614111111','+610411111111']) await assert.rejects(save({phone}),/valid phone/);
for (const first_name of ['',null,'a'.repeat(101),'Bad\nName']) await assert.rejects(save({first_name}),/first name/);
await db.exec("update appointment_reminders set confirmation_state='confirmed',confirmation_method='sms',confirmation_confirmed_at=now()");
const before=await snapshot();
let expected=await contact();
await db.exec('SET ROLE authenticated');
assert.equal((await save({first_name:'Mario'},expected)).first_name,'Mario');
await db.exec('RESET ROLE');
let after=await snapshot();
assert.equal(after.appointment.patient_name,'Mario Person');
assert.equal(after.reminder.patient_first_name,'Mario');
assert.equal(after.reminder.patient_last_name,'Person');
assert.equal(after.reminder.confirmation_revision,before.reminder.confirmation_revision,'Name-only edit preserves confirmation');
assert.equal(after.reminder.confirmation_state,'confirmed');
for (const field of ['appointment_date','appointment_time','booking_rep_id','patient_phone']) assert.equal(after.appointment[field],before.appointment[field]);
await assert.rejects(save({first_name:'Stale'},expected),/changed while/);
await save({first_name:'Mario'},expected); // same correction can be retried
expected=await contact();
assert.equal((await save({phone:'0411 111 111'},expected)).phone,'+61411111111');
after=await snapshot();
assert.equal(after.appointment.patient_phone,'+61411111111');
assert.equal(after.reminder.patient_phone,'+61411111111');
assert.equal(after.reminder.confirmation_state,'not_requested');
assert.notEqual(after.reminder.confirmation_revision,before.reminder.confirmation_revision);
// A failed last write rolls back the contact and booking too.
await db.exec(`CREATE FUNCTION reject_fixture_name() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.patient_first_name='Rejected' THEN RAISE EXCEPTION 'Fixture failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER reject_fixture_name BEFORE UPDATE ON appointment_reminders FOR EACH ROW EXECUTE FUNCTION reject_fixture_name();`);
const rollback=await snapshot();
await assert.rejects(save({first_name:'Rejected'}),/Fixture failure/);
assert.deepEqual(await snapshot(),rollback);
await db.exec('DROP TRIGGER reject_fixture_name ON appointment_reminders');
// The appointment already has the correction, but the reminder is stale.
await db.exec("update appointment_reminders set patient_phone='0400000000',patient_first_name='Old'");
await save(); after=await snapshot();
assert.equal(after.reminder.patient_first_name,'Mario'); assert.equal(after.reminder.patient_phone,after.lead.phone);
await save({first_name:'Mary Jane',last_name:"O’Neill"});
after=await snapshot(); assert.equal(after.reminder.patient_first_name,'Mary Jane');assert.equal(after.reminder.patient_last_name,"O’Neill");
await db.exec('update appointment_reminders set appointment_id=null');
await assert.rejects(save({first_name:'Missing'}),/not linked/);
await db.query('update appointment_reminders set appointment_id=$1',[uid(11)]);
await db.query('insert into clinic_portal_users values($1)',[uid(20)]);
await db.query("select set_config('fixture.user',$1,false)",[uid(20)]);
await assert.rejects(save(),/Sales access/);
await db.exec("select set_config('fixture.user','',false)");
// Shared unbooked leads may be edited by any active sales rep.
await db.query('insert into meta_leads(id,first_name,phone) values($1,$2,$3)',[uid(30),'New','0400000000']);
await actor('other@example.test');
assert.equal((await save({first_name:'Shared'},null,uid(30))).first_name,'Shared');
await actor('admin@example.test');
await save({first_name:'Admin edit'});
// Historical booking labels and delivery evidence are not rewritten.
await db.exec("update clinic_appointments set outcome='show'");
const historical=await snapshot();
await save({first_name:'New identity',phone:'0422222222'});
after=await snapshot();assert.deepEqual(after.appointment,historical.appointment);assert.deepEqual(after.reminder,historical.reminder);
assert.equal((await db.query('select count(*) n from sms_messages')).rows[0].n,0);
assert.equal((await db.query('select count(*) n from appointment_reminder_deliveries')).rows[0].n,0);
console.log('PASS: contact validation, roles/ownership, stale writes and retries, atomic name/phone sync, rollback, mismatch repair, multi-word names, unlinked reminder failure, shared leads, historical preservation, confirmation behavior, and no messages.');
await db.close();
