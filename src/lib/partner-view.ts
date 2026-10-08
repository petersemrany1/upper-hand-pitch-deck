import { z } from "zod";

export const partnerViewInput = z.object({ clinicId: z.string().uuid() });

export function partnerViewSearch(search: Record<string, unknown>): { viewClinic?: string } {
  const result = partnerViewInput.shape.clinicId.safeParse(search.viewClinic);
  return result.success ? { viewClinic: result.data } : {};
}

export function clinicPortalTarget(userType: string, ownClinicId: string | null, viewClinic?: string) {
  // A URL parameter can never change a partner's assigned clinic.
  if (userType === "clinic" && ownClinicId) return { clinicId: ownClinicId, partnerView: false };
  if (userType === "admin" && viewClinic) return { clinicId: viewClinic, partnerView: true };
  return null;
}

export type PartnerViewClinic = { id: string; clinic_name: string; is_active: boolean };
