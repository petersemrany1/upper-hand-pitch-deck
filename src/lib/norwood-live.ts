import { z } from 'zod';
import { NORWOOD_VIEWS, type NorwoodView } from './norwood-assessment';
export type LiveReply<T> = {ok:true;data:T}|{ok:false;error:string};
export type LiveState = { roomId:string; expiresAt:string; offer:string|null; answer:string|null; patientPresent:boolean; repPresent:boolean; ended:boolean };
export type LiveConnection = {state:LiveState;iceServers:RTCIceServer[]};
export const liveRequestSchema = z.object({clientId:z.string().uuid(),roomId:z.string().uuid().optional(),action:z.enum(['start','find','join','poll','sdp','stop']),sdp:z.string().max(29999).optional()}).strict();
export type LiveRequest = z.infer<typeof liveRequestSchema>;
export type PatientLiveApi = (input:{data:LiveRequest & {token:string}})=>Promise<LiveReply<{state:LiveState|null;iceServers?:RTCIceServer[]}>>;
export type RepLiveApi = (input:{data:LiveRequest & {leadId:string;assessmentId:string}})=>Promise<LiveReply<{state:LiveState|null;iceServers?:RTCIceServer[]}>>;
const capture = z.object({type:z.literal('capture'),id:z.string().uuid(),view:z.enum(NORWOOD_VIEWS)}).strict();
const result = z.object({type:z.literal('result'),id:z.string().uuid(),view:z.enum(NORWOOD_VIEWS),ready:z.boolean(),message:z.string().max(300),views:z.array(z.enum(NORWOOD_VIEWS)).max(5)}).strict();
const status = z.object({type:z.literal('status'),views:z.array(z.enum(NORWOOD_VIEWS)).max(5)}).strict();
const guide = z.object({type:z.literal('guide'),view:z.enum(NORWOOD_VIEWS)}).strict();
const preview = z.object({type:z.literal('photo-preview'),id:z.string().uuid(),index:z.number().int().min(0).max(15),total:z.number().int().min(1).max(16),data:z.string().min(1).max(8192).regex(/^[A-Za-z0-9+/=]+$/)}).strict();
const busy = z.object({type:z.literal('busy'),id:z.string().uuid()}).strict();
export const liveMessageSchema=z.discriminatedUnion('type',[capture,result,status,busy,guide,preview]);
export type LiveMessage=z.infer<typeof liveMessageSchema>;
export function parseLiveMessage(raw:unknown):LiveMessage|null {
 if(typeof raw!=='string'||raw.length>9000)return null;
 try{return liveMessageSchema.parse(JSON.parse(raw));}catch{return null;}
}
export const LIVE_ANGLES:Record<NorwoodView,{name:string;instruction:string;check:string}>={
 front:{name:'Hairline',instruction:'Face the phone. Hold your hair back, away from both corners.',check:'Before capturing: see the entire front hairline and both temple corners. Keep fingers above the hairline.'},
 top:{name:'Top',instruction:'Lift the phone above your forehead. Tip it towards your head.',check:'See from the front hairline through the middle of the scalp.'},
 crown:{name:'Crown',instruction:'Move the phone a little behind the top of your head.',check:'See the back of the top, with the back and sides for context. Guide their hand while you watch.'},
 left:{name:'Left side',instruction:'Bring the phone beside your left ear.',check:'See the left temple, ear and upper scalp. Ask the patient which side they are showing.'},
 right:{name:'Right side',instruction:'Bring the phone beside your right ear.',check:'See the right temple, ear and upper scalp. Ask the patient which side they are showing.'},
};
