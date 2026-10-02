import { expect, test } from "bun:test";
import { sendSms } from "./twilio";
import { PATIENT_SMS_FROM } from "../_shared/patient-sms";
test("actual Twilio request uses the shared confirmation sender and exact body", async () => {
  let calls=0;
  const transport: typeof fetch = (async (url: string, init: RequestInit) => {
    calls++;
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACfixture/Messages.json");
    expect(init.method).toBe("POST");
    const form=new URLSearchParams(init.body as URLSearchParams);
    expect(form.get("From")).toBe(PATIENT_SMS_FROM);expect(form.get("To")).toBe("+61400000000");expect(form.get("Body")).toBe("Fixture preview");
    return new Response(JSON.stringify({sid:"SMfixture",status:"queued"}),{status:201});
  }) as typeof fetch;
  const result=await sendSms("ACfixture","fixture-token","+61400000000","Fixture preview",transport);
  expect(result).toEqual({ok:true,sid:"SMfixture",status:"queued"});expect(calls).toBe(1);
});
test("provider rejection is distinguishable from an uncertain send",async()=>{
  const response=(status:number,data:unknown)=>(async()=>new Response(JSON.stringify(data),{status})) as typeof fetch;
  expect((await sendSms("a","b","c","d",response(400,{message:"invalid number"}))).ok).toBe(false);
  await expect(sendSms("a","b","c","d",response(503,{message:"unavailable"}))).rejects.toThrow("uncertain");
  await expect(sendSms("a","b","c","d",response(201,{}))).rejects.toThrow("missing SID");
});
