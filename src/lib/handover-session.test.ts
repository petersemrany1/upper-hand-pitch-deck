import { expect, mock, test } from "bun:test";
import { finishSessionAfterHandoverCheck, type EndSessionResult } from "./handover-session";
const pending = [{lead_id:"bassel",patient_name:"Fixture Patient",clinic_name:"Fixture Clinic",appointment_date:"2026-10-20",appointment_time:"12:00"}];
test("a saved booking without a handover keeps the session open",async()=>{
  const complete=mock(()=>{}),blocked=mock(()=>{}),failed=mock(()=>{});
  expect(await finishSessionAfterHandoverCheck({check:async()=>({ok:false,pending}),complete,blocked,failed})).toBe(false);
  expect(blocked).toHaveBeenCalledWith(pending);expect(complete).not.toHaveBeenCalled();expect(failed).not.toHaveBeenCalled();
});
test("database/network failure preserves session and queue for retry",async()=>{
  const complete=mock(()=>{}),failed=mock(()=>{});
  await finishSessionAfterHandoverCheck({check:async()=>{throw new Error("offline");},complete,blocked:()=>{},failed});
  expect(complete).not.toHaveBeenCalled();expect(failed).toHaveBeenCalledTimes(1);
});
test("session only clears after the server confirms all handovers are done",async()=>{
  let resolve!:(result:EndSessionResult)=>void;
  const complete=mock(()=>{});
  const result=finishSessionAfterHandoverCheck({check:()=>new Promise(r=>{resolve=r;}),complete,blocked:()=>{},failed:()=>{}});
  expect(complete).not.toHaveBeenCalled();resolve({ok:true});expect(await result).toBe(true);expect(complete).toHaveBeenCalledTimes(1);
});
