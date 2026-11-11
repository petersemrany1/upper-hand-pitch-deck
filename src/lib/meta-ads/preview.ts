// Development-only fixture. The preview route returns 404 in production.
import { emptyConfig, emptyCreative, type Asset, type Draft, type Setup } from './model';
import type { MetaAdsApi } from './api';
const cover = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="450"><rect width="360" height="450" fill="#e9e1d5"/><circle cx="180" cy="155" r="70" fill="#b7c5b5"/><path d="M75 450v-90a105 105 0 0 1 210 0v90" fill="#7d9082"/><text x="180" y="370" text-anchor="middle" font-family="sans-serif" font-size="25" fill="white">A fresh start.</text></svg>')}`;
export function createPreviewApi(): MetaAdsApi {
  const config=emptyConfig('act_1001');Object.assign(config,{campaignName:'Perth · November leads',adsetName:'Perth · Local audience',pageId:'2001',instagramId:'3001',formId:'4001',leadDeliveryConfirmed:true,locations:[{key:'2172809',name:'Perth',region:'Western Australia',type:'city',country_code:'AU',radius:25}]});
  const id='11111111-1111-4111-8111-111111111111';
  const assets:Asset[]=[1,2].map(n=>({id:`22222222-2222-4222-8222-22222222222${n}`,draft_id:id,file_name:`Perth creative ${n}.mp4`,size:24500000,width:1080,height:1920,duration:27,mime:'video/mp4',path:`fixture/${n}`,thumbnail_path:`fixture/${n}.jpg`,status:'ready',thumbnailUrl:cover}));
  config.creatives=assets.map((a,i)=>({...emptyCreative(a.id,`Perth · ${i?'Patient story':'Fresh start'}`),text:'Take the first step towards feeling like yourself again. Book a consultation with our team in Perth.',headline:'Your next chapter starts here',url:'https://hairtransplantgroup.com.au'}));
  const draft:Draft={id,owner_id:'preview',name:config.campaignName,config,revision:1,status:'draft',requested_mode:null,progress:{items:{}},error:null,review_hash:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),assets};
  const drafts=new Map([[id,draft]]);
  const setup:Setup={configured:true,databaseReady:true,workerReady:true,account:{id:'act_1001',name:'Hair Transplant Group',currency:'AUD',timezone_name:'Australia/Sydney',account_status:1},pages:[{id:'2001',name:'Hair Transplant Group',instagram_business_account:{id:'3001',username:'hairtransplantgroup'}}],campaigns:[{id:'5001',name:'Perth · Always on',objective:'OUTCOME_LEADS',status:'ACTIVE',effective_status:'ACTIVE',daily_budget:'5000'}]};
  return {async request<T>(action:string,input:any={}):Promise<T>{
    await new Promise(resolve=>setTimeout(resolve,120));let value:any;const d=drafts.get(input.id);
    if(action==='setup')value=setup;
    else if(action==='list')value=[...drafts.values()];
    else if(action==='get'){if(!d)throw new Error('Preview batch not found.');value=d;}
    else if(action==='save'){const saved={...(d||draft),id:d?.id||crypto.randomUUID(),config:structuredClone(input.config),name:input.config.campaignName||'Untitled batch',revision:(d?.revision||0)+1,status:'draft',assets:d?.assets||[],updated_at:new Date().toISOString()};drafts.set(saved.id,saved as Draft);value=saved;}
    else if(action==='choices'){value=input.kind==='forms'?[{id:'4001',name:'Perth · Consultation enquiry'}]:input.kind==='pixels'?[{id:'7001',name:'HTG website'}]:input.kind==='audiences'?[{id:'8001',name:'Website visitors · 90 days'}]:[{id:'6001',name:'Perth · Local',campaign_id:'5001',status:'ACTIVE',effective_status:'ACTIVE',optimization_goal:'LEAD_GENERATION',daily_budget:'5000',targeting:{geo_locations:{cities:[{key:'2172809',name:'Perth',radius:25,distance_unit:'kilometer'}]},age_min:25,age_max:65,targeting_automation:{individual_setting:{geo:0}}}},{id:'6002',name:'Perth · Expanded reach',campaign_id:'5001',status:'ACTIVE',effective_status:'ACTIVE',optimization_goal:'LEAD_GENERATION',daily_budget:'5000',targeting:{geo_locations:{cities:[{key:'2172809',name:'Perth',radius:25,distance_unit:'kilometer'}]},age_min:25,age_max:65,targeting_automation:{individual_setting:{geo:1}}}}];}
    else if(action==='search')value=input.kind==='locations'?[{key:'2172809',name:'Perth',type:input.type,region:'Western Australia',country_code:input.country,radius:25}]:[{id:'9001',name:'Personal care'}];
    else if(action==='register'){const asset={id:crypto.randomUUID(),draft_id:d!.id,file_name:input.file.name,...input.file,path:'fixture/video',thumbnail_path:'fixture/thumb',status:'uploading'};d!.assets!.push(asset);value=asset;}
    else if(action==='complete_upload'){const a=d!.assets!.find(a=>a.id===input.assetId)!;a.status='ready';a.thumbnailUrl=cover;value=a;}
    else if(action==='review'){value={hash:'preview-review',expiresAt:new Date(Date.now()+900000).toISOString(),warnings:['A daily budget is an average, not a strict daily spending limit. Meta controls delivery and reviews every ad.'],summary:{account:setup.account,campaign:d!.config.campaignName,adset:d!.config.adsetName,budget:`AUD ${d!.config.budget.toFixed(2)} daily · shared across ad set`,locationExpansion:d!.config.locationExpansion,locations:['Perth, Western Australia, AU · 25 km'],adCount:d!.config.creatives.length,page:'Hair Transplant Group'},canActivate:true,activationBlockers:[]};}
    else if(action==='publish'){d!.status='complete';d!.requested_mode=input.mode;d!.progress={items:Object.fromEntries(d!.config.creatives.map((a,i)=>[a.assetId,{videoId:`91${i}`,creativeId:`92${i}`,adId:`93${i}`,effectiveStatus:input.mode==='ACTIVE'?'PENDING_REVIEW':'PAUSED'}])),message:input.mode==='ACTIVE'?'Preview only: this is how the batch looks after submission.':'Preview only: all ads are shown paused.'};value=d;}
    else if(action==='statuses')value=d!.progress.items;
    else if(action==='pause'){d!.status='cancelled';value=d;}
    else if(action==='retry')value=d;
    else throw new Error(`Preview does not support ${action}.`);
    return structuredClone(value) as T;
  }};
}
