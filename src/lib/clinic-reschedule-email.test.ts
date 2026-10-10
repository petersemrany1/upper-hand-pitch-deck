import {test,expect} from "bun:test";
import {appointmentEmailLabel,clinicRescheduleEmail,validateClinicEmailDraft,validClinicEmail} from "./clinic-reschedule-email";
import type {RescheduleSnapshot} from "./booking-reschedule";
const s={appointment:{patient_name:"Jane Smith",appointment_date:"2026-10-30",appointment_time:"11:30:00"},clinic:{clinic_name:"Boss Clinic",state:"WA"}} as RescheduleSnapshot;
test("approved copy has old and new clinic times and no signature",()=>{
 const email=clinicRescheduleEmail(s,"2026-10-30","12:00");
 expect(email.subject).toBe("Consultation rescheduled — Jane Smith");
 expect(email.body).toContain("Hi Boss Clinic team,");
 expect(email.body).toContain("Previous appointment: Friday 30 October 2026 at 11:30am");
 expect(email.body).toContain("New appointment: Friday 30 October 2026 at 12:00pm");
 expect(email.body).toEndWith("The patient will receive a text confirming their new appointment details.");
 expect(email.body).not.toMatch(/Kind regards|Hair Transplant Group/);
});
test("midnight, noon and clinic local times do not shift with rep timezone",()=>{
 expect(appointmentEmailLabel("2026-10-04","00:00")).toEndWith("at 12:00am");
 expect(appointmentEmailLabel("2026-10-04","12:00")).toEndWith("at 12:00pm");
 expect(appointmentEmailLabel("2026-10-04","17:05")).toEndWith("at 5:05pm");
});
test("edited copy is preserved, empty or oversized messages and multiline subjects rejected",()=>{
 const draft={subject:"Revised appointment",body:"Hi team,\n\nPatient requested next Friday."};
 expect(validateClinicEmailDraft(draft)).toEqual(draft);
 for(const patch of [{subject:""},{subject:"Hello\nBcc: someone@example.invalid"},{subject:"x".repeat(201)},{body:" "},{body:"x".repeat(5001)}]) expect(()=>validateClinicEmailDraft({...draft,...patch})).toThrow();
 expect(validClinicEmail("clinic@example.invalid")).toBe(true);
 for(const v of [null,"","wrong","a@example.invalid,b@example.invalid","a@example.invalid\n"])expect(validClinicEmail(v)).toBe(false);
});
