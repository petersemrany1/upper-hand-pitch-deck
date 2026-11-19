import { describe, expect, test } from 'bun:test';
import { maintainPool, RejectedPurchase, type Dependencies, type Purchase, type OwnedNumber } from './workflow';
const base='https://example.test';
const purchase:Purchase={id:'reservation-one',phone:'+61485000001',state:'prepared',monthly_cents:825,currency:'usd'};
const owned:OwnedNumber={sid:'PN'+'1'.repeat(32),phone:purchase.phone,friendly:'HTG-Replacement-reservation-one',voiceUrl:base+'/functions/v1/voice-inbound',smsUrl:base+'/functions/v1/sms-inbound',voice:true,sms:true,mms:false};
function fixture(overrides:Partial<Dependencies>={}) {
  const calls:string[]=[];
  const d:Dependencies={baseUrl:base,settings:{enabled:true,target_active:7,max_additional_numbers:2,max_monthly_cents:1650,max_unit_cents:825,currency:'usd'},
    pool:Array.from({length:6},(_,i)=>({number:`+6140000000${i}`,twilio_sid:null,status:'active',mms_enabled:false})),budget:{used_numbers:0,committed_cents:0},pending:null,
    quote:async(phone)=>{calls.push('quote');return {phone:phone || purchase.phone,cents:825,currency:'usd',bundle:'BUtest',address:'ADtest'};},
    owned:async()=>{calls.push('owned');return owned;},buy:async()=>{calls.push('buy');return owned;},reserve:async()=>{calls.push('reserve');return purchase;},
    begin:async()=>{calls.push('begin');return true;},finish:async()=>{calls.push('finish');},mark:async(_,state)=>{calls.push(state);},...overrides};
  return {d,calls};
}
describe('bounded automatic number replacement',()=>{
  test('restores the pool with one purchase after a durable reservation',async()=>{
    const {d,calls}=fixture(); expect((await maintainPool(d)).result).toBe('purchased');
    expect(calls).toEqual(['quote','reserve','begin','buy','finish']);
  });
  test('a dry run cannot reserve, buy or write',async()=>{
    const {d,calls}=fixture(); expect((await maintainPool(d,true)).result).toBe('ready'); expect(calls).toEqual(['quote']);
  });
  test('a full pool or exhausted allowance cannot buy',async()=>{
    const f=fixture(); f.d.pool.push({...f.d.pool[0]}); expect((await maintainPool(f.d)).result).toBe('pool_full'); expect(f.calls).toEqual([]);
    const b=fixture({budget:{used_numbers:2,committed_cents:1650}}); expect((await maintainPool(b.d)).result).toBe('budget_exhausted'); expect(b.calls).toEqual([]);
  });
  test('currency or price change fails before any reservation',async()=>{
    for(const change of [{cents:826,currency:'usd'},{cents:825,currency:'aud'},{cents:NaN,currency:'usd'}]){
      const {d,calls}=fixture({quote:async()=>({phone:purchase.phone,bundle:'BUtest',address:'ADtest',...change})});
      await expect(maintainPool(d)).rejects.toThrow('allowance'); expect(calls).toEqual([]);
    }
  });
  test('another worker claiming the reservation prevents a second POST',async()=>{
    const {d,calls}=fixture({begin:async()=>false}); expect((await maintainPool(d)).result).toBe('already_claimed'); expect(calls).not.toContain('buy');
  });
  test('unknown purchase outcome pauses buying; a retry only reconciles',async()=>{
    const {d,calls}=fixture({buy:async()=>{calls.push('buy');throw new Error('timeout');}});
    expect((await maintainPool(d)).result).toBe('needs_review'); expect(calls).toContain('uncertain');
    d.pending={...purchase,state:'uncertain'}; calls.length=0;
    expect((await maintainPool(d)).result).toBe('reconciled'); expect(calls).toEqual(['owned','finish']);
  });
  test('a missing uncertain number never authorizes a new purchase',async()=>{
    const {d,calls}=fixture({pending:{...purchase,state:'requested'},owned:async()=>null});
    expect((await maintainPool(d)).result).toBe('needs_review'); expect(calls).toEqual(['uncertain']);
  });
  test('a definitive rejection frees the reserved allowance',async()=>{
    const {d,calls}=fixture({buy:async()=>{throw new RejectedPurchase('HTTP 400');}});
    expect((await maintainPool(d)).result).toBe('rejected'); expect(calls).toContain('failed'); expect(calls).not.toContain('finish');
  });
  test('a successful purchase with failed registration is reconciled, never re-bought',async()=>{
    const {d,calls}=fixture({finish:async()=>{throw new Error('database timed out');}});
    expect((await maintainPool(d)).result).toBe('needs_review'); expect(calls.filter(c=>c==='buy')).toHaveLength(1); expect(calls).toContain('uncertain');
  });
  test('reconciliation refuses another identity or wrong callback configuration',async()=>{
    const {d,calls}=fixture({pending:{...purchase,state:'uncertain'},owned:async()=>({...owned,voiceUrl:'https://wrong.test'})});
    await expect(maintainPool(d)).rejects.toThrow('ownership'); expect(calls).toEqual([]);
  });
});
