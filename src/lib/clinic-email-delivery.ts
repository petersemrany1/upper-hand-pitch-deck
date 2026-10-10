export type ClinicEmailEvent = { id: string; email_to: string; email_subject: string; email_body: string };
export type EmailDeliveryStatus = { status: string; error: string | null };
export type EmailSendResult = { status: "accepted" | "failed" | "uncertain"; receipt?: string; error?: string };
export async function deliverClinicEmailOnce(deps: {
  claim(): Promise<ClinicEmailEvent | null>;
  existing(): Promise<EmailDeliveryStatus>;
  send(event: ClinicEmailEvent): Promise<EmailSendResult>;
  finish(result: EmailSendResult): Promise<void>;
}): Promise<EmailDeliveryStatus> {
  const event = await deps.claim();
  if (!event) return deps.existing();
  let result: EmailSendResult;
  try { result = await deps.send(event); }
  catch { result = {status: "uncertain", error: "Email confirmation was interrupted. Check delivery before sending again."}; }
  try { await deps.finish(result); }
  catch { return {status: "uncertain", error: "Email status could not be saved. Check delivery before sending again."}; }
  return {status: result.status, error: result.error ?? null};
}

// A saved appointment must not be reported as a failed reschedule when either
// independent notification fails. Both persist their own retry/receipt state.
export async function deliverRescheduleNotifications(sms: () => Promise<EmailDeliveryStatus>, email: () => Promise<EmailDeliveryStatus>) {
  const [textResult, emailResult] = await Promise.allSettled([sms(), email()]);
  const result = (r: PromiseSettledResult<EmailDeliveryStatus>) => r.status === "fulfilled" ? r.value : {status: "uncertain", error: "Check the delivery status on this booking."};
  return {...result(textResult), email: result(emailResult)};
}
