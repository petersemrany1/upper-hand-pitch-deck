import { consultationMemberLabel } from "./consultation-team";

type AppointmentDoctor = { doctor_id: string | null; doctor_name: string | null };
type ClinicDoctor = {
  id: string;
  name: string;
  title: string | null;
  is_active: boolean;
  conducts_consultations: boolean;
};

/** The booking's named provider wins; never choose arbitrarily from a roster. */
export function checkoutDoctorName(
  appointment: AppointmentDoctor | null,
  clinicDoctors: ClinicDoctor[],
): string | null {
  const bookedName = appointment?.doctor_name?.trim();
  if (bookedName) return bookedName;
  if (appointment?.doctor_id) {
    const bookedDoctor = clinicDoctors.find((doctor) => doctor.id === appointment.doctor_id);
    return consultationMemberLabel(bookedDoctor) || null;
  }
  const available = clinicDoctors.filter((doctor) => doctor.is_active && doctor.conducts_consultations);
  return available.length === 1 ? consultationMemberLabel(available[0]) || null : null;
}
