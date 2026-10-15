import { expect, test } from 'bun:test';
import { nextNorwoodScan, pendingScanViews, parseNorwoodScanSelection } from './norwood-video-scan';
import { requestNorwoodScanSelection } from '../utils/norwood-video-scan.server';
test('two scans request only missing angles and preserve completed photos',()=>{
 expect(nextNorwoodScan([])).toBe('upper');
 expect(nextNorwoodScan(['front','top','crown'])).toBe('sides');
 expect(pendingScanViews('upper',['front','top'])).toEqual(['crown']);
 expect(pendingScanViews('sides',['left'])).toEqual(['right']);
});
test('missing angles are allowed; duplicate, unrequested or nonexistent frames are rejected',()=>{
 expect(parseNorwoodScanSelection('{"selected":[]}', ['top'], 8)).toEqual([]);
 expect(parseNorwoodScanSelection('{"selected":[{"view":"crown","frame":5},{"view":"top","frame":2}]}',['top','crown'],8)).toEqual([{view:'top',frame:2},{view:'crown',frame:5}]);
 for(const selected of [[{view:'top',frame:9}],[{view:'top',frame:'2'}],[{view:'left',frame:2}],[{view:'top',frame:1},{view:'top',frame:2}],[{view:'top',frame:1},{view:'crown',frame:1}]]) expect(()=>parseNorwoodScanSelection(JSON.stringify({selected}),['top','crown'],8)).toThrow();
});
test('the selector receives labelled stills, requires opposite profiles and never invents a grade',async()=>{
 let body:any;
 const request=(async(_url:unknown,init:RequestInit)=>{body=JSON.parse(String(init.body));return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"selected":[{"view":"left","frame":0},{"view":"right","frame":2}]}'}]});}) as typeof fetch;
 expect(await requestNorwoodScanSelection(['one','two','three'],['left','right'],'server-key',request)).toEqual([{view:'left',frame:0},{view:'right',frame:2}]);
 expect(body.system).toContain('opposite profiles');
 expect(body.system).toContain('Omit any missing or uncertain view');
 expect(body.messages[0].content.filter((x:any)=>x.type==='image')).toHaveLength(3);
 expect(JSON.stringify(body)).not.toContain('server-key');
 for(const response of [Response.json({stop_reason:'max_tokens',content:[]}),Response.json({error:'no'},{status:503}),Response.json({stop_reason:'end_turn',content:[{type:'text',text:'null'}]})]) await expect(requestNorwoodScanSelection(['one'],['top'],'key',(async()=>response) as typeof fetch)).rejects.toThrow();
});

test('invalid AI output is retried with the SAME frames, then accepted only if valid',async()=>{
 const bodies:any[]=[];
 const request=(async(_url:unknown,init:RequestInit)=>{
  bodies.push(JSON.parse(String(init.body)));
  return Response.json({stop_reason:'end_turn',content:[{type:'text',text:bodies.length===1?'```json\n{"selected":[]}\n```':'{"selected":[{"view":"top","frame":1}]}'}]});
 }) as typeof fetch;
 expect(await requestNorwoodScanSelection(['a','b'],['top'],'key',request)).toEqual([{view:'top',frame:1}]);
 expect(bodies).toHaveLength(2);
 expect(bodies[0].output_config.format.type).toBe('json_schema');
 expect(bodies[0].output_config.format.schema.additionalProperties).toBe(false);
 expect(bodies[0].messages).toEqual(bodies[1].messages);
 expect(bodies[1].max_tokens).toBeGreaterThan(bodies[0].max_tokens);
});

test('a valid empty selection is a missing angle, not a formatting error',async()=>{
 let calls=0;
 const request=(async()=>{calls++;return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"selected":[]}'}]});}) as typeof fetch;
 expect(await requestNorwoodScanSelection(['a'],['top'],'key',request)).toEqual([]);
 expect(calls).toBe(1);
});

test('invalid results stay bounded and do not blame the patient’s framing',async()=>{
 for(const text of ['not json','{"selected":[{"view":"top","frame":9}]}','{"selected":[{"view":"top","frame":0},{"view":"crown","frame":0}]}']){
  let calls=0;
  const request=(async()=>{calls++;return Response.json({stop_reason:'end_turn',content:[{type:'text',text}]});}) as typeof fetch;
  await expect(requestNorwoodScanSelection(['a'],['top','crown'],'key',request)).rejects.toThrow('The scan check failed. Tap Retry.');
  expect(calls).toBe(2);
 }
});

test('provider refusal and transport failures do not become accepted photos or automatic retry loops',async()=>{
 for(const kind of ['refusal','http','network']){
  let calls=0;
  const request=(async()=>{calls++;if(kind==='network')throw new Error('network');return kind==='http'?Response.json({}, {status:503}):Response.json({stop_reason:'refusal',content:[]});}) as typeof fetch;
  await expect(requestNorwoodScanSelection(['a'],['top'],'key',request)).rejects.toThrow('The scan check failed. Tap Retry.');
  expect(calls).toBe(1);
 }
});
