// Ported from the Legal app (family-law-floater/src/lib/firm-lawyer-allocation.ts). Re-run the port script to refresh.
// Trilogy books against the firm's shared calendar and allocates the available
// lawyer afterwards. Scope this preference to its existing firm record, not a
// display name or a synthetic lawyer record. null remains the stored selection.
export const TRILOGY_FIRM_ID = "e2a11dfa-0191-4d90-90d6-67a4fade3979";
export const ANY_AVAILABLE_LAWYER = "__any_available__";
export const ANY_AVAILABLE_LAWYER_LABEL = "Any available lawyer";
export const TRILOGY_ALLOCATION_LABEL = "To be allocated by Trilogy";

export function firmAllocatesLawyer(firmId: string | null | undefined): boolean {
  return firmId === TRILOGY_FIRM_ID;
}
