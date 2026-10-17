import {afterAll,expect,mock,test} from 'bun:test';
import {Window} from 'happy-dom';
import {act,createElement as h} from 'react';
const browser=new Window({url:'http://localhost'});
const env={window:browser,document:browser.document,navigator:browser.navigator,IS_REACT_ACT_ENVIRONMENT:true};
const previous=new Map(Object.keys(env).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
for(const[k,v]of Object.entries(env))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});
let hidden=false;Object.defineProperty(browser.document,'hidden',{get:()=>hidden});
let callbacks:any,shots=0,stopped=0;const sent:any[]=[];
mock.module('@/lib/norwood-live-peer',()=>({NorwoodLivePeer:class{
 pc={connectionState:'connected'};constructor(_ice:any,cb:any){callbacks=cb;}
 async offer(){callbacks.connected();return 'v=0 offer';}async accept(){}send(m:any){sent.push(m);}close(){}
}}));
mock.module('./norwood-camera',()=>({openNorwoodCamera:async()=>({photo:()=>`original-${++shots}`,stop:()=>{stopped++;}})}));
mock.module('@/lib/norwood-live-preview',()=>({makeCapturePreview:async(p:string)=>p,previewMessages:(id:string,jpeg:string)=>[{type:'photo-preview',id,data:jpeg,index:0,total:1}]}));
const {createRoot}=await import('react-dom/client');
const {default:PatientNorwoodLive}=await import('./PatientNorwoodLive');
afterAll(()=>{browser.happyDOM.abort();for(const[k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else Reflect.deleteProperty(globalThis,k);}});
const state=()=>({roomId:'r',expiresAt:new Date(Date.now()+600000).toISOString(),offer:null,answer:'v=0 answer',patientPresent:true,repPresent:true,ended:false});
test('review saves the exact rejected original without asking the patient for another photo',async()=>{
 shots=0;sent.length=0;const captures:any[]=[];let attempt=0;
 const capture=async(...args:any[])=>{captures.push(args);if(!args[3])return{ready:false,message:'Framing',reviewIndex:1,reviewTicket:'ticket'};if(++attempt===1)throw new Error('Failed to fetch');return{ready:true,message:'Saved',reviewIndex:0};};
 const api=async()=>({ok:true as const,data:{state:state(),iceServers:[]}});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(h(PatientNorwoodLive,{token:'token',views:['top','crown','left'],api,capture})));
  await act(async()=>host.querySelector('button')!.click());
  const id=crypto.randomUUID();
  await act(async()=>{callbacks.message({type:'capture',id,view:'front'});await new Promise(r=>setTimeout(r,760));});
  expect(shots).toBe(3);expect(host.textContent).toContain('Your advisor is checking this photo.');expect(sent.find(m=>m.type==='photo-preview').data).toBe('original-2');
  await act(async()=>{callbacks.message({type:'accept-photo',id,view:'front',approval:'approved'});});
  expect(host.textContent).toContain('Your advisor is checking this photo.');
  // A failed upload retains that same still for an advisor retry.
  await act(async()=>{callbacks.message({type:'accept-photo',id,view:'front',approval:'approved-again'});});
  expect(shots).toBe(3);expect(captures[2]).toEqual(['original-2','front',[],'approved-again']);
  expect(sent.filter(m=>m.type==='result').at(-1).views).toEqual(['front','top','crown','left']);
  expect(host.textContent).toContain('Hairline saved');
 }finally{await act(async()=>root.unmount());host.remove();}
});
test('a temporary heartbeat failure preserves camera; hiding the page stops it immediately',async()=>{
 let polls=0;const actions:any[]=[];stopped=0;
 const api=async({data}:any)=>{actions.push(data);if(data.action==='poll'&&++polls===1)throw new Error('Failed to fetch');return{ok:true as const,data:{state:state(),iceServers:[]}};};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(h(PatientNorwoodLive,{token:'token',views:['top'],api,capture:async()=>({ready:false,message:'unused'})})));
  await act(async()=>host.querySelector('button')!.click());expect(stopped).toBe(0);expect(host.textContent).toContain('Reconnecting…');
  await act(async()=>{await new Promise(r=>setTimeout(r,2150));});expect(stopped).toBe(0);expect(host.textContent).toContain('Sharing camera');
  await act(async()=>{hidden=true;document.dispatchEvent(new browser.Event('visibilitychange') as unknown as Event);});
  expect(stopped).toBe(1);expect(actions.find(a=>a.action==='stop')?.stopReason).toBe('page_hidden');expect(host.textContent).toContain('Show advisor');
 }finally{hidden=false;await act(async()=>root.unmount());host.remove();}
},5000);
