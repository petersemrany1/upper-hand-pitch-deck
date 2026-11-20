export type Purchase = { id: string; phone: string; state: string; monthly_cents: number; currency: string };
export type PoolNumber = { number: string; twilio_sid: string | null; status: string; mms_enabled: boolean };
export type Settings = { enabled: boolean; release_enabled?: boolean; target_active: number; max_additional_numbers: number; max_monthly_cents: number; max_unit_cents: number; currency: string };
export type Quote = { phone: string; cents: number; currency: string; bundle: string; address: string };
export type OwnedNumber = { sid: string; phone: string; friendly: string; voiceUrl: string; smsUrl: string; voice: boolean; sms: boolean; mms: boolean };
export class RejectedPurchase extends Error {}
export interface Dependencies {
  settings: Settings;
  pool: PoolNumber[];
  budget: { used_numbers: number; committed_cents: number };
  pending: Purchase | null;
  baseUrl: string;
  quote(phone?: string): Promise<Quote>;
  owned(phone: string): Promise<OwnedNumber | null>;
  buy(quote: Quote, id: string): Promise<OwnedNumber>;
  reserve(quote: Quote): Promise<Purchase | null>;
  begin(id: string): Promise<boolean>;
  finish(id: string, number: OwnedNumber): Promise<void>;
  mark(id: string, state: 'uncertain' | 'failed', error: string): Promise<void>;
}
export function validateOwned(number: OwnedNumber, purchase: Purchase, base: string) {
  if (!/^PN[0-9a-f]{32}$/i.test(number.sid) || number.phone !== purchase.phone ||
    number.friendly !== `HTG-Replacement-${purchase.id}` || !number.voice || !number.sms ||
    number.voiceUrl !== `${base}/functions/v1/voice-inbound` || number.smsUrl !== `${base}/functions/v1/sms-inbound`) {
    throw new Error('Replacement ownership or callback configuration needs review');
  }
}
export async function maintainPool(d: Dependencies, dryRun = false) {
  const s = d.settings;
  // An ambiguous purchase must be reconciled before considering any new purchase.
  if (d.pending && d.pending.state !== 'prepared') {
    const owned = await d.owned(d.pending.phone);
    if (!owned) {
      if (!dryRun) await d.mark(d.pending.id, 'uncertain', 'Purchase outcome unconfirmed; no further purchase will be attempted.');
      return { result: 'needs_review', error: 'A purchase outcome is unconfirmed. Further purchases are paused.' };
    }
    validateOwned(owned, d.pending, d.baseUrl);
    if (!dryRun) await d.finish(d.pending.id, owned);
    return { result: dryRun ? 'would_reconcile' : 'reconciled', number: owned.phone };
  }
  if (!s.enabled && !dryRun) return { result: 'disabled' };
  if (d.pool.filter(n => n.status === 'active').length >= s.target_active) {
    if (d.pending && !dryRun) await d.mark(d.pending.id, 'failed', 'Pool already replenished before purchase.');
    return { result: 'pool_full' };
  }
  if (!d.pending && (d.budget.used_numbers >= s.max_additional_numbers || d.budget.committed_cents >= s.max_monthly_cents)) {
    return { result: 'budget_exhausted', error: 'The approved replacement allowance is fully committed; no number was bought.' };
  }
  const quote = await d.quote(d.pending?.phone);
  if (!Number.isSafeInteger(quote.cents) || quote.cents <= 0 || quote.cents > s.max_unit_cents || quote.currency !== s.currency ||
    (d.pending ? quote.cents > d.pending.monthly_cents || quote.currency !== d.pending.currency : d.budget.committed_cents + quote.cents > s.max_monthly_cents)) {
    throw new Error('Current Twilio rental price or currency exceeds the approved allowance');
  }
  if (dryRun) return { result: 'ready', monthly_cents: quote.cents, currency: quote.currency, active_numbers: d.pool.filter(n => n.status === 'active').length };
  const purchase = d.pending || await d.reserve(quote);
  if (!purchase) return { result: 'pool_full' };
  if (quote.phone !== purchase.phone) throw new Error('Reserved replacement identity changed');
  // Persist intent BEFORE the external request. This transition succeeds only once.
  if (!await d.begin(purchase.id)) return { result: 'already_claimed' };
  let owned: OwnedNumber;
  try {
    owned = await d.buy(quote, purchase.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Purchase failed';
    const state = error instanceof RejectedPurchase ? 'failed' : 'uncertain';
    await d.mark(purchase.id, state, message);
    return { result: state === 'failed' ? 'rejected' : 'needs_review', error: message };
  }
  try {
    validateOwned(owned, purchase, d.baseUrl);
    await d.finish(purchase.id, owned);
  } catch (error) {
    // A timeout while storing a successful purchase must never cause another buy.
    await d.mark(purchase.id, 'uncertain', error instanceof Error ? error.message : 'Registration needs reconciliation');
    return { result: 'needs_review', error: 'Number purchased; registration will be reconciled before further purchases.' };
  }
  return { result: 'purchased', number: owned.phone, monthly_cents: quote.cents, currency: quote.currency };
}
