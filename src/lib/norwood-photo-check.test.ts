import { expect, test } from 'bun:test';
import { parseNorwoodPhotoCheck, norwoodSms } from './norwood-photo-check';
import { requestNorwoodPhotoCheck } from '../utils/norwood-photo-check.server';
const clear = {head_present:true,requested_view_visible:true,quality:'clear'};
test('capture requires a visible head, the requested region AND adequate quality',()=>{
  expect(parseNorwoodPhotoCheck(JSON.stringify(clear),'top').ready).toBe(true);
  for(const partial of [{head_present:false},{requested_view_visible:false},...['dark','blurry','obscured','too_far'].map(quality=>({quality}))])
    expect(parseNorwoodPhotoCheck(JSON.stringify({...clear,...partial}),'crown').ready).toBe(false);
  expect(parseNorwoodPhotoCheck(JSON.stringify({...clear,requested_view_visible:false}),'crown').message).toContain('back of your head');
});
test('malformed, coerced, missing and embellished checks fail closed',()=>{
  for(const raw of ['null','{}','```json\n{}\n```',JSON.stringify({...clear,head_present:'true'}),JSON.stringify({...clear,quality:'maybe'}),JSON.stringify({...clear,norwood:4})])
    expect(()=>parseNorwoodPhotoCheck(raw,'front')).toThrow();
});
test('SMS matches the requested wording, safely handling an absent name',()=>{
  expect(norwoodSms(' Peter ','https://example.test/#token')).toBe('Hi Peter please see link below for our ai norwood scale scanner https://example.test/#token');
  expect(norwoodSms(null,'link')).toBe('Hi there please see link below for our ai norwood scale scanner link');
});
test('per-photo provider receives only that photo and anatomical framing instructions',async()=>{
  let body:any;
  const request=(async(_url:unknown,init:RequestInit)=>{body=JSON.parse(String(init.body));return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(clear)}]});}) as typeof fetch;
  expect((await requestNorwoodPhotoCheck('crown','fixture','server-key',request)).ready).toBe(true);
  expect(body.system).toContain('A front face');
  expect(body.system).toContain('bald crown');
  expect(body.messages[0].content.filter((x:any)=>x.type==='image')).toHaveLength(1);
  expect(JSON.stringify(body)).not.toContain('server-key');
  for(const response of [Response.json({stop_reason:'max_tokens',content:[]}),Response.json({error:'no'},{status:503}),Response.json({stop_reason:'end_turn',content:[{type:'text',text:'null'}]})])
    await expect(requestNorwoodPhotoCheck('top','fixture','key',(async()=>response) as typeof fetch)).rejects.toThrow();
});
