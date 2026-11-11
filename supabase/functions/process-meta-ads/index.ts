import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import { configuredAccount, createGraph } from '../_shared/meta-ads/graph.ts';
import { runJob } from '../_shared/meta-ads/worker.ts';
Deno.serve(async(req)=>{
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!service||req.headers.get('authorization')!==`Bearer ${service}`)return new Response('Unauthorized',{status:401});
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const db=createClient(Deno.env.get('SUPABASE_URL')!,service,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const token=Deno.env.get('META_ACCESS_TOKEN'),account=Deno.env.get('META_AD_ACCOUNT_ID');
    if(!token||!account)return Response.json({ok:false,message:'Meta publishing credentials are not configured.'},{status:503});
    const {error:healthError}=await db.from('meta_ads_runtime').update({heartbeat_at:new Date().toISOString(),version:'1'}).eq('id',true);
    if(healthError)throw healthError;
    const {data,error}=await db.rpc('meta_ads_claim');if(error)throw error;
    if(data?.[0])await runJob(db,createGraph(token),configuredAccount(account),data[0]);
    return Response.json({ok:true,processed:!!data?.length});
  }catch{ return Response.json({ok:false,message:'The publishing worker could not finish. Check its server logs and saved batch state.'},{status:500}); }
});
