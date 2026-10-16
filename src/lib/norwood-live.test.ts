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
it('allows a brief network interruption to recover, but ends a persistent disconnect', async () => {
  const Original = globalThis.RTCPeerConnection;
  class FakePeer { connectionState = 'new'; onconnectionstatechange?: () => void; close() {} }
  (globalThis as any).RTCPeerConnection = FakePeer;
  let interruptions = 0;
  try {
    const peer = new NorwoodLivePeer([], {message:()=>{},connected:()=>{},interrupted:()=>interruptions++});
    const pc = peer.pc as unknown as FakePeer;
    pc.connectionState = 'disconnected'; pc.onconnectionstatechange!();
    expect(interruptions).toBe(0);
    pc.connectionState = 'connected'; pc.onconnectionstatechange!();
    await new Promise(resolve => setTimeout(resolve, 5100));
    expect(interruptions).toBe(0);
    pc.connectionState = 'disconnected'; pc.onconnectionstatechange!();
    await new Promise(resolve => setTimeout(resolve, 5100));
    expect(interruptions).toBe(1); peer.close();
  } finally { globalThis.RTCPeerConnection = Original; }
}, 12000);
