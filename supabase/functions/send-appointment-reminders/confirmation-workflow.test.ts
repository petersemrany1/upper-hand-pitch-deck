import { expect, test } from "bun:test";
import { confirmationDay, confirmationCallAlertDue, localClock, nextReminderAction, type ReminderSettings } from "../_shared/appointment-confirmation.ts";
import { processConfirmationWorkflow, workflowSms, type ConfirmationBooking, type WorkflowDependencies } from "./confirmation-workflow.ts";
import { sendConfirmationEmail } from "./email.ts";

const settings: ReminderSettings = { clinic_id: "clinic", mode: "confirmation", timezone: "Australia/Perth", normal_send_time: "13:00", alert_email: "fixture@example.test", call_days: [1,2,3,4,5], closed_dates: [], updated_at: "v1" };
function booking(patch: Partial<ConfirmationBooking> = {}): ConfirmationBooking {
  return { id:"reminder", appointment_id:"appointment", status:"confirmed",updated_at:"2026-10-20T00:00:00Z",booking_date:"2026-10-23",booking_time:"10:30",patient_first_name:"Fixture",patient_phone:"0400000000",lead_id:null,
    three_day_sms_sent:true,twentyfour_hour_sms_sent:false,three_day_sms_claim:null,twentyfour_hour_sms_claim:null,
    confirmation_revision:"revision",confirmation_state:"not_requested",confirmation_requested_at:null,confirmation_followup_at:null,confirmation_email_at:null,confirmation_ack_at:null,confirmation_confirmed_at:null,confirmation_method:null,confirmation_reason:null,confirmation_last_reply:null,confirmation_last_reply_at:null,confirmation_call_result:null,confirmation_last_call_at:null,schedule_changed_at:"2026-10-01T00:00:00Z",
    appointment:{id:"appointment",appointment_date:"2026-10-23",appointment_time:"10:30",doctor_id:"consultant",outcome:null,disqualified_at:null,clinic:{clinic_name:"Fixture Clinic",address:"1 Example St, Perth WA 6000",city:"Perth",state:"WA",phone:"0899999999",team:[{id:"consultant",name:"Consultant",is_active:true,conducts_consultations:true}]}},...patch };
}
const at = (time: string) => new Date(`2026-10-22T${time}:00+08:00`);
test("Perth 9am request, 1pm second request, 4:30pm Sydney alert", () => {
  const row = booking();
  expect(nextReminderAction(row, settings, at("08:59"))).toBeNull();
  expect(nextReminderAction(row, settings, at("09:00"))).toBe("request");
  row.confirmation_requested_at=at("09:00").toISOString();row.confirmation_state="awaiting_reply";
  expect(nextReminderAction(row, settings, at("12:59"))).toBeNull();
  expect(nextReminderAction(row, settings, at("13:00"))).toBe("followup");
  row.confirmation_followup_at=at("13:00").toISOString();
  expect(nextReminderAction(row, settings, at("13:29"))).toBeNull();
  expect(nextReminderAction(row, settings, at("13:30"))).toBe("call_email");
  expect(nextReminderAction(row, settings, at("15:00"))).toBeNull();
});
test("Sydney alert time follows daylight saving independently of the clinic", () => {
  for (const [day, offset] of [["2026-01-22", "+11:00"], ["2026-07-23", "+10:00"]]) {
    for (const timezone of ["Australia/Perth", "Australia/Melbourne", "Australia/Sydney"]) {
      const now = new Date(`${day}T16:30:00${offset}`);
      const row = booking({ confirmation_state: "awaiting_reply", confirmation_requested_at: new Date(now.getTime() - 4 * 3600000).toISOString(), confirmation_followup_at: new Date(now.getTime() - 1800000).toISOString() });
      expect(confirmationCallAlertDue(row, { ...settings, timezone }, now)).toBe(true);
      expect(confirmationCallAlertDue(row, { ...settings, timezone }, new Date(now.getTime() - 60000))).toBe(false);
      expect(confirmationCallAlertDue(row, { ...settings, timezone }, new Date(now.getTime() + 30 * 60000))).toBe(false);
    }
  }
});

