import { deliverRescheduleOnce } from "@/lib/reschedule-delivery";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bookingActor } from "./booking-access.server";
import { validateReschedule,rescheduleText,type RescheduleSnapshot } from "@/lib/booking-reschedule";
import { formatAUPhone } from "../../supabase/functions/send-appointment-reminders/reminders";
import { sendSms } from "../../supabase/functions/send-appointment-reminders/twilio";
import { PATIENT_SMS_FROM } from "@/lib/booking-confirmation-sms";
const admin=()=>supabaseAdmin as any;
const id=(value:string)=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new Error("Invalid appointment reference");return value;};

export const getRescheduleDetails=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .inputValidator((data:{appointmentId:string})=>({appointmentId:id(data.appointmentId)}))
 .handler(async({data,context})=>{
   const {data:details,error}=await (context.supabase as any).rpc("get_booking_reschedule",{p_id:data.appointmentId});
   if(error)throw new Error(error.message);
   return details as {snapshot:RescheduleSnapshot;version:string};
 });

// Claim once. Timeouts retain the claim and require review rather than blindly
// sending a duplicate. A definite rejection remains retryable on the same event.
async function deliverReschedule(eventId:string) {
 const db=admin();
 return deliverRescheduleOnce({
  async claim(){const {data,error}=await db.from("appointment_reschedules").update({sms_status:"sending",sms_error:null}).eq("id",eventId).in("sms_status",["pending","failed"]).select("*").maybeSingle();if(error)throw error;return data;},
  async existing(){const {data,error}=await db.from("appointment_reschedules").select("sms_status,sms_error").eq("id",eventId).single();if(error)throw error;return {status:data.sms_status,error:data.sms_error};},
  async send(event){const account=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN;if(!account||!token)return {ok:false,error:"SMS service is not configured"};return sendSms(account,token,event.sms_phone,event.sms_body);},
  async finish(status,result){const {error}=await db.from("appointment_reschedules").update({sms_status:status,sms_sid:result.sid??null,sms_error:result.error??null}).eq("id",eventId);if(error)throw error;},
  async log(event,result){
   const {data:a}=await db.from("clinic_appointments").select("lead_id,patient_name").eq("id",event.appointment_id).single();
   const {data:existing}=await db.from("sms_threads").select("id").eq("phone",event.sms_phone).maybeSingle();
   let threadId=existing?.id;
   if(!threadId){const {data:thread}=await db.from("sms_threads").insert({phone:event.sms_phone,display_name:a?.patient_name}).select("id").single();threadId=thread?.id;}
   if(threadId)await db.from("sms_messages").insert({thread_id:threadId,direction:"outbound",body:event.sms_body,twilio_message_sid:result.sid,status:result.status??"queued",from_number:PATIENT_SMS_FROM,to_number:event.sms_phone,lead_id:a?.lead_id,sent_at:new Date().toISOString()});
  }
 });
}
export const rescheduleBooking=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .inputValidator((data:{appointmentId:string;requestId:string;version:string;date:string;time:string;reason:string})=>({...data,appointmentId:id(data.appointmentId),requestId:id(data.requestId),reason:String(data.reason??"").trim().slice(0,500)}))
 .handler(async({data,context})=>{
   const actor=await bookingActor(context.supabase);
   const {data:details,error}=await (context.supabase as any).rpc("get_booking_reschedule",{p_id:data.appointmentId});
   if(error)throw new Error(error.message);
   // A retried request never moves the appointment twice or queues another text.
   const {data:previous}=await admin().from("appointment_reschedules").select("appointment_id,actor_id,new_date,new_time").eq("id",data.requestId).maybeSingle();
   if(previous){if(details.snapshot.appointment.appointment_date!==previous.new_date || details.snapshot.appointment.appointment_time.slice(0,5)!==previous.new_time.slice(0,5))throw new Error("The appointment changed again. Refresh before sending a confirmation.");if(previous.appointment_id!==data.appointmentId||previous.actor_id!==actor.id||previous.new_date!==data.date||previous.new_time.slice(0,5)!==data.time)throw new Error("Request already used");return {eventId:data.requestId,...await deliverReschedule(data.requestId)};}
   if(details.version!==data.version)throw new Error("Appointment or availability changed. Refresh and review the new details.");
   const snapshot=details.snapshot as RescheduleSnapshot;
   validateReschedule(snapshot,data.date,data.time);
   const phone=formatAUPhone(snapshot.appointment.patient_phone);
   if(!phone)throw new Error("The patient needs a valid phone number before a confirmation can be sent");
   const {data:eventId,error:commitError}=await admin().rpc("commit_booking_reschedule",{p_id:data.appointmentId,p_request:data.requestId,p_actor:actor.id,p_version:data.version,p_date:data.date,p_time:data.time,p_reason:data.reason,p_sms:rescheduleText(snapshot,data.date,data.time),p_phone:phone});
   if(commitError)throw new Error(commitError.message);
   return {eventId:eventId as string,...await deliverReschedule(eventId)};
 });
export const retryRescheduleSms=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .inputValidator((data:{eventId:string})=>({eventId:id(data.eventId)}))
 .handler(async({data,context})=>{
   await bookingActor(context.supabase);
   const {data:event,error}=await (context.supabase as any).from("appointment_reschedules").select("id,appointment_id,new_date,new_time").eq("id",data.eventId).maybeSingle();
   if(error||!event)throw new Error("You do not have access to this booking");
   const {data:a}=await context.supabase.from("clinic_appointments").select("appointment_date,appointment_time").eq("id",event.appointment_id).single();
   if(!a||a.appointment_date!==event.new_date||a.appointment_time.slice(0,5)!==event.new_time.slice(0,5))throw new Error("The appointment has changed again. Do not send the old confirmation.");
   return deliverReschedule(event.id);
 });
