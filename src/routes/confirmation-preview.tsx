import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ConfirmationCallsView, type ConfirmationApi } from "@/components/ConfirmationCallsView";
import { confirmationDate, type ConfirmationBooking, type ConfirmationEvent } from "@/lib/appointment-confirmations";
export const Route=createFileRoute("/confirmation-preview")({component:Preview});
function Preview(){
 if(!import.meta.env.DEV)return <main>Not found</main>;
 return <FixturePreview/>;
}
function FixturePreview(){
 const now=useMemo(()=>new Date(),[]);
 const [activePhone,setActivePhone]=useState<string|null>(null);
 const [notice,setNotice]=useState("");
 const api=useMemo<ConfirmationApi>(()=>{
  let bookings:ConfirmationBooking[]= [
   ["Alex Example","09:30","Sydney","NSW","123 Example Street"],
   ["Jordan Sample","11:00","Perth","WA","45 Sample Road"],
   ["Taylor Demo","14:00","Sydney","NSW","123 Example Street"],
  ].map(([patient_name,appointment_time,city,state,address],i)=>({
   id:"fixture-"+i,lead_id:null,patient_name,patient_phone:"0400 000 000",appointment_date:confirmationDate(1,now),appointment_time,doctor_name:"Consultation specialist",updated_at:now.toISOString(),deposit_amount:75,square_payment_id:"fixture",stripe_payment_intent_id:null,outcome:null,disqualified_at:null,clinic:{clinic_name:"Example "+city+" Clinic",address,city,state},reminders:[{status:"confirmed"}],events:[],
  }));
  const add=(data:any,kind:ConfirmationEvent["kind"])=>{
   bookings=bookings.map(b=>b.id===data.appointmentId?{...b,events:[{id:data.requestId,appointment_id:b.id,appointment_updated_at:data.version,kind,note:data.note||null,created_at:new Date().toISOString(),actor_name:"Peter",sms_status:kind==="sms"?"accepted":null,sms_error:null,sms_body:data.body||null,sms_phone:b.patient_phone},...b.events]}:b);
  };
  return {list:async date=>structuredClone(bookings.filter(b=>b.appointment_date===date)),record:async data=>{add(data,data.outcome);},send:async data=>{add(data,"sms");return {status:"accepted",error:null};}};
 },[now]);
 return <div style={{minHeight:"100vh",background:"#f7f7f5"}}>
  <div style={{padding:"8px 24px",background:"#fff1d7",fontSize:12}}>Preview with sample patients · Calls and texts are simulated{notice&&" · "+notice}</div>
  <nav className="appointment-view-tabs"><a href="#" onClick={e=>e.preventDefault()}>Appointments</a><a href="#" aria-current="page" onClick={e=>e.preventDefault()}>Confirmation calls</a></nav>
  <ConfirmationCallsView api={api} now={now} onCall={async b=>setActivePhone(b.patient_phone)} activePhone={activePhone} callBusy={!!activePhone} callStatus={activePhone?"in-call":"ready"} onHangup={()=>setActivePhone(null)} onInbox={()=>setNotice("The live screen opens this patient’s SMS conversation.")} onReschedule={()=>setNotice("The live screen opens the existing reschedule form.")}/>
 </div>;
}