test("only unanswered second texts are alerted; replies, calls, failures and closures suppress them", () => {
  const row = booking({ confirmation_state: "awaiting_reply", confirmation_requested_at: at("09:00").toISOString(), confirmation_followup_at: at("13:00").toISOString() });
  for (const patch of [
    { confirmation_requested_at: null }, { confirmation_followup_at: null },
    { confirmation_followup_at: at("13:05").toISOString() },
    { confirmation_last_reply_at: at("13:15").toISOString() },
    { confirmation_last_call_at: at("13:15").toISOString() },
    { confirmation_email_at: at("13:30").toISOString() },
    { confirmation_state: "confirmed" as const },
    { confirmation_state: "needs_call" as const, confirmation_reason: "patient_reply" },
    { confirmation_state: "needs_call" as const, confirmation_reason: "delivery_failed" },
    { confirmation_state: "needs_call" as const, confirmation_reason: "opt_out" },
  ]) expect(confirmationCallAlertDue({ ...row, ...patch }, settings, at("13:30"))).toBe(false);
  expect(confirmationCallAlertDue(row, { ...settings, closed_dates: ["2026-10-22"] }, at("13:30"))).toBe(false);
  expect(confirmationCallAlertDue(row, { ...settings, call_days: [1] }, at("13:30"))).toBe(false);
  expect(confirmationCallAlertDue(row, { ...settings, mode: "off" }, at("13:30"))).toBe(false);
  expect(confirmationCallAlertDue({ ...row, confirmation_state: "needs_call", confirmation_reason: "no_reply" }, settings, at("13:35"))).toBe(true);
  expect(nextReminderAction({ ...row, status: "cancelled" }, settings, at("13:30"))).toBeNull();
  expect(nextReminderAction({ ...row, booking_date: "2026-10-22", booking_time: "12:00" }, settings, at("13:30"))).toBeNull();
});

