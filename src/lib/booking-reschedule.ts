import { APP_TIMEZONE } from "./timezone";
import { generateSlots, type TradingHours, type BlockedSlot, type ExistingAppt, type AvailabilityOverride } from "./slot-generation";
import { clinicSmsAddress, rescheduleConfirmationSms } from "../../supabase/functions/_shared/patient-sms";
export type RescheduleSnapshot = {
  appointment: {id:string;clinic_id:string;lead_id:string|null;booking_rep_id:string|null;patient_name:string;patient_phone:string|null;doctor_name:string|null;appointment_date:string;appointment_time:string;updated_at:string;outcome:string|null;disqualified_at:string|null};
  clinic: {clinic_name:string;address:string|null;city:string|null;state:string|null;phone:string|null;min_appointment_gap_mins:number|null};
  trading: TradingHours[];blocks:BlockedSlot[];busy:ExistingAppt[];overrides:AvailabilityOverride[];
  reminder:{id:string;status:string}|null;
};
export function clinicNow(_state:string|null, now=new Date()) {
  const timeZone=APP_TIMEZONE;
  return { date:now.toLocaleDateString("en-CA",{timeZone}),time:now.toLocaleTimeString("en-GB",{timeZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}) };
}
export function availableRescheduleSlots(s:RescheduleSnapshot,date:string,now=new Date()) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const [y,m,d]=date.split("-").map(Number); const day=new Date(y,m-1,d,12);
  if(day.getFullYear()!==y || day.getMonth()!==m-1 || day.getDate()!==d) return [];
  const local=clinicNow(s.clinic.state,now);
  if(date<local.date) return [];
  return generateSlots(day,s.trading,s.blocks,s.busy,s.overrides,s.clinic.state,s.clinic.min_appointment_gap_mins??0)
    .filter(slot=>slot.available && (date>local.date || slot.time>local.time));
}
export function validateReschedule(s:RescheduleSnapshot,date:string,time:string,now=new Date()) {
  if(s.appointment.outcome || s.appointment.disqualified_at || s.reminder?.status!=="confirmed") throw new Error("Only active confirmed appointments can be rescheduled");
  if(date===s.appointment.appointment_date && time===s.appointment.appointment_time.slice(0,5)) throw new Error("Choose a different date or time");
  if(!availableRescheduleSlots(s,date,now).some(slot=>slot.time===time)) throw new Error("That time is not available. Choose another time.");
  if(!s.clinic.phone?.trim() || !s.clinic.address?.trim() || !s.appointment.doctor_name?.trim()) throw new Error("Clinic contact or consultation provider details are missing. Ask an administrator to update them first.");
}
export function rescheduleText(s:RescheduleSnapshot,date:string,time:string) {
  const h=Number(time.slice(0,2));
  return rescheduleConfirmationSms({firstName:s.appointment.patient_name.trim().split(/\s+/)[0]||"there",date:new Date(date+"T12:00:00Z").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}),time:`${h%12||12}:${time.slice(3,5)} ${h>=12?"PM":"AM"}`,consultantName:s.appointment.doctor_name,clinicName:s.clinic.clinic_name,clinicAddress:clinicSmsAddress(s.clinic),clinicPhone:s.clinic.phone});
}
