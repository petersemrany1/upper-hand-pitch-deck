import { expect, test } from 'bun:test';
import { releaseRetiredNumbers, type ReleaseNumber } from './releases';
import { PoolProvider } from './twilio';
const now=Date.parse('2026-11-20T00:00:00Z'), account='AC'+'a'.repeat(32), sid='PN'+'b'.repeat(32);
const old:ReleaseNumber={number:'+61400000001',twilio_sid:sid,status:'retired',retired_at:new Date(now-60*86400000).toISOString(),release_due_at:new Date(now).toISOString(),released_at:null};
test('only due retired leases release; dry runs and disabled rules never mutate',async()=>{
  const changes:string[]=[];
  const d={enabled:true,numbers:[old,{...old,status:'active'},{...old,released_at:new Date(now).toISOString()},{...old,retired_at:null},{...old,release_due_at:new Date(now+1).toISOString()},{...old,retired_at:new Date(now-59*86400000).toISOString()}],now,
    begin:async()=>{changes.push('begin');return true;},release:async()=>{changes.push('release');},finish:async()=>{changes.push('finish');}};
  expect((await releaseRetiredNumbers(d,true)).due).toBe(1); expect(changes).toEqual([]);
  expect((await releaseRetiredNumbers({...d,enabled:false},false)).due).toBe(0); expect(changes).toEqual([]);
  expect((await releaseRetiredNumbers(d,false)).released).toBe(1); expect(changes).toEqual(['begin','release','finish']);
});
test('a failed release remains an explicit error and cannot count as released',async()=>{
  const errors:Array<string|null>=[];
  const result=await releaseRetiredNumbers({enabled:true,numbers:[old],now,begin:async()=>true,release:async()=>{throw new Error('timeout');},finish:async(_,e)=>{errors.push(e);}},false);
  expect(result.released).toBe(0); expect(result.errors).toHaveLength(1); expect(errors).toEqual(['timeout']);
});
test('provider verifies exact account, number and SID before DELETE; 204 and absent retries reconcile',async()=>{
  const calls:string[]=[];
  const transport:typeof fetch=async(_,init)=>{calls.push(init?.method||'GET');return init?.method==='DELETE'?new Response(null,{status:204}):Response.json({account_sid:account,sid,phone_number:old.number});};
  await new PoolProvider(account,'fixture','https://example.test',transport).release(old);
  expect(calls).toEqual(['GET','DELETE']);
  const absent:typeof fetch=async(_,init)=>{expect(init?.method).not.toBe('DELETE');return Response.json({code:20404},{status:404});};
  await new PoolProvider(account,'fixture','https://example.test',absent).release(old);
  for(const mismatch of [{account_sid:'ACother',sid,phone_number:old.number},{account_sid:account,sid:'PNother',phone_number:old.number},{account_sid:account,sid,phone_number:'+61400000002'}]) {
    await expect(new PoolProvider(account,'fixture','https://example.test',async(_,init)=>{expect(init?.method).not.toBe('DELETE');return Response.json(mismatch);}).release(old)).rejects.toThrow('identity');
  }
});
test('network failures and non-Twilio 404 never count as a released lease',async()=>{
  await expect(new PoolProvider(account,'fixture','https://example.test',async()=>Response.json({},{status:404})).release(old)).rejects.toThrow('verify');
  await expect(new PoolProvider(account,'fixture','https://example.test',async(_,init)=>init?.method==='DELETE'?Response.json({code:20429},{status:429}):Response.json({account_sid:account,sid,phone_number:old.number})).release(old)).rejects.toThrow('unconfirmed');
});
