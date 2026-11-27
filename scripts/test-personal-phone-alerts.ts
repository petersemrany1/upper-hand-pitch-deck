// Isolated UI check: no browser permission prompt, real SMS, or phone call.
import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import { Window } from 'happy-dom';
import { act, createElement as h } from 'react';
const browser = new Window({ url: 'https://fixture.invalid/dashboard' });
for (const [key,value] of Object.entries({window:browser,document:browser.document,navigator:browser.navigator,HTMLElement:browser.HTMLElement,Element:browser.Element,Node:browser.Node,IS_REACT_ACT_ENVIRONMENT:true})) Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
let involvedOnly=true, ready=true, path='/dashboard', belongs=false, lookupError=false, callback:any;
const alerts:any[]=[], openedThreads:any[]=[];
const navigate=()=>{};
const openMessenger=(value:any)=>openedThreads.push(value);
mock.module('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'owner'}})}));
mock.module('@/hooks/useConversationNotificationPreference',()=>({useConversationNotificationPreference:()=>({involvedOnly,ready})}));
mock.module('@/hooks/useMessenger',()=>({openMessenger,useMessenger:()=>({open:false,threadId:null})}));
mock.module('@tanstack/react-router',()=>({useNavigate:()=>navigate,useLocation:()=>({pathname:path})}));
mock.module('sonner',()=>({toast:(...args:any[])=>alerts.push(args)}));
mock.module('@/integrations/supabase/client',()=>({supabase:{
  channel:()=>({on(_event:any,_filter:any,fn:any){callback=fn;return this;},subscribe(){return this;}}),
  removeChannel:()=>{},
  from:(table:string)=>({select(){return this;},eq(){return this;},async maybeSingle(){return table==='sms_thread_participants'?{data:belongs?{thread_id:'existing-thread'}:null,error:lookupError?{message:'offline'}:null}:{data:{display_name:'Existing contact'}};}}),
}}));
const {createRoot}=await import('react-dom/client');
const {SmsNotifier}=await import('../src/components/SmsNotifier');
const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
const render=()=>act(async()=>root.render(h(SmsNotifier)));
const receive=async(direction='inbound')=>act(async()=>callback({new:{id:'message',thread_id:'existing-thread',direction,body:'An existing conversation reply',from_number:'+61412000001'}}));
await render(); await receive();
assert.equal(alerts.length,0,'unrelated conversations do not show a involved-only toast');
belongs=true;await receive();
assert.equal(alerts.length,1,'participation shows an alert on an existing shared-number thread without renting a number');
alerts[0][1].action.onClick();
assert.equal(openedThreads[0],'existing-thread','Open returns to the original conversation in the phone widget');
lookupError=true;await receive();assert.equal(alerts.length,1,'lookup failure does not notify everyone');
lookupError=false;await receive('outbound');assert.equal(alerts.length,1,'own sends do not produce incoming alerts');
path='/inbox';await render();await receive();assert.equal(alerts.length,1,'open inbox does not duplicate a toast');
path='/dashboard';involvedOnly=false;await render();belongs=false;await receive();assert.equal(alerts.length,2,'other users retain their existing alert behavior');
await act(async()=>root.unmount());
console.log('PASS: involved-only toasts, original thread links, fail-closed lookup, outgoing suppression and existing shared-user alerts.');
