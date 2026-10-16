import { useEffect,useRef,useState } from 'react';
import { Camera,Video,VideoOff,Check } from 'lucide-react';
import { NORWOOD_VIEWS,type NorwoodView } from '@/lib/norwood-assessment';
import { LIVE_ANGLES,type LiveRequest,type RepLiveApi } from '@/lib/norwood-live';
import { NorwoodLivePeer } from '@/lib/norwood-live-peer';
import './norwood-live.css';
export default function NorwoodRepLive({leadId,assessmentId,api}:{leadId:string;assessmentId:string;api:RepLiveApi}){
 const video=useRef<HTMLVideoElement>(null),client=useRef(crypto.randomUUID()),run=useRef(0),peer=useRef<NorwoodLivePeer | undefined>(undefined),room=useRef<string | undefined>(undefined),timer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined),captureTimer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined),pending=useRef<string | undefined>(undefined);
 const [phase,setPhase]=useState<'idle'|'connecting'|'live'>('idle'),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[views,setViews]=useState<NorwoodView[]>([]),[view,setView]=useState<NorwoodView>('front');
 const call=async(input:Omit<LiveRequest,'clientId'>)=>{
  const reply=await Promise.race([api({data:{...input,clientId:client.current,leadId,assessmentId}}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Camera connection timed out. Reconnect to continue.')),12_000))]);
  if(!reply.ok)throw new Error(reply.error);return reply.data;
 };
 const stop=(reason='')=>{
  run.current++;clearTimeout(timer.current);clearTimeout(captureTimer.current);pending.current=undefined;setBusy(false);peer.current?.close();peer.current=undefined;if(video.current)video.current.srcObject=null;
  const id=room.current;room.current=undefined;if(id)void call({action:'stop',roomId:id}).catch(()=>{});
  setPhase('idle');setError(reason);
 };
 useEffect(()=>()=>stop(),[leadId,assessmentId]);
 async function join(){
  if(phase!=='idle')return;const version=++run.current;setPhase('connecting');setError('');setMessage('');
  try{
   let found=await call({action:'find'});
   for(let attempt=0;!found.state?.offer&&attempt<25;attempt++){
    if(run.current!==version)return;await new Promise(resolve=>setTimeout(resolve,2000));
    if(run.current!==version)return;found=await call({action:'find'});
   }
   if(run.current!==version)return;
   if(!found.state?.offer)throw new Error('Ask the patient to tap “Share camera with my advisor”, then connect.');
   const joined=await call({action:'join',roomId:found.state.roomId});
   if(run.current!==version){if(joined.state)void call({action:'stop',roomId:joined.state.roomId}).catch(()=>{});return;}
   if(!joined.state?.offer||!joined.iceServers)throw new Error('Patient camera is not ready yet.');
   const state=joined.state;room.current=state.roomId;
   const connection=new NorwoodLivePeer(joined.iceServers,{
    connected:()=>{if(run.current===version)setPhase('live');},
    interrupted:()=>{if(run.current===version)stop('Camera disconnected. Ask the patient to share again.');},
    stream:stream=>{if(video.current&&run.current===version){video.current.srcObject=stream;void video.current.play().catch(()=>{});}},
    message:m=>{
     if(run.current!==version)return;
     if(m.type==='status'){setViews(m.views);setView(NORWOOD_VIEWS.find(v=>!m.views.includes(v))??'right');}
     if(m.type==='result'&&m.id===pending.current){clearTimeout(captureTimer.current);pending.current=undefined;setBusy(false);setViews(m.views);setMessage(m.ready?'Photo checked and saved.':m.message);if(m.ready)setView(NORWOOD_VIEWS.find(v=>!m.views.includes(v))??'right');}
    },
   });peer.current=connection;
   const started=Date.now();
   const poll=async()=>{
    if(run.current!==version)return;
    try{
     const result=await call({action:'poll',roomId:state.roomId});if(run.current!==version)return;
     if(!result.state||result.state.ended||!result.state.patientPresent)throw new Error('Patient stopped sharing.');
     if(Date.now()-started>40_000&&connection.pc.connectionState!=='connected')throw new Error('Video did not connect. Ask the patient to share again.');
     timer.current=setTimeout(poll,2000);
    }catch(e){if(run.current===version)stop(e instanceof Error?e.message:'Camera interrupted.');}
   };void poll();
   const answer=await connection.answer(state.offer!);if(run.current!==version)return;
   await call({action:'sdp',roomId:state.roomId,sdp:answer});
  }catch(e){if(run.current===version)stop(e instanceof Error?e.message:'Could not connect the camera.');}
 }
 function take(){
  if(phase!=='live'||busy||views.includes(view)||!video.current||video.current.readyState<2)return;
  const id=crypto.randomUUID();pending.current=id;setBusy(true);setMessage('Checking this angle…');
  try{peer.current!.send({type:'capture',id,view});captureTimer.current=setTimeout(()=>{pending.current=undefined;setBusy(false);setMessage('Still waiting for the photo check. The saved-photo count will update when it finishes.');},95_000);}
  catch{stop('Camera disconnected. Ask the patient to share again.');}
 }
 if(views.length===5)return <section className="nw-rep-live" aria-live="polite"><strong>All five photos checked</strong><p>The estimate will appear here shortly.</p></section>;
 return <section className="nw-rep-live" aria-label="Guide the patient camera">
  <div className="nw-rep-title"><strong>Guide the patient’s camera</strong><span>{views.length}/5 checked</span></div>
  <div className="nw-rep-video"><video ref={video} autoPlay playsInline muted aria-label="Patient live camera"/>{phase!=='live'&&<div><Video size={34}/><span>{phase==='connecting'?'Connecting camera…':'See what they’re showing you'}</span></div>}</div>
  {phase==='live'?<><div className="nw-rep-angles">{NORWOOD_VIEWS.map(v=><button key={v} disabled={busy} aria-pressed={view===v} onClick={()=>{setView(v);setMessage('');}}>{views.includes(v)&&<Check size={12}/>} {LIVE_ANGLES[v].name}</button>)}</div><div className="nw-rep-direction"><b>Say: “{LIVE_ANGLES[view].instruction}”</b><p>{LIVE_ANGLES[view].check}</p></div><button className="nw-rep-capture" disabled={busy||views.includes(view)} onClick={take}><Camera size={18}/>{busy?'Checking photo…':views.includes(view)?'Photo saved':`Capture ${LIVE_ANGLES[view].name.toLowerCase()}`}</button></>:<button className="nw-rep-capture" disabled={phase==='connecting'} onClick={()=>void join()}><Video size={18}/>{phase==='connecting'?'Connecting…':'Connect to patient camera'}</button>}
  {(message||error)&&<p role="status" className={error?'nw-rep-error':''}>{error||message}</p>}
  {phase!=='idle'&&<button className="nw-rep-end" onClick={()=>stop()}><VideoOff size={15}/>End camera sharing</button>}
  <small>The patient keeps holding their phone. Guide one movement at a time. Only scan once safely stopped.</small>
 </section>;
}
