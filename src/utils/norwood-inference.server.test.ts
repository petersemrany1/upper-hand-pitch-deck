import { expect, test } from 'bun:test';
import { requestNorwoodEstimate } from './norwood-inference.server';
import { NorwoodAbstentionError } from '../lib/norwood-evidence';
import { NORWOOD_VIEWS } from '../lib/norwood-assessment';
const images = NORWOOD_VIEWS.map(view => ({view, base64:'synthetic-fixture'}));
const assessment = { norwood: 4, confidence:'medium',reason:'Fixture',photo_problems:[], observations: {
  views:Object.fromEntries(NORWOOD_VIEWS.map(v=>[v,'clear'])),pattern:'standard',hairline:'extensive',crown:'distinct_loss',bridge:'substantial',fringe:'broad',anterior_extent:'not_applicable',boundary_uncertain:false,
}};
const reply = (value: unknown) => Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({assessment:value})}]});
test('null and inconsistent evidence are review outcomes, not transport retries',async()=>{
  for(const value of [null,{...assessment,norwood:7}]){
    let calls=0;
    await expect(requestNorwoodEstimate(images,'fixture', (async()=>{calls++;return reply(value);}) as typeof fetch)).rejects.toBeInstanceOf(NorwoodAbstentionError);
    expect(calls).toBe(1);
  }
});
test('a transient provider failure retries the same five saved originals and then returns a supported result',async()=>{
  const bodies:any[]=[];
  const result=await requestNorwoodEstimate(images,'fixture', (async(_url,init)=>{
    bodies.push(JSON.parse(String(init?.body)));
    return bodies.length===1?Response.json({error:{message:'busy'}},{status:529}):reply(assessment);
  }) as typeof fetch);
  expect(result.norwood).toBe(4);expect(bodies).toHaveLength(2);
  expect(bodies[0].messages).toEqual(bodies[1].messages);
  expect(bodies[0].messages[0].content.filter((b:any)=>b.type==='image')).toHaveLength(5);
});
test('malformed format recovers once, while no unsupported result is shown',async()=>{
  let calls=0;
  const result=await requestNorwoodEstimate(images,'fixture', (async()=>++calls===1?Response.json({stop_reason:'end_turn',content:[{type:'text',text:'```json\n{}\n```'}]}):reply(assessment)) as typeof fetch);
  expect(result.norwood).toBe(4);expect(calls).toBe(2);
  await expect(requestNorwoodEstimate(images,'fixture',(async()=>reply({...assessment,norwood:99})) as typeof fetch)).rejects.toMatchObject({code:'HP-REPLY'});
});
test('models without output_config use the same schema and validator through forced tool output',async()=>{
  let calls=0;
  const result=await requestNorwoodEstimate(images,'fixture',(async(_url,init)=>{
    const body=JSON.parse(String(init?.body));
    if(++calls===1)return Response.json({error:{message:'output_config unsupported'}},{status:400});
    expect(body.tool_choice.name).toBe('photo_check');
    return Response.json({stop_reason:'tool_use',content:[{type:'tool_use',name:'photo_check',input:{assessment}}]});
  }) as typeof fetch);
  expect(result.norwood).toBe(4);expect(calls).toBe(2);
});
