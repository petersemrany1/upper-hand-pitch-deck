import {afterAll,expect,mock,test} from 'bun:test';
import{createHash}from'node:crypto';
import{signFramingReview,type FramingReview}from'./norwood-framing-review.server';
const assessment='11111111-1111-4111-8111-111111111111',reviewer='22222222-2222-4222-8222-222222222222',room='33333333-3333-4333-8333-333333333333';
const jpeg=Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(600,1),Buffer.from([255,217])]);
let live:any,stored:any,uploads=0,aiCalls=0;
const row:any={id:assessment,photos:{},clinic_name:'Test',status:'opened',expires_at:new Date(Date.now()+7200000).toISOString(),consented_at:'now',framing_consented_at:'now',photo_problems:[],analysis_attempts:0};
const admin={
 rpc:async(_name:string,args:any)=>{if(args.p_action==='photo'){stored=args.p_photo;return{data:{...row,photos:{[args.p_view]:args.p_photo}},error:null};}return{data:row,error:null};},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:live,error:null})})})}),
 storage:{from:()=>({upload:async()=>{uploads++;return{error:null};},remove:async()=>({error:null})})}
};
mock.module('@/integrations/supabase/client.server',()=>({supabaseAdmin:admin}));
mock.module('./norwood-burst-check.server',()=>({requestNorwoodBurstCheck:async()=>{aiCalls++;throw new Error('Unexpected second framing check');}}));
const{captureNorwoodFrame}=await import('./norwood-sandbox.server');
const old=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-key';
afterAll(()=>{if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=old;});
function approval(overrides:Partial<FramingReview>={}){return signFramingReview({purpose:'framing-approved',assessment,view:'front',sha256:createHash('sha256').update(jpeg).digest('hex'),problem:'wrong_angle',expires:Date.now()+120000,reviewer,room,...overrides},'fixture-key');}
test('reviewed upload stores exactly one approved original and staff audit, without repeating AI framing',async()=>{
 live={room_id:room,rep_id:reviewer,ended:false,expires_at:new Date(Date.now()+600000).toISOString()};uploads=0;aiCalls=0;
 const result=await captureNorwoodFrame('fixture-token','front',jpeg.toString('base64'),[],approval());
 expect(result.check.ready).toBe(true);expect(result.session?.views).toEqual(['front']);expect(uploads).toBe(1);expect(aiCalls).toBe(0);
 expect(stored.sha256).toBe(createHash('sha256').update(jpeg).digest('hex'));expect(stored.review.by).toBe(reviewer);expect(stored.review.problem).toBe('wrong_angle');
});
test('a changed photo, view, assessment, reviewer, room or stopped camera never uploads',async()=>{
 uploads=0;const good={room_id:room,rep_id:reviewer,ended:false,expires_at:new Date(Date.now()+600000).toISOString()};live=good;
 for(const overrides of [{sha256:'0'.repeat(64)},{view:'top' as const},{assessment:room},{reviewer:room},{room:assessment}])await expect(captureNorwoodFrame('fixture-token','front',jpeg.toString('base64'),[],approval(overrides))).rejects.toThrow();
 for(const invalid of [{...good,ended:true},{...good,expires_at:'2000-01-01'},null]){live=invalid;await expect(captureNorwoodFrame('fixture-token','front',jpeg.toString('base64'),[],approval())).rejects.toThrow();}
 live=good;await expect(captureNorwoodFrame('fixture-token','front',jpeg.toString('base64'),[jpeg.toString('base64')],approval())).rejects.toThrow();expect(uploads).toBe(0);
});
