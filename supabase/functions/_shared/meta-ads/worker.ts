import { BUCKET, accountPath, adsetPayload, campaignPayload, creativePayload, requireGeoMatch, type Asset, type Draft, type Inflight, type Progress } from './model.ts';
import { ADSET_FIELDS, CAMPAIGN_FIELDS, MetaError, fingerprint, type Graph } from './graph.ts';
import { assetsForDraft } from './api.ts';
import { inspectDraft } from './review.ts';

type Job = Draft & { lease_token: string; attempts: number; review_plan: { snapshotHash: string }; pause_requested: boolean };
function result<T = any>(r: { data: T; error: any }): T { if(r.error) throw new Error(r.error.message); return r.data; }
export const objectName = (draft: string, kind: string, label: string, assetId = '') => `${label.slice(0,100)} [portal:${draft}:${kind}${assetId ? `:${assetId}` : ''}]`;
export async function runJob(db: any, graph: Graph, accountId: string, job: Job, timeLimit = 43000) {
  const started=Date.now(),c=job.config;
  let p: Progress=structuredClone(job.progress||{items:{}});
  p.items ||= {};
  const assets=await assetsForDraft(db,job.id);
  const checkpoint=async(extra:Record<string,unknown>={})=>{
    const r=result(await db.from('meta_ads_drafts').update({progress:p,updated_at:new Date().toISOString(),...extra}).eq('id',job.id).eq('lease_token',job.lease_token).select('id').maybeSingle());
    if(!r) throw new Error('Publishing lease expired. The next worker will resume this batch.');
  };
  const release=async(status='queued',delay=1000,error:string|null=null)=>checkpoint({status,error,next_attempt_at:new Date(Date.now()+delay).toISOString(),lease_token:null,lease_until:null});
  const event=async(event:string,detail:Record<string,unknown>={})=>{ result(await db.from('meta_ads_events').insert({draft_id:job.id,event,detail})); };
  const signed=async(path:string)=>result(await db.storage.from(BUCKET).createSignedUrl(path,24*3600)).signedUrl;
  const remember=(kind:Inflight['kind'],id:string,assetId?:string)=>{
    if(!/^\d+$/.test(id)) throw new MetaError('Meta returned no valid object ID. Check the request before continuing.',true);
    if(kind==='campaign')p.campaignId=id;
    else if(kind==='adset')p.adsetId=id;
    else p.items[assetId!]={...p.items[assetId!],[{video:'videoId',creative:'creativeId',ad:'adId'}[kind]]:id};
    delete p.inflight; delete p.ambiguous;
  };
  const create=async(kind:Inflight['kind'],label:string,payload:Record<string,unknown>,assetId?:string)=>{
    const name=objectName(job.id,kind,label,assetId),edge={campaign:'campaigns',adset:'adsets',video:'advideos',creative:'adcreatives',ad:'ads'}[kind];
    // Persist intent BEFORE the network call. An expired lease must reconcile it.
    p.inflight={kind,name,assetId,startedAt:new Date().toISOString()}; p.message=`Creating ${kind==='video'?'Meta video':kind}…`; await checkpoint();
    let created:any;
    try { created=await graph.post(`${accountId}/${edge}`,{...payload,...(kind==='video'?{title:name}:{name})}); }
    catch(e) { if(e instanceof MetaError&&!e.uncertain) { delete p.inflight; await checkpoint(); } throw e; }
    remember(kind,String(created.id||created.video_id||''),assetId); await checkpoint();
    await event(`${kind}_created`,{id:created.id||created.video_id,assetId});
  };
  const builtState=async()=>{
    const campaign=await graph.get(p.campaignId!,{fields:`${CAMPAIGN_FIELDS},account_id`});
    const adset=await graph.get(p.adsetId!,{fields:ADSET_FIELDS});
    if(accountPath(campaign.account_id)!==accountId||adset.campaign_id!==p.campaignId) throw new Error('The saved campaign or ad set no longer belongs to this batch.');
    requireGeoMatch(adset.targeting,c.locationExpansion);
    // Status changes made by this worker are excluded; audience, budget and schedule are not.
    const {status:_cs,effective_status:_ce,...campaignSettings}=campaign;
    const {status:_as,effective_status:_ae,...adsetSettings}=adset;
    return {campaign,adset,hash:await fingerprint({campaignSettings,adsetSettings})};
  };
  try {
    if(accountPath(c.accountId)!==accountId) throw new Error('This batch uses a different connected ad account.');
    // Recover only by finding the exact operation marker, never by retrying a create blindly.
    if(p.inflight){
      const op=p.inflight,edge={campaign:'campaigns',adset:'adsets',video:'advideos',creative:'adcreatives',ad:'ads'}[op.kind];
      const found=(await graph.all(`${accountId}/${edge}`,{fields:op.kind==='video'?'id,title':'id,name'})).filter((o:any)=>(o.name||o.title)===op.name);
      if(found.length!==1){p.ambiguous=true;throw new Error(found.length>1?'Meta returned multiple matches for an interrupted request. Inspect the batch in Ads Manager before continuing.':'Meta has not confirmed the interrupted request yet. Nothing was resent. Use “Check again” to reconcile it, or contact your administrator with this batch ID.');}
      remember(op.kind,found[0].id,op.assetId); await checkpoint(); await event('request_reconciled',{kind:op.kind,id:found[0].id});
    }
    while(Date.now()-started<timeLimit){
      const current=result(await db.from('meta_ads_drafts').select('pause_requested').eq('id',job.id).single());
      if(current.pause_requested){
        for(const item of Object.values(p.items)) if(item.adId&&!p.pausedAdIds?.includes(item.adId)){if(Date.now()-started>timeLimit){await release();return;}await graph.post(item.adId,{status:'PAUSED'});item.activated=false;item.effectiveStatus='PAUSED';p.pausedAdIds=[...(p.pausedAdIds||[]),item.adId];await checkpoint();}
        delete p.pausedAdIds;
        p.message='Batch paused. Existing campaigns and other ads were left unchanged.';
        await checkpoint({status:'cancelled',requested_mode:'PAUSED',pause_requested:false,lease_token:null,lease_until:null,error:null});await event('batch_paused');return;
      }
      if(!p.checked){
        const inspect=await inspectDraft(graph,c,assets,accountId);
        if(await fingerprint(inspect.snapshot)!==job.review_plan.snapshotHash) throw new Error('The Meta account, Page, campaign or ad set changed after review. This batch was stopped before creation.');
        if(job.requested_mode==='ACTIVE'&&inspect.activationBlockers.length) throw new Error(inspect.activationBlockers.join(' '));
        p.checked=true;await checkpoint();
      }
      if(!p.campaignId){
        if(c.mode!=='new_campaign'){p.campaignId=c.campaignId;await checkpoint();continue;}
        const account=await graph.get(accountId,{fields:'currency'});
        await create('campaign',c.campaignName,campaignPayload(c,account.currency,c.campaignName));continue;
      }
      if(!p.adsetId){
        if(c.mode==='existing_adset'){p.adsetId=c.adsetId;await checkpoint();continue;}
        const campaign=await graph.get(p.campaignId,{fields:'daily_budget,lifetime_budget'}),account=await graph.get(accountId,{fields:'currency'});
        const payload=adsetPayload(c,account.currency,p.campaignId,c.adsetName,!!(campaign.daily_budget||campaign.lifetime_budget));
        await graph.post(`${accountId}/adsets`,{...payload,execution_options:['validate_only']});
        await create('adset',c.adsetName,payload);continue;
      }
      if(!p.baseline){const state=await builtState();p.baseline=state.hash;await checkpoint();continue;}
      const missingVideo=c.creatives.find(ad=>!p.items[ad.assetId]?.videoId);
      if(missingVideo){const asset=assets.find(a=>a.id===missingVideo.assetId)!;const name=objectName(job.id,'video',asset.file_name,asset.id);await create('video',asset.file_name,{file_url:await signed(asset.path),title:name},asset.id);continue;}
      let progressed=false;
      for(const ad of c.creatives){
        if(Date.now()-started>timeLimit){await release();return;}
        const item=p.items[ad.assetId];if(item.adId)continue;
        const asset=assets.find(a=>a.id===ad.assetId)!;
        if(!item.creativeId){
          const video=await graph.get(item.videoId!,{fields:'status'}),status=video.status?.video_status;
          if(['error','expired'].includes(status))throw new Error(`Meta could not process “${asset.file_name}”. Check its format in Ads Manager.`);
          if(status!=='ready'){p.message='Meta is processing your videos. You can leave this page.';continue;}
          await create('creative',ad.name,creativePayload(c,ad,item.videoId!,await signed(asset.thumbnail_path),ad.name),asset.id);progressed=true;break;
        }
        await create('ad',ad.name,{adset_id:p.adsetId,creative:{creative_id:item.creativeId},status:'PAUSED'},asset.id);progressed=true;break;
      }
      if(progressed)continue;
      if(c.creatives.some(ad=>!p.items[ad.assetId]?.adId)){await release('queued',20000);return;}
      const state=await builtState();
      if(state.hash!==p.baseline)throw new Error('The audience, budget or schedule changed while this batch was being prepared. Ads are kept paused. Check Ads Manager before continuing.');
      if(job.requested_mode==='ACTIVE'){
        if(c.mode!=='new_campaign'&&state.campaign.status!=='ACTIVE')throw new Error('The existing campaign is paused. The new ads will stay paused.');
        if(c.mode==='existing_adset'&&state.adset.status!=='ACTIVE')throw new Error('The existing ad set is paused. The new ads will stay paused.');
        if(!p.parentActivated){
          if(c.mode==='new_campaign')await graph.post(p.campaignId,{status:'ACTIVE'});
          if(c.mode!=='existing_adset')await graph.post(p.adsetId,{status:'ACTIVE'});
          p.parentActivated=true;await checkpoint();continue;
        }
        const remaining=c.creatives.find(ad=>!p.items[ad.assetId].activated);
        if(remaining){
          // Geo is read back immediately before EACH activation, including resumed batches.
          requireGeoMatch(state.adset.targeting,c.locationExpansion);
          await graph.post(p.items[remaining.assetId].adId!,{status:'ACTIVE'});
          p.items[remaining.assetId].activated=true;await checkpoint();continue;
        }
        p.activatedAt=new Date().toISOString();p.message='Submitted to Meta. Delivery depends on review, schedule and account status.';
      }else p.message='All ads were created paused. They will not spend until activated.';
      const statuses=await graph.get('',{ids:Object.values(p.items).map(i=>i.adId).filter(Boolean).join(','),fields:'effective_status'});
      for(const item of Object.values(p.items))if(item.adId&&statuses[item.adId])item.effectiveStatus=statuses[item.adId].effective_status;
      await release('complete');await event('batch_complete',{mode:job.requested_mode,adCount:c.creatives.length});return;
    }
    await release('queued',1000);
  }catch(e){
    const error=e instanceof Error?e.message:'Publishing could not continue.';
    if(p.inflight)p.ambiguous=true;
    // Status updates are repeatable. If activation fails halfway, pause only this batch's ads.
    if(job.requested_mode==='ACTIVE'&&(p.parentActivated||Object.values(p.items).some(i=>i.activated))){
      // Persist the stop before compensating: a timeout must resume pausing, never activation.
      await checkpoint({pause_requested:true});
      let pauseFailed=false;
      for(const item of Object.values(p.items))if(item.adId&&!p.pausedAdIds?.includes(item.adId)){
        if(Date.now()-started>timeLimit){pauseFailed=true;break;}
        try{await graph.post(item.adId,{status:'PAUSED'});item.activated=false;item.effectiveStatus='PAUSED';p.pausedAdIds=[...(p.pausedAdIds||[]),item.adId];await checkpoint();}catch{pauseFailed=true;}
      }
      if(!pauseFailed){delete p.pausedAdIds;await checkpoint({pause_requested:false});}
      p.message=pauseFailed?'Some ads may still be active. Open Ads Manager or use Pause batch immediately.':'The batch stopped and its new ads were paused.';
    }
    await event('batch_interrupted',{message:error,uncertain:!!p.inflight});
    const retry=e instanceof MetaError&&e.retryable&&!e.uncertain&&!p.inflight&&job.attempts<8;
    await release(retry?'queued':'needs_attention',retry?60000:1000,error);
  }
}
