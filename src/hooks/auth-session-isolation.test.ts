import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
const browser=new Window({url:"https://portal.example/settings"});
const environment={window:browser,document:browser.document,navigator:browser.navigator,HTMLElement:browser.HTMLElement,Element:browser.Element,Node:browser.Node,IS_REACT_ACT_ENVIRONMENT:true,confirm:()=>true};
const previous=new Map(Object.keys(environment).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
for(const [k,value] of Object.entries(environment))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
let active=true, logoutError:Error|null=null;
const signOut=mock(async (_?:unknown)=>({error:logoutError}));
const verifyOtp=mock(async (_:unknown)=>({error:new Error("Stop before navigation in test")}));
mock.module("@/integrations/supabase/client",()=>({supabase:{auth:{
  signOut,verifyOtp,onAuthStateChange:()=>({data:{sub:{subscription:{unsubscribe(){}}},subscription:{unsubscribe(){}}}}),
  getSession:async()=>({data:{session:null}}),signInWithPassword:async()=>({error:null})
},from:()=>({select:()=>({ilike:()=>({maybeSingle:async()=>({data:{is_active:active}})})})})}}));
const impersonateRep=mock(async()=>({success:true,tokenHash:"test-token"}));
mock.module("@/utils/sales-call.functions",()=>({impersonateRep,listReps:async()=>({success:true,reps:[{id:"rep",name:"Test Rep",email:"test@example.test",role:"rep",created_at:"2026-10-10"}]}),inviteRep:mock(()=>{}),updateRep:mock(()=>{}),updateRepRole:mock(()=>{}),updateRepEmail:mock(()=>{}),deleteRep:mock(()=>{}),setRepPassword:mock(()=>{}),setRepActive:mock(()=>{})}));
mock.module("sonner",()=>({toast:{loading:()=>"toast",error:()=>{},success:()=>{}}}));
const {createRoot}=await import("react-dom/client");
const {AuthProvider,useAuth}=await import("./useAuth");
const {TeamSection}=await import("@/components/settings/TeamSection");
let host:HTMLDivElement,root:ReturnType<typeof createRoot>,auth:ReturnType<typeof useAuth>;
function Harness(){auth=useAuth();return null;}
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);active=true;logoutError=null;signOut.mockClear();verifyOtp.mockClear();impersonateRep.mockClear();});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
afterAll(()=>{browser.happyDOM.abort();for(const[k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else Reflect.deleteProperty(globalThis,k);}});
test("ordinary logout revokes only this browser session",async()=>{
 await act(async()=>root.render(h(AuthProvider,null,h(Harness))));await act(async()=>{await auth.signOut();});
 expect(signOut).toHaveBeenCalledWith({scope:"local"});
});
test("deactivated-account protection still revokes all sessions",async()=>{
 active=false;await act(async()=>root.render(h(AuthProvider,null,h(Harness))));
 await act(async()=>{expect((await auth.signIn("test@example.test","test")).error).toContain("deactivated");});
 expect(signOut).toHaveBeenCalledTimes(1);expect(signOut.mock.calls[0]).toEqual([]);
});
test("Sign in as uses local logout before exchanging the admin-issued login token",async()=>{
 await act(async()=>root.render(h(TeamSection)));
 const button=Array.from(host.querySelectorAll("button")).find(b=>b.getAttribute("title")?.includes("Sign in as")||b.textContent?.includes("Sign in as"));
 expect(button).toBeDefined();await act(async()=>button!.click());
 expect(signOut).toHaveBeenCalledWith({scope:"local"}); expect(verifyOtp).toHaveBeenCalledWith({token_hash:"test-token",type:"magiclink"});
});
test("failed logout does not switch to another account",async()=>{
 logoutError=new Error("temporary server failure");await act(async()=>root.render(h(TeamSection)));
 const button=Array.from(host.querySelectorAll("button")).find(b=>b.getAttribute("title")?.includes("Sign in as")||b.textContent?.includes("Sign in as"));
 expect(button).toBeDefined();await act(async()=>button!.click());expect(verifyOtp).not.toHaveBeenCalled();
});
