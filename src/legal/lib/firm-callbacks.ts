// Ported from the Legal app (family-law-floater/src/lib/firm-callbacks.ts). Re-run the port script to refresh.
export type FirmIncomingCaller = {
  callSid: string;
  applicationId: string;
  name: string;
  firmName: string;
  phone: string;
};

export function firmCallbackIdentity(ownerId: string, sessionId: string) {
  return `firm_${ownerId.replaceAll("-", "")}_${sessionId.replaceAll("-", "")}`;
}

export const FIRM_CALLBACK_LEASE_MS = 90_000;

export type FirmMissedCall = {
  id: string;
  application_id: string;
  phone: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};
export type FirmMissedCallCursor = { createdAt: string; id: string };
