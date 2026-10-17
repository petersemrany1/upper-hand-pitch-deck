import { afterAll, expect, mock, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act, createElement as h, useRef, useState } from 'react';
const browser = new Window({url:'http://localhost'});
const environment={window:browser,document:browser.document,navigator:browser.navigator,IS_REACT_ACT_ENVIRONMENT:true};
const previous=new Map(Object.keys(environment).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
for(const [k,v] of Object.entries(environment))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});
Object.defineProperty(browser.document,'hidden',{get:()=>false});
let peerCallbacks:any;const sent:any[]=[];
mock.module('@/lib/norwood-live-peer',()=>({NorwoodLivePeer:class {
  pc={connectionState:'connected'}; constructor(_ice:any,private callbacks:any){peerCallbacks=callbacks;}
  async answer(){this.callbacks.connected();return 'v=0 answer';} send(m:any){sent.push(m);} close(){}
}}));
const {default:NorwoodWorkspace}=await import('./NorwoodWorkspace');
Object.defineProperty(browser.HTMLDialogElement.prototype,'showModal',{value:function(){this.open=true;}});
Object.defineProperty(browser.HTMLDialogElement.prototype,'close',{value:function(){this.open=false;}});
const {createRoot}=await import('react-dom/client');
const {default:NorwoodRepLive}=await import('./NorwoodRepLive');
afterAll(()=>{browser.happyDOM.abort();for(const[k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else Reflect.deleteProperty(globalThis,k);}});
const shared={roomId:'r',offer:'v=0 offer',answer:null,ended:false,patientPresent:true,repPresent:false,expiresAt:new Date(Date.now()+600000).toISOString()};
test('patient sharing connects the rep automatically without a rep click',async()=>{
  let sharing=false;const actions:string[]=[];
  const api=async({data}:any)=>{actions.push(data.action);return {ok:true as const,data:{state:sharing?shared:null,iceServers:[]}};};
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
    await act(async()=>root.render(h(NorwoodRepLive,{leadId:'lead',assessmentId:'assessment',api})));
    expect(actions).toEqual(['find']);expect(host.textContent).toContain('Waiting for the patient');
    sharing=true;
    await act(async()=>{await new Promise(r=>setTimeout(r,2150));});
    expect(actions.filter(a=>a==='join')).toHaveLength(1);expect(actions).toContain('sdp');
    expect(host.textContent).toContain('Waiting for camera image');
    await act(async()=>host.querySelector('video')!.dispatchEvent(new browser.Event('loadeddata') as unknown as Event));
    expect(host.textContent).toContain('Capture hairline');
    await act(async()=>{await new Promise(r=>setTimeout(r,2100));});
    expect(actions.filter(a=>a==='join')).toHaveLength(1);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='End camera sharing')!.click());
    await act(async()=>{await new Promise(r=>setTimeout(r,2100));});
    expect(actions.filter(a=>a==='join')).toHaveLength(1);
  }finally{await act(async()=>root.unmount());host.remove();}
},10000);
test('an in-flight discovery cannot connect after navigating away',async()=>{
  let finish:(value:any)=>void=()=>{};const actions:string[]=[];
  const api=({data}:any)=>{actions.push(data.action);return new Promise<any>(r=>{finish=r;});};
  const host=document.createElement('div');const root=createRoot(host);
  await act(async()=>root.render(h(NorwoodRepLive,{leadId:'lead',assessmentId:'assessment',api})));
  await act(async()=>root.unmount());
  await act(async()=>finish({ok:true,data:{state:shared,iceServers:[]}}));
  expect(actions).toEqual(['find']);
});


