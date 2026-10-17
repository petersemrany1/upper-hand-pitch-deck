import {describe,it,expect} from 'bun:test';
import {parseLiveMessage,liveRequestSchema} from './norwood-live';
import {NorwoodLivePeer} from './norwood-live-peer';
const id='00000000-0000-4000-8000-000000000001';
describe('live camera message boundaries',()=>{
 it('accepts only bounded capture commands for a real angle',()=>{
  expect(parseLiveMessage(JSON.stringify({type:'capture',id,view:'crown'}))?.type).toBe('capture');
  for(const value of [{type:'capture',id,view:'face'},{type:'capture',id,view:'front',audio:true},{type:'capture',id:'bad',view:'front'},{type:'capture',id,view:'front',photo:'private'}])expect(parseLiveMessage(JSON.stringify(value))).toBeNull();
  expect(parseLiveMessage('x'.repeat(2001))).toBeNull();expect(parseLiveMessage('{}')).toBeNull();
 });
 it('does not carry patient identifiers or arbitrary photo fields in capture results',()=>{
  expect(parseLiveMessage(JSON.stringify({type:'result',id,view:'front',ready:true,message:'Saved',views:['front']}))?.type).toBe('result');
  expect(parseLiveMessage(JSON.stringify({type:'result',id,view:'front',ready:true,message:'Saved',views:['front'],name:'Patient'}))).toBeNull();
 });
 it('rejects unbounded SDP, invalid client IDs and invented actions',()=>{
  expect(liveRequestSchema.safeParse({clientId:id,action:'start'}).success).toBe(true);
  for(const input of [{clientId:id,action:'record'},{clientId:'other',action:'poll'},{clientId:id,action:'sdp',sdp:'x'.repeat(30000)}])expect(liveRequestSchema.safeParse(input).success).toBe(false);
 });
 it('will never offer an audio track',async()=>{
  const Original=globalThis.RTCPeerConnection;
  (globalThis as any).RTCPeerConnection=class{};
  try{const p=new NorwoodLivePeer([],{message:()=>{},connected:()=>{},interrupted:()=>{}});await expect(p.offer({getAudioTracks:()=>[{}]} as MediaStream)).rejects.toThrow('Audio is not allowed');}
  finally{globalThis.RTCPeerConnection=Original;}
 });
});

// A mobile radio handover can briefly enter disconnected while the data channel
// remains usable. It must not force the patient to restart immediately.
it('allows transport recovery for 15 seconds, clears the deadline on recovery and stops persistent loss', () => {
  const Original=globalThis.RTCPeerConnection, originalTimeout=globalThis.setTimeout, originalClear=globalThis.clearTimeout;
  const timers=new Map<number,()=>void>();let next=0,interruptions=0;const recovery:boolean[]=[];
  class FakePeer{connectionState='new';onconnectionstatechange?:()=>void;close(){}}
  (globalThis as any).RTCPeerConnection=FakePeer;
  (globalThis as any).setTimeout=(cb:()=>void,ms:number)=>{expect(ms).toBe(15000);timers.set(++next,cb);return next;};
  (globalThis as any).clearTimeout=(id:number)=>timers.delete(id);
  try{
    const peer=new NorwoodLivePeer([],{message:()=>{},connected:()=>{},interrupted:()=>interruptions++,recovering:v=>recovery.push(v)});
    const pc=peer.pc as unknown as FakePeer;
    pc.connectionState='disconnected';pc.onconnectionstatechange!();expect(interruptions).toBe(0);expect(timers.size).toBe(1);
    pc.connectionState='connected';pc.onconnectionstatechange!();expect(timers.size).toBe(0);expect(recovery).toEqual([true,false]);
    pc.connectionState='disconnected';pc.onconnectionstatechange!();[...timers.values()][0]();expect(interruptions).toBe(1);peer.close();expect(timers.size).toBe(0);
  }finally{globalThis.RTCPeerConnection=Original;globalThis.setTimeout=originalTimeout;globalThis.clearTimeout=originalClear;}
});
