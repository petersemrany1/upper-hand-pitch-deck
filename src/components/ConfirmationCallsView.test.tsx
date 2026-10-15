import { afterAll, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import type { ConfirmationBooking } from "@/lib/appointment-confirmations";
import type { ConfirmationApi } from "./ConfirmationCallsView";
const browser = new Window({url:"http://localhost"});
const environment={window:browser,document:browser.document,navigator:browser.navigator,IS_REACT_ACT_ENVIRONMENT:true};
const previous=new Map(Object.keys(environment).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
for(const [key,value] of Object.entries(environment))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
const {createRoot}=await import("react-dom/client");
const {ConfirmationCallsView}=await import("./ConfirmationCallsView");
afterAll(()=>{browser.happyDOM.abort();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
const now=new Date("2026-10-15T00:00:00Z");
function fixture():ConfirmationBooking {
 return {id:"a",lead_id:null,patient_name:"Alex Example",patient_phone:"0400000000",appointment_date:"2026-10-16",appointment_time:"09:30",doctor_name:null,updated_at:"2026-10-15T00:00:00Z",deposit_amount:75,square_payment_id:"fixture",stripe_payment_intent_id:null,outcome:null,disqualified_at:null,clinic:{clinic_name:"Example Clinic",address:"123 Example St",city:"Perth",state:"WA"},reminders:[{status:"confirmed"}],events:[]};
}
async function mounted(run:(ctx:any)=>Promise<void>,sendStatus="accepted"){
 let row=fixture(),calls=0,sends:any[]=[],records:any[]=[],listDates:string[]=[],callbackRequests:any[]=[],completed:any[]=[];
 const api:ConfirmationApi={
  list:async date=>{listDates.push(date);return [structuredClone(row)];},
  callbacks:async()=>row.callback?[structuredClone(row)]:[],
  scheduleCallback:async()=>{},
  completeCallback:async data=>{completed.push(data);row.callback=null;},
  record:async data=>{records.push(data);row.events.unshift({id:data.requestId,appointment_id:row.id,appointment_updated_at:data.version,kind:data.outcome,note:data.note,created_at:now.toISOString(),actor_name:"Peter",sms_status:null,sms_error:null,sms_body:null,sms_phone:null});},
  send:async data=>{sends.push(data);row.events.unshift({id:data.requestId,appointment_id:row.id,appointment_updated_at:data.version,kind:"sms",note:null,created_at:new Date(now.getTime()+1000).toISOString(),actor_name:"Peter",sms_status:sendStatus,sms_error:sendStatus==="uncertain"?"Provider timed out":null,sms_body:data.body,sms_phone:row.patient_phone});return {status:sendStatus,error:null};},
 };
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
 const button=(label:string)=>[...host.querySelectorAll("button")].find(b=>b.textContent?.trim()===label)!;
 try {
  await act(async()=>root.render(h(ConfirmationCallsView,{api,now,repName:"Peter",onScheduleCallback:(b,note)=>{callbackRequests.push({b,note});},onCall:async()=>{calls++;},onHangup:()=>{},onInbox:()=>{},onReschedule:()=>{}})));
  await run({host,button,click:async(label:string)=>act(async()=>button(label).click()),sends,records,listDates,callbackRequests,completed,get calls(){return calls;},changeBooking:()=>{row={...row,updated_at:"2026-10-15T01:00:00Z",appointment_time:"11:00"};},addOverdueCallback:()=>{row={...row,appointment_date:"2026-10-13",callback:{id:"callback",appointment_id:row.id,callback_date:"2026-10-14",callback_time:null,note:"Cannot attend. Call to rebook.",actor_name:"Peter",created_at:now.toISOString()}};}});
 } finally {await act(async()=>root.unmount());host.remove();}
}
test("tomorrow opens automatically, calls are explicit and no-answer opens an editable unsent text",async()=>{
 await mounted(async(ctx:any)=>{
  expect(ctx.listDates[0]).toBe("2026-10-16");
  expect(ctx.host.querySelector(".cc-script").textContent).toContain("Hi Alex, it’s Peter.");
  expect(ctx.host.querySelector(".cc-script").textContent).toContain("tomorrow, Friday 16 October at 9:30 am");
  expect(ctx.host.querySelector(".cc-script").textContent).toContain("pay $395");
  expect(ctx.calls).toBe(0);expect(ctx.sends).toHaveLength(0);
  expect(ctx.host.textContent).toContain("before 9 am in Perth");
  await ctx.click("Call patient");expect(ctx.calls).toBe(1);
  await ctx.click("No answer → text");
  expect(ctx.records[0].outcome).toBe("no_answer");expect(ctx.sends).toHaveLength(0);
  const text=ctx.host.querySelector('textarea[aria-label="Confirmation text"]');
  expect(text.disabled).toBe(false);expect(text.value).toContain("I just tried calling");
  await act(async()=>{
   Object.getOwnPropertyDescriptor(browser.HTMLTextAreaElement.prototype,"value")!.set!.call(text,"Hi Alex, please confirm tomorrow. Here is the address.");
   text.dispatchEvent(new browser.Event("input",{bubbles:true}) as unknown as Event);
  });
  await ctx.click("Send text");
  expect(ctx.sends).toHaveLength(1);expect(ctx.sends[0].body).toBe("Hi Alex, please confirm tomorrow. Here is the address.");
  expect(ctx.button("Send text").disabled).toBe(true);
  expect(ctx.host.querySelector('textarea[aria-label="Confirmation text"]').disabled).toBe(true);
  expect(ctx.host.textContent).toContain("This patient still needs to confirm");
  expect(ctx.records).toHaveLength(1);
  await ctx.click("Close text");await ctx.click("View text");expect(ctx.button("Send text").disabled).toBe(true);
 });
});
test("a changed booking blocks an old draft and clears the previous confirmation",async()=>{
 await mounted(async(ctx:any)=>{
  await ctx.click("Confirmed they’re coming");
  expect(ctx.records[0].outcome).toBe("confirmed");
  await ctx.click("Text appointment details");
  ctx.changeBooking();
  await ctx.click("Refresh");
  expect(ctx.host.textContent).toContain("The appointment changed");
  expect(ctx.button("Send text").disabled).toBe(true);expect(ctx.sends).toHaveLength(0);
  expect(ctx.host.querySelector(".cc-person .cc-badge").textContent).toBe("To call");
 });
});
test("an uncertain provider response never offers a blind resend",async()=>{
 await mounted(async(ctx:any)=>{
  await ctx.click("No answer → text");await ctx.click("Send text");
  expect(ctx.sends).toHaveLength(1);expect(ctx.button("Send text").disabled).toBe(true);
  expect(ctx.host.textContent).toContain("Provider timed out");
 },"uncertain");
});
test("callback action sends nothing; overdue callbacks survive the appointment date and can be completed",async()=>{
 await mounted(async(ctx:any)=>{
  await ctx.click("Call back later");expect(ctx.callbackRequests).toHaveLength(1);
  expect(ctx.sends).toHaveLength(0);expect(ctx.records).toHaveLength(0);expect(ctx.calls).toBe(0);
  ctx.addOverdueCallback();await ctx.click("Refresh");await ctx.click("Callbacks · 1 due");
  expect(ctx.host.textContent).toContain("Cannot attend. Call to rebook.");
  expect(ctx.host.textContent).toContain("original appointment has passed");
  expect(ctx.button("Text appointment details").disabled).toBe(true);
  expect(ctx.button("Confirmed they’re coming").disabled).toBe(true);
  await ctx.click("Call patient");expect(ctx.calls).toBe(1);
  await ctx.click("Change callback");expect(ctx.callbackRequests[1].b.callback.id).toBe("callback");
  await ctx.click("Mark callback done");expect(ctx.completed).toEqual([{appointmentId:"a",callbackId:"callback"}]);
  expect(ctx.host.textContent).toContain("No callbacks scheduled");expect(ctx.sends).toHaveLength(0);
 });
});
