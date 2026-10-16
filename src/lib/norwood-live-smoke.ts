import {NorwoodLivePeer} from './norwood-live-peer';
/** Synthetic video through the real relay. Does not request camera/microphone. */
export async function testNorwoodLiveRelay(iceServers:RTCIceServer[]){
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
 const ctx=canvas.getContext('2d')!;let frame=0;
 const draw=()=>{ctx.fillStyle=frame++%2?'#174a39':'#517d63';ctx.fillRect(0,0,320,240);};draw();
 const interval=setInterval(draw,100),stream=canvas.captureStream(10);
 const video=document.createElement('video');video.muted=true;video.autoplay=true;video.playsInline=true;
 let sender:NorwoodLivePeer|undefined,receiver:NorwoodLivePeer|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 try{
  await new Promise<void>((resolve,reject)=>{
   let control=false,picture=false;
   const ready=()=>{if(control&&picture)resolve();};
   const interrupted=()=>reject(new Error('The video relay could not connect from this network.'));
   sender=new NorwoodLivePeer(iceServers,{message:()=>{},connected:()=>sender!.send({type:'status',views:[]}),interrupted});
   receiver=new NorwoodLivePeer(iceServers,{message:m=>{if(m.type==='status'){control=true;ready();}},connected:()=>{},interrupted,stream:s=>{if(!s.getVideoTracks().length)return;video.srcObject=s;video.onloadeddata=()=>{picture=video.videoWidth>0;ready();};void video.play().catch(interrupted);}});
   timer=setTimeout(()=>reject(new Error('The camera relay test timed out. Please retry.')),25_000);
   void sender.offer(stream).then(offer=>receiver!.answer(offer)).then(answer=>sender!.accept(answer)).catch(reject);
  });
  return true;
 }finally{clearInterval(interval);clearTimeout(timer);sender?.close();receiver?.close();stream.getTracks().forEach(t=>t.stop());video.pause();video.srcObject=null;}
}
