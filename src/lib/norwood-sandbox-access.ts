export const NORWOOD_PATIENT_PREVIEW_ORIGIN = "https://preview--hairtransplantgroup.lovable.app";
export const NORWOOD_SANDBOX_LEAD_IDS = new Set([
  "5e70f557-73ce-4bb7-a11a-6b718dbd092f",
  "b2828129-1c28-4502-927a-11f43a0a8473",
]);
export function assertNorwoodSandboxLead(leadId: string) {
  if (!NORWOOD_SANDBOX_LEAD_IDS.has(leadId)) throw new Error("This photo test is available only for the sandbox test leads.");
}
