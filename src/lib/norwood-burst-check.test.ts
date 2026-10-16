import { expect, test } from "bun:test";
import { parseNorwoodBurstCheck } from "./norwood-burst-check";
import { requestNorwoodBurstCheck } from "../utils/norwood-burst-check.server";
const usable={head_present:true,requested_view_visible:true,problem:"none"};
const blurred={...usable,problem:"blurred"};
test("selects the exact usable original even when neighbouring frames fail",()=>{
 const check=parseNorwoodBurstCheck(JSON.stringify({frames:[blurred,usable,{...usable,requested_view_visible:false,problem:"wrong_angle"}],best_frame:1}),"crown",3);
 expect(check).toEqual({ready:true,selectedIndex:1,problem:"none",message:"Photo saved"});
});
test("inconsistent, missing and out-of-bounds AI selections fail closed",()=>{
 for(const reply of [
  {frames:[blurred],best_frame:0},{frames:[usable],best_frame:1},{frames:[usable],best_frame:null},
  {frames:[{...usable,head_present:false}],best_frame:0},{frames:[{...usable,requested_view_visible:false}],best_frame:0},
  {frames:[usable],best_frame:"0"},{frames:[usable],best_frame:0,extra:"oops"},
 ])expect(()=>parseNorwoodBurstCheck(JSON.stringify(reply),"front",1)).toThrow();
 expect(()=>parseNorwoodBurstCheck(JSON.stringify({frames:[usable],best_frame:0}),"front",3)).toThrow();
});
test("rejection gives one plain-language correction instead of demanding the entire sequence again",()=>{
 for(const [problem,text] of [["hairline_cut_off","further away"],["hair_covering","Push your hair back"],["too_dark","brighter"],["blurred","still"],["too_far","closer"]]){
  const check=parseNorwoodBurstCheck(JSON.stringify({frames:[{...usable,problem}],best_frame:null}),"front",1);expect(check.ready).toBe(false);expect(check.message).toContain(text);
 }
 const check=parseNorwoodBurstCheck(JSON.stringify({frames:[{head_present:false,requested_view_visible:false,problem:"no_head"},{...usable,problem:"blurred"}],best_frame:null}),"top",2);
 expect(check.problem).toBe("blurred");
});
test("one provider call jointly checks the originals and chooses an index; no second contradictory gate",async()=>{
 let calls=0;let body:any;
 const request=(async(_url:unknown,init:RequestInit)=>{calls++;body=JSON.parse(String(init.body));return Response.json({stop_reason:"end_turn",content:[{type:"text",text:JSON.stringify({frames:[blurred,usable,blurred],best_frame:1})}]});}) as typeof fetch;
 expect((await requestNorwoodBurstCheck("top",["one","two","three"],"secret",request)).selectedIndex).toBe(1);
 expect(body.output_config.format.schema.properties.frames.minItems).toBe(1);expect(body.output_config.format.schema.properties.frames.maxItems).toBeUndefined();
 expect(calls).toBe(1);expect(body.messages[0].content.filter((b:any)=>b.type==="image").map((b:any)=>b.source.data)).toEqual(["one","two","three"]);
 expect(body.system).toContain("A partially cropped face is fine");expect(body.system).toContain("Do NOT grade hair loss");expect(JSON.stringify(body)).not.toContain("secret");
 await expect(requestNorwoodBurstCheck("top",[],"secret",request)).rejects.toThrow();
 await expect(requestNorwoodBurstCheck("top",Array(9).fill("x"),"secret",request)).rejects.toThrow();expect(calls).toBe(1);
});

 test("eight-frame movement can select any original and returns a usable rejection preview index",async()=>{
 const frames=Array.from({length:8},(_,i)=>i===6?usable:blurred);
 expect(parseNorwoodBurstCheck(JSON.stringify({frames,best_frame:6}),"crown",8).selectedIndex).toBe(6);
 const failed=parseNorwoodBurstCheck(JSON.stringify({frames:[{head_present:false,requested_view_visible:false,problem:"no_head"},blurred],best_frame:null}),"front",2);
 expect(failed.reviewIndex).toBe(1);
 });

 test("long movement is checked in groups of at most three and maps selected/review indices back to originals",async()=>{
 const sizes:number[]=[];
 const request=(async(_url:unknown,init:RequestInit)=>{
   const body=JSON.parse(String(init.body)), images=body.messages[0].content.filter((block:any)=>block.type==="image");sizes.push(images.length);
   const frames=images.map((image:any)=>image.source.data==="good"?usable:{head_present:false,requested_view_visible:false,problem:"no_head"});
   const index=frames.findIndex((frame:any)=>frame.problem==="none");
   return Response.json({stop_reason:"end_turn",content:[{type:"text",text:JSON.stringify({frames,best_frame:index<0?null:index})}]});
 }) as typeof fetch;
 const check=await requestNorwoodBurstCheck("front",["a","b","c","d","e","f","good","h"],"key",request);
 expect(sizes).toEqual([3,3,2]);expect(check.selectedIndex).toBe(6);expect(check.ready).toBe(true);
 const rejected=await requestNorwoodBurstCheck("crown",Array(8).fill("blank"),"key",request);
 expect(rejected.ready).toBe(false);expect(rejected.reviewIndex).toBe(0);
 });
