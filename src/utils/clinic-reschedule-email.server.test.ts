import {afterAll,expect,test} from "bun:test";
import {sendClinicRescheduleEmail} from "./clinic-reschedule-email.server";
const fetchBefore=globalThis.fetch,key=process.env.RESEND_API_KEY,gateway=process.env.LOVABLE_API_KEY;
process.env.RESEND_API_KEY="test-key";process.env.LOVABLE_API_KEY="test-gateway";
afterAll(()=>{globalThis.fetch=fetchBefore;if(key===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=key;if(gateway===undefined)delete process.env.LOVABLE_API_KEY;else process.env.LOVABLE_API_KEY=gateway;});
const event={id:"test-event",email_to:"clinic@example.invalid",email_subject:"Edited subject",email_body:"Edited message <not HTML>"};
test("email transport uses saved recipient and literal edited copy with a stable idempotency key",async()=>{
 let captured:any;
 globalThis.fetch=(async(_url:any,options:any)=>{captured=options;return Response.json({id:"test-receipt"});}) as typeof fetch;
 expect(await sendClinicRescheduleEmail(event)).toEqual({status:"accepted",receipt:"test-receipt"});
 expect(JSON.parse(captured.body)).toMatchObject({to:["clinic@example.invalid"],subject:event.email_subject,text:event.email_body});
 expect(JSON.parse(captured.body).html).toBeUndefined();expect(captured.headers["Idempotency-Key"]).toBe("clinic-reschedule-test-event");
});
test("temporary gateway failures and missing receipts are uncertain, definite rejection is retryable",async()=>{
 for(const [code,status] of [[400,"failed"],[429,"failed"],[408,"uncertain"],[409,"uncertain"],[502,"uncertain"]] as const){globalThis.fetch=(async()=>new Response("",{status:code})) as typeof fetch;expect((await sendClinicRescheduleEmail(event)).status).toBe(status);}
 globalThis.fetch=(async()=>Response.json({})) as typeof fetch;expect((await sendClinicRescheduleEmail(event)).status).toBe("uncertain");
});
