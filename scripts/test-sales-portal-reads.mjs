import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12,'0');
const migration = readFileSync(new URL('../supabase/migrations/20261117010000_sales_portal_reads.sql', import.meta.url),'utf8');
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create table partner_clinics(id uuid primary key, city text, location text, is_active bool);
  create table clinic_packs(clinic_id uuid,pack_type text,pack_size int,date_paid date,purchased_at timestamptz);
  create table clinic_trials(clinic_id uuid,paid_started_at timestamptz);
  create table clinic_appointments(id uuid primary key, clinic_id uuid, booking_rep_id uuid,booked_at timestamptz,is_free_trial bool,patient_name text,outcome text,disqualified_at timestamptz);
  create table call_records(id uuid primary key,lead_id uuid,called_at timestamptz,direction text,outcome text,status text,visible bool);
  create function booking_sales_actor() returns table(id uuid,role text) language sql stable as $$
    select current_setting('fixture.id')::uuid,current_setting('fixture.role') where current_setting('fixture.role') in ('admin','rep')
  $$;
  create function current_clinic_id() returns uuid language sql stable as $$select nullif(current_setting('fixture.clinic',true),'')::uuid$$;
  create function can_manage_booking(p_id uuid) returns boolean language sql stable security definer as $$
    select exists(select 1 from booking_sales_actor() s where s.role='admin' or exists (select from clinic_appointments a where a.id=p_id and a.booking_rep_id=s.id))
  $$;
  alter table clinic_appointments enable row level security;
  create policy staff on clinic_appointments for select to authenticated using(exists(select from booking_sales_actor()));
  create policy "clinic select own appts" on clinic_appointments for select to authenticated using(clinic_id=current_clinic_id());
  create policy "appointment owner or own clinic" on clinic_appointments as restrictive for all to authenticated
    using(can_manage_booking(id) or clinic_id=current_clinic_id()) with check(clinic_id=current_clinic_id() or exists (select from booking_sales_actor() s where s.role='admin' or s.id=booking_rep_id));
  alter table call_records enable row level security;
  create policy allowed on call_records for select to authenticated using(visible);
  grant select on call_records,clinic_appointments to authenticated;
  insert into partner_clinics values ('${id(1)}','Melbourne','Melbourne',true),('${id(2)}','Perth','Perth',true),('${id(3)}','Old','Old',false);
  insert into clinic_packs values ('${id(1)}','free_trial',10,'2026-01-01',now()),('${id(1)}','paid',1,'2026-01-03',now());
  insert into clinic_trials values ('${id(2)}',null);
`);
const appt = async(n,c,rep,booked,free,name,outcome,disqualified=null) =>
  db.query('insert into clinic_appointments values($1,$2,$3,$4,$5,$6,$7,$8)',[id(n),id(c),id(rep),booked,free,name,outcome,disqualified]);
await appt(10,1,4,'2026-01-03T12:59:59Z',false,'Fixture pre-cutoff',null);
await appt(11,1,4,'2026-01-03T13:00:00Z',false,'Fixture post-cutoff',null);
await appt(12,1,5,'2026-01-10',false,'Fixture second',null);
await appt(13,1,5,'2026-01-10',false,'Fixture Test',null);
await appt(14,1,5,'2026-01-10',true,'Fixture trial',null);
await appt(15,1,5,'2026-01-10',false,'Fixture','noshow');
await appt(16,1,5,'2026-01-10',false,'Fixture',null,'2026-01-11');
await appt(17,2,5,'2026-01-10',false,'Fixture active trial',null);
const actors=[['admin',9,''],['rep',4,''],['rep',5,''],['clinic',6,id(1)],['caller',7,'']];
const setActor=async([role,n,clinic])=>{
  await db.exec('reset role;set role authenticated');
  await db.query("select set_config('fixture.role',$1,false),set_config('fixture.id',$2,false),set_config('fixture.clinic',$3,false)",[role,id(n),clinic]);
};
const visible=async()=> (await db.query('select id from clinic_appointments order by id')).rows.map(r=>r.id);
const before=[];
for(const actor of actors){await setActor(actor); before.push(await visible());}
await db.exec('reset role');
await db.exec(migration);
for(const [i,actor] of actors.entries()){
  await setActor(actor); assert.deepEqual(await visible(),before[i]);
  if(i<3){
    const {v}= (await db.query('select sales_capacity_snapshot() as v')).rows[0];
    assert.deepEqual(v.remaining,{[id(1)]:-1,[id(2)]:1,[id(3)]:0});
    assert.deepEqual(v.clinics.map(c=>c.id),[id(1),id(2)]);
  }else await assert.rejects(db.query('select sales_capacity_snapshot()'),/Sales access required/);
}
await db.exec("reset role; set role anon");
await assert.rejects(db.query('select sales_capacity_snapshot()'),/permission denied/);
await assert.rejects(db.query("select sales_queue_history('{}',now(),now(),'UTC')"),/permission denied/);
await db.exec('reset role');
for(const [n,at,dir,out,vis] of [[1,'2026-01-01','outbound','old',true],[2,'2026-01-04T13:01:00Z','inbound','inbound',true],[3,'2026-01-04T13:02:00Z',null,'outbound',true],[4,'2026-01-04T13:02:00Z','outbound',null,true],[5,'2026-01-04T15:00:00Z','outbound','private',false]])
  await db.query('insert into call_records values ($1,$2,$3,$4,$5,null,$6)',[id(n),id(1),at,dir,out,vis]);
await setActor(actors[1]);
const ids=Array.from({length:1011},(_,i)=>id(i+1));
const history=(await db.query("select sales_queue_history($1,'2026-01-04T13:00:00Z','2026-01-02T13:00:00Z','Australia/Sydney') as h",[ids])).rows[0].h;
assert.equal(Object.keys(history).length,ids.length);assert.equal(history[id(1)].attempts,3);assert.equal(history[id(1)].todayAttempts,2);
assert.equal(Date.parse(history[id(1)].todayFirstAttemptAt),Date.parse('2026-01-04T13:01:00Z'));
assert.deepEqual(history[id(1)].days,{'2026-01-05':{count:2,lastOutcome:'outbound'}});
assert.equal(history[id(1011)].attempts,0);
await db.close();
console.log('Capacity, history, API row cap, local day boundaries, and existing appointment visibility passed for all fixture roles.');
