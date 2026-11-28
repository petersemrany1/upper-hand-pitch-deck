// Legal's "doorbells" (webhooks and public API routes) are mounted at the
// same addresses as in the Legal app but answer only once the move is switched over: until
// LEGAL_LIVE=true every request gets a 503 and nothing runs. Twilio, Square,
// Stripe, Annature and the lead forms keep ringing the Legal app until then.
export function legalLive(): boolean {
  return /^\s*(true|1|yes|on)\s*$/i.test(process.env.LEGAL_LIVE ?? "");
}

/** The "not yet" response while Legal is switched off here, otherwise null. */
export function legalHookOff(): Response | null {
  return legalLive() ? null : new Response("Legal webhooks are not switched on in this app yet.", { status: 503 });
}
