import { expect, test } from "bun:test";
import { sendSms } from "./twilio.ts";
import { PATIENT_SMS_FROM } from "../_shared/patient-sms.ts";
test("actual Twilio request uses the shared confirmation sender and exact body", async () => {
  let calls=0;
  const transport: typeof fetch = (async (url: string, init: RequestInit) => {
    calls++;
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACfixture/Messages.json");
    expect(init.method).toBe("POST");
    const form=new URLSearchParams(init.body as URLSearchParams);
    expect(form.get("From")).toBe(PATIENT_SMS_FROM);expect(form.get("To")).toBe("+61400000000");expect(form.get("Body")).toBe("Fixture preview");
    return new Response(JSON.stringify({sid:"SMfixture",status:"queued",from:PATIENT_SMS_FROM}),{status:201});
  }) as unknown as typeof fetch;
  const result=await sendSms("ACfixture","fixture-token","+61400000000","Fixture preview",PATIENT_SMS_FROM,transport);
  expect(result).toEqual({ok:true,sid:"SMfixture",status:"queued",from:PATIENT_SMS_FROM});expect(calls).toBe(1);
});
test("provider rejection is distinguishable from an uncertain send",async()=>{
  const response=(status:number,data:unknown)=>(async()=>new Response(JSON.stringify(data),{status})) as unknown as typeof fetch;
  expect((await sendSms("a","b","c","d",PATIENT_SMS_FROM,response(400,{message:"invalid number"}))).ok).toBe(false);
  await expect(sendSms("a","b","c","d",PATIENT_SMS_FROM,response(503,{message:"unavailable"}))).rejects.toThrow("uncertain");
  await expect(sendSms("a","b","c","d",PATIENT_SMS_FROM,response(201,{}))).rejects.toThrow("missing SID");
});
