// Run with PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-reminder-migration.mjs
// Isolated PostgreSQL; no external service, patients, messages or real bookings.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE partner_clinics (id uuid primary key, clinic_name text);
CREATE TABLE partner_doctors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid, name text, title text, is_active boolean DEFAULT true, what_makes_them_different text);
CREATE TABLE clinic_appointments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid, doctor_id uuid, doctor_name text, lead_id uuid, patient_name text, patient_phone text, appointment_date date, appointment_time text, booked_at timestamptz DEFAULT now(), outcome text, disqualified_at timestamptz);
CREATE TABLE appointment_reminders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid, patient_first_name text, patient_last_name text, patient_phone text, doctor_name text, booking_date date, booking_time time, status text, booked_at timestamptz, updated_at timestamptz DEFAULT now(), three_day_sms_sent boolean DEFAULT false, three_day_sms_sent_at timestamptz, twentyfour_hour_sms_sent boolean DEFAULT false, twentyfour_hour_sms_sent_at timestamptz);
INSERT INTO partner_clinics VALUES ('00000000-0000-4000-8000-000000000001', 'Boss Clinic');
INSERT INTO partner_doctors (id,clinic_id,name,title) VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Dr Jai','Surgeon');
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261003000000_consultation_and_procedure_roles.sql',import.meta.url),'utf8'));
await db.exec(`
INSERT INTO clinic_appointments (id,clinic_id,doctor_id,doctor_name,lead_id,patient_name,appointment_date,appointment_time) VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Dr Jai',gen_random_uuid(),'Fixture Person',(now() at time zone 'Australia/Sydney')::date+3,'10:00');
INSERT INTO appointment_reminders(lead_id,doctor_name,booking_date,booking_time,status,three_day_sms_sent) SELECT lead_id,doctor_name,appointment_date,appointment_time::time,'confirmed',true FROM clinic_appointments;
CREATE TRIGGER fill_appointment_doctor_trg BEFORE INSERT OR UPDATE OF clinic_id,doctor_id,doctor_name ON clinic_appointments FOR EACH ROW EXECUTE FUNCTION fill_appointment_doctor();
CREATE TRIGGER reminder AFTER INSERT ON clinic_appointments FOR EACH ROW EXECUTE FUNCTION auto_create_appointment_reminder();
CREATE FUNCTION sync_reminder_on_reschedule() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER clinic_appointments_sync_reminder AFTER UPDATE ON clinic_appointments FOR EACH ROW EXECUTE FUNCTION sync_reminder_on_reschedule();
`);
const sql = readFileSync(new URL('../supabase/migrations/20261003010000_link_and_safe_patient_reminders.sql',import.meta.url),'utf8');
await db.exec(sql);
const row = async () => (await db.query("select * from appointment_reminders where appointment_id='00000000-0000-4000-8000-000000000003'")).rows[0];
let r=await row(); assert.ok(r);assert.equal(r.doctor_name,'Debra Best — Hair Regrowth Specialist');assert.equal(r.three_day_sms_sent,true);
const n=async()=>Number((await db.query('select count(*) n from appointment_reminders')).rows[0].n);
assert.equal(await n(),1);await db.exec(sql);assert.equal(await n(),1);assert.equal((await row()).three_day_sms_sent,true);
await db.exec("update clinic_appointments set appointment_time='11:00' where id='00000000-0000-4000-8000-000000000003'");
r=await row();assert.equal(r.booking_time,'11:00:00');assert.equal(r.three_day_sms_sent,false);assert.equal(r.three_day_sms_sent_at,null);
const token='00000000-0000-4000-8000-000000000004';
const claim=async()=> (await db.query('select claim_appointment_reminder($1,$2,$3,$4) ok',[r.id,'3day',token,r.updated_at])).rows[0].ok;
assert.equal(await claim(),true);assert.equal(await claim(),false);
await db.exec("update clinic_appointments set patient_name='Fixture Updated' where id='00000000-0000-4000-8000-000000000003'");
assert.equal((await row()).three_day_sms_claim,token);assert.equal((await row()).patient_last_name,'Updated');
await db.exec("update clinic_appointments set appointment_time='12:00' where id='00000000-0000-4000-8000-000000000003'");
r=await row();assert.equal(r.three_day_sms_claim,null);assert.equal(await claim(),true);
await db.exec("update appointment_reminders set three_day_sms_claim=null,status='cancelled'");r=await row();assert.equal(await claim(),false);
await db.exec("update appointment_reminders set status='confirmed';update clinic_appointments set outcome='noshow'");r=await row();assert.equal(await claim(),false);
await db.exec("update clinic_appointments set outcome=null;update appointment_reminders set twentyfour_hour_sms_sent=true");
// Same-date edit preserves sent flags; new booking without lead still gets exact link.
await db.exec("update clinic_appointments set doctor_name=doctor_name");assert.equal((await row()).twentyfour_hour_sms_sent,true);
await db.exec("insert into clinic_appointments(clinic_id,patient_name,appointment_date,appointment_time) values ('00000000-0000-4000-8000-000000000001','New Fixture',(now() at time zone 'Australia/Sydney')::date+1,'09:00')");
assert.equal(await n(),2);assert.equal(Number((await db.query('select count(*) n from appointment_reminders where appointment_id is null')).rows[0].n),0);
assert.equal((await db.query("select has_function_privilege('authenticated','claim_appointment_reminder(uuid,text,uuid,timestamptz)','EXECUTE') ok")).rows[0].ok,false);
assert.equal((await db.query("select has_function_privilege('service_role','claim_appointment_reminder(uuid,text,uuid,timestamptz)','EXECUTE') ok")).rows[0].ok,true);
console.log('PASS: SQL migration, repeat application, existing Boss repair, sent-flag preservation, exact appointment links, reschedule sync, duplicate claims, cancellation/outcome exclusion and service-only claim access.');
await db.close();
