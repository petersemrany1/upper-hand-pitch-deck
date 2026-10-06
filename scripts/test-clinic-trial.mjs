import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const clinic = "6087e8f7-32c9-4d1e-a251-01fbfd36d830";
const migration = readFileSync(new URL("../supabase/migrations/20261006040000_gro_dated_trial.sql", import.meta.url), "utf8");
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE FUNCTION is_admin_user() RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('fixture.role',true)='admin' $$;
CREATE FUNCTION is_clinic_user_for(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('fixture.clinic',true)=$1::text $$;
CREATE TABLE partner_clinics(id uuid PRIMARY KEY,clinic_name text,city text,price_per_booking numeric DEFAULT 800);
CREATE TABLE clinic_packs(id uuid DEFAULT gen_random_uuid(),clinic_id uuid,pack_type text,pack_size int,amount_paid_ex_gst numeric,free_shows_included int DEFAULT 0,date_paid date,purchased_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now());
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid,appointment_date date,outcome text,patient_name text DEFAULT 'Fixture',created_at timestamptz DEFAULT now());
INSERT INTO partner_clinics(id,clinic_name) VALUES ('${clinic}','Gro Clinics - Sydney');
CREATE VIEW clinic_show_slots AS SELECT id AS appointment_id,clinic_id,appointment_date,1::bigint AS show_no,'paid'::text AS pack_type,false AS is_free,false AS unpurchased FROM clinic_appointments;
CREATE VIEW clinic_effective_rate AS SELECT id AS clinic_id,0::numeric AS amount_paid_ex_gst,0::bigint AS shows_purchased,0::bigint AS shows_delivered,0::numeric AS effective_rate,800::numeric AS list_rate FROM partner_clinics;
CREATE FUNCTION revenue_by_key(date,date,text) RETURNS numeric LANGUAGE sql AS $$ SELECT sum(COALESCE(er.effective_rate, 0)) FROM clinic_appointments a JOIN clinic_effective_rate er ON er.clinic_id=a.clinic_id WHERE a.outcome='show' $$;
CREATE FUNCTION money_monthly(date,date,uuid) RETURNS numeric LANGUAGE sql AS $$ SELECT sum(CASE WHEN o.is_showed THEN COALESCE(er.effective_rate, 0) ELSE 0 END) FROM clinic_appointments a JOIN clinic_effective_rate er ON er.clinic_id=a.clinic_id CROSS JOIN (SELECT true AS is_showed) o WHERE a.outcome='show' $$;
CREATE FUNCTION clinic_pack_economics() RETURNS TABLE(shows_delivered bigint) LANGUAGE sql AS $$ SELECT count(*)::bigint AS shows_delivered FROM clinic_show_slots s $$;
GRANT SELECT,INSERT,UPDATE ON clinic_appointments TO authenticated;
`);
await db.exec(migration);
await db.exec(migration); // safe replay
await db.exec(`UPDATE clinic_trials SET booking_opens=(now() AT TIME ZONE 'Australia/Sydney')::date-2,appointment_start=(now() AT TIME ZONE 'Australia/Sydney')::date+1,appointment_end=(now() AT TIME ZONE 'Australia/Sydney')::date+8;`);
const day = (await db.query("select ((now() AT TIME ZONE 'Australia/Sydney')::date+1)::text d")).rows[0].d;
const insert = async (date=day, free=false) => (await db.query("insert into clinic_appointments(clinic_id,appointment_date,is_free_trial) values($1,$2,$3) returning id,is_free_trial",[clinic,date,free])).rows[0];
const trial = await insert(); assert.equal(trial.is_free_trial,true);
await assert.rejects(insert("2099-01-01"),/not accepting/);
await db.query("update clinic_appointments set is_free_trial=false,appointment_date='2099-01-01',outcome='show' where id=$1",[trial.id]);
assert.equal((await db.query("select is_free_trial from clinic_appointments where id=$1",[trial.id])).rows[0].is_free_trial,true);
await db.exec("set role authenticated; select set_config('fixture.role','rep',false)");
assert.equal((await db.query("select * from clinic_trials")).rows.length,0);
await assert.rejects(db.query("select start_clinic_paid_pack($1)",[clinic]),/Admin access/);
assert.equal((await db.query("update clinic_trials set paid_started_at=now() returning clinic_id")).rows.length,0);
await db.query("select set_config('fixture.clinic',$1,false)",[clinic]);
assert.equal((await db.query("select * from clinic_trials")).rows.length,1);
assert.equal((await db.query("update clinic_trials set paid_started_at=now() returning clinic_id")).rows.length,0);
await db.exec("reset role; select set_config('fixture.role','admin',false)");
await assert.rejects(db.query("select start_clinic_paid_pack($1)",[clinic]),/Add the paid pack/);
await db.query("insert into clinic_packs(clinic_id,pack_type,pack_size,amount_paid_ex_gst) values($1,'paid',10,8000)",[clinic]);
assert.equal((await insert()).is_free_trial,true); // adding a pack is not activation
await db.query("select start_clinic_paid_pack($1)",[clinic]);
const paid=await insert("2099-01-02",true); assert.equal(paid.is_free_trial,false); // cannot forge free status
await db.query("update clinic_appointments set outcome='show' where id=$1",[paid.id]);
const slots=(await db.query("select * from clinic_show_slots order by is_free")).rows;
assert.equal(slots[0].show_no,1); assert.equal(slots[0].pack_type,'paid'); assert.equal(slots[1].is_free,true);
const rate=(await db.query("select * from clinic_effective_rate")).rows[0];
assert.equal(rate.shows_delivered,1); assert.equal(Number(rate.effective_rate),800);
assert.equal(Number((await db.query("select revenue_by_key(null,null,null) r")).rows[0].r),800);
assert.equal(Number((await db.query("select money_monthly(null,null,null) r")).rows[0].r),800);
assert.equal((await db.query("select * from clinic_pack_economics()")).rows[0].shows_delivered,1);
// Expired trials reject new bookings; an extension opens them again.
await db.exec("update clinic_trials set paid_started_at=null,booking_opens=current_date-10,appointment_start=current_date-9,appointment_end=current_date-1");
await assert.rejects(insert(),/not accepting/);
await db.exec("update clinic_trials set appointment_end=current_date+20");
assert.equal((await insert()).is_free_trial,true);
await db.close();
console.log("Trial DB verified: RLS, date guards, immutable classification, manual paid activation, expiry/extension, and zero trial revenue/credit usage.");
