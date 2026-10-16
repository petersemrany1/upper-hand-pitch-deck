import { createServerFn } from '@tanstack/react-start';
import { getRequest,setResponseHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assertNorwoodPreviewRequest } from '@/lib/norwood-preview-access';
import { liveRequestSchema } from '@/lib/norwood-live';
import { assertNorwoodStaff } from './norwood-sandbox.server';
import { patientLive,repLive,liveIceServers } from './norwood-live.server';
async function safe<T>(work:()=>Promise<T>){
 setResponseHeader('Cache-Control','no-store, private');setResponseHeader('Referrer-Policy','no-referrer');
 try{const r=getRequest();assertNorwoodPreviewRequest(r.url,r.headers.get('origin'));return {ok:true as const,data:await work()};}
 catch(e){return {ok:false as const,error:e instanceof Error?e.message:'Camera connection interrupted. Please reconnect.'};}
}
export const patientNorwoodLive=createServerFn({method:'POST'}).inputValidator(liveRequestSchema.extend({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}))
 .handler(({data})=>safe(()=>{const {token,...input}=data;return patientLive(token,input);}));
export const repNorwoodLive=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(liveRequestSchema.extend({leadId:z.string().uuid(),assessmentId:z.string().uuid()}))
 .handler(({data,context})=>safe(()=>{const {leadId,assessmentId,...input}=data;return repLive(context.supabase,leadId,assessmentId,input);}));

export const testNorwoodCameraRelay=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({leadId:z.string().uuid()}))
 .handler(({data,context})=>safe(async()=>{await assertNorwoodStaff(context.supabase,data.leadId);return liveIceServers();}));
