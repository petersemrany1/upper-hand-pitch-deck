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
 it('does not carry patient identifiers or photo bytes in capture responses',()=>{
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
