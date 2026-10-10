import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import type { CustomerJourney } from "./customer-journey";
const browser=new Window({url:"https://portal.example/sales-call"});
const environment={window:browser,document:browser.document,navigator:browser.navigator,HTMLElement:browser.HTMLElement,Element:browser.Element,Node:browser.Node,CustomEvent:browser.CustomEvent,IS_REACT_ACT_ENVIRONMENT:true};
const previous=new Map(Object.keys(environment).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
for(const [k,value] of Object.entries(environment)) Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
const empty=(id="lead"):CustomerJourney=>({leadIds:[id,"duplicate"],threadIds:["thread"],phoneKey:"61412345678",calls:[],messages:[],skips:[]});
let load:(id:string)=>Promise<any>;const callbacks:Record<string,(event:any)=>void>={};let requests=0;
mock.module("@/integrations/supabase/client",()=>({supabase:{rpc:(_:string,p:{p_lead:string})=>{requests++;return load(p.p_lead);},channel:()=>{const ch:any={on:(_:any,filter:any,cb:any)=>{callbacks[filter.table]=cb;return ch;},subscribe:()=>ch};return ch;},removeChannel:async()=>{}}}));
const {createRoot}=await import("react-dom/client");
const {CustomerJourneyTimeline}=await import("./CustomerJourneyTimeline");
const {useCustomerJourney,refreshCustomerJourney}=await import("./useCustomerJourney");
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);requests=0;load=async id=>({data:empty(id),error:null});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
afterAll(()=>{browser.happyDOM.abort();for(const [k,d] of previous){if(d)Object.defineProperty(globalThis,k,d);else Reflect.deleteProperty(globalThis,k);}});
function Harness({id="lead",open=true}:{id?:string;open?:boolean}) {const j=useCustomerJourney(id,"0412345678",open);return h(CustomerJourneyTimeline,{data:j.data,loading:j.loading,error:j.error,onRetry:j.refresh});}
const render=async(id="lead",open=true)=>{await act(async()=>root.render(h(Harness,{id,open})));};
const photos=(id="lead",status="delivered")=>({...empty(id),messages:[{id:"photo",created_at:"2026-10-08T03:28:00Z",sent_at:null,direction:"outbound",body:null,media_urls:["https://example.com/photo.jpg"],status}]});
test("opening Journey loads recent photos directly without Comprehensive Update",async()=>{
 load=async()=>({data:photos(),error:null});await render();expect(host.textContent).toContain("Photo sent");expect(host.textContent).toContain("Delivered");expect(host.textContent).not.toContain("Comprehensive");expect(host.querySelector("time")?.textContent).toContain("2:28");expect(host.querySelector("img")?.alt).toBe("Photo 1");
});
test("request failure is a visible retry, never a false first-contact claim",async()=>{
 load=async()=>({data:null,error:new Error("offline")});await render();expect(host.querySelector('[role="alert"]')?.textContent).toContain("couldn’t load");expect(host.textContent).not.toContain("No recorded");
 load=async()=>({data:photos(),error:null});await act(async()=>host.querySelector("button")!.click());expect(host.textContent).toContain("Photo sent");
});
test("closing and reopening fetches new communication rather than cached emptiness",async()=>{
 await render();expect(host.textContent).toContain("No recorded communications");await render("lead",false);load=async()=>({data:photos(),error:null});await render();expect(host.textContent).toContain("Photo sent");expect(requests).toBe(2);
});
test("late results from the previous customer cannot replace the current history",async()=>{
 let resolve!:(v:any)=>void;load=id=>id==="lead"?new Promise(r=>resolve=r):Promise.resolve({data:photos("other"),error:null});await render();await render("other");await act(async()=>resolve({data:{...empty(),messages:[{...photos().messages[0],body:"WRONG CUSTOMER"}]},error:null}));expect(host.textContent).not.toContain("WRONG CUSTOMER");expect(host.textContent).toContain("Photo sent");
});
test("delivery and analysis realtime changes refresh open history",async()=>{
 load=async()=>({data:photos("lead","queued"),error:null});await render();expect(host.textContent).toContain("Photo queued");load=async()=>({data:photos(),error:null});await act(async()=>{callbacks.sms_messages({new:{thread_id:"thread"},old:{}});await new Promise(r=>setTimeout(r,240));});expect(host.textContent).toContain("Delivered");expect(requests).toBe(2);
});
test("a local photo send refreshes history; failed refresh keeps entries with a warning",async()=>{
 await render();load=async()=>({data:photos(),error:null});await act(async()=>{refreshCustomerJourney("duplicate");await new Promise(r=>setTimeout(r,240));});expect(host.textContent).toContain("Photo sent");
 load=async()=>({data:null,error:new Error("offline")});await act(async()=>window.dispatchEvent(new window.Event("focus")));expect(host.textContent).toContain("may be out of date");expect(host.textContent).toContain("Photo sent");
});
