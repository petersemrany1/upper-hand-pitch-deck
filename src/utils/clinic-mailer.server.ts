import type { EmailSendResult } from "@/lib/clinic-email-delivery";

export async function sendClinicEmail(to: string, subject: string, text: string, cc: string[] = []): Promise<EmailSendResult> {
  const url = process.env.HANDOVER_MAILER_URL, secret = process.env.HANDOVER_MAILER_SECRET;
  if (!url || !secret) return {status: "failed", error: "Clinic email service is not configured."};

  // External clinic emails use the same Google Workspace mailer as handovers.
  // The database claim prevents duplicate sends; uncertain results stay claimed.
  const response = await fetch(url, {
    method: "POST", redirect: "follow", signal: AbortSignal.timeout(20000),
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({secret, to, ...(cc.length ? {cc: cc.join(", ")} : {}), subject, text, fromName: "Hair Transplant Group", replyTo: "peter@gobold.com.au"}),
  });
  if (!response.ok) {
    // A server timeout can follow a successful send. Never blindly retry it.
    const uncertain = response.status >= 500 || [408,409].includes(response.status);
    return {status: uncertain ? "uncertain" : "failed", error: `Email service returned ${response.status}.${uncertain ? " Check delivery before sending again." : " The email was not accepted; you can retry it."}`};
  }
  const receipt = await response.json() as {ok?: boolean};
  if (receipt.ok === false) return {status: "failed", error: "Clinic email service rejected the message. You can retry it."};
  if (receipt.ok !== true) return {status: "uncertain", error: "Email service did not confirm sending. Check delivery before sending again."};
  return {status: "accepted"};
}
