// Real PostgreSQL functions in an isolated in-memory database; no provider calls.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const sql = (file) => readFileSync(new URL("../supabase/migrations/" + file, import.meta.url), "utf8");
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE partner_clinics(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_name text,state text,city text);
CREATE TABLE clinic_appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid REFERENCES partner_clinics(id),appointment_date date,appointment_time text,patient_phone text,outcome text,disqualified_at timestamptz);
CREATE TABLE appointment_reminders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),appointment_id uuid REFERENCES clinic_appointments(id),booking_date date,booking_time time,patient_phone text,status text DEFAULT 'confirmed',updated_at timestamptz DEFAULT now(),schedule_changed_at timestamptz DEFAULT now()-interval '2 days',three_day_sms_sent boolean DEFAULT false,twentyfour_hour_sms_sent boolean DEFAULT false,three_day_sms_sent_at timestamptz,twentyfour_hour_sms_sent_at timestamptz,three_day_sms_claim uuid,twentyfour_hour_sms_claim uuid);
CREATE TABLE sms_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),direction text,to_number text,from_number text,body text,twilio_message_sid text UNIQUE,status text,sent_at timestamptz,created_at timestamptz DEFAULT now());
CREATE FUNCTION has_sales_role(text[]) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION booking_sales_actor() RETURNS TABLE(id uuid,role text) LANGUAGE sql AS $$ SELECT gen_random_uuid(),'admin'::text $$;
CREATE FUNCTION can_manage_booking(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
INSERT INTO partner_clinics(clinic_name,state,city) VALUES('Boss Clinic','WA','Perth');
`);
await db.exec(sql("20261023010000_clinic_reminder_confirmation.sql"));
await db.exec(sql("20261120050000_sydney_confirmation_call_alerts.sql"));
const migration = sql("20261123010000_confirmation_reply_sender_matching.sql");
const rows = async (query, args = []) => (await db.query(query, args)).rows;
const one = async (query, args = []) => (await rows(query,args))[0];
const value = async (query, args = []) => Object.values(await one(query,args))[0];
const oldSender = "+61468031075", replacement = "+61480887591", thirdSender = "+61480000002";
let serial = 0;
const at = (minutes) => new Date(Date.now()-minutes*60000).toISOString();
const make = async (phone = "+61400" + String(++serial).padStart(6,"0")) => {
 const a = await value("insert into clinic_appointments(clinic_id,appointment_date,appointment_time,patient_phone) select id,current_date+7,'09:00',$1 from partner_clinics limit 1 returning id",[phone]);
 return one("insert into appointment_reminders(appointment_id,booking_date,booking_time,patient_phone) select id,appointment_date,appointment_time::time,patient_phone from clinic_appointments where id=$1 returning *",[a]);
};
const reload = (r) => one("select * from appointment_reminders where id=$1",[r.id]);
const send = async (r, {sender = replacement, kind = "request", minutes = 120, sid = "OUT-" + crypto.randomUUID(), log = true} = {}) => {
 const time = at(minutes);
 await db.query("insert into appointment_reminder_deliveries(reminder_id,revision,kind,body,destination,status,provider_id,created_at) values($1,$2,$3,'Reply YES',$4,'delivered',$5,$6)",[r.id,r.confirmation_revision,kind,r.patient_phone,sid,time]);
 if(log) await db.query("insert into sms_messages(direction,from_number,to_number,body,twilio_message_sid,status,sent_at,created_at) values('outbound',$1,$2,'Reply YES',$3,'delivered',$4,$4)",[sender,r.patient_phone,sid,time]);
 await db.query("update appointment_reminders set confirmation_state='awaiting_reply',confirmation_requested_at=coalesce(confirmation_requested_at,$2),confirmation_followup_at=case when $3='followup' then $2 else confirmation_followup_at end where id=$1",[r.id,time,kind]);
 return sid;
};
const incoming = async (r, {to = replacement, body = "YES", minutes = 100, sid = "IN-" + crypto.randomUUID()} = {}) => {
 await db.query("insert into sms_messages(direction,from_number,to_number,body,twilio_message_sid,status,created_at) values('inbound',$1,$2,$3,$4,'received',$5)",[r.patient_phone,to,body,sid,at(minutes)]);
 return {sid,from:r.patient_phone,to,body};
};
const consume = (m) => value("select consume_appointment_confirmation_reply($1,$2,$3,$4,null)",[m.sid,m.from,m.to,m.body]);
const claim = (r,kind = "followup") => value("select claim_confirmation_delivery(r.id,r.confirmation_revision,$2,s.updated_at,'fixture',r.patient_phone) from appointment_reminders r join clinic_appointments a on a.id=r.appointment_id join clinic_reminder_settings s on s.clinic_id=a.clinic_id where r.id=$1",[r.id,kind]);
const recover = () => value("select reconcile_appointment_confirmation_replies(500)");

// Reproduce production: both YES messages are stored, but the old fixed-number
// gate ignores them and still allows the follow-up to be claimed.
const jordan = await make();
await send(jordan,{minutes:300});
const firstYes = await incoming(jordan,{minutes:297});
assert.equal((await consume(firstYes)).matched,false);
assert.equal((await reload(jordan)).confirmation_state,"awaiting_reply");
await send(jordan,{kind:"followup",minutes:60});
const secondYes = await incoming(jordan,{minutes:40});
assert.equal((await consume(secondYes)).matched,false);
await db.query("update appointment_reminders set confirmation_state='needs_call',confirmation_reason='no_reply',confirmation_email_at=now() where id=$1",[jordan.id]);

await db.exec(migration);
await db.exec(migration); // migration replay preserves state and privileges
assert.equal(await claim(jordan,"call_email"),null);
const recovered = await recover();
assert.equal(recovered.processed,2);
assert.equal((await reload(jordan)).confirmation_state,"confirmed");
assert.equal((await reload(jordan)).confirmation_method,"sms");
assert.equal((await reload(jordan)).confirmation_reason,null);
assert.equal((await reload(jordan)).confirmation_confirmed_at.toISOString(),(await one("select created_at from sms_messages where twilio_message_sid=$1",[firstYes.sid])).created_at.toISOString());
assert.equal((await consume(secondYes)).duplicate,true);
assert.equal((await recover()).processed,0);
assert.equal(await claim(jordan),null);

for(const sender of [oldSender,replacement,thirdSender]) {
 const r = await make(); await send(r,{sender});
 const m = await incoming(r,{to:sender,body:" yes! "});
 assert.equal((await consume(m)).confirmed,true,"Any actual sender can receive the confirmation");
 assert.equal(await claim(r),null); assert.equal(await claim(r,"call_email"),null);
}
// Rotation between request and follow-up; reply to the first sender still matches
// the same revision. No lookup of today's pool or retirement status is involved.
const rotated = await make();
await send(rotated,{sender:replacement,minutes:180});
await send(rotated,{sender:thirdSender,kind:"followup",minutes:60});
assert.equal((await consume(await incoming(rotated,{to:replacement,minutes:30}))).confirmed,true);

// A reply to an unrelated sender cannot confirm, nor can a forged RPC without
// the actual stored inbound message. Unmatched attempts do not consume receipts.
const wrong = await make(); await send(wrong);
const wrongReply = await incoming(wrong,{to:thirdSender});
assert.equal((await consume(wrongReply)).matched,false);
assert.equal(await value("select count(*)::int from appointment_reply_receipts where provider_id=$1",[wrongReply.sid]),0);
assert.equal((await consume({...wrongReply,sid:"missing",to:replacement})).matched,false);
assert.equal((await reload(wrong)).confirmation_state,"awaiting_reply");

// Saving the inbox message is enough to block chasing even when the webhook
// crashes before calling the processor. The worker later repairs the state.
const interrupted = await make(); await send(interrupted);
await incoming(interrupted);
assert.equal(await claim(interrupted),null,"Inbox guard stops a second request before reconciliation");
assert.equal((await reload(interrupted)).confirmation_state,"awaiting_reply");
await recover(); assert.equal((await reload(interrupted)).confirmation_state,"confirmed");

// At 4:30 Sydney, bypass just the clock predicate to prove the atomic inbox
// guard blocks an otherwise eligible call email under the real claim function.
const email = await make(); await send(email); await send(email,{kind:"followup",minutes:60});
await incoming(email,{minutes:40,body:"Can I change the time?"});
await db.exec("CREATE OR REPLACE FUNCTION confirmation_call_alert_due(r appointment_reminders,s clinic_reminder_settings,p_now timestamptz) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$");
assert.equal(await claim(email,"call_email"),null);
await recover(); assert.equal((await reload(email)).confirmation_reason,"patient_reply");
assert.equal((await reload(email)).confirmation_state,"needs_call");

// Shared phones and an unrelated later outgoing message still need human review.
const sharedA = await make(), sharedB = await make(sharedA.patient_phone);
await send(sharedA,{minutes:180}); await send(sharedB,{minutes:120});
assert.equal((await consume(await incoming(sharedA))).ambiguous,true);
assert.equal((await reload(sharedA)).confirmation_state,"needs_call");
assert.equal((await reload(sharedB)).confirmation_state,"needs_call");
const unrelated = await make(); await send(unrelated);
await db.query("insert into sms_messages(direction,from_number,to_number,body,twilio_message_sid,created_at) values('outbound',$1,$2,'Another question','OTHER',$3)",[replacement,unrelated.patient_phone,at(110)]);
assert.equal((await consume(await incoming(unrelated))).confirmed,false);
assert.equal((await reload(unrelated)).confirmation_reason,"patient_reply");

// Recovery evaluates the history at receive time: a subsequent unrelated text
// must not change what an earlier YES answered.
const historical = await make(); await send(historical);
await incoming(historical);
await db.query("insert into sms_messages(direction,from_number,to_number,body,twilio_message_sid,created_at) values('outbound',$1,$2,'Later text','LATER',$3)",[replacement,historical.patient_phone,at(90)]);
await recover(); assert.equal((await reload(historical)).confirmation_state,"confirmed");

// Reschedules, completed/cancelled bookings and later staff/reply decisions are
// never overwritten by a historical confirmation.
const changed = await make(); await send(changed); const changedReply = await incoming(changed);
await db.query("update clinic_appointments set appointment_time='10:00' where id=$1",[changed.appointment_id]);
assert.equal((await consume(changedReply)).matched,false);
assert.equal((await reload(changed)).confirmation_state,"not_requested");
for(const state of ["completed","cancelled","off"]) {
 const r=await make(); await send(r); const m=await incoming(r);
 if(state==="completed") await db.query("update clinic_appointments set outcome='showed' where id=$1",[r.appointment_id]);
 if(state==="cancelled") await db.query("update appointment_reminders set status='cancelled' where id=$1",[r.id]);
 if(state==="off") await db.exec("update clinic_reminder_settings set mode='off'");
 assert.equal((await consume(m)).matched,false,state);
 if(state==="off") await db.exec("update clinic_reminder_settings set mode='confirmation'");
}
const newer = await make(); await send(newer);
const oldYes = await incoming(newer,{minutes:100});
await consume(await incoming(newer,{minutes:90,body:"NO, please change it"}));
await consume(oldYes); assert.equal((await reload(newer)).confirmation_last_reply,"NO, please change it");
assert.equal((await reload(newer)).confirmation_state,"needs_call");
const called = await make(); await send(called); const beforeCall = await incoming(called);
await db.query("update appointment_reminders set confirmation_state='confirmed',confirmation_method='phone',confirmation_last_call_at=now() where id=$1",[called.id]);
await consume(beforeCall); assert.equal((await reload(called)).confirmation_method,"phone");

// Provider response/logging can arrive after the inbound message; retrying a
// previously unmatched reply then succeeds without sending another patient text.
const fast = await make(); const fastSid=await send(fast,{log:false});
const fastReply=await incoming(fast); assert.equal((await consume(fastReply)).matched,false);
await db.query("insert into sms_messages(direction,from_number,to_number,body,twilio_message_sid,sent_at) values('outbound',$1,$2,'Reply YES',$3,now())",[replacement,fast.patient_phone,fastSid]);
await recover(); assert.equal((await reload(fast)).confirmation_state,"confirmed");

// An older missed STOP cannot undo a newer processed START during recovery.
const optOrder = await make(); await send(optOrder);
const oldStop = await incoming(optOrder,{body:"STOP",minutes:100});
await consume(await incoming(optOrder,{body:"START",minutes:90}));
assert.equal((await consume(oldStop)).stale,true);
assert.equal(await value("select count(*)::int from patient_sms_opt_outs where phone=$1",[optOrder.patient_phone]),0);

// Opt-outs continue across replacement senders; START never confirms a booking.
const opted = await make(); await send(opted);
await consume(await incoming(opted,{body:"STOP"}));
assert.equal(await value("select count(*)::int from patient_sms_opt_outs where phone=$1",[opted.patient_phone]),1);
assert.equal((await reload(opted)).status,"confirmed");
await consume(await incoming(opted,{body:"START",minutes:90}));
assert.equal(await value("select count(*)::int from patient_sms_opt_outs where phone=$1",[opted.patient_phone]),0);
assert.notEqual((await reload(opted)).confirmation_state,"confirmed");

for(const role of ["anon","authenticated"]) for(const signature of [
 "consume_appointment_confirmation_reply(text,text,text,text,text)",
 "reconcile_appointment_confirmation_replies(integer)",
 "confirmation_reply_matches(appointment_reminders,text,text,timestamptz)",
 "claim_confirmation_delivery(uuid,uuid,text,timestamptz,text,text)",
]) assert.equal(await value("select has_function_privilege($1,$2,'EXECUTE')",[role,signature]),false,role+" must not execute "+signature);
assert.equal(await value("select has_function_privilege('service_role','reconcile_appointment_confirmation_replies(integer)','EXECUTE')"),true);
await assert.rejects(db.query("select reconcile_appointment_confirmation_replies(0)"),/limit/);
await assert.rejects(db.query("select reconcile_appointment_confirmation_replies(1001)"),/limit/);
await db.close();
console.log("PASS: reproduced replacement-number failure; recovered both YES replies; old/new/rotated sender matching; inbox chase guard; retry and replay safety; shared phones; unrelated conversations; timestamps; reschedules; opt-outs; privileges.");
