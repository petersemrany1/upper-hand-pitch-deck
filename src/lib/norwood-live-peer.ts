import { parseLiveMessage,type LiveMessage } from './norwood-live';
/** Video-only, one-way WebRTC. Signalling travels through the authenticated app server. */
export class NorwoodLivePeer {
 readonly pc:RTCPeerConnection;
 private channel:RTCDataChannel|null=null;
 private closed=false;
 constructor(iceServers:RTCIceServer[],private callbacks:{message:(m:LiveMessage)=>void;connected:()=>void;interrupted:()=>void;stream?:(s:MediaStream)=>void},relay=true){
  this.pc=new RTCPeerConnection({iceServers,iceTransportPolicy:relay?'relay':'all'});
  this.pc.onconnectionstatechange=()=>{if(this.closed)return;if(['failed','disconnected'].includes(this.pc.connectionState))callbacks.interrupted();};
  this.pc.ontrack=e=>{if(e.track.kind==='video')callbacks.stream?.(new MediaStream([e.track]));};
  this.pc.ondatachannel=e=>this.attach(e.channel);
 }
 private attach(channel:RTCDataChannel){
  if(this.channel){channel.close();return;}
  this.channel=channel;
  channel.onopen=()=>{if(!this.closed)this.callbacks.connected();};
  channel.onmessage=e=>{const message=parseLiveMessage(e.data);if(message&&!this.closed)this.callbacks.message(message);};
  channel.onclose=()=>{if(!this.closed)this.callbacks.interrupted();};
 }
 send(message:LiveMessage){if(this.closed||this.channel?.readyState!=='open')throw new Error('Camera disconnected');this.channel.send(JSON.stringify(message));}
 async offer(stream:MediaStream){
  if(stream.getAudioTracks().length)throw new Error('Audio is not allowed');
  const tracks=stream.getVideoTracks();if(tracks.length!==1)throw new Error('One camera is required');
  const transceiver=this.pc.addTransceiver(tracks[0],{direction:'sendonly',streams:[stream]});
  const params=transceiver.sender.getParameters();
  if(params.encodings?.length){params.encodings[0].maxBitrate=1_500_000;await transceiver.sender.setParameters(params);}
  this.attach(this.pc.createDataChannel('hair-profile',{ordered:true}));
  await this.pc.setLocalDescription(await this.pc.createOffer());return this.gather();
 }
 async answer(offer:string){
  await this.pc.setRemoteDescription({type:'offer',sdp:offer});
  for(const t of this.pc.getTransceivers())t.direction='recvonly';
  await this.pc.setLocalDescription(await this.pc.createAnswer());return this.gather();
 }
 async accept(answer:string){if(!this.pc.currentRemoteDescription)await this.pc.setRemoteDescription({type:'answer',sdp:answer});}
 private async gather(){
  if(this.pc.iceGatheringState!=='complete')await new Promise<void>((resolve,reject)=>{
   const finish=(error?:Error)=>{clearTimeout(timer);this.pc.removeEventListener('icegatheringstatechange',change);this.pc.removeEventListener('connectionstatechange',close);error?reject(error):resolve();};
   const change=()=>{if(this.pc.iceGatheringState==='complete')finish();};
   const close=()=>{if(this.closed)finish(new Error('Camera stopped'));};
   const timer=setTimeout(()=>finish(new Error('Camera network connection timed out. Try again.')),12_000);
   this.pc.addEventListener('icegatheringstatechange',change);this.pc.addEventListener('connectionstatechange',close);change();
  });
  if(this.closed||!this.pc.localDescription?.sdp)throw new Error('Camera stopped');
  return this.pc.localDescription.sdp;
 }
 close(){this.closed=true;this.channel?.close();this.pc.close();this.callbacks.stream?.(new MediaStream());}
}
