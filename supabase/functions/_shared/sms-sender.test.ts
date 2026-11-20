import { expect, test } from 'bun:test';
import { resolveSmsSender } from './sms-sender';
test('sender lookup passes the capability requirement and fails closed without a valid active number',async()=>{
  expect(await resolveSmsSender({rpc:async(name:string,args:unknown)=>{expect(name).toBe('select_sms_sender');expect(args).toEqual({p_preferred:'+61400000001',p_mms:true});return {data:'+61400000002'};}},'+61400000001',true)).toBe('+61400000002');
  for(const result of [{data:null},{data:'invalid'},{error:{message:'unavailable'}}]) await expect(resolveSmsSender({rpc:async()=>result})).rejects.toThrow();
});
