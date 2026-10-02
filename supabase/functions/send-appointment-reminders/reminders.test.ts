import { test, expect } from "bun:test";
import { appointmentReminderSms, bookingConfirmationSms, PATIENT_SMS_FROM } from "../_shared/patient-sms";
import { processReminders, reminderCopy, daysUntilSydney, formatAUPhone, type Reminder, type Dependencies } from "./reminders";
const now = new Date("2026-10-03T02:00:00Z");
function fixture(): Reminder {
  return { id: "r1", appointment_id: "a1", status: "confirmed", updated_at: "2026-10-01T00:00:00Z", booking_date: "2026-10-06", booking_time: "10:30:00", patient_first_name: "Peter", patient_phone: "0400 000 000", lead_id: "l1", three_day_sms_sent: false, twentyfour_hour_sms_sent: false, three_day_sms_claim: null, twentyfour_hour_sms_claim: null,
    appointment: { id: "a1", appointment_date: "2026-10-06", appointment_time: "10:30", doctor_id: "jai", outcome: null, disqualified_at: null,
      clinic: { clinic_name: "Boss Clinic", address: "3/28 Hood St Subiaco WA 6008", city: "Perth", state: "WA", phone: "(08) 9388 2884", team: [
        { id: "jai", name: "Dr Jai", is_active: true, conducts_consultations: false },
        { id: "debra", name: "Debra Best — Hair Regrowth Specialist", is_active: true, conducts_consultations: true },
      ] } } };
}
function effects() {
  const calls: string[] = []; const messages: string[] = [];
  const deps: Dependencies = {
    claim: async () => { calls.push("claim"); return true; },
    send: async (phone, text) => { calls.push("send:" + phone); messages.push(text); return { ok: true, sid: "SMfixture", status: "queued" }; },
    finish: async () => { calls.push("finish"); },
    log: async () => { calls.push("log"); },
  };
  return { calls, messages, deps };
}
test("Boss 3-day text uses Debra, full Boss details and no surgeon/title/HTG", () => {
  expect(reminderCopy(fixture(), "3day")).toBe("Hi Peter, this is a reminder that your hair transplant consultation is scheduled for Tuesday 6 October at 10:30 AM with Debra Best at Boss Clinic. Address: 3/28 Hood St Subiaco WA 6008. If you need to reschedule, call Boss Clinic on (08) 9388 2884.");
});
test("day-before text has tomorrow, date, provider and every clinic detail", () => {
  expect(reminderCopy(fixture(), "24h")).toBe("Hi Peter, this is a reminder that your hair transplant consultation is scheduled for tomorrow (Tuesday 6 October) at 10:30 AM with Debra Best at Boss Clinic. Address: 3/28 Hood St Subiaco WA 6008. If you need to reschedule, call Boss Clinic on (08) 9388 2884.");
});
test("Nitai falls back to consulting doctor and uses only Nitai contact details", () => {
  const r = fixture(); r.appointment!.doctor_id = "shobhna";
  r.appointment!.clinic = { clinic_name: "Nitai Medical & Cosmetic Centre", address: "64 Lincoln Rd", city: "Essendon", state: "VIC", phone: "(03) 9300 1244", team: [{id:"shobhna",name:"Dr. Shobhna Singh",is_active:true,conducts_consultations:true}] };
  for (const kind of ["3day", "24h"] as const) {
    const text = reminderCopy(r,kind);
    expect(text).toContain("with Dr. Shobhna Singh at Nitai Medical & Cosmetic Centre.");
    expect(text).toContain("Address: 64 Lincoln Rd, Essendon, VIC.");
    expect(text).toContain("call Nitai Medical & Cosmetic Centre on (03) 9300 1244.");
    expect(text).not.toMatch(/Boss|Debra|Dr Dr|Hair Transplant Group/);
  }
});
test("all three formats prefer consultant to doctor without adding Dr", () => {
  const details = { firstName:"A",date:"Tuesday",time:"10:00 AM",consultantName:"Debra Best",doctorName:"Dr Jai",clinicName:"Boss Clinic",clinicAddress:"Address",clinicPhone:"123" };
  for (const text of [bookingConfirmationSms(details),appointmentReminderSms(details,"3day"),appointmentReminderSms(details,"24h")]) {
    expect(text).toContain("with Debra Best at Boss Clinic"); expect(text).not.toContain("Dr Jai");
  }
  expect(PATIENT_SMS_FROM).toBe("+61468031075");
});
test("dry run shows both kinds, masks patient and has zero send/write effects", async () => {
  const { deps,calls } = effects(); const result = await processReminders([fixture()],now,true,deps);
  expect(result.length).toBe(2); expect(calls).toEqual([]);
  for (const r of result) { expect(r.from).toBe(PATIENT_SMS_FROM); expect(r.body).toContain("Hi [name],"); expect(JSON.stringify(r)).not.toMatch(/0400|Peter/); }
});
test("only due kind is claimed/sent/logged/marked", async () => {
  const { deps,calls } = effects(); await processReminders([fixture()],now,false,deps);
  expect(calls).toEqual(["claim","send:+61400000000","log","finish"]);
});
test("day-before schedule sends day-before text", async () => {
  const { deps,messages } = effects(); await processReminders([fixture()],new Date("2026-10-05T02:00:00Z"),false,deps);
  expect(messages.length).toBe(1); expect(messages[0]).toContain("tomorrow (Tuesday 6 October)");
});
test("sent, cancelled, claimed, non-due and past rows never send", async () => {
  for (const variant of [ {three_day_sms_sent:true},{status:"cancelled"},{three_day_sms_claim:"token"},{booking_date:"2026-10-05"},{booking_date:"2026-09-01"} ]) {
    const {deps,calls} = effects(); await processReminders([{...fixture(),...variant}],now,false,deps); expect(calls).toEqual([]);
  }
});
test("invalid/unlinked/completed/ambiguous/missing-contact rows fail before claiming", async () => {
  const variants = [fixture(),fixture(),fixture(),fixture(),fixture(),fixture()];
  variants[0].appointment = null; variants[1].appointment!.outcome = "noshow";
  variants[2].appointment!.appointment_date = "2026-10-07";
  variants[3].appointment!.clinic!.phone = null;
  variants[4].appointment!.clinic!.team.push({id:"other",name:"Other",is_active:true,conducts_consultations:true});
  variants[5].patient_phone = "bad";
  for (const row of variants) {const {deps,calls} = effects(); const result=await processReminders([row],now,false,deps); expect(result[0].error).toBeTruthy(); expect(calls).toEqual([]);}
});
test("explicit booked provider is preserved when a clinic has multiple consultants", () => {
  const r=fixture();r.appointment!.doctor_id="debra";r.appointment!.clinic!.team.push({id:"other",name:"Other",is_active:true,conducts_consultations:true});
  expect(reminderCopy(r,"3day")).toContain("with Debra Best");
});
test("losing atomic claim means no send",async()=> {const {deps,calls}=effects();deps.claim=async()=>false;await processReminders([fixture()],now,false,deps);expect(calls).toEqual([]);});
test("definite Twilio rejection is finished but never logged as sent",async()=>{const {deps,calls}=effects();deps.send=async()=>({ok:false,error:"Invalid destination"});const result=await processReminders([fixture()],now,false,deps);expect(result[0].error).toBe("Invalid destination");expect(calls).toEqual(["claim","finish"]);});
test("uncertain network result retains claim and reports error without marking sent",async()=>{const {deps,calls}=effects();deps.send=async()=>{throw new Error("timeout")};const result=await processReminders([fixture()],now,false,deps);expect(result[0].error).toBe("timeout");expect(calls).toEqual(["claim"]);});
test("Sydney calendar days remain correct across midnight and DST start/end",()=>{
  expect(daysUntilSydney("2026-10-06",new Date("2026-10-03T13:59:00Z"))).toBe(3);
  expect(daysUntilSydney("2026-10-06",new Date("2026-10-03T14:01:00Z"))).toBe(2);
  expect(daysUntilSydney("2026-10-06",new Date("2026-10-04T13:01:00Z"))).toBe(1);
  expect(daysUntilSydney("2026-04-06",new Date("2026-04-04T13:01:00Z"))).toBe(1);
});
test("phone normalization and 12-hour boundaries",()=>{
  expect(formatAUPhone("0468 031 075")).toBe(PATIENT_SMS_FROM);expect(formatAUPhone("61468031075")).toBe(PATIENT_SMS_FROM);expect(formatAUPhone("123")).toBeNull();
  for(const [time,label] of [["00:00","12:00 AM"],["12:00","12:00 PM"],["15:45","3:45 PM"]]){const r=fixture();r.booking_time=time;r.appointment!.appointment_time=time;expect(reminderCopy(r,"3day")).toContain(`at ${label}`);}
});
