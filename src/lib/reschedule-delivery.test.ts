import {test,expect} from "bun:test";
import {deliverRescheduleOnce,type DeliveryResult} from "./reschedule-delivery";
function fixture(send:()=>Promise<DeliveryResult> = async()=>({ok:true,sid:"SMfixture",status:"queued"})) {
 let status="pending",sends=0,logs=0;
 const deps={claim:async()=>{if(!["pending","failed"].includes(status))return null;status="sending";return {sms_body:"Fixture",sms_phone:"+61400000000",appointment_id:"fixture"};},existing:async()=>({status,error:null}),send:async()=>{sends++;return send();},finish:async(next:string)=>{status=next;},log:async()=>{logs++;}};
 return {deps,read:()=>({status,sends,logs})};
}
test("repeated and concurrent confirmation requests send only once",async()=>{const f=fixture();await Promise.all([deliverRescheduleOnce(f.deps),deliverRescheduleOnce(f.deps)]);await deliverRescheduleOnce(f.deps);expect(f.read()).toEqual({status:"accepted",sends:1,logs:1});});
test("definite provider failure remains visible and retryable without another appointment update",async()=>{let attempt=0;const f=fixture(async()=>++attempt===1?{ok:false,error:"Rejected"}:{ok:true,sid:"SMfixture"});expect((await deliverRescheduleOnce(f.deps)).status).toBe("failed");expect((await deliverRescheduleOnce(f.deps)).status).toBe("accepted");expect(f.read()).toEqual({status:"accepted",sends:2,logs:1});});
test("network uncertainty cannot be retried into a duplicate SMS",async()=>{const f=fixture(async()=>{throw new Error("timeout")});await deliverRescheduleOnce(f.deps);await deliverRescheduleOnce(f.deps);expect(f.read()).toEqual({status:"uncertain",sends:1,logs:0});});
test("a status-write failure retains the sending claim",async()=>{const f=fixture();f.deps.finish=async()=>{throw new Error("database down")};expect((await deliverRescheduleOnce(f.deps)).status).toBe("uncertain");await deliverRescheduleOnce(f.deps);expect(f.read().sends).toBe(1);});
