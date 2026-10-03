import { useEffect, useState } from "react";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getRescheduleDetails,rescheduleBooking } from "@/utils/booking-reschedule.functions";
import { availableRescheduleSlots,clinicNow,rescheduleText,type RescheduleSnapshot } from "@/lib/booking-reschedule";
import { toast } from "sonner";

export function BookingRescheduleDialog({appointmentId,onClose,onSaved}:{appointmentId:string;onClose:()=>void;onSaved:()=>void}) {
 const [details,setDetails]=useState<{snapshot:RescheduleSnapshot;version:string}|null>(null);
 const [date,setDate]=useState("");const [time,setTime]=useState("");const [reason,setReason]=useState("");
 const [review,setReview]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState("");
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const load=async()=>{setDetails(null);setError("");setReview(false);setRequestId(crypto.randomUUID());try{const d=await getRescheduleDetails({data:{appointmentId}});setDetails(d);setDate(d.snapshot.appointment.appointment_date);setTime("");}catch(e){setError(e instanceof Error?e.message:"Could not load appointment");}};
 useEffect(()=>{void load();},[appointmentId]);
 const s=details?.snapshot;const slots=s?availableRescheduleSlots(s,date):[];
 const choose=()=>{setError("");setRequestId(crypto.randomUUID());setReview(true);};
 const save=async()=>{
  if(!details||saving)return;setSaving(true);setError("");
  try{const result=await rescheduleBooking({data:{appointmentId,requestId,version:details.version,date,time,reason}});
    if(result.status==="accepted")toast.success("Appointment rescheduled. Patient confirmation accepted for sending.");
    else toast.warning("Appointment rescheduled, but the patient SMS needs attention. Check its status on the booking.");
    onSaved();
  }catch(e){setError(e instanceof Error?e.message:"Could not reschedule");}finally{setSaving(false);}
 };
 const label=(d:string,t:string)=>`${new Date(d+"T12:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} at ${t.slice(0,5)}`;
 return <Dialog open onOpenChange={(open)=>{if(!open&&!saving)onClose();}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{review?"Confirm this reschedule":"Reschedule appointment"}</DialogTitle><DialogDescription>Check the patient's name, phone and clinic before changing the appointment.</DialogDescription></DialogHeader>
 {error&&<div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error} <button type="button" disabled={saving} onClick={load} className="underline">Refresh details</button></div>}
 {!s&&!error&&<p>Loading appointment…</p>}
 {s&&<>
 <div className="rounded-lg border p-4 space-y-1"><p className="font-semibold">{s.appointment.patient_name}</p><p>{s.appointment.patient_phone||"No phone number"}</p><p>{s.clinic.clinic_name} · {s.appointment.doctor_name?.split(" — ")[0]}</p><p className="text-sm text-muted-foreground">Current: {label(s.appointment.appointment_date,s.appointment.appointment_time)}</p></div>
 {!review?<><label className="grid gap-1 text-sm">New date<input className="rounded border p-2" type="date" min={clinicNow(s.clinic.state).date} value={date} onChange={e=>{setDate(e.target.value);setTime("");}}/></label>
 <label className="grid gap-1 text-sm">Available time<select className="rounded border p-2" value={time} onChange={e=>setTime(e.target.value)}><option value="">Choose a time</option>{slots.map(slot=><option key={slot.time} value={slot.time}>{slot.label}</option>)}</select></label>
 {!slots.length&&<p className="text-sm">No available times on this date. Choose another date.</p>}
 <label className="grid gap-1 text-sm">Reason (optional)<textarea maxLength={500} className="rounded border p-2" value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <Button disabled={!time||(date===s.appointment.appointment_date&&time===s.appointment.appointment_time.slice(0,5))||!!s.appointment.outcome||s.reminder?.status!=="confirmed"} onClick={choose}>Review reschedule</Button></>:<>
 <p>Move <strong>{s.appointment.patient_name}</strong> at <strong>{s.clinic.clinic_name}</strong> from <strong>{label(s.appointment.appointment_date,s.appointment.appointment_time)}</strong> to <strong>{label(date,time)}</strong>?</p>
 <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold mb-2">Text to the patient</p><p>{rescheduleText(s,date,time)}</p></div>
 <p className="text-sm text-muted-foreground">The clinic portal will show the new time. Remaining reminders will follow the new date. The booking owner and deposit stay unchanged.</p>
 <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={()=>setReview(false)}>Back</Button><Button disabled={saving} onClick={save}>{saving?"Saving…":"Confirm reschedule and send text"}</Button></div>
 </>}
 </>}
 </DialogContent></Dialog>;
}