test("an SMS or phone confirmation stops all confirmation messages and the call alert", async () => {
  for (const method of ["sms", "phone"] as const) {
    const row = booking({ confirmation_state: "confirmed", confirmation_method: method, confirmation_requested_at: at("09:00").toISOString() });
    const { deps, calls } = effects();
    for (const time of ["09:05", "13:00", "15:00", "20:00"]) {
      await processConfirmationWorkflow([row], new Map([[row.id, settings]]), at(time), false, deps, "https://example.test");
    }
    expect(calls).toEqual([]);
  }
});
test("all three modes: Off sends nothing; Nitai sends ordinary reminders only", () => {
  for (const time of ["09:00","13:00","15:00"]) expect(nextReminderAction(booking(),{...settings,mode:"off"},at(time))).toBeNull();
  const nitai={...settings,mode:"reminders" as const,timezone:"Australia/Melbourne",normal_send_time:"16:00"};
  expect(nextReminderAction(booking(),nitai,new Date("2026-10-22T15:59:00+11:00"))).toBeNull();
  expect(nextReminderAction(booking(),nitai,new Date("2026-10-22T16:00:00+11:00"))).toBe("24h");
  expect(nextReminderAction(booking({twentyfour_hour_sms_sent:true}),nitai,at("15:00"))).toBeNull();
});
test("clinic calendars cross UTC midnight and DST independently", () => {
  const utc = new Date("2026-10-21T22:00:00Z");
  expect(localClock(utc,"Australia/Melbourne")).toEqual({date:"2026-10-22",minute:540});
  expect(localClock(utc,"Australia/Perth")).toEqual({date:"2026-10-22",minute:360});
  expect(nextReminderAction(booking(),{...settings,timezone:"Australia/Melbourne"},utc)).toBe("request");
  expect(nextReminderAction(booking(),settings,utc)).toBeNull();
  expect(localClock(new Date("2026-04-04T23:00:00Z"),"Australia/Melbourne").minute).toBe(540);
  expect(localClock(new Date("2026-10-03T22:00:00Z"),"Australia/Melbourne").minute).toBe(540);
});
test("Monday confirmation moves to Friday; holidays move it to the previous staffed day", () => {
  expect(confirmationDay("2026-10-26",settings)).toBe("2026-10-23");
  expect(confirmationDay("2026-10-26",{...settings,closed_dates:["2026-10-23"]})).toBe("2026-10-22");
  const row=booking({booking_date:"2026-10-26",three_day_sms_sent:false});
  expect(nextReminderAction(row,settings,new Date("2026-10-23T09:00:00+08:00"))).toBe("request");
  row.confirmation_state="confirmed";row.confirmation_method="phone";
  expect(nextReminderAction(row,settings,new Date("2026-10-25T09:00:00+08:00"))).toBe("24h");
  row.confirmation_state="needs_call";row.confirmation_email_at="2026-10-23T07:00:00Z";
  expect(nextReminderAction(row,settings,new Date("2026-10-25T09:00:00+08:00"))).toBe("24h");
});
test("late bookings and scheduler recovery do not send a burst or shorten reply windows", () => {
  const row=booking({schedule_changed_at:at("12:55").toISOString()});
  expect(nextReminderAction(row,settings,at("13:00"))).toBeNull();
  expect(nextReminderAction(row,settings,at("13:05"))).toBe("request");
  row.confirmation_requested_at=at("13:05").toISOString();row.confirmation_state="awaiting_reply";
  expect(nextReminderAction(row,settings,at("15:00"))).toBeNull();
  expect(nextReminderAction(row,settings,at("15:05"))).toBeNull();
  expect(nextReminderAction(booking(),settings,at("16:00"))).toBeNull();
});
test("cancelled/past appointments never send; patient questions stay outside the no-reply alert", () => {
  expect(nextReminderAction(booking({status:"cancelled"}),settings,at("09:00"))).toBeNull();
  expect(nextReminderAction(booking(),settings,new Date("2026-10-23T10:30:00+08:00"))).toBeNull();
  expect(nextReminderAction(booking({confirmation_state:"needs_call",confirmation_reason:"patient_reply"}),settings,at("10:00"))).toBeNull();
});
function effects() {
  const calls:string[]=[];
  const deps:WorkflowDependencies={claim:async()=>{calls.push("claim");return "delivery";},finish:async(_id,status)=>{calls.push(status);},sms:async()=>{calls.push("sms");return {ok:true,sid:"SMfixture"};},email:async()=>{calls.push("email");return {ok:true,sid:"email-fixture"};},log:async()=>{calls.push("log");}};
  return {deps,calls};
}
test("dry run is read-only and anonymises SMS previews",async()=>{
  const {deps,calls}=effects();const rows=await processConfirmationWorkflow([booking()],new Map([["reminder",settings]]),at("09:00"),true,deps,"https://example.test");
  expect(calls).toEqual([]);expect(rows[0].body).toContain("Hi [name]");expect(rows[0].body).not.toContain("Hi Fixture");
});
test("claim loss sends nothing; provider uncertainty is never retried blindly",async()=>{
  const {deps,calls}=effects();deps.claim=async()=>null;
  await processConfirmationWorkflow([booking()],new Map([["reminder",settings]]),at("09:00"),false,deps,"https://example.test");expect(calls).toEqual([]);
  deps.claim=async()=>"delivery";deps.sms=async()=>{throw new Error("timeout");};
  await processConfirmationWorkflow([booking()],new Map([["reminder",settings]]),at("09:00"),false,deps,"https://example.test");expect(calls).toEqual(["unknown"]);
});
test("staff-day requests use the actual date, not tomorrow; copy has a clear YES action",()=>{
  expect(workflowSms(booking(),"request")).toContain("Friday 23 October");
  expect(workflowSms(booking(),"request")).not.toContain("tomorrow");
  for (const kind of ["request", "followup"] as const) {
    const text = workflowSms(booking(), kind);
    expect(text).toContain("If you need to reschedule, call 0899999999 at least 24 hours before your appointment to keep your deposit.");
    expect(text).toEndWith("Please reply YES to confirm you'll attend.");
    expect(text).not.toMatch(/\bCHANGE\b|Hair Transplant Group/);
  }
  expect(workflowSms(booking(),"followup")).toContain("we haven't heard back");
});
test("missing provider details produce a visible failure, not an untracked skipped confirmation",async()=>{
  const {deps,calls}=effects();const row=booking();row.appointment!.clinic!.team=[];
  await processConfirmationWorkflow([row],new Map([["reminder",settings]]),at("09:00"),false,deps,"https://example.test");
  expect(calls).toEqual(["claim","failed"]);
});
test("an inbox logging failure cannot change an already accepted send into an uncertain send",async()=>{
  const {deps,calls}=effects();deps.log=async()=>{throw new Error("logging unavailable");};
  const result=await processConfirmationWorkflow([booking()],new Map([["reminder",settings]]),at("09:00"),false,deps,"https://example.test");
  expect(calls).toEqual(["claim","sms","accepted"]);expect(result.some(r=>r.warning)).toBe(true);
});
test("email transport has a stable idempotency key and distinguishes rejection from uncertainty",async()=>{
  const transport=(async(_url:unknown,init:RequestInit)=>{
    expect((init.headers as Record<string,string>)["Idempotency-Key"]).toBe("appointment-confirmation/delivery");
    expect(JSON.parse(init.body as string).to).toEqual(["fixture@example.test"]);
    return new Response(JSON.stringify({id:"message"}),{status:200});
  }) as unknown as typeof fetch;
  expect((await sendConfirmationEmail("fixture@example.test","subject","html","delivery",{apiKey:"fixture"},transport)).ok).toBe(true);
  expect((await sendConfirmationEmail("fixture@example.test","subject","html","delivery",{})).ok).toBe(false);
});

