import { expect, test } from "bun:test";
import { callbackDue, callbackLabel, validateCallback, type ConfirmationCallback } from "./confirmation-callbacks";
const callback: ConfirmationCallback = { id:"c",appointment_id:"a",callback_date:"2026-10-15",callback_time:null,note:null,actor_name:"Peter",created_at:"2026-10-14T00:00:00Z" };
test("callbacks are due by Sydney date/time, remain overdue, and date-only callbacks begin at Sydney midnight",()=>{
 expect(callbackDue(callback,new Date("2026-10-14T12:59:00Z"))).toBe(false);
 expect(callbackDue(callback,new Date("2026-10-14T13:00:00Z"))).toBe(true);
 expect(callbackDue({...callback,callback_time:"11:00:00"},new Date("2026-10-14T23:59:00Z"))).toBe(false);
 expect(callbackDue({...callback,callback_time:"11:00:00"},new Date("2026-10-15T00:00:00Z"))).toBe(true);
 expect(callbackDue(callback,new Date("2027-01-01T00:00:00Z"))).toBe(true);
 expect(callbackLabel({...callback,callback_time:"11:00:00"})).toBe("Thursday 15 October at 11:00 am (Sydney)");
});
test("callback time follows Sydney daylight saving rather than the device or Perth clock",()=>{
 const summer={...callback,callback_date:"2027-01-10",callback_time:"11:00:00"};
 const winter={...callback,callback_date:"2027-07-10",callback_time:"11:00:00"};
 expect(callbackDue(summer,new Date("2027-01-10T00:00:00Z"))).toBe(true);
 expect(callbackDue(winter,new Date("2027-07-10T00:00:00Z"))).toBe(false);
 expect(callbackDue(winter,new Date("2027-07-10T01:00:00Z"))).toBe(true);
});
test("callback input rejects past or impossible dates and times, but allows any time today",()=>{
 const now=new Date("2026-10-15T00:00:00Z");
 for(const [date,time] of [["2026-10-14",null],["2026-02-30",null],["2026-10-15","10:59"],["2026-10-15","11:00"],["2026-10-16","24:00"],["",null]])expect(()=>validateCallback(date!,time,now)).toThrow();
 expect(()=>validateCallback("2026-10-15",null,now)).not.toThrow();
 expect(()=>validateCallback("2026-10-15","11:01",now)).not.toThrow();
});
