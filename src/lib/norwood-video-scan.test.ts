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
