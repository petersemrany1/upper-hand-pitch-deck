import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import { dispatch } from '../_shared/meta-ads/api.ts';
import { configuredAccount, createGraph } from '../_shared/meta-ads/graph.ts';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  try {
    const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'');
    if(!bearer) return json({error:'Sign in to use Meta Ads.'},401);
    const {data:{user},error}=await db.auth.getUser(bearer);
    if(error||!user?.email) return json({error:'Your session expired. Sign in again.'},401);
    const {data:rep,error:roleError}=await db.from('sales_reps').select('role,is_active').eq('email',user.email).maybeSingle();
    if(roleError||rep?.role!=='admin'||rep.is_active===false) return json({error:'Meta Ads is available to administrators only.'},403);
    const raw=await req.text();
    if(raw.length>256000) return json({error:'This request is too large.'},413);
    const body=JSON.parse(raw);
    const token=Deno.env.get('META_ACCESS_TOKEN'),configured=Deno.env.get('META_AD_ACCOUNT_ID');
    const result=await dispatch(body.action,body.data||{},{db,owner:user.id,graph:token?createGraph(token):null,accountId:configured?configuredAccount(configured):null,storageUrl:url,publishableKey:Deno.env.get('SUPABASE_ANON_KEY')!});
    return json({data:result});
  } catch(error) { return json({error:error instanceof Error?error.message:'Meta Ads could not complete that action.'},400); }
});
