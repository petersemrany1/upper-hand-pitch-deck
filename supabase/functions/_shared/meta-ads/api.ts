import { BUCKET, MAX_VIDEO_BYTES, accountPath, emptyConfig, parseConfig, type Asset, type Draft, type Setup } from './model.ts';
import { ADSET_FIELDS, CAMPAIGN_FIELDS, type Graph } from './graph.ts';
import { makeReview, pagesForAccount, searchLocations } from './review.ts';

const uuid = (v: unknown) => { if (typeof v !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v)) throw new Error('Invalid batch or upload ID.'); return v; };
function unwrap<T = any>({ data, error }: { data: T; error: any }): T { if (error) throw new Error(error.message); return data; }
export async function ownedDraft(db: any, id: unknown, owner: string): Promise<Draft> {
  const draft = unwrap<Draft>(await db.from('meta_ads_drafts').select('*').eq('id', uuid(id)).eq('owner_id', owner).maybeSingle());
  if (!draft) throw new Error('Batch not found.');
  return draft;
}
export async function assetsForDraft(db: any, id: string): Promise<Asset[]> { return unwrap(await db.from('meta_ads_assets').select('*').eq('draft_id', id).order('created_at')); }
async function signedAsset(db: any, asset: Asset) {
  if (asset.status !== 'ready') return asset;
  const [video, thumb] = await Promise.all([db.storage.from(BUCKET).createSignedUrl(asset.path, 3600), db.storage.from(BUCKET).createSignedUrl(asset.thumbnail_path, 3600)]);
  return { ...asset, previewUrl: unwrap(video).signedUrl, thumbnailUrl: unwrap(thumb).signedUrl };
}
export async function dispatch(action: string, input: any, context: { db: any; owner: string; graph: Graph | null; accountId: string | null; storageUrl: string; publishableKey: string }) {
  const { db, owner, graph, accountId } = context;
  const requireMeta = (): Graph => { if (!graph || !accountId) throw new Error('Meta publishing is not connected yet. Configure the Meta access token and ad account on the server.'); return graph; };
  const editable = async (id: unknown) => { const d = await ownedDraft(db,id,owner); if (d.status !== 'draft') throw new Error('This batch has been submitted and cannot be edited.'); return d; };
  switch (action) {
    case 'setup': {
      const health = await db.from('meta_ads_runtime').select('*').eq('id', true).maybeSingle();
      const base: Setup = { configured: !!graph && !!accountId, databaseReady: !health.error && !!health.data, workerReady: !!health.data?.heartbeat_at && Date.parse(health.data.heartbeat_at) > Date.now()-5*60000, pages: [], campaigns: [] };
      if (!base.databaseReady) return { ...base, message: 'The Meta Ads database setup is pending. Your administrator needs to deploy the Meta Ads migrations.' };
      if (!graph || !accountId) return { ...base, message: 'Connect Meta publishing on the server to load your real campaigns, Pages and lead forms.' };
      try {
        const [account,pages,campaigns] = await Promise.all([graph.get(accountId,{ fields:'id,name,currency,timezone_name,account_status' }),pagesForAccount(graph,accountId),graph.all(`${accountId}/campaigns`,{fields:CAMPAIGN_FIELDS,effective_status:['ACTIVE','PAUSED']})]);
        return { ...base, account,pages,campaigns, ...(!base.workerReady ? { message: 'The publishing worker is not running yet. You can prepare drafts; publishing will unlock when it is connected.' } : {}) };
      } catch(e) { return { ...base, configured:false,message:e instanceof Error?e.message:'Meta connection failed.' }; }
    }
    case 'list': return unwrap(await db.from('meta_ads_drafts').select('id,name,status,revision,requested_mode,progress,error,updated_at,created_at').eq('owner_id',owner).order('updated_at',{ascending:false}).limit(100));
    case 'get': {
      const draft = await ownedDraft(db,input.id,owner);
      return { ...draft, assets: await Promise.all((await assetsForDraft(db,draft.id)).map(a=>signedAsset(db,a))) };
    }
    case 'save': {
      const config = parseConfig(input.config);
      if (config.accountId && accountId && accountPath(config.accountId)!==accountId) throw new Error('This ad account is not connected.');
      return unwrap(await db.rpc('meta_ads_save',{p_id:input.id ? uuid(input.id) : null,p_owner:owner,p_revision:Number(input.revision)||0,p_config:config,p_name:config.campaignName||'Untitled batch'}));
    }
    case 'choices': {
      const g = requireMeta();
      if (input.kind==='adsets') {
        if (!/^\d+$/.test(input.parent)) throw new Error('Choose a campaign.');
        const campaign=await g.get(input.parent,{fields:'account_id'});
        if(accountPath(campaign.account_id)!==accountId) throw new Error('Campaign not available.');
        return g.all(`${input.parent}/adsets`,{fields:ADSET_FIELDS,effective_status:['ACTIVE','PAUSED','CAMPAIGN_PAUSED']});
      }
      if (input.kind==='forms') {
        const pages=await pagesForAccount(g,accountId!);
        if(!pages.some(p=>p.id===input.parent)) throw new Error('Page not available.');
        return (await g.all(`${input.parent}/leadgen_forms`,{fields:'id,name,status'})).filter((f:any)=>f.status==='ACTIVE');
      }
      if(input.kind==='pixels') return g.all(`${accountId}/adspixels`,{fields:'id,name'});
      if(input.kind==='audiences') return g.all(`${accountId}/customaudiences`,{fields:'id,name,subtype'});
      throw new Error('Unknown selection.');
    }
    case 'search': {
      const g=requireMeta(); const query=String(input.query||'').trim().slice(0,150);
      if(query.length<2) return [];
      if(input.kind==='locations') return searchLocations(g,query,String(input.country),String(input.type));
      if(input.kind==='interests') return (await g.get(`${accountId}/targetingsearch`,{type:'adinterest',q:query,limit:30})).data||[];
      throw new Error('Unknown search.');
    }
    case 'register': {
      const draft=await editable(input.id);
      const f=input.file;
      if(!f || !Number.isSafeInteger(f.size) || f.size<1 || f.size>MAX_VIDEO_BYTES || !['video/mp4','video/quicktime','video/webm'].includes(f.mime) || !Number.isInteger(f.width) || f.width<1 || !Number.isInteger(f.height) || f.height<1 || !Number.isFinite(f.duration) || f.duration<=0) throw new Error('Choose a playable MP4, MOV or WebM video up to 1 GB.');
      const id=crypto.randomUUID(); const path=`${owner}/${draft.id}/${id}`;
      return unwrap(await db.rpc('meta_ads_asset',{p_draft:draft.id,p_owner:owner,p_asset:{id,file_name:String(f.name).slice(0,255),size:f.size,mime:f.mime,width:f.width,height:f.height,duration:f.duration,path:`${path}/video`,thumbnail_path:`${path}/thumbnail.jpg`},p_complete:false}));
    }
    case 'upload_urls': {
      const draft=await editable(input.id); const asset=(await assetsForDraft(db,draft.id)).find(a=>a.id===uuid(input.assetId));
      if(!asset) throw new Error('Upload not found.');
      if(asset.status==='ready') throw new Error('This video is already uploaded. Remove it and add a new file to replace it.');
      const video=unwrap(await db.storage.from(BUCKET).createSignedUploadUrl(asset.path,{upsert:true}));
      const thumbnail=unwrap(await db.storage.from(BUCKET).createSignedUploadUrl(asset.thumbnail_path,{upsert:true}));
      return {videoToken:video.token,thumbnailToken:thumbnail.token,path:asset.path,thumbnailPath:asset.thumbnail_path,storageUrl:context.storageUrl,publishableKey:context.publishableKey,bucket:BUCKET};
    }
    case 'complete_upload': {
      const draft=await editable(input.id); const asset=(await assetsForDraft(db,draft.id)).find(a=>a.id===uuid(input.assetId));
      if(!asset) throw new Error('Upload not found.');
      if(asset.status==='ready')return signedAsset(db,asset);
      const video=unwrap(await db.storage.from(BUCKET).info(asset.path));
      const thumb=unwrap(await db.storage.from(BUCKET).info(asset.thumbnail_path));
      if(Number(video.metadata?.size)!==asset.size || !String(video.metadata?.mimetype||'').startsWith('video/') || !String(thumb.metadata?.mimetype||'').startsWith('image/') || Number(thumb.metadata?.size)>10*1024*1024) throw new Error('The uploaded files are incomplete or do not match the selected video. Retry this upload.');
      // Freeze a private copy. Outstanding signed upload tokens can only alter staging files.
      const sealed=`${owner}/${draft.id}/${asset.id}/sealed/${crypto.randomUUID()}`;
      unwrap(await db.storage.from(BUCKET).copy(asset.path,`${sealed}/video`));
      unwrap(await db.storage.from(BUCKET).copy(asset.thumbnail_path,`${sealed}/thumbnail.jpg`));
      const complete=unwrap<Asset>(await db.rpc('meta_ads_asset',{p_draft:draft.id,p_owner:owner,p_asset:{id:asset.id,path:`${sealed}/video`,thumbnail_path:`${sealed}/thumbnail.jpg`},p_complete:true}));
      return signedAsset(db,complete);
    }
    case 'thumbnail_url': {
      const draft=await editable(input.id),asset=(await assetsForDraft(db,draft.id)).find(a=>a.id===uuid(input.assetId));
      if(!asset||asset.status!=='ready')throw new Error('Finish uploading this video first.');
      const path=`${owner}/${draft.id}/${asset.id}/covers/${crypto.randomUUID()}.jpg`;
      return {...unwrap(await db.storage.from(BUCKET).createSignedUploadUrl(path)),path,bucket:BUCKET};
    }
    case 'complete_thumbnail': {
      const draft=await editable(input.id),asset=(await assetsForDraft(db,draft.id)).find(a=>a.id===uuid(input.assetId));
      if(!asset||asset.status!=='ready')throw new Error('Finish uploading this video first.');
      const path=String(input.path),prefix=`${owner}/${draft.id}/${asset.id}/covers/`;
      if(!path.startsWith(prefix)||!/^[-a-f0-9]{36}\.jpg$/.test(path.slice(prefix.length)))throw new Error('Invalid cover upload.');
      const thumb=unwrap(await db.storage.from(BUCKET).info(path));
      if(thumb.metadata?.mimetype!=='image/jpeg'||!(Number(thumb.metadata?.size)>0)||Number(thumb.metadata?.size)>10*1024*1024)throw new Error('Choose a JPG or PNG cover up to 10 MB.');
      const sealed=`${owner}/${draft.id}/${asset.id}/sealed/${crypto.randomUUID()}/thumbnail.jpg`;
      unwrap(await db.storage.from(BUCKET).copy(path,sealed));
      const complete=unwrap<Asset>(await db.rpc('meta_ads_asset',{p_draft:draft.id,p_owner:owner,p_asset:{id:asset.id,thumbnail_path:sealed},p_complete:true}));
      return signedAsset(db,complete);
    }
    case 'review': {
      const draft=await editable(input.id);
      const assets=await assetsForDraft(db,draft.id);
      const plan=await makeReview(requireMeta(),draft.config,assets,accountId!,draft.revision);
      const updated=unwrap(await db.from('meta_ads_drafts').update({review_hash:plan.hash,review_plan:plan,review_expires_at:plan.expiresAt}).eq('id',draft.id).eq('revision',draft.revision).eq('status','draft').select('id').maybeSingle());
      if(!updated) throw new Error('The draft changed while checking it. Review again.');
      return plan;
    }
    case 'publish': {
      const g=requireMeta(),draft=await editable(input.id);
      const runtime=unwrap(await db.from('meta_ads_runtime').select('heartbeat_at').eq('id',true).single());
      if(!runtime.heartbeat_at || Date.parse(runtime.heartbeat_at)<Date.now()-5*60000) throw new Error('The publishing worker is offline. Your draft is saved. Try again when it is connected.');
      // Re-fetch live settings immediately before queuing, not just on the review screen.
      const latest=await makeReview(g,draft.config,await assetsForDraft(db,draft.id),accountId!,draft.revision);
      if(latest.hash!==input.hash || draft.review_hash!==input.hash) throw new Error('Meta settings changed after your review. Review this batch again.');
      return unwrap(await db.rpc('meta_ads_queue',{p_id:draft.id,p_owner:owner,p_revision:input.revision,p_hash:input.hash,p_mode:input.mode}));
    }
    case 'retry': {
      const draft=await ownedDraft(db,input.id,owner);
      if(draft.status!=='needs_attention') throw new Error('This batch does not need a retry.');
      // An uncertain write keeps its inflight marker. The worker ONLY searches for it.
      return unwrap(await db.from('meta_ads_drafts').update({status:'queued',error:null,next_attempt_at:new Date().toISOString(),lease_until:null,lease_token:null}).eq('id',draft.id).eq('status','needs_attention').select('*').single());
    }
    case 'reopen': {
      const draft=await ownedDraft(db,input.id,owner),p=draft.progress;
      if(draft.status!=='needs_attention'||p.inflight||p.campaignId||p.adsetId||Object.keys(p.items).length)throw new Error('This batch already has Meta objects. Resolve it in Ads Manager or start a new batch.');
      return unwrap(await db.from('meta_ads_drafts').update({status:'draft',progress:{items:{}},review_hash:null,review_plan:null,review_expires_at:null,error:null,requested_mode:null}).eq('id',draft.id).eq('status','needs_attention').select('*').single());
    }
    case 'pause': {
      const draft=await ownedDraft(db,input.id,owner);
      if(draft.status==='draft') throw new Error('This batch has not been submitted.');
      // A separate column avoids overwriting an in-flight worker checkpoint.
      const result=unwrap(await db.from('meta_ads_drafts').update({pause_requested:true,next_attempt_at:new Date().toISOString()}).eq('id',draft.id).select('*').single());
      unwrap(await db.from('meta_ads_events').insert({draft_id:draft.id,actor_id:owner,event:'pause_requested'}));
      return result;
    }
    case 'statuses': {
      const draft=await ownedDraft(db,input.id,owner),g=requireMeta(); const items={...draft.progress.items};
      const ids=Object.values(items).map(i=>i.adId).filter(Boolean);
      const statuses=ids.length?await g.get('',{ids:ids.join(','),fields:'id,effective_status,issues_info'}):{};
      for(const [id,item] of Object.entries(items)) if(item.adId) {
        const ad=statuses[item.adId];if(!ad)continue;
        items[id]={...item,effectiveStatus:ad.effective_status,...(ad.issues_info?.length?{error:ad.issues_info.map((i:any)=>i.error_summary||i.error_message).filter(Boolean).join(' ')}:{error:undefined})};
      }
      return items;
    }
    default: throw new Error('Unknown Meta Ads action.');
  }
}