test("both Peter and Nina receive one provider request, with duplicate addresses removed", async () => {
  let requests = 0;
  const transport = (async (_url: unknown, init: RequestInit) => {
    requests++;
    expect(JSON.parse(init.body as string).to).toEqual(["peter@gobold.com.au", "nina@bold-marketing.com.au"]);
    return new Response(JSON.stringify({ id: "message" }), { status: 200 });
  }) as typeof fetch;
  expect((await sendConfirmationEmail("peter@gobold.com.au, nina@bold-marketing.com.au, NINA@bold-marketing.com.au", "subject", "html", "delivery", { apiKey: "fixture" }, transport)).ok).toBe(true);
  expect(requests).toBe(1);
  expect((await sendConfirmationEmail("peter@gobold.com.au,invalid", "subject", "html", "delivery", { apiKey: "fixture" }, transport)).ok).toBe(false);
  expect(requests).toBe(1);
});

test("orphan reminder rows are reported without sending; real missing clinic settings still fail",async()=>{
  const {deps,calls}=effects();
  const orphan=booking({appointment_id:null,appointment:null});
  const results=await processConfirmationWorkflow([orphan],new Map(),at("09:00"),true,deps,"https://example.test");
  expect(results[0].skipped).toBe("unlinked_appointment");expect(results[0].error).toBeUndefined();expect(calls).toEqual([]);
  const invalid=await processConfirmationWorkflow([booking()],new Map(),at("09:00"),true,deps,"https://example.test");
  expect(invalid[0].error).toBe("Clinic reminder settings are missing");
});

test("all scheduled patient texts follow the saved slot, and an old reminder cannot render", () => {
  const row = booking();
  const appointment = row.appointment!;
  for (const [day, time, expected] of [
    ["2026-10-23", "11:00", "Friday 23 October"],
    ["2026-11-16", "09:15", "Monday 16 November"],
  ]) {
    appointment.appointment_date = day;
    appointment.appointment_time = time;
    for (const kind of ["3day", "24h", "request", "followup"] as const) {
      expect(() => workflowSms(row, kind)).toThrow("appointment_schedule_mismatch");
    }
    row.booking_date = day;
    row.booking_time = time + ":00";
    for (const kind of ["3day", "24h", "request", "followup"] as const) {
      const body = workflowSms(row, kind);
      expect(body).toContain(expected);
      expect(body).toContain(time === "11:00" ? "at 11:00 AM" : "at 9:15 AM");
    }
  }
});
