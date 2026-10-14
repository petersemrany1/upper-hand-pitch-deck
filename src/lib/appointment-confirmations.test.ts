import { describe, expect, test } from "bun:test";
import { activeConfirmationBooking, clinicLocalClock, confirmationDate, confirmationState, confirmationText, confirmationCallGuide, currentConfirmationEvents, type ConfirmationBooking, type ConfirmationEvent } from "./appointment-confirmations";

export const fixtureBooking = (patch: Partial<ConfirmationBooking> = {}): ConfirmationBooking => ({
 id: "00000000-0000-4000-8000-000000000030", lead_id: null, patient_name: "Alex Example", patient_phone: "0400000000",
 appointment_date: "2026-10-16", appointment_time: "09:30", doctor_name: "Consultant", updated_at: "2026-10-15T00:00:00.123456Z",
 deposit_amount: 75, square_payment_id: "fixture-payment", stripe_payment_intent_id: null, outcome: null, disqualified_at: null,
 clinic: {clinic_name: "Example Clinic",address: "123 Example Street",city: "Sydney",state: "NSW"},
 reminders: [{status: "confirmed"}], events: [], ...patch,
});
const event = (patch: Partial<ConfirmationEvent> = {}): ConfirmationEvent => ({
 id: "e", appointment_id: fixtureBooking().id, appointment_updated_at: fixtureBooking().updated_at,
 kind: "no_answer", note: null, created_at: "2026-10-15T01:00:00Z", actor_name: "Peter",
 sms_status: null, sms_body: null, sms_phone: null, sms_error: null, ...patch,
});
describe("day-before confirmations", () => {
 test("the call guide uses the rep, tomorrow only for the next day, and the booked provider's role", () => {
  const now = new Date("2026-10-15T00:00:00Z");
  const doctor = fixtureBooking({doctor_name:"Dr. Jane Example — Hair Transplant Specialist"});
  const guide = confirmationCallGuide(doctor, "Peter Semrany", now).join("\n");
  expect(guide).toContain("Hi Alex, it’s Peter. Our team spoke with you regarding your hair transplant.");
  expect(guide).toContain("tomorrow, Friday 16 October at 9:30 am");
  expect(guide).toContain("you’ve paid your $75 deposit. Otherwise, you’ll need to pay $395.");
  expect(guide).toContain("our most senior doctor, so you’re in good hands. Good luck!");
  expect(confirmationCallGuide(fixtureBooking({doctor_name:"Debra Best — Hair Regrowth Specialist"}),"Nina",now).join("\n")).toContain("our most senior consultant");
  const later=confirmationCallGuide({...doctor,appointment_date:"2026-10-19"},"Peter",now).join("\n");
  expect(later).toContain("on Monday 19 October");
  expect(later).not.toContain("tomorrow");
  expect(confirmationCallGuide(doctor,"Peter",new Date("2026-10-15T13:00:00Z")).join("\n")).not.toContain("tomorrow");
  expect(confirmationCallGuide({...doctor,square_payment_id:null},"Peter",now).join("\n")).not.toContain("$395");
  expect(confirmationCallGuide({...doctor,deposit_amount:100},"Peter",now).join("\n")).toContain("$100 deposit");
  expect(confirmationCallGuide({...doctor,doctor_name:null},null,now).join("\n")).toContain("[REP NAME]");
  expect(confirmationCallGuide({...doctor,doctor_name:null},null,now).join("\n")).toContain("[doctor/consultant]");
 });
 test("tomorrow follows Sydney midnight, including daylight saving and year rollover", () => {
  expect(confirmationDate(1, new Date("2026-10-15T12:59:00Z"))).toBe("2026-10-16");
  expect(confirmationDate(1, new Date("2026-10-15T13:00:00Z"))).toBe("2026-10-17");
  expect(confirmationDate(1, new Date("2026-12-31T01:00:00Z"))).toBe("2027-01-01");
  expect(confirmationDate(1, new Date("2026-07-01T13:30:00Z"))).toBe("2026-07-02");
 });
 test("the Perth clock reflects the seasonal difference from Sydney", () => {
  const perth = fixtureBooking({clinic:{clinic_name:"Example",address:"1 Example Street",city:"Perth",state:"WA"}});
  expect(clinicLocalClock(perth,new Date("2026-10-15T00:00:00Z"))).toMatchObject({city:"Perth",early:true});
  expect(clinicLocalClock(perth,new Date("2026-10-15T01:00:00Z"))).toMatchObject({early:false});
  expect(clinicLocalClock(perth,new Date("2026-07-15T01:00:00Z"))).toMatchObject({early:false});
 });
 test("past, cancelled, attended and disqualified appointments leave the call list", () => {
  const now=new Date("2026-10-15T00:00:00Z");
  expect(activeConfirmationBooking(fixtureBooking(),now)).toBe(true);
  for (const patch of [{appointment_date:"2026-10-14"},{appointment_date:"2026-10-15",appointment_time:"10:59"},{reminders:[{status:"cancelled"}]},{reminders:[]},{outcome:"showed"},{outcome:"noshow"},{disqualified_at:now.toISOString()}]) {
   expect(activeConfirmationBooking(fixtureBooking(patch),now)).toBe(false);
  }
  expect(activeConfirmationBooking(fixtureBooking({appointment_date:"2026-10-15",appointment_time:"12:00"}),now)).toBe(true);
 });
 test("texts do not confirm attendance; a changed booking requires a fresh confirmation", () => {
  const b=fixtureBooking({events:[event({kind:"confirmed"}),event({id:"s",kind:"sms",created_at:"2026-10-15T02:00:00Z",sms_status:"accepted"})]});
  expect(confirmationState(b)).toBe("confirmed");
  expect(confirmationState({...b,updated_at:"2026-10-15T03:00:00Z"})).toBe("pending");
  expect(currentConfirmationEvents({...b,updated_at:"2026-10-15T03:00:00Z"})).toHaveLength(0);
  expect(confirmationState(fixtureBooking({events:[event({kind:"sms",sms_status:"accepted"})]}))).toBe("pending");
  expect(confirmationState({...b,events:[...b.events,event({id:"n",kind:"needs_help",created_at:"2026-10-15T04:00:00Z"})]})).toBe("needs_help");
 });
 test("the editable draft contains the actual appointment and only verified paid deposit", () => {
  const text=confirmationText(fixtureBooking(),true);
  expect(text).toContain("I just tried calling");
  expect(text).toContain("Friday 16 October");
  expect(text).toContain("9:30 am");
  expect(text).toContain("123 Example Street, Sydney, NSW");
  expect(text).toStartWith("Hi Alex, I just tried calling to check you have the address");
  expect(text).not.toContain("Map:");
  expect(text).not.toContain("Hair Transplant Group");
  expect(text).toContain("$75 deposit is refundable when you attend");
  expect(text).toEndWith("Please reply YES to confirm you're coming");
  expect(text).not.toContain("$395");
  expect(text).not.toContain("QR");
  expect(confirmationText(fixtureBooking({square_payment_id:null}),false)).not.toContain("deposit");
  expect(confirmationText(fixtureBooking({deposit_amount:100}),false)).toContain("$100");
  expect(()=>confirmationText(fixtureBooking({clinic:null}),true)).toThrow("clinic name and address");
 });
});
