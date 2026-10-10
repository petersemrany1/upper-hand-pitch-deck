import {afterAll,expect,mock,test} from "bun:test";
import {Window} from "happy-dom";
import {act,createElement as h} from "react";
const browser=new Window({url:"http://localhost"});
const environment={window:browser,document:browser.document,navigator:browser.navigator,IS_REACT_ACT_ENVIRONMENT:true};
const previous=new Map(Object.keys(environment).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
for(const [key,value] of Object.entries(environment))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
const snapshot={appointment:{id:"a",clinic_id:"c",patient_name:"Jane Smith",patient_phone:"0400000000",doctor_name:"Test Consultant",appointment_date:"2099-10-15",appointment_time:"09:00",outcome:null,disqualified_at:null},clinic:{clinic_name:"Test Clinic",address:"Test address",phone:"0800000000",state:"WA",min_appointment_gap_mins:0},trading:Array.from({length:7},(_,day_of_week)=>({day_of_week,open_time:"09:00",close_time:"17:00",is_closed:false,consult_duration_mins:15})),busy:[],blocks:[],overrides:[],reminder:{id:"rem",status:"confirmed"}};
let submitted:any=null,saved=0;
mock.module("@/utils/booking-reschedule.functions",()=>({getRescheduleDetails:async()=>({snapshot,version:"v1",clinicEmail:"clinic@example.invalid"}),rescheduleBooking:async({data}:any)=>{submitted=data;return {status:"accepted",email:{status:"accepted"}};}}));
mock.module("@/components/ui/dialog",()=>Object.fromEntries(["Dialog","DialogContent","DialogHeader","DialogTitle","DialogDescription"].map(name=>[name,({children}:any)=>h("div",null,children)])));
mock.module("sonner",()=>({toast:{success:()=>{},warning:()=>{}}}));
const {createRoot}=await import("react-dom/client");
const {BookingRescheduleDialog}=await import("./BookingRescheduleDialog");
afterAll(()=>{browser.happyDOM.abort();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
test("review sends nothing; confirming submits edited clinic email beside the unchanged SMS",async()=>{
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
 try {
  await act(async()=>root.render(h(BookingRescheduleDialog,{appointmentId:"a",onClose:()=>{},onSaved:()=>{saved++;}})));
  const select=host.querySelector("select")!;
  await act(async()=>{select.value="11:30";select.dispatchEvent(new browser.Event("change",{bubbles:true}) as unknown as Event);});
  const button=(label:string)=>[...host.querySelectorAll("button")].find(b=>b.textContent===label)!;
  await act(async()=>button("Review reschedule").click());
  expect(submitted).toBeNull();expect(host.textContent).toContain("Text to the patient");expect(host.textContent).toContain("To: clinic@example.invalid");
  const subject=host.querySelector<HTMLInputElement>('input:not([type="date"])')!;
  const body=host.querySelector("textarea")!;
  expect(subject.value).toBe("Consultation rescheduled — Jane Smith");expect(body.value).toContain("at 11:30am");expect(body.value).not.toContain("Kind regards");
  await act(async()=>{
   Object.getOwnPropertyDescriptor(browser.HTMLInputElement.prototype,"value")!.set!.call(subject,"Updated consultation time");subject.dispatchEvent(new browser.Event("input",{bubbles:true}) as unknown as Event);
   Object.getOwnPropertyDescriptor(browser.HTMLTextAreaElement.prototype,"value")!.set!.call(body,"Hi team, Jane requested a new time.");body.dispatchEvent(new browser.Event("input",{bubbles:true}) as unknown as Event);
  });
  await act(async()=>button("Confirm reschedule & send").click());
  expect(submitted.emailSubject).toBe("Updated consultation time");expect(submitted.emailBody).toBe("Hi team, Jane requested a new time.");expect(submitted.clinicEmail).toBe("clinic@example.invalid");expect(submitted.time).toBe("11:30");expect(saved).toBe(1);
 } finally {await act(async()=>root.unmount());host.remove();}
});
