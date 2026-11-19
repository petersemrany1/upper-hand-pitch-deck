import { expect, test } from 'bun:test';
import { PoolProvider } from './twilio';
import { RejectedPurchase } from './workflow';
const account='AC'+'0'.repeat(32), sid='PN'+'1'.repeat(32), bundle='BU'+'2'.repeat(32), address='AD'+'3'.repeat(32);
const base='https://example.test';
const pool=[{number:'+61400000001',twilio_sid:sid,status:'active',mms_enabled:true}];
test('quotes use the existing HTG compliance identity and purchases configure callbacks within price cap',async()=>{
  const requests:Array<{url:string;method:string;body?:URLSearchParams}>=[];
  const fake:typeof fetch=async(input,init)=>{
    const url=String(input); requests.push({url,method:init?.method || 'GET',body:init?.body as URLSearchParams});
    let data:unknown;
    if(url.includes('pricing.twilio.com')) data={price_unit:'usd',phone_number_prices:[{number_type:'mobile',current_price:'8.25'}]};
    else if(url.endsWith(`${sid}.json`)) data={account_sid:account,phone_number:pool[0].number,bundle_sid:bundle,address_sid:address};
    else if(url.endsWith(`/Bundles/${bundle}`)) data={status:'twilio-approved'};
    else if(url.includes('AvailablePhoneNumbers')) data={available_phone_numbers:[{phone_number:'+61485000001',capabilities:{voice:true,sms:true,mms:false}}]};
    else if(init?.method==='POST') data={account_sid:account,sid,phone_number:'+61485000001',friendly_name:'HTG-Replacement-id',voice_url:base+'/functions/v1/voice-inbound',sms_url:base+'/functions/v1/sms-inbound',capabilities:{voice:true,sms:true,mms:false}};
    else throw new Error('Unexpected request');
    return new Response(JSON.stringify(data),{status:200});
  };
  const p=new PoolProvider(account,'test-token',base,fake);
  const quote=await p.quote(pool); expect(quote.cents).toBe(825); expect(quote.bundle).toBe(bundle); expect(quote.address).toBe(address);
  expect(requests.every(r=>r.method==='GET')).toBe(true);
  await p.buy(quote,'id'); const body=requests.at(-1)!.body!;
  expect(body.get('BundleSid')).toBe(bundle); expect(body.get('AddressSid')).toBe(address);
  expect(body.get('VoiceUrl')).toBe(base+'/functions/v1/voice-inbound'); expect(body.get('SmsUrl')).toBe(base+'/functions/v1/sms-inbound');
  expect(requests.filter(r=>r.method==='POST')).toHaveLength(1);
});
test('provider separates definite rejections from ambiguous responses',async()=>{
  const quote={phone:'+61485000001',cents:825,currency:'usd',bundle,address};
  const reject=new PoolProvider(account,'test-token',base,async()=>new Response(JSON.stringify({code:21422}),{status:400}));
  await expect(reject.buy(quote,'id')).rejects.toBeInstanceOf(RejectedPurchase);
  const ambiguous=new PoolProvider(account,'test-token',base,async()=>new Response(JSON.stringify({code:20500}),{status:500}));
  let caught:unknown; try {await ambiguous.buy(quote,'id');} catch(e){caught=e;}
  expect(caught).toBeInstanceOf(Error); expect(caught).not.toBeInstanceOf(RejectedPurchase);
});
