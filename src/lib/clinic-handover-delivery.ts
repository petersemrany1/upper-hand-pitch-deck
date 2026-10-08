import { z } from "zod";

const emailAddress = z.string().email();
type ClinicEmailSettings = { email: string | null; handover_cc: string | null };

export async function loadClinicHandoverRecipients(
  lookup: (table: "partner_clinics" | "clinics") => PromiseLike<{
    data: ClinicEmailSettings | null;
    error: { message: string } | null;
  }>,
) {
  const partner = await lookup("partner_clinics");
  if (partner.error) throw new Error("Could not load the clinic's notification addresses. Please try again.");
  if (partner.data) return clinicHandoverRecipients(partner.data);
  const legacy = await lookup("clinics");
  if (legacy.error) throw new Error("Could not load the clinic's notification addresses. Please try again.");
  return clinicHandoverRecipients(legacy.data);
}

export function clinicHandoverRecipients(
  clinic: ClinicEmailSettings | null,
): { to: string; cc: string[] } {
  const to = clinic?.email?.trim() ?? "";
  if (!emailAddress.safeParse(to).success) {
    throw new Error("Add a valid notification email in the clinic's settings before sending the handover.");
  }
  const cc = (clinic?.handover_cc ?? "").split(/[,;\s]+/).filter(Boolean);
  if (cc.some((address) => !emailAddress.safeParse(address).success)) {
    throw new Error("Correct the notification CC addresses in the clinic's settings before sending the handover.");
  }
  const seen = new Set([to.toLowerCase()]);
  return {
    to,
    cc: cc.filter((address) => {
      const key = address.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

export function clinicHandoverReceipt(input: {
  providerId: unknown;
  clinicId: string;
  leadId: string;
  to: string;
  cc: string[];
}) {
  if (typeof input.providerId !== "string" || !input.providerId.trim()) {
    throw new Error("The email service did not return a message ID. Check the delivery log before trying again.");
  }
  return {
    message_id: input.providerId.trim(),
    template_name: "clinic-handover",
    recipient_email: input.to,
    status: "sent" as const,
    metadata: {
      provider: "resend",
      delivery_state: "accepted_by_provider",
      clinic_id: input.clinicId,
      lead_id: input.leadId,
      cc: input.cc,
    },
  };
}
