import { expect, mock, test } from "bun:test";
let errorTable = "";
const cursors:(string|null)[] = [];
const page = (from:number,n:number) => Array.from({length:n},(_,i)=>({id:String(from+i).padStart(6,"0"),status:"new",created_at:"2026-10-08T00:00:00Z",callback_scheduled_at:null,campaign_name:"Sydney"}));
mock.module("@/integrations/supabase/client",()=>({supabase:{
 rpc:()=>{let cursor:string|null=null;const query:any={select:()=>query,order:()=>query,limit:()=>query,gt:(_:string,v:string)=>{cursor=v;return query;},then:(resolve:any)=>{cursors.push(cursor);return Promise.resolve({data:cursor?page(500,2):page(0,500),error:null}).then(resolve);}};return query;},
 from:(table:string)=>{const query:any={select:()=>query,eq:()=>query,in:()=>query,then:(resolve:any)=>Promise.resolve({data:table==="partner_clinics"?[{id:"clinic",city:"Sydney"}]:[],error:errorTable===table?new Error("offline"):null}).then(resolve)};return query;}
}}));
mock.module("@/lib/clinic-capacity",()=>({clinicLocationKeywords:(c:any)=>[c.city.toLowerCase()],fetchClinicRemainingSlots:async()=>({clinic:10})}));
const { fetchUntouchedLeads }=await import("./lead-skips");
test("final check traverses every page using stable IDs",async()=>{const leads=await fetchUntouchedLeads("session","id,status,created_at");expect(leads).toHaveLength(502);expect(cursors).toEqual([null,"000499"]);});
test("failed capacity or pause reads cannot masquerade as no leads",async()=>{for(const table of ["partner_clinics","app_settings"]){errorTable=table;await expect(fetchUntouchedLeads("session","id")).rejects.toThrow("offline");}errorTable="";});
