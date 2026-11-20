import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { isInternalCall } from '../_shared/authorize-core.ts';
import { maintainPool, type Purchase, type Settings } from './workflow.ts';
import { PoolProvider } from './twilio.ts';
import { releaseRetiredNumbers } from './releases.ts';
const json = (body: unknown, status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
serve(async req => {
  if (req.method !== 'POST') return json({error:'Method not allowed'},405);
  let body: Record<string,unknown>;
  try { body=await req.json(); } catch { return json({error:'JSON body required'},400); }
  if (!body || Array.isArray(body) || typeof body!=='object' || Object.keys(body).some(k=>!['dry_run','job_id','job_token'].includes(k)) || ('dry_run' in body && typeof body.dry_run !== 'boolean')) return json({error:'Invalid maintenance request'},400);
  const dryRun = body.dry_run === true;
  const base = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const account = Deno.env.get('TWILIO_ACCOUNT_SID'), token = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!base || !key || !account || !token) return json({error:'Existing provider configuration unavailable'},503);
  const sb=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const lease=crypto.randomUUID();
  const rpc=async(name:string,args:Record<string,unknown>={})=>{
    const {data,error}=await sb.rpc(name,args).abortSignal(AbortSignal.timeout(10_000));
    if(error) throw new Error(`${name}: ${error.message}`); return data;
  };
  const checked=async(query:any)=>{ const {data,error}=await query; if(error) throw new Error(error.message); return data; };
  const internal=isInternalCall({internalSecretHeader:req.headers.get('x-internal-secret'),bearerToken:req.headers.get('authorization')?.replace(/^Bearer /i,'') || null},
    {internalSecret:Deno.env.get('INTERNAL_FUNCTION_SECRET'),serviceRoleKey:key});
  if(!internal) {
    if(typeof body.job_id!=='string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.job_id) || typeof body.job_token!=='string' || !/^[0-9a-f]{64}$/.test(body.job_token)) return json({error:'Unauthorized'},401);
    try {
      if(!await rpc('consume_voice_pool_job',{p_id:body.job_id,p_token:body.job_token,p_dry_run:dryRun})) return json({error:'Unauthorized'},401);
    } catch {return json({error:'Job authentication unavailable'},503);}
  }
  let held=false;
  const report=async(result:{result:string;error?:string})=>{
    await checked(sb.from('voice_pool_settings').update({checked_at:new Date().toISOString(),last_result:result.result,last_error:result.error || null}).eq('singleton',true));
    if(result.error) {
      const old=await checked(sb.from('error_logs').select('id').eq('function_name','voice-pool-maintenance').eq('error_message',result.error).eq('resolved',false).limit(1));
      if(!old.length) await checked(sb.from('error_logs').insert({function_name:'voice-pool-maintenance',error_message:result.error,context:{result:result.result}}));
    }
  };
  try {
    const settings:Settings = dryRun ? await checked(sb.from('voice_pool_settings').select('*').eq('singleton',true).single()) : await rpc('voice_pool_lease',{p_token:lease});
    if(!settings) return json({result:'disabled_or_busy'});
    held=!dryRun;
    const pool=await checked(sb.from('phone_numbers').select('number,twilio_sid,status,mms_enabled,retired_at,release_due_at,released_at'));
    const pending:Purchase|null=await checked(sb.from('voice_pool_purchases').select('*').in('state',['prepared','requested','uncertain']).maybeSingle());
    const provider=new PoolProvider(account,token,base);
    const releases=await releaseRetiredNumbers({enabled:settings.release_enabled === true,numbers:pool,now:Date.now(),
      begin:n=>rpc('voice_pool_begin_release',{p_token:lease,p_number:n.number,p_sid:n.twilio_sid}),
      release:n=>provider.release(n),
      finish:async(n,error)=>{await rpc('voice_pool_finish_release',{p_number:n.number,p_sid:n.twilio_sid,p_error:error});},
    },dryRun);
    const result=await maintainPool({settings,pool,pending,baseUrl:base,budget:await rpc('voice_pool_budget'),
      quote:phone=>provider.quote(pool.filter((n:any)=>!n.released_at && n.status==='active'),phone),owned:phone=>provider.owned(phone),buy:(quote,id)=>provider.buy(quote,id),
      reserve:quote=>rpc('voice_pool_reserve',{p_token:lease,p_phone:quote.phone,p_cents:quote.cents,p_currency:quote.currency}),
      begin:id=>rpc('voice_pool_begin',{p_token:lease,p_id:id}),
      finish:async(id,n)=>{await rpc('voice_pool_finish',{p_id:id,p_sid:n.sid,p_mms:n.mms});},
      mark:async(id,state,error)=>{await checked(sb.from('voice_pool_purchases').update({state,error,updated_at:new Date().toISOString()}).eq('id',id).neq('state','purchased'));},
    },dryRun);
    if(!dryRun) await report({...result,error:[result.error,...releases.errors].filter(Boolean).join('; ') || undefined});
    return json({...result,releases,dry_run:dryRun});
  } catch(error) {
    const message=error instanceof Error?error.message:'Replacement maintenance failed';
    if(!dryRun && held) { try {await report({result:'error',error:message});} catch { /* original error remains available to scheduler */ } }
    return json({result:'error',error:message,dry_run:dryRun},503);
  } finally {
    if(held) {try{await rpc('voice_pool_lease',{p_token:lease,p_release:true});}catch{/* expires after five minutes */}}
  }
});
