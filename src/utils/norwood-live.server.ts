import { readFramingReview, signFramingReview } from './norwood-framing-review.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { assertNorwoodStaff, hashNorwoodToken, latestNorwood, patientAction, type AssessmentRow } from './norwood-sandbox.server';
import type { LiveRequest, LiveState } from '@/lib/norwood-live';
const db=()=>supabaseAdmin as any;
function publicState(row:any):LiveState|null {
 if(!row?.room_id)return null;
 return {roomId:row.room_id,expiresAt:row.expires_at,offer:row.offer,answer:row.answer,ended:row.ended,
 patientPresent:Date.parse(row.patient_seen)>Date.now()-15_000,repPresent:Date.parse(row.rep_seen)>Date.now()-15_000};
}
export async function liveIceServers():Promise<RTCIceServer[]> {
 const sid=process.env.TWILIO_ACCOUNT_SID,secret=process.env.TWILIO_AUTH_TOKEN;
 if(!sid||!secret)throw new Error('The camera connection is not configured.');
 const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Tokens.json`,{method:'POST',signal:AbortSignal.timeout(10_000),headers:{Authorization:`Basic ${Buffer.from(`${sid}:${secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({Ttl:'600'})});
 if(!response.ok)throw new Error('The camera connection could not start. Please retry.');
 const body=await response.json();
 const ice=(Array.isArray(body.ice_servers)?body.ice_servers:[]).filter((v:any)=>typeof v.urls==='string'&&/^turns?:/.test(v.urls)&&typeof v.username==='string'&&typeof v.credential==='string').map((v:any)=>({urls:v.urls,username:v.username,credential:v.credential}));
 if(!ice.length)throw new Error('The camera relay is unavailable. Please retry.');
 return ice;
}
async function action(row:AssessmentRow,role:'patient'|'rep',input:LiveRequest,repId?:string){
 const {data,error}=await db().rpc('norwood_preview_live_action',{p_assessment:row.id,p_role:role,p_action:input.action,p_client:input.clientId,p_room:input.roomId??null,p_rep:repId??null,p_sdp:input.sdp??null});
 if(error){
  const safe=['This camera','Invalid camera','Your camera','Please ask','Camera sharing','Wait for','An advisor','Camera access','Connect the'];
  throw new Error(safe.some(s=>error.message.startsWith(s))?error.message:'Live camera setup is unavailable. Your advisor can retry shortly.');
 }
 if(input.action==='stop')console.info('Norwood camera stopped',{side:role,reason:input.stopReason??'user_stop'});
 return publicState(data);
}
export async function patientLive(token:string,input:LiveRequest){
 if(!['start','poll','sdp','stop'].includes(input.action))throw new Error('Invalid camera request');
 const row=await patientAction(hashNorwoodToken(token),'open');
 const state=await action(row,'patient',input);
 const iceServers=input.action==='start'?await liveIceServers():undefined;
 return {state,iceServers};
}
export async function repLive(userDb:any,leadId:string,assessmentId:string,input:LiveRequest){
 if(!['find','join','poll','sdp','stop','review'].includes(input.action))throw new Error('Invalid camera request');
 const actor=await assertNorwoodStaff(userDb,leadId);
 const row=await latestNorwood(userDb,leadId);
 if(!row||row.id!==assessmentId)throw new Error('This camera session was replaced. Refresh the assessment.');
 // Waiting for patient consent is normal. Only the rep who sent this link
 // discovers it automatically; other signed-in reps must not race to join it.
 if(input.action==='find' && (!row.consented_at || !row.framing_consented_at || (row.created_by && row.created_by!==actor.id)))return {state:null};
 if(input.action==='review'){
  if(!input.reviewTicket || !input.reviewConfirmed || !input.roomId || row.revoked_at || Date.parse(row.expires_at)<=Date.now() || !row.consented_at || !row.framing_consented_at || !['sent','opened'].includes(row.status))throw new Error('Photo review is unavailable.');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY??'';
  const ticket=readFramingReview(input.reviewTicket,key,'framing-review');
  if(ticket.assessment!==row.id)throw new Error('Photo review does not match this assessment.');
  // The RPC authenticates the joined rep, browser client and room, checks live
  // consent/expiry, and refreshes their heartbeat before issuing an approval.
  const state=await action(row,'rep',{...input,action:'poll'},actor.id);
  if(!state || state.ended)throw new Error('Camera sharing stopped.');
  const reviewApproval=signFramingReview({...ticket,purpose:'framing-approved',reviewer:actor.id,room:state.roomId,expires:Math.min(ticket.expires,Date.parse(state.expiresAt))},key);
  return {state,reviewApproval};
 }
 const state=await action(row,'rep',input,actor.id);
 const iceServers=input.action==='join'?await liveIceServers():undefined;
 return {state,iceServers};
}
export async function checkLiveSetup(){
 const {error}=await db().from('norwood_preview_live').select('assessment_id').limit(0);
 if(error)throw new Error('The live camera database update is still needed.');
 // Connectivity only: no camera, no patient data, no video room or SMS is created.
 await liveIceServers();
 return true;
}
