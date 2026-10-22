// Isolated PostgreSQL; no real patients or external sends.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE partner_clinics(id uuid PRIMARY KEY,clinic_name text,state text,city text);
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid REFERENCES partner_clinics(id),appointment_date date,appointment_time text,patient_phone text,outcome text,disqualified_at timestamptz);
CREATE TABLE appointment_reminders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),appointment_id uuid REFERENCES clinic_appointments(id),booking_date date,booking_time time,patient_phone text,status text DEFAULT 'confirmed',updated_at timestamptz DEFAULT now(),schedule_changed_at timestamptz DEFAULT now(),three_day_sms_sent boolean DEFAULT false,twentyfour_hour_sms_sent boolean DEFAULT false,three_day_sms_sent_at timestamptz,twentyfour_hour_sms_sent_at timestamptz,three_day_sms_claim uuid,twentyfour_hour_sms_claim uuid);
CREATE TABLE sms_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),direction text,to_number text,from_number text,twilio_message_sid text UNIQUE,status text,sent_at timestamptz,created_at timestamptz DEFAULT now());
CREATE FUNCTION has_sales_role(text[]) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('fixture.role',true),'')=ANY($1) $$;
CREATE FUNCTION booking_sales_actor() RETURNS TABLE(id uuid,role text) LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-000000000099'::uuid,current_setting('fixture.role',true) $$;
CREATE FUNCTION can_manage_booking(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('fixture.role',true) IN ('admin','rep') $$;
GRANT SELECT ON appointment_reminders,clinic_appointments TO authenticated;
INSERT INTO partner_clinics VALUES ('00000000-0000-4000-8000-000000000001','Boss Clinic','WA','Perth'),('00000000-0000-4000-8000-000000000002','Nitai Medical & Cosmetic Centre','VIC','Essendon');
`);
const sql=readFileSync(new URL('../supabase/migrations/20261023010000_clinic_reminder_confirmation.sql',import.meta.url),'utf8');
await db.exec(sql);
const boss='00000000-0000-4000-8000-000000000001', nitai='00000000-0000-4000-8000-000000000002';
const setting=async(id=boss)=>(await db.query('select *,updated_at::text version from clinic_reminder_settings where clinic_id=$1',[id])).rows[0];
assert.equal((await setting()).mode,'confirmation');assert.equal((await setting(nitai)).mode,'reminders');
assert.equal((await setting()).timezone,'Australia/Perth');assert.equal((await setting(nitai)).timezone,'Australia/Melbourne');
await db.exec(sql);assert.equal((await setting()).mode,'confirmation');
const make=async(phone='0400000000',clinic=boss)=>{
 const a=(await db.query("insert into clinic_appointments(clinic_id,appointment_date,appointment_time,patient_phone) values($1,current_date+7,'10:00',$2) returning id",[clinic,phone])).rows[0].id;
 return (await db.query("insert into appointment_reminders(appointment_id,booking_date,booking_time,patient_phone) select id,appointment_date,appointment_time::time,patient_phone from clinic_appointments where id=$1 returning *",[a])).rows[0];
};
const reload=async(r)=>(await db.query('select * from appointment_reminders where id=$1',[r.id])).rows[0];
const claim=async(r,kind='request',version)=>(await db.query('select claim_confirmation_delivery($1,$2,$3,$4,$5,$6) id',[r.id,r.confirmation_revision,kind,version||(await setting()).version,'Fixture message','+61400000000'])).rows[0].id;
const finish=async(id,status='accepted',sid='SMfixture')=>db.query('select finish_confirmation_delivery($1,$2,$3,$4)',[id,status,sid,status==='failed'?'Fixture failure':null]);
const log=async(sid,to='+61400000000')=>db.query("insert into sms_messages(direction,to_number,twilio_message_sid,status,sent_at) values('outbound',$1,$2,'queued',clock_timestamp())",[to,sid]);
const reply=async(sid,body,phone='+61400000000')=>(await db.query('select consume_appointment_confirmation_reply($1,$2,$3,$4,null) result',[sid,phone,'+61468031075',body])).rows[0].result;
let r=await make();let id=await claim(r);assert.ok(id);assert.equal(await claim(r),null);
await finish(id);await log('SMfixture');r=await reload(r);assert.equal(r.confirmation_state,'awaiting_reply');
assert.equal(r.twentyfour_hour_sms_sent,false,'Friday request must not consume Sunday reminder');
assert.equal((await reply('INyes',' yes! ')).confirmed,true);r=await reload(r);assert.equal(r.confirmation_state,'confirmed');
assert.equal(await claim(r,'followup'),null);assert.equal(await claim(r,'call_email'),null);
assert.equal((await reply('INyes','NO')).duplicate,true);assert.equal((await reload(r)).confirmation_state,'confirmed');
await reply('INthanks','Thanks!');assert.equal((await reload(r)).confirmation_state,'confirmed');
// Invalid sender cannot confirm a patient, even with the right mobile recipient.
assert.equal((await db.query("select consume_appointment_confirmation_reply('wrong','+61400000000','+61499999999','YES',null) r")).rows[0].r.matched,false);
// Reset on reschedule isolates old in-flight sends and old YES replies.
const oldRevision=r.confirmation_revision;
await db.query("update clinic_appointments set appointment_time='11:00' where id=$1",[r.appointment_id]);
r=await reload(r);assert.notEqual(r.confirmation_revision,oldRevision);assert.equal(r.confirmation_state,'not_requested');
await finish(id);assert.equal((await reload(r)).confirmation_requested_at,null);
assert.equal((await reply('old-yes','YES')).matched,false);
await db.query("update appointment_reminders set booking_time='11:00' where id=$1",[r.id]);
r=await reload(r);id=await claim(r);await finish(id,'accepted','SMnew');await log('SMnew');
// Unrelated conversation means a bare YES must go to review, never automatic confirmation.
await log('SMunrelated');await reply('INambiguous','YES');r=await reload(r);assert.equal(r.confirmation_state,'needs_call');assert.equal(r.confirmation_reason,'patient_reply');
assert.equal(await claim(r,'followup'),null);assert.ok(await claim(r,'call_email'));
// Admin-only clinic setting, stale-write rejection, and mode OFF enforced by the sender.
const save=async(mode,version)=>db.query("select save_clinic_reminder_settings($1,$2,'Australia/Perth','fixture@example.test',ARRAY[1,2,3,4,5],ARRAY[]::date[],'13:00',$3)",[boss,mode,version || (await setting()).version]);
await db.exec("set role authenticated;select set_config('fixture.role','rep',false)");
await assert.rejects(save('off'),/Admin access/);
await db.exec("select set_config('fixture.role','admin',false)");
const version=(await setting()).version;await save('off',version);await assert.rejects(save('confirmation',version),/Settings changed/);
await db.exec('reset role');assert.equal(await claim(r,'call_email'),null);
assert.equal((await reload(r)).confirmation_reason,'patient_reply','Switching off must preserve a patient request');
await save('confirmation');
// Two upcoming appointments on a shared phone cannot be confirmed by a single YES.
let second=await make();const secondId=await claim(second);await finish(secondId,'accepted','SMsecond');await log('SMsecond');
await reply('INshared','YES');assert.equal((await reload(second)).confirmation_state,'needs_call');
// STOP is honoured by all modes, and is distinct from cancelling a booking.
await reply('INstop','STOP');assert.equal((await reload(second)).status,'confirmed');
assert.equal((await db.query('select count(*)::int n from patient_sms_opt_outs')).rows[0].n,1);
let opted=await make('0400000000',nitai);assert.equal(await claim(opted,'24h',(await setting(nitai)).version),null);
await reply('INstart','START');assert.equal((await db.query('select count(*)::int n from patient_sms_opt_outs')).rows[0].n,0);
// Phone confirmation stops chasing and checks both access and revision.
await db.exec("set role authenticated;select set_config('fixture.role','rep',false)");
await db.query("select record_appointment_confirmation_call($1,$2,'confirmed')",[second.id,second.confirmation_revision]);
assert.equal((await reload(second)).confirmation_method,'phone');
await assert.rejects(db.query("select record_appointment_confirmation_call($1,gen_random_uuid(),'confirmed')",[second.id]),/Appointment changed/);
await db.exec("select set_config('fixture.role','outsider',false)");
await assert.rejects(db.query("select record_appointment_confirmation_call($1,$2,'confirmed')",[second.id,second.confirmation_revision]),/Booking access/);
assert.equal((await db.query('select * from clinic_reminder_settings')).rows.length,0);
assert.equal((await db.query("select has_function_privilege('authenticated','claim_confirmation_delivery(uuid,uuid,text,timestamptz,text,text)','EXECUTE') ok")).rows[0].ok,false);
await db.exec('reset role');
// Delivery failures are actionable; unknown sends remain claimed, never duplicated.
let failed=await make('0400000001');const failedId=await claim(failed);await finish(failedId,'unknown','SMfailed');
assert.equal((await reload(failed)).confirmation_reason,'delivery_failed');assert.equal(await claim(await reload(failed)),null);
let deliveryRow=await make('0400000002');const deliveredId=await claim(deliveryRow);await finish(deliveredId,'accepted','SMdelivery');await log('SMdelivery','+61400000002');
await db.query("update sms_messages set status='undelivered (30003)' where twilio_message_sid='SMdelivery'");
assert.equal((await reload(deliveryRow)).confirmation_reason,'delivery_failed');
let stalled=await make('0400000003');const stalledId=await claim(stalled);await db.query("update appointment_reminder_deliveries set updated_at=now()-interval '11 minutes' where id=$1",[stalledId]);
await db.exec('select recover_stale_confirmation_deliveries()');assert.equal((await reload(stalled)).confirmation_reason,'delivery_failed');
// A signed callback can arrive before the Twilio POST returns or the inbox row exists.
let fast=await make('0400000004');const fastId=await claim(fast);
await db.query("select record_confirmation_delivery_callback($1,'SMfast','undelivered','Provider could not deliver')",[fastId]);
await finish(fastId,'accepted','SMfast');
assert.equal((await reload(fast)).confirmation_reason,'delivery_failed');
assert.equal((await db.query('select status,error from appointment_reminder_deliveries where id=$1',[fastId])).rows[0].error,'Provider could not deliver');
await db.query("select record_confirmation_delivery_callback($1,'SMwrong','delivered',null)",[fastId]);
assert.equal((await db.query('select status from appointment_reminder_deliveries where id=$1',[fastId])).rows[0].status,'undelivered');
// New clinics default to normal texts; settings are not accidentally copied from Perth.
await db.exec("insert into partner_clinics values(gen_random_uuid(),'New Perth clinic','WA','Perth')");
assert.equal((await db.query("select s.mode from clinic_reminder_settings s join partner_clinics c on c.id=s.clinic_id where c.clinic_name='New Perth clinic'")).rows[0].mode,'reminders');
// Switching off closes automatic non-response tasks and invalidates queued sends.
let pending=await make('0400000005');const pendingId=await claim(pending);await finish(pendingId,'accepted','SMpending');
await db.exec("select set_config('fixture.role','admin',false)");await save('off');
assert.equal((await reload(pending)).confirmation_state,'not_requested');assert.notEqual((await reload(pending)).confirmation_revision,pending.confirmation_revision);
assert.equal(await claim(pending,'followup'),null);
// Isolated cron stubs test replacement/replay without invoking HTTP.
await db.exec(`CREATE SCHEMA cron;CREATE TABLE cron.job(jobname text PRIMARY KEY,schedule text,command text);
CREATE FUNCTION cron.unschedule(text) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN DELETE FROM cron.job WHERE jobname=$1;RETURN true;END $$;
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN INSERT INTO cron.job VALUES($1,$2,$3);RETURN 1;END $$;
INSERT INTO cron.job VALUES('send-appointment-reminders-daily','0 5 * * *','legacy');`);
const scheduleSql=readFileSync(new URL('../supabase/migrations/20261023020000_schedule_clinic_confirmation_reminders.sql',import.meta.url),'utf8');
await db.exec(scheduleSql);await db.exec(scheduleSql);
const jobs=(await db.query('select * from cron.job')).rows;assert.equal(jobs.length,1);assert.equal(jobs[0].jobname,'send-appointment-reminders-local');assert.equal(jobs[0].schedule,'*/5 * * * *');
// Existing manual calls must stop the automated sequence too, including rollout backfill.
await db.exec("alter table clinic_appointments add column updated_at timestamptz default now(); create table appointment_confirmation_events(id uuid default gen_random_uuid(),appointment_id uuid,appointment_updated_at timestamptz,kind text,created_at timestamptz default clock_timestamp())");
const manual=await make('0400000091');
const manualEvent=(row,kind,stale=false)=>db.query("insert into appointment_confirmation_events(appointment_id,appointment_updated_at,kind) select id,updated_at - CASE WHEN $3 THEN interval '1 day' ELSE interval '0 day' END,$2 from clinic_appointments where id=$1",[row.appointment_id,kind,stale]);
await manualEvent(manual,'confirmed');
const bridge=readFileSync(new URL('../supabase/migrations/20261023015000_sync_manual_appointment_confirmations.sql',import.meta.url),'utf8');
await db.exec(bridge);await db.exec(bridge);
assert.equal((await reload(manual)).confirmation_state,'confirmed');
await save('confirmation');assert.equal(await claim(await reload(manual),'followup'),null);
const nextManual=await make('0400000092');
await manualEvent(nextManual,'confirmed',true);assert.equal((await reload(nextManual)).confirmation_state,'not_requested');
await manualEvent(nextManual,'confirmed');assert.equal((await reload(nextManual)).confirmation_method,'phone');
await manualEvent(nextManual,'no_answer');assert.equal((await reload(nextManual)).confirmation_state,'confirmed');
await db.query("update clinic_appointments set appointment_date=appointment_date+1,updated_at=clock_timestamp() where id=$1",[nextManual.appointment_id]);
assert.equal((await reload(nextManual)).confirmation_state,'not_requested');
await db.close();
console.log('PASS: clinic modes/timezones, migration replay, atomic claims, YES routing, duplicate webhooks, rescheduling, ambiguous replies, opt-outs, phone confirmation, RLS, delivery failures and interrupted-send recovery.');