test('expanding and closing the camera preserves one peer, selected angle and video node',async()=>{
  const actions:string[]=[];
  const api=async({data}:any)=>{actions.push(data.action);return {ok:true as const,data:{state:shared,iceServers:[]}};};
  function Harness(){
    const [expanded,setExpanded]=useState(false);const trigger=useRef<HTMLButtonElement>(null);
    return h(NorwoodWorkspace,{expanded,onExpandedChange:setExpanded,returnFocus:trigger,children:h('section',{},
      h('button',{ref:trigger,onClick:()=>setExpanded(v=>!v)},expanded?'Back':'Expand'),
      h(NorwoodRepLive,{leadId:'lead',assessmentId:'assessment',api})
    )});
  }
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
    await act(async()=>root.render(h(Harness)));
    const originalVideo=host.querySelector('video');
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()==='Crown')!.click());
    for(let i=0;i<3;i++){
      await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Expand')!.click());
      expect(host.querySelector('dialog')?.open).toBe(true);
      expect(host.querySelector('dialog video')).toBe(originalVideo);
      expect(host.querySelector('dialog [aria-pressed=true]')?.textContent?.trim()).toBe('Crown');
      await act(async()=>host.querySelector('dialog')!.dispatchEvent(new browser.Event('cancel',{cancelable:true}) as unknown as Event));
      expect(host.querySelector('dialog')?.open).toBe(false);
      expect(host.querySelector('video')).toBe(originalVideo);
      expect(document.activeElement?.textContent).toBe('Expand');
    }
    expect(actions.filter(a=>a==='join')).toHaveLength(1);
    expect(actions.filter(a=>a==='stop')).toHaveLength(0);
    expect(document.body.style.overflow).toBe('');
  }finally{await act(async()=>root.unmount());host.remove();}
  expect(actions.filter(a=>a==='stop')).toHaveLength(1);
});

test('one failed heartbeat keeps the camera, then recovers; explicit stop still ends it',async()=>{
 let polls=0,ended=false;const actions:string[]=[];
 const api=async({data}:any)=>{actions.push(data.action);if(data.action==='poll'&&++polls===1)throw new Error('Failed to fetch');return{ok:true as const,data:{state:{...shared,ended},iceServers:[]}};};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(h(NorwoodRepLive,{leadId:'lead',assessmentId:'assessment',api,savedViews:['top','left','crown']})));
  const video=host.querySelector('video');expect(host.textContent).toContain('Reconnecting…');expect(actions).not.toContain('stop');
  await act(async()=>{await new Promise(r=>setTimeout(r,2150));});
  expect(host.querySelector('video')).toBe(video);expect(host.textContent).not.toContain('Reconnecting…');expect(host.textContent).toContain('3/5 saved');expect(actions.filter(a=>a==='join')).toHaveLength(1);
  ended=true;await act(async()=>{await new Promise(r=>setTimeout(r,2150));});
  expect(host.textContent).toContain('Patient stopped sharing');expect(actions.filter(a=>a==='stop')).toHaveLength(1);
 }finally{await act(async()=>root.unmount());host.remove();}
},10000);
test('framing review requires displayed exact preview and explicit rep confirmation',async()=>{
 sent.length=0;const actions:any[]=[];
 const api=async({data}:any)=>{actions.push(data);return{ok:true as const,data:{state:shared,iceServers:[],...(data.action==='review'?{reviewApproval:'signed-approval'}:{})}};};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(h(NorwoodRepLive,{leadId:'lead',assessmentId:'assessment',api,savedViews:['top','left','crown']})));
  const video=host.querySelector('video')!;Object.defineProperty(video,'readyState',{value:2});
  await act(async()=>video.dispatchEvent(new browser.Event('loadeddata') as unknown as Event));
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Capture hairline')!.click());
  const capture=sent.find(m=>m.type==='capture');
  // The preview is the checked JPEG, received BEFORE its result.
  await act(async()=>{
   peerCallbacks.message({type:'photo-preview',id:capture.id,index:0,total:1,data:'/9j/AAAA/9k='});
   peerCallbacks.message({type:'result',id:capture.id,view:'front',ready:false,message:'Move back',views:['top','left','crown'],reviewTicket:'signed-ticket'});
  });
  const usePhoto=[...host.querySelectorAll('button')].find(b=>b.textContent==='Use reviewed photo')!;
  expect(usePhoto).toBeTruthy();expect(usePhoto.disabled).toBe(true);expect(actions.some(a=>a.action==='review')).toBe(false);
  await act(async()=>host.querySelector('img.nw-rep-review')!.dispatchEvent(new browser.Event('load') as unknown as Event));
  await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());expect(usePhoto.disabled).toBe(false);
  await act(async()=>usePhoto.click());
  expect(actions.find(a=>a.action==='review').reviewConfirmed).toBe(true);expect(sent.find(m=>m.type==='accept-photo')).toEqual({type:'accept-photo',id:capture.id,view:'front',approval:'signed-approval'});
  await act(async()=>peerCallbacks.message({type:'result',id:capture.id,view:'front',ready:true,message:'Saved',views:['front','top','left','crown']}));
  expect(host.textContent).toContain('4/5 saved');expect(host.querySelector('[aria-pressed=true]')?.textContent).toContain('Right side');expect(host.textContent).not.toContain('Use reviewed photo');
 }finally{await act(async()=>root.unmount());host.remove();}
});
