/** A call may finish with the clinics that had room when its dial was admitted.
 * This does not reserve a credit. Other live calls can use the last credit first.
 * Opening a lead, waiting in the queue, or a previous call grants no exception.
 */
export class SalesCallCapacity {
  private admission: { leadId: string; clinics: Set<string> } | null = null;

  admit(leadId: string, remaining: Record<string, number>) {
    this.admission = { leadId, clinics: new Set(Object.keys(remaining).filter((id) => remaining[id] > 0)) };
  }

  clear() { this.admission = null; }

  allows(leadId: string, clinicId: string, liveLeadId: string | null, liveStatus: string): boolean {
    return liveStatus === "in-call" && liveLeadId === leadId
      && this.admission?.leadId === leadId && this.admission.clinics.has(clinicId);
  }
}

export const salesCallCapacity = new SalesCallCapacity();

/** Unmatched locations retain the existing manual-routing behaviour. */
export function canStartSalesCall(matchingClinicIds: string[], remaining: Record<string, number>): boolean {
  return matchingClinicIds.length === 0 || matchingClinicIds.some((id) => (remaining[id] ?? 0) > 0);
}
