import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
let nativePg;
let db;
if (process.env.NATIVE_PG_MODULE) {
 const {default: EmbeddedPostgres}=await import(process.env.NATIVE_PG_MODULE);
 nativePg=new EmbeddedPostgres({databaseDir:`/private/tmp/calendar-pg-${process.pid}`,user:'postgres',password:'isolated-test-only',port:55439,persistent:false,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
 await nativePg.initialise();await nativePg.start();
 const client=nativePg.getPgClient();await client.connect();
 db={exec:text=>client.query(text),query:(text,args)=>client.query(text,args),close:async()=>{await client.end();await nativePg.stop();}};
} else {
 const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
 db=new PGlite();
}
try {
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sql=path=>readFileSync(new URL('../supabase/migrations/'+path,import.meta.url),'utf8');
await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role;
CREATE TABLE sales_reps(id uuid PRIMARY KEY,name text,email text,role text,is_active boolean default true,allowed_tabs text[]);
CREATE TABLE partner_clinics(id uuid PRIMARY KEY,clinic_name text,address text,city text,state text,phone text,min_appointment_gap_mins integer default 0);
CREATE TABLE clinic_portal_users(id uuid,clinic_id uuid);
CREATE TABLE meta_leads(id uuid PRIMARY KEY,rep_id uuid,booking_date date,booking_time text);
CREATE TABLE partner_doctors(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid,name text,title text,is_active boolean DEFAULT true,what_makes_them_different text);
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid,doctor_id uuid,doctor_name text,lead_id uuid,patient_name text,patient_phone text,appointment_date date,appointment_time text,booked_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),outcome text,disqualified_at timestamptz,deposit_amount numeric);
CREATE TABLE appointment_reminders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lead_id uuid,patient_first_name text,patient_last_name text,patient_phone text,doctor_name text,booking_date date,booking_time time,status text,booked_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),three_day_sms_sent boolean DEFAULT false,three_day_sms_sent_at timestamptz,twentyfour_hour_sms_sent boolean DEFAULT false,twentyfour_hour_sms_sent_at timestamptz);
CREATE TABLE clinic_trading_hours(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid,day_of_week integer,open_time time,close_time time,is_closed boolean,consult_duration_mins integer,unique(clinic_id,day_of_week));
CREATE TABLE clinic_blocked_slots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid,slot_date date,slot_start time,slot_end time,is_recurring boolean,recur_day_of_week integer);
CREATE TABLE clinic_availability(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid,override_date date,override_type text CONSTRAINT clinic_availability_override_type_check CHECK(override_type IN ('blocked','open')),start_time time,end_time time);
CREATE TABLE clinic_appointment_notes(id uuid DEFAULT gen_random_uuid(),appointment_id uuid,clinic_id uuid,author_name text,author_type text CHECK(author_type IN ('admin','clinic')),body text);
CREATE VIEW booking_rep_attribution AS SELECT a.id appointment_id,l.rep_id FROM clinic_appointments a JOIN meta_leads l ON l.id=a.lead_id;
CREATE FUNCTION is_clinic_user_for(c uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT exists(select 1 from clinic_portal_users where id=auth.uid() and clinic_id=c) $$;
INSERT INTO sales_reps(id,name,email,role,allowed_tabs) VALUES
('${uid(1)}','Admin','admin@fixture.test','admin',null),('${uid(2)}','Rep A','a@fixture.test','rep',ARRAY['sales_portal']),('${uid(3)}','Rep B','b@fixture.test','rep',null),('${uid(4)}','Caller','caller@fixture.test','caller',null);
INSERT INTO partner_clinics VALUES('${uid(10)}','Fixture Clinic','123 Fixture St','Sydney','NSW','0299999999',0),('${uid(11)}','Other Clinic','456 Fixture St','Perth','WA','0899999999',0);
INSERT INTO clinic_portal_users VALUES('${uid(5)}','${uid(10)}');
INSERT INTO partner_doctors(id,clinic_id,name,title) VALUES('${uid(20)}','${uid(10)}','Consultant','Specialist'),('${uid(21)}','${uid(11)}','Doctor','Doctor');
`);
await db.exec(sql('20261003000000_consultation_and_procedure_roles.sql'));
await db.exec(`CREATE TRIGGER fill_appointment_doctor_trg BEFORE INSERT OR UPDATE OF clinic_id,doctor_id,doctor_name ON clinic_appointments FOR EACH ROW EXECUTE FUNCTION fill_appointment_doctor();CREATE TRIGGER reminder AFTER INSERT ON clinic_appointments FOR EACH ROW EXECUTE FUNCTION auto_create_appointment_reminder();`);
await db.exec(sql('20260523062813_a1faded2-d15f-4bec-9fe9-a3d32667bd1d.sql'));
await db.exec(sql('20261003010000_link_and_safe_patient_reminders.sql'));
for(const [a,owner,clinic,time] of [[30,2,10,'09:00'],[31,3,10,'10:00'],[32,3,11,'09:00']]){
 await db.query('insert into meta_leads(id,rep_id,booking_date,booking_time) values($1,$2,$3,$4)',[uid(a+10),uid(owner),'2026-12-01',time]);
 await db.query('insert into clinic_appointments(id,clinic_id,lead_id,patient_name,patient_phone,appointment_date,appointment_time,deposit_amount) values($1,$2,$3,$4,$5,$6,$7,75)',[uid(a),uid(clinic),uid(a+10),'Fixture '+a,'0400000000','2026-12-01',time]);
}
await db.exec(`ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;ALTER TABLE clinic_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY old_broad ON appointment_reminders FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY old_broad ON clinic_appointments FOR ALL TO authenticated USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
`);
await db.exec(sql('20261003020000_sales_rescheduling.sql'));
await db.exec(sql('20261003020000_sales_rescheduling.sql')); // deployment/canonical replay is safe
await db.exec(`
 ALTER TABLE clinic_blocked_slots ADD COLUMN recur_pattern text,ADD COLUMN recur_days_of_week integer[],ADD COLUMN recur_day_of_month integer,ADD COLUMN recur_nth_week integer,ADD COLUMN recur_until date;
 ALTER TABLE clinic_availability ADD CONSTRAINT clinic_availability_unique UNIQUE(clinic_id,override_date);
 ALTER TABLE clinic_trading_hours ADD CONSTRAINT clinic_hours_unique UNIQUE(clinic_id,day_of_week);
 INSERT INTO clinic_trading_hours(clinic_id,day_of_week,open_time,close_time,is_closed,consult_duration_mins)
 SELECT c.id,n,'09:00','17:00',false,15 FROM partner_clinics c CROSS JOIN generate_series(0,6) n;
`);
if (nativePg) await db.exec('CREATE PUBLICATION supabase_realtime FOR TABLE clinic_appointments');
await db.exec(sql('20261008010000_clinic_calendar_scheduling.sql'));
await db.exec(sql('20261008010000_clinic_calendar_scheduling.sql'));
await db.exec(sql('20261009020000_exclude_disqualified_calendar.sql'));
await db.exec(sql('20261009020000_exclude_disqualified_calendar.sql'));
const actor=async(n,email,role='authenticated')=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:uid(n),email,role})]);await db.exec('SET ROLE '+role);};
const snapshot=async(clinic=uid(10))=>(await db.query('select get_clinic_schedule($1) s',[clinic])).rows[0].s;
const save=async(command,version,clinic=uid(10))=>{const s=version??(await snapshot(clinic)).version;return (await db.query('select save_clinic_schedule($1,$2,$3) s',[clinic,s,JSON.stringify(command)])).rows[0].s;};
const book=async(date,time,clinic=uid(10),id=crypto.randomUUID())=>db.query('insert into clinic_appointments(id,clinic_id,patient_name,appointment_date,appointment_time) values($1,$2,$3,$4,$5) returning *',[id,clinic,'Calendar Fixture',date,time]);
let checks=0;
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const reject=async(promise,pattern)=>{await assert.rejects(promise,pattern);checks++;};
if (nativePg) equal((await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename")).rows.map(row=>row.tablename),['clinic_appointments','clinic_availability','clinic_blocked_slots','clinic_trading_hours','partner_clinics'],'Replayed migration publishes every schedule table without duplicate membership');

await actor(2,'a@fixture.test');
equal((await snapshot()).consultation_minutes,30,'Legacy clinics retain the 30 minute duration');
equal('patient_name' in (await snapshot()).appointments[0],false,'Sales snapshot never leaks another patient');
await reject(save({action:'settings',consultation_minutes:90,buffer_minutes:30}),/Only this clinic/);
await actor(5,'clinic@fixture.test');
await reject(snapshot(uid(11)),/access/);
let s=await save({action:'settings',consultation_minutes:90,buffer_minutes:30});
const originalWeekly=JSON.parse(JSON.stringify(s.trading));
const weekly=Array.from({length:7},(_,day_of_week)=>({day_of_week,open_time:'09:00',close_time:'17:00',is_closed:false,consult_duration_mins:30}));
await reject(save({action:'settings',consultation_minutes:90,buffer_minutes:30,trading:weekly.map(h=>({...h,open_time:'10:00'}))}),/patient is already booked/);
s=await save({action:'settings',consultation_minutes:90,buffer_minutes:30,trading:weekly});
equal(s.trading.find(h=>h.day_of_week===0).open_time,'09:00:00','Weekly hours saved');
equal(s.trading.length,7,'All seven weekly days saved');
await reject(save({action:'settings',consultation_minutes:90,buffer_minutes:30,trading:weekly.slice(0,6)}),/seven days/);
s=await save({action:'settings',consultation_minutes:90,buffer_minutes:30,trading:originalWeekly});

equal(s.consultation_minutes,90);equal(s.buffer_minutes,30);
equal(s.appointments[0].consultation_duration_minutes,30,'Defaults do not shorten/lengthen existing bookings');
await reject(save({action:'settings',consultation_minutes:0,buffer_minutes:30}),/valid/);
await reject(save({action:'settings',consultation_minutes:90,buffer_minutes:-1}),/valid/);
const stale=s.version;
s=await save({action:'block',dates:['2099-10-12'],start:'10:30',end:'12:00'});
await reject(save({action:'hours',dates:['2099-10-12'],start:'09:00',end:'15:00',closed:false},stale),/changed/);
await save({action:'hours',dates:['2099-10-12'],start:'09:00',end:'15:00',closed:false});
await actor(1,'admin@fixture.test','service_role');
await reject(book('2099-10-12','10:00'),/blocked time/);
const first=(await book('2099-10-12','09:00')).rows[0];
equal(first.consultation_duration_minutes,90,'New rows freeze the actual consultation length');
await reject(book('2099-10-12','09:15'),/blocked time|overlap/);
await reject(book('2099-10-12','14:00'),/working hours/);
await book('2099-10-12','12:00');checks++;
await reject(book('2099-10-12','13:30'),/buffer/);
await reject(db.query('update clinic_appointments set consultation_duration_minutes=30 where id=$1',[first.id]),/keeps its booked/);
await actor(5,'clinic@fixture.test');
await reject(save({action:'block',dates:['2099-10-12'],start:'09:30',end:'10:00'}),/patient is already booked/);
await reject(save({action:'hours',dates:['2099-10-12'],start:'09:00',end:'13:00',closed:false}),/full appointment/);
await reject(save({action:'hours',dates:['2099-10-12'],start:'09:00',end:'15:00',closed:true}),/full appointment/);
equal((await snapshot()).overrides.find(o=>o.override_date==='2099-10-12').end_time,'15:00:00','Failed save is atomic');
// An unchanged booked appointment can still receive notes/outcomes.
await actor(1,'admin@fixture.test','service_role');
await db.query('update clinic_appointments set outcome=$1 where id=$2',['show',first.id]);checks++;
// Settings preserve existing appointments even if the new buffer needs review.
await save({action:'settings',consultation_minutes:60,buffer_minutes:60});
equal((await snapshot()).appointments.find(a=>a.id===first.id).consultation_duration_minutes,90);
await book('2099-10-13','09:00');
await reject(book('2099-10-13','10:00'),/buffer/);
await book('2099-10-13','11:00');checks++;
await save({action:'settings',consultation_minutes:60,buffer_minutes:0});
await book('2099-10-14','09:00');await book('2099-10-14','10:00');checks++;
await reject(book('2099-10-15','09:07'),/working hours/);
await reject(book('2020-01-01','09:00'),/future/);
await db.query("insert into clinic_availability(clinic_id,override_date,override_type) values($1,'2099-11-05','blocked')",[uid(10)]);
await reject(book('2099-11-05','09:00'),/working hours/);
await save({action:'hours',dates:['2099-11-04','2099-11-05'],start:'09:00',end:'15:00',closed:false});
await reject(book('2099-11-05','09:00'),/working hours/);
// Recurring blocks: an exception affects just one date, other repeats remain.
await db.query(`insert into clinic_blocked_slots(id,clinic_id,slot_date,slot_start,slot_end,is_recurring,recur_pattern,recur_until) values($1,$2,'2099-10-15','12:00','13:00',true,'daily','2099-12-31')`,[uid(100),uid(10)]);
await reject(book('2099-10-15','11:30'),/blocked time/);
await save({action:'unblock',id:uid(100),date:'2099-10-15',scope:'date'});
await book('2099-10-15','12:00');checks++;
await reject(book('2099-10-16','12:00'),/blocked time/);
await save({action:'block',id:uid(100),dates:['2099-10-16'],start:'14:00',end:'15:00',scope:'date'});
await book('2099-10-16','12:00');checks++;
await reject(book('2099-10-16','14:00'),/blocked time/);
await reject(book('2099-10-17','12:00'),/blocked time/);
// Moving a repeat excludes its original occurrence and keeps the destination repeat.
s=await save({action:'block',id:uid(100),source_date:'2099-10-17',dates:['2099-10-18'],start:'14:00',end:'15:00',scope:'date'});
equal(s.blocks.find(b=>b.id===uid(100)).excluded_dates.includes('2099-10-17'),true,'Moved repeat excludes source date');
equal(s.blocks.find(b=>b.id===uid(100)).excluded_dates.includes('2099-10-18'),false,'Destination repeat is preserved');
await book('2099-10-17','12:00');checks++;
await reject(book('2099-10-18','12:00'),/blocked time/);
await reject(book('2099-10-18','14:00'),/blocked time/);
await reject(save({action:'block',id:uid(100),source_date:'2099-10-17',dates:['2099-10-19'],start:'14:00',end:'15:00',scope:'date'}),/block has changed/);
// A move is atomic: old time reopens, new time closes, failed moves preserve both.
s=await save({action:'block',dates:['2099-10-20'],start:'09:00',end:'10:00'});
let movable=s.blocks.find(b=>b.slot_date==='2099-10-20'&&!b.is_recurring);
s=await save({action:'block',id:movable.id,source_date:'2099-10-20',dates:['2099-10-21'],start:'14:00',end:'15:00',scope:'date'});
await book('2099-10-20','09:00');checks++;
await reject(book('2099-10-21','14:00'),/blocked time/);
movable=s.blocks.find(b=>b.slot_date==='2099-10-21'&&!b.is_recurring);
await reject(save({action:'block',id:movable.id,source_date:'2099-10-21',dates:['2099-10-17'],start:'12:00',end:'13:30',scope:'date'}),/patient is already booked/);
equal((await snapshot()).blocks,s.blocks,'Rejected drag preserves original blocks');
await reject(save({action:'block',id:movable.id,source_date:'2099-10-22',dates:['2099-10-23'],start:'14:00',end:'15:00',scope:'date'}),/block has changed/);
// Repeated hours preserve explicit closed dates and public holidays.
await save({action:'hours',dates:['2099-11-02'],start:'09:00',end:'15:00',closed:true});
await db.query("insert into clinic_public_holidays values('NSW','2099-11-03','Fixture holiday')");
await save({action:'hours',dates:['2099-11-01','2099-11-02','2099-11-03'],start:'10:00',end:'14:00',closed:false});
await reject(book('2099-11-02','10:00'),/working hours/);
await reject(book('2099-11-03','10:00'),/working hours/);
await save({action:'hours',dates:['2099-11-03'],start:'09:00',end:'15:00',closed:false});
await book('2099-11-03','10:00');checks++;
// Direct writes cannot cut a booked consultation either.
await reject(db.query("insert into clinic_blocked_slots(clinic_id,slot_date,slot_start,slot_end,is_recurring) values($1,'2099-11-03','10:30','11:00',false)",[uid(10)]),/patient is already booked/);
// Undo checks the current version and cannot roll back a concurrent booking.
const before=await snapshot();
const configuration={consultation_minutes:before.consultation_minutes,buffer_minutes:before.buffer_minutes,blocks:before.blocks,overrides:before.overrides};
const changed=await save({action:'block',dates:['2099-11-04'],start:'09:00',end:'10:00'});
await save({action:'restore',configuration},changed.version);checks++;
const v=(await snapshot()).version;
await book('2099-11-04','09:00');
await reject(save({action:'restore',configuration},v),/changed/);
// Anonymous/caller writes are denied; another clinic cannot edit this calendar.
await actor(4,'caller@fixture.test');await reject(snapshot(),/access/);
await actor(1,'admin@fixture.test');equal((await snapshot(uid(11))).buffer_minutes,0,'Other clinics unaffected');
await db.exec('RESET ROLE');await db.exec('SET ROLE anon');await reject(snapshot(),/permission denied/);
await actor(1,'admin@fixture.test','service_role');
// Compare the exact shared client slot list with actual database INSERTs.
// Each attempted booking is rolled back, including reminder side effects.
for (const [duration,buffer] of [[90,30],[45,0],[30,60],[120,15]]) {
 await save({action:'settings',consultation_minutes:duration,buffer_minutes:buffer});
 const model=await snapshot();
 for(const date of ['2099-10-12','2099-10-15','2099-10-16','2099-11-02','2099-11-03']) {
  const expected=JSON.parse(execFileSync(process.env.BUN_BIN||'bun',['--eval',"import {scheduleSlots} from './src/lib/clinic-schedule.ts'; const {model,date}=await Bun.stdin.json(); console.log(JSON.stringify(scheduleSlots(model,date).filter(s=>s.available).map(s=>s.time)));"],{cwd:new URL('..',import.meta.url),input:JSON.stringify({model,date}),encoding:'utf8'}));
  const actual=[];
  for(let minute=480;minute<=1080;minute+=15) {
   const time=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
   await db.exec('BEGIN');
   try {await book(date,time);actual.push(time);}catch(error){if(!/working hours|blocked time|just taken/.test(error.message))throw error;}
   finally {await db.exec('ROLLBACK');}
  }
  equal(actual,expected,`Client/database parity ${duration}/${buffer} on ${date}`);
 }
}
await db.exec('BEGIN');
const beforeResize=await snapshot();
const resized=await save({action:'settings',consultation_minutes:240,buffer_minutes:0,apply_to_existing:true,trading:beforeResize.trading.map(h=>({...h,close_time:'10:00'}))});
equal(resized.appointments.every(a=>a.consultation_duration_minutes===240),true,'Confirmed settings update every existing duration, including conflicts');
equal(resized.appointments.map(a=>[a.id,a.appointment_date,a.appointment_time]),beforeResize.appointments.map(a=>[a.id,a.appointment_date,a.appointment_time]),'Bulk resize leaves patient start times unchanged');
equal((await snapshot(uid(11))).consultation_minutes,30,'Bulk resize does not affect another clinic');
equal(resized.trading.every(h=>h.close_time==='10:00:00'),true,'Confirmed settings save conflicting hours for later review');
await reject(book('2099-12-30','09:00'),/working hours/);
await db.exec('ROLLBACK');
await reject(db.query('update clinic_appointments set consultation_duration_minutes=5 where clinic_id=$1',[uid(10)]),/keeps its booked/);

// A disqualified booking remains auditable without reserving its old slot.
await actor(1,'admin@fixture.test');
await db.exec('BEGIN');
await save({action:'settings',consultation_minutes:30,buffer_minutes:0,trading:Array.from({length:7},(_,day_of_week)=>({day_of_week,open_time:'09:00',close_time:'17:00',is_closed:false,consult_duration_mins:15}))});
const disqId=uid(800), timestampId=uid(801), activeId=uid(802);
await book('2099-11-20','09:00',uid(10),disqId);
await db.query("update clinic_appointments set outcome='disqualified' where id=$1",[disqId]);
await book('2099-11-20','10:00',uid(10),timestampId);
await db.query("update clinic_appointments set disqualified_at=now() where id=$1",[timestampId]);
await book('2099-11-20','09:00',uid(10),activeId);
equal((await snapshot()).appointments.filter(a=>a.appointment_date==='2099-11-20').map(a=>a.id),[activeId],'Only active booking occupies the calendar');
equal((await db.query("select * from booking_busy_times($1) where appointment_date='2099-11-20'",[uid(10)])).rows.map(a=>a.appointment_time),['09:00'],'Sales busy times exclude both disqualification markers');
const reschedule=(await db.query('select get_booking_reschedule($1) s',[activeId])).rows[0].s;
equal(reschedule.snapshot.busy.filter(a=>a.appointment_date==='2099-11-20'),[],'Reschedule conflicts exclude disqualified bookings');
equal((await db.query('select count(*)::int n from clinic_appointments where id=any($1::uuid[])',[[disqId,timestampId]])).rows[0].n,2,'History is retained');
await db.query("insert into clinic_blocked_slots(clinic_id,slot_date,slot_start,slot_end,is_recurring) values($1,'2099-11-20','10:00','10:30',false)",[uid(10)]);
checks++;
await db.exec('SAVEPOINT reinstate');
await reject(db.query('update clinic_appointments set outcome=null where id=$1',[disqId]),/just taken|overlaps/);
await db.exec('ROLLBACK TO SAVEPOINT reinstate');
await db.exec('SAVEPOINT timestamp_reinstate');
await reject(db.query('update clinic_appointments set disqualified_at=null where id=$1',[timestampId]),/blocked time/);
await db.exec('ROLLBACK TO SAVEPOINT timestamp_reinstate');
await db.exec('ROLLBACK');

if (nativePg) {
 await db.exec('RESET ROLE');
 const a=nativePg.getPgClient(),b=nativePg.getPgClient();await a.connect();await b.connect();
 for(const client of [a,b]) {await client.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await client.query("SET statement_timeout='5s'");}
 const bpid=(await b.query('select pg_backend_pid() pid')).rows[0].pid;
 const waitBlocked=async()=>{for(let i=0;i<100;i++){const r=await db.query("select wait_event from pg_stat_activity where pid=$1",[bpid]);if(r.rows[0].wait_event==='advisory')return;await new Promise(r=>setTimeout(r,10));}throw new Error('Concurrent writer did not wait on clinic lock');};
 const insert=(client,date,time)=>client.query("insert into clinic_appointments(clinic_id,patient_name,appointment_date,appointment_time) values($1,'Concurrent fixture',$2,$3)",[uid(11),date,time]);
 // Two independent connections choose the same slot: the second must wait,
 // then recheck the newly committed appointment and fail.
 await a.query('BEGIN');await insert(a,'2099-12-01','09:00');
 let pending=insert(b,'2099-12-01','09:00').then(()=>null,e=>e);
 await waitBlocked();await a.query('COMMIT');equal((await pending)?.message.includes('just taken'),true,'Concurrent duplicate booking rejected');
 // A committed block wins over a waiting booking, and vice versa.
 await a.query('BEGIN');await a.query("insert into clinic_blocked_slots(clinic_id,slot_date,slot_start,slot_end,is_recurring) values($1,'2099-12-02','10:00','11:00',false)",[uid(11)]);
 pending=insert(b,'2099-12-02','10:00').then(()=>null,e=>e);
 await waitBlocked();await a.query('COMMIT');equal((await pending)?.message.includes('blocked time'),true,'Concurrent block is respected');
 await a.query('BEGIN');await insert(a,'2099-12-03','10:00');
 pending=b.query("insert into clinic_blocked_slots(clinic_id,slot_date,slot_start,slot_end,is_recurring) values($1,'2099-12-03','10:00','11:00',false)",[uid(11)]).then(()=>null,e=>e);
 await waitBlocked();await a.query('COMMIT');equal((await pending)?.message.includes('patient is already booked'),true,'Concurrent booked patient remains protected');
 await a.end();await b.end();
}
console.log(`PASS: ${checks} database scheduling, ownership, atomicity, recurrence, migration replay and boundary checks.`);
} catch(error) { console.error({message:error.message,detail:error.detail,where:error.where,position:error.position,stack:error.stack?.split("\n").slice(0,4).join("\n")});process.exitCode=1;} finally { await db.close(); }
