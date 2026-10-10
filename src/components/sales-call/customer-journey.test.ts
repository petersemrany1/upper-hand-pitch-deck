import { expect, test } from "bun:test";
import { journeyItems, journeyPhone, mediaUrls, messageItem, relevantJourneyChange, type CustomerJourney, type JourneyMessage } from "./customer-journey";
const message=(patch:Partial<JourneyMessage>={}):JourneyMessage=>({id:"m",created_at:"2026-10-08T03:28:00Z",sent_at:null,direction:"outbound",body:null,media_urls:[],status:"delivered",...patch});
const empty:CustomerJourney={leadIds:["lead","duplicate"],threadIds:["thread"],phoneKey:"61412345678",calls:[],messages:[],skips:[]};
test("full phone identity handles Australian formats without tail matches or blanks",()=>{
 for(const p of ["0412 345 678","+61 412 345 678","61412345678","412345678"]) expect(journeyPhone(p)).toBe("61412345678");
 for(const p of [null,"","123"]) expect(journeyPhone(p)).toBeNull();
 expect(journeyPhone("+1 61412345678")).not.toBe(journeyPhone("0412345678"));
});
test("photo-only MMS is a visible communication, including direction and delivery",()=>{
 const item=messageItem(message({media_urls:["https://example.com/before-after.jpg"]}));
 expect(item.title).toBe("Photo sent");expect(item.status).toBe("Delivered");expect(item.media).toHaveLength(1);expect(item.summary).toBe("No accompanying text.");
 expect(messageItem(message({direction:"inbound",body:"Please call tomorrow"})).title).toBe("Text received");
});
test("queued, failed and unknown delivery never imply successful delivery",()=>{
 expect(messageItem(message({status:"queued"})).title).toBe("Text queued");
 expect(messageItem(message({status:"undelivered (30003)"})).title).toBe("Text not delivered");
 expect(messageItem(message({status:null})).status).toBe("Delivery not recorded");
});
test("each communication and skip appears once in descending time, beyond 50 rows",()=>{
 const calls=[{id:"c",called_at:"2026-10-08T03:27:00Z",direction:"outbound",status:"completed",duration:142,outcome:"callback_scheduled",rep_name:"Test rep",call_analysis:{patient_summary:"Asked for a call tomorrow."}}];
 const messages=Array.from({length:75},(_,i)=>message({id:`m${i}`,twilio_message_sid:`sid${i}`}));messages.push({...messages[0],id:"duplicate-log"});
 const rows=journeyItems({...empty,calls,messages,skips:[{id:"s",lead_id:"lead",rep_id:"rep",rep_name:"Test rep",session_id:null,reason:"Review phone",created_at:"2026-10-09T00:00:00Z"}]});
 expect(rows).toHaveLength(77);expect(rows[0].kind).toBe("skip");expect(rows.at(-1)?.summary).toBe("Asked for a call tomorrow.");expect(rows.at(-1)?.duration).toBe("2m 22s");
});
test("short connected calls are not falsely labelled voicemail",()=>{
 const item=journeyItems({...empty,calls:[{id:"c",called_at:"2026-10-08T03:00:00Z",direction:"inbound",status:"completed",duration:8,outcome:null,rep_name:null,call_analysis:{summary:"Confirmed the appointment."}}]})[0];
 expect(item.title).toBe("Incoming call");expect(item.summary).toBe("Confirmed the appointment.");
});
test("unsafe media links are not rendered",()=>expect(mediaUrls(["javascript:alert(1)","https://example.com/photo.jpg",null])).toEqual(["https://example.com/photo.jpg"]));
test("updates match duplicate enquiries, inbox threads or full remote number",()=>{
 expect(relevantJourneyChange({lead_id:"duplicate"},"lead",null,empty)).toBe(true);
 expect(relevantJourneyChange({thread_id:"thread"},"lead",null,empty)).toBe(true);
 expect(relevantJourneyChange({direction:"inbound",from_number:"0412345678"},"lead",null,empty)).toBe(true);
 expect(relevantJourneyChange({direction:"outbound",from_number:"0412345678",to_number:"+14123456789"},"lead",null,empty)).toBe(false);
});

test("duplicate transport logs retain photo attachments and message text",()=>{
 const rows=journeyItems({...empty,messages:[message({id:"text-copy",twilio_message_sid:"same",body:"Clinic details"}),message({id:"photo-copy",twilio_message_sid:"same",media_urls:["https://example.com/photo.jpg"]})]});
 expect(rows).toHaveLength(1);expect(rows[0].summary).toBe("Clinic details");expect(rows[0].media).toHaveLength(1);
});

test("clinic email history shows recipient, edited copy and truthful delivery status",()=>{
 const e={id:"email1",created_at:"2026-10-10T03:00:00Z",email_accepted_at:null,email_to:"clinic@example.invalid",email_subject:"Revised consultation",email_body:"Hi team, the patient requested Friday.",email_status:"failed",email_error:"Rejected"};
 const items=journeyItems({...empty,emails:[e,e]});
 expect(items).toHaveLength(1);expect(items[0].title).toBe("Clinic email — Revised consultation");expect(items[0].status).toBe("Not delivered");expect(items[0].detail).toContain(e.email_body);expect(items[0].summary).toContain(e.email_to);
 expect(journeyItems({...empty,emails:[{...e,email_status:"accepted"}]})[0].status).toBe("Accepted for sending");
});
