import { afterAll, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import type { ConfirmationBooking } from "@/lib/appointment-confirmations";
const browser=new Window({url:"http://localhost"});
const environment={window:browser,document:browser.document,navigator:browser.navigator,IS_REACT_ACT_ENVIRONMENT:true};
const previous=new Map(Object.keys(environment).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
for(const [key,value] of Object.entries(environment))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
mock.module("./ui/dialog",()=>Object.fromEntries(["Dialog","DialogContent","DialogHeader","DialogTitle","DialogDescription"].map(name=>[name,({children}:any)=>h("div",null,children)])));
const { createRoot }=await import("react-dom/client");
const { ConfirmationCallbackDialog }=await import("./ConfirmationCallbackDialog");
afterAll(()=>{browser.happyDOM.abort();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
test("saving a callback waits for success, exposes failures and safely reuses the request on retry",async()=>{
 const booking={id:"a",updated_at:"v1",patient_name:"Alex Example",clinic:{clinic_name:"Example Clinic"},callback:{id:"old",callback_date:"2099-10-15",callback_time:null,note:"Needs to rebook"}} as ConfirmationBooking;
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);const requests:any[]=[];let saved=0;
 try{
  await act(async()=>root.render(h(ConfirmationCallbackDialog,{booking,save:async data=>{requests.push(data);if(requests.length===1)throw new Error("Response lost. Please retry.");},onSaved:()=>{saved++;},onClose:()=>{}})));
  const button=()=>[...host.querySelectorAll("button")].find(b=>b.textContent==="Save callback")!;
  expect(requests).toHaveLength(0);
  await act(async()=>button().click());expect(saved).toBe(0);expect(host.textContent).toContain("Response lost");
  await act(async()=>button().click());expect(saved).toBe(1);expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);expect(requests[0].expectedCallbackId).toBe("old");expect(requests[0].time).toBeNull();expect(requests[0].note).toBe("Needs to rebook");
 }finally{await act(async()=>root.unmount());host.remove();}
});
