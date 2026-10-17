import{afterAll,expect,mock,test}from'bun:test';
import{signFramingReview,readFramingReview}from'./norwood-framing-review.server';
const assessment='11111111-1111-4111-8111-111111111111',rep='22222222-2222-4222-8222-222222222222',room='33333333-3333-4333-8333-333333333333',client='44444444-4444-4444-8444-444444444444';
let access=true,roomAccess=true;const calls:any[]=[];
const row={id:assessment,consented_at:'now',framing_consented_at:'now',status:'opened',revoked_at:null,expires_at:new Date(Date.now()+7200000).toISOString()};
mock.module('./norwood-sandbox.server',()=>({assertNorwoodStaff:async()=>{if(!access)throw new Error('Lead access required');return{id:rep};},latestNorwood:async()=>row,hashNorwoodToken:()=>'',patientAction:async()=>row}));
mock.module('@/integrations/supabase/client.server',()=>({supabaseAdmin:{rpc:async(_name:string,args:any)=>{calls.push(args);return roomAccess?{data:{room_id:room,expires_at:new Date(Date.now()+600000).toISOString(),ended:false,patient_seen:new Date().toISOString(),rep_seen:new Date().toISOString()},error:null}:{data:null,error:{message:'Camera access required'}};}}}));
const{repLive,patientLive}=await import('./norwood-live.server');
const old=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-key';
afterAll(()=>{if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=old;});
const ticket=()=>signFramingReview({purpose:'framing-review',assessment,view:'front',sha256:'a'.repeat(64),problem:'wrong_angle',expires:Date.now()+120000},'fixture-key');
const input=()=>({action:'review' as const,clientId:client,roomId:room,reviewTicket:ticket(),reviewConfirmed:true as const});
test('only authenticated staff with the joined room can approve an exact framing ticket',async()=>{
 const result=await repLive({},'lead',assessment,input());
 const approval=readFramingReview(result.reviewApproval!,'fixture-key','framing-approved');
 expect(approval.reviewer).toBe(rep);expect(approval.room).toBe(room);
 expect(calls.at(-1)).toMatchObject({p_action:'poll',p_assessment:assessment,p_role:'rep',p_client:client,p_room:room,p_rep:rep});
});
test('patient, unauthorised staff, another joined client or missing confirmation cannot approve',async()=>{
 await expect(patientLive('token',input())).rejects.toThrow('Invalid camera request');
 access=false;await expect(repLive({},'lead',assessment,input())).rejects.toThrow('Lead access required');access=true;
 roomAccess=false;await expect(repLive({},'lead',assessment,input())).rejects.toThrow('Camera access required');roomAccess=true;
 await expect(repLive({},'lead',assessment,{...input(),reviewConfirmed:undefined})).rejects.toThrow('Photo review is unavailable');
 await expect(repLive({},'lead',room,input())).rejects.toThrow('replaced');
});
