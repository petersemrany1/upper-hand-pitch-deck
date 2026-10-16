import { useEffect,useRef,useState } from 'react';
import { Camera,Video,VideoOff } from 'lucide-react';
import type { NorwoodView } from '@/lib/norwood-assessment';
import type { NorwoodPhotoCheck } from '@/lib/norwood-photo-check';
import type { LiveRequest,LiveMessage,PatientLiveApi } from '@/lib/norwood-live';
import { NorwoodLivePeer } from '@/lib/norwood-live-peer';
import { openNorwoodCamera } from './norwood-camera';
import type { CaptureCamera } from '@/lib/norwood-capture-controller';
import './norwood-live.css';
export default function PatientNorwoodLive({token,views,api,capture}:{token:string;views:NorwoodView[];api:PatientLiveApi;capture:(photo:string,view:NorwoodView,alternatives?:string[])=>Promise<NorwoodPhotoCheck>}){
 const video=useRef<HTMLVideoElement>(null),client=useRef(crypto.randomUUID()),run=useRef(0),room=useRef<string | undefined>(undefined),peer=useRef<NorwoodLivePeer | undefined>(undefined),camera=useRef<CaptureCamera | undefined>(undefined),abort=useRef<AbortController | undefined>(undefined),timer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const currentViews=useRef(views),captureFn=useRef(capture),busy=useRef(false),handled=useRef(new Set<string>());
 currentViews.current=views;captureFn.current=capture;
 const [phase,setPhase]=useState<'idle'|'opening'|'waiting'|'live'|'capturing'|'checking'>('idle'),[error,setError]=useState('');
 const call=async (input:Omit<LiveRequest,'clientId'>)=>{
  const result=await Promise.race([api({data:{...input,clientId:client.current,token}}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Connection interrupted. Tap Share camera to reconnect.')),12_000))]);
  if(!result.ok)throw new Error(result.error);return result.data;
 };
 const stop=(message='')=>{
  run.current++;clearTimeout(timer.current);abort.current?.abort();camera.current?.stop();camera.current=undefined;peer.current?.close();peer.current=undefined;busy.current=false;
  const id=room.current;room.current=undefined;if(id)void call({action:'stop',roomId:id}).catch(()=>{});
  setPhase('idle');setError(message);
 };
 useEffect(()=>{
  const hide=()=>{if(document.hidden)stop('Camera paused. Share again when you’re ready.');};
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',hide);stop();};
 },[token]);
 async function start(){
  if(phase!=='idle')return;
  const version=++run.current;setError('');setPhase('opening');handled.current.clear();
  const controller=new AbortController();abort.current=controller;
  try{
   // This explicit gesture is separate consent for sharing video with the advisor.
   const opened=await openNorwoodCamera(video.current!,controller.signal);
   if(run.current!==version){opened.stop();return;}camera.current=opened;
   const began=await call({action:'start'});
   if(run.current!==version){if(began.state)void call({action:'stop',roomId:began.state.roomId}).catch(()=>{});return;}
   if(!began.state||!began.iceServers)throw new Error('Camera connection unavailable. Please try again.');
   const state=began.state;room.current=state.roomId;
   const connection=new NorwoodLivePeer(began.iceServers,{
    connected:()=>{if(run.current===version){setPhase('live');connection.send({type:'status',views:currentViews.current});}},
    interrupted:()=>{if(run.current===version)stop('Camera disconnected. Share again to continue.');},
    message:message=>{void receive(message,version,connection);},
   });peer.current=connection;
   // Heartbeats run while ICE is gathered so neither side loses its lease.
   let connectedAt=0;const started=Date.now();
   const poll=async()=>{
    if(run.current!==version)return;
    try{
     const reply=await call({action:'poll',roomId:state.roomId});if(run.current!==version)return;
     if(!reply.state||reply.state.ended||Date.parse(reply.state.expiresAt)<=Date.now())throw new Error('Camera sharing ended.');
     if(reply.state.answer){await connection.accept(reply.state.answer);if(!connectedAt)connectedAt=Date.now();}
     if(connectedAt&&!reply.state.repPresent)throw new Error('Your advisor disconnected. Share again to continue.');
     if(Date.now()-started>60_000&&!connectedAt)throw new Error('Your advisor hasn’t connected. Let them know, then share again.');
     timer.current=setTimeout(poll,2000);
    }catch(e){if(run.current===version)stop(e instanceof Error?e.message:'Camera disconnected.');}
   };void poll();
   const offer=await connection.offer(video.current!.srcObject as MediaStream);
   if(run.current!==version)return;
   await call({action:'sdp',roomId:state.roomId,sdp:offer});if(run.current===version)setPhase('waiting');
  }catch(e){if(run.current===version)stop(e instanceof DOMException&&e.name==='NotAllowedError'?'Allow camera access in your browser, then try again.':e instanceof Error?e.message:'Camera unavailable. Please try again.');}
 }
 async function receive(message:LiveMessage,version:number,connection:NorwoodLivePeer){
  if(message.type!=='capture'||run.current!==version||busy.current||handled.current.has(message.id))return;
  handled.current.add(message.id);if(handled.current.size>100){stop('Please share your camera again.');return;}
  busy.current=true;setPhase('capturing');connection.send({type:'busy',id:message.id});
  let photos:string[]=[];
  try{
   if(currentViews.current.includes(message.view)){connection.send({type:'result',id:message.id,view:message.view,ready:true,message:'Already saved',views:currentViews.current});return;}
   for(let i=0;i<3;i++){
    if(run.current!==version||!camera.current)throw new Error('Camera stopped');
    photos.push(camera.current.photo());if(i<2)await new Promise(resolve=>setTimeout(resolve,350));
   }
   setPhase('checking');
   const result=await captureFn.current(photos[0],message.view,photos.slice(1));
   if(run.current!==version)return;
   const saved=result.ready?Array.from(new Set([...currentViews.current,message.view])):currentViews.current;
   currentViews.current=saved;
   connection.send({type:'result',id:message.id,view:message.view,ready:result.ready,message:result.message.slice(0,300),views:saved});
  }catch{if(run.current===version)connection.send({type:'result',id:message.id,view:message.view,ready:false,message:'The photo could not be checked. Please capture this angle again.',views:currentViews.current});}
  finally{photos=[];if(run.current===version){busy.current=false;setPhase('live');}}
 }
 const active=phase!=='idle';
 return <section className="nw-live-patient nw-card" aria-label="Camera with your advisor">
  <div className="nw-live-heading"><span className="nw-eyebrow">WITH YOUR ADVISOR</span><h1>{phase==='capturing'?'Hold still':phase==='checking'?'Photo taken':phase==='live'?'Your advisor can see you':phase==='waiting'?'Waiting for your advisor':phase==='opening'?'Opening your camera…':'Let’s do this together'}</h1></div>
  <div className={`nw-live-view ${!active?'nw-live-idle':''}`}>
   <video ref={video} autoPlay muted playsInline aria-label="Your camera" />
   {!active&&<div className="nw-live-invite"><Video size={56} strokeWidth={1.2}/><p>Hold your phone.<br/>Your advisor will guide you.</p></div>}
   {active&&<span className="nw-live-badge">{phase==='live'||phase==='capturing'||phase==='checking'?'● Sharing camera':'Connecting…'}</span>}
  </div>
  <div className="nw-live-controls">
   {error&&<p className="nw-error" role="alert">{error}</p>}
   {!active?<><p className="nw-live-disclosure">Share live camera video with your advisor. Only the 5 photos are saved.</p><button className="nw-primary" onClick={()=>void start()}><Camera size={20}/>Share camera with my advisor</button><p className="nw-live-footnote">Only start when safely stopped, never while driving.</p></>:<><p className="nw-live-one-line">{phase==='capturing'?'Your advisor is taking a photo.':phase==='checking'?'You can lower your arm.':'Stay on your call. Listen to your advisor.'}</p><button className="nw-live-stop" onClick={()=>stop()}><VideoOff size={20}/>Stop sharing</button></>}
  </div>
 </section>;
}
