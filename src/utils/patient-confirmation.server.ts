import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { bookingConfirmationSms, clinicSmsAddress } from "@/lib/booking-confirmation-sms";
import { formatAUPhone } from "../../supabase/functions/send-appointment-reminders/reminders";

export async function loadPatientConfirmation(db: SupabaseClient<Database>, leadId: string) {
  const { data: appointment, error } = await db.from("clinic_appointments")
    .select(`appointment_date, appointment_time, patient_name, patient_phone, doctor_name,
      outcome, disqualified_at, clinic:partner_clinics!clinic_appointments_clinic_id_fkey(clinic_name,address,city,state,phone),
      reminder:appointment_reminders!appointment_reminders_appointment_id_fkey(status)`)
    .eq("lead_id", leadId).maybeSingle();
  if (error) throw new Error("Could not check the saved appointment. Please reopen the booking.");
  if (!appointment || appointment.outcome || appointment.disqualified_at ||
      appointment.reminder.some(row => row.status !== "confirmed")) {
    throw new Error("An active booking is required to send a confirmation.");
  }
  const clinic = appointment.clinic;
  const phone = formatAUPhone(appointment.patient_phone);
  if (!clinic || !appointment.doctor_name?.trim() || !phone) {
    throw new Error("Check the clinic, consultation provider and patient phone on the booking.");
  }
  if (!/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(appointment.appointment_time)) {
    throw new Error("Check the time on the saved appointment.");
  }
  const [hours, minutes] = appointment.appointment_time.split(":");
  const hour = Number(hours);
  const body = bookingConfirmationSms({
    firstName: appointment.patient_name.trim().split(/\s+/)[0] || "there",
    date: new Date(appointment.appointment_date + "T12:00:00Z").toLocaleDateString("en-AU", {
      weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
    }),
    time: `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`,
    consultantName: appointment.doctor_name,
    clinicName: clinic.clinic_name, clinicAddress: clinicSmsAddress(clinic), clinicPhone: clinic.phone,
  });
  return { body, phone };
}
