/** Uses the same Resend connection as existing patient chase emails. */
export async function sendConfirmationEmail(to: string, subject: string, html: string, idempotencyKey: string, config: { apiKey?: string; gatewayKey?: string }, transport: typeof fetch = fetch) {
  if (!config.apiKey) return { ok: false, error: "Confirmation email is not configured: RESEND_API_KEY is missing" };
  const gateway = Boolean(config.gatewayKey);
  const response = await transport(gateway ? "https://connector-gateway.lovable.dev/resend/emails" : "https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${gateway ? config.gatewayKey : config.apiKey}`, ...(gateway ? { "X-Connection-Api-Key": config.apiKey } : {}), "Idempotency-Key": `appointment-confirmation/${idempotencyKey}` },
    body: JSON.stringify({ from: "Bold Patients <admin@bold-patients.com>", reply_to: "admin@bold-patients.com", to: [to], subject, html }),
  });
  if (response.status >= 500) throw new Error("Email provider outcome uncertain; review delivery before retrying");
  const data = await response.json();
  if (!response.ok) return { ok: false, error: data.message || `Email error ${response.status}` };
  if (!data.id) throw new Error("Email provider response missing ID; review before retrying");
  return { ok: true, sid: data.id as string };
}
