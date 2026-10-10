import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
const browser = new Window({url:"https://portal.example/sales-call"});
const environment = {window:browser, document:browser.document, navigator:browser.navigator, HTMLElement:browser.HTMLElement, Element:browser.Element, Node:browser.Node, IS_REACT_ACT_ENVIRONMENT:true};
const previous = new Map(Object.keys(environment).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
for(const [key,value] of Object.entries(environment)) Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
// The dialog shell is cosmetic here. Exercise the actual form and save flow.
mock.module("@/components/ui/dialog",()=>({Dialog:({children}:any)=>h("div",null,children),DialogContent:({children}:any)=>h("div",null,children),DialogTitle:({children}:any)=>h("h2",null,children),DialogDescription:({children}:any)=>h("p",null,children)}));
const savedRequests:any[]=[];
let saveImpl:()=>Promise<any>;
mock.module("./lead-skips",()=>({recordLeadSkip:(r:any)=>{savedRequests.push(r);return saveImpl();}}));
const { createRoot } = await import("react-dom/client");
const { SkipLeadDialog } = await import("./SkipLeadDialog");
const { useSessionCompletion } = await import("./useSessionCompletion");
let host:HTMLDivElement, root:ReturnType<typeof createRoot>;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);savedRequests.length=0;saveImpl=async()=>({id:"saved"});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
afterAll(()=>{browser.happyDOM.abort();for(const [key,d] of previous) {if(d) Object.defineProperty(globalThis,key,d);else Reflect.deleteProperty(globalThis,key);}});
const submit=async()=>{await act(async()=>{document.querySelector("form")!.dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));});};
const reason=async()=>{await act(async()=>{const e=document.querySelector("textarea")!;Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value")!.set!.call(e,"Phone number needs checking");e.dispatchEvent(new window.Event("input",{bubbles:true}));});};
test("empty skip is blocked; cancel creates no entry",async()=>{
 const next=mock(()=>{}), cancel=mock(()=>{});
 await act(async()=>root.render(h(SkipLeadDialog,{leadId:"lead",leadName:"Test Lead",sessionId:"session",onSaved:next,onCancel:cancel})));
 await submit(); expect(savedRequests).toHaveLength(0);expect(next).not.toHaveBeenCalled();
 await act(async()=>{Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Cancel")!.click();});expect(cancel).toHaveBeenCalledTimes(1);
});
test("failed saves do not advance; retry uses identical request; only success advances",async()=>{
 const next=mock(()=>{}); saveImpl=async()=>{throw new Error("offline");};
 await act(async()=>root.render(h(SkipLeadDialog,{leadId:"lead",leadName:"Test Lead",sessionId:"session",onSaved:next,onCancel:()=>{}})));
 await reason(); await submit(); expect(savedRequests).toHaveLength(1);expect(next).not.toHaveBeenCalled();expect(document.querySelector('[role="alert"]')?.textContent).toContain("Retry");
 saveImpl=async()=>({id:"saved"});await submit();expect(savedRequests[1]).toEqual(savedRequests[0]);expect(next).toHaveBeenCalledTimes(1);
 expect(savedRequests[0]).toMatchObject({leadId:"lead",sessionId:"session",reason:"Phone number needs checking"});
 expect(savedRequests[0]).not.toHaveProperty("repId");expect(savedRequests[0]).not.toHaveProperty("createdAt");
});
function Harness({enabled, options}:{enabled:boolean;options:any}) {const review=useSessionCompletion(enabled,options);return h("button",{onClick:review.retry},review.error||"Checking");}
test("final check restores untouched leads instead of completing",async()=>{
 const restore=mock(()=>{}), complete=mock(()=>{});
 await act(async()=>root.render(h(Harness,{enabled:true,options:{load:async()=>[{id:"new"}],stillCurrent:()=>true,restore,complete}})));
 expect(restore).toHaveBeenCalledWith([{id:"new"}]);expect(complete).not.toHaveBeenCalled();
});
test("failed final check stays open and retries; only a successful empty result completes",async()=>{
 const complete=mock(()=>{});let fail=true;
 const options={load:async()=>{if(fail) throw new Error("offline");return [];},stillCurrent:()=>true,restore:mock(()=>{}),complete};
 await act(async()=>root.render(h(Harness,{enabled:true,options})));
 expect(complete).not.toHaveBeenCalled();expect(host.textContent).toContain("retry");
 fail=false;await act(async()=>document.querySelector("button")!.click());expect(complete).toHaveBeenCalledTimes(1);
});
test("manual end during a pending check cannot reopen or complete the session",async()=>{
 const complete=mock(()=>{}),restore=mock(()=>{});let resolve!:(x:any[])=>void;
 const options={load:()=>new Promise<any[]>(r=>{resolve=r;}),stillCurrent:()=>true,restore,complete};
 await act(async()=>root.render(h(Harness,{enabled:true,options})));
 await act(async()=>root.render(h(Harness,{enabled:false,options})));
 await act(async()=>resolve([{id:"new"}]));expect(restore).not.toHaveBeenCalled();expect(complete).not.toHaveBeenCalled();
});
