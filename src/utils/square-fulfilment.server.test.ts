import { afterEach, expect, test } from 'bun:test';
import { fulfilSquareDeposit } from './square-fulfilment.server';
import type { SquarePayment } from '../lib/square.server';

const savedFetch = globalThis.fetch;
const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const savedEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  globalThis.fetch = savedFetch;
  for (const key of keys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

const paid: SquarePayment = {
  id: 'square-payment', status: 'COMPLETED', reference_id: 'lead',
  amount_money: { amount: 7500, currency: 'AUD' },
};

test('Square refund updates never credit the old payment or enqueue a deposit receipt', async () => {
  let requests = 0;
  globalThis.fetch = (async () => { requests++; throw new Error('Unexpected external request'); }) as typeof fetch;
  for (const refund of [
    { refund_ids: ['refund-pending'], refunded_money: { amount: 0, currency: 'AUD' } },
    { refund_ids: ['refund-completed'], refunded_money: { amount: 7500, currency: 'AUD' } },
    { refunded_money: { amount: 2500, currency: 'AUD' } },
  ]) {
    expect(await fulfilSquareDeposit({ ...paid, ...refund }, 'https://example.test')).toEqual({
      ok: true, detail: 'refund update ignored for deposit fulfilment',
    });
  }
  expect(requests).toBe(0);
});

test('unrefunded payment retries can still recover a missed deposit receipt', async () => {
  process.env.SUPABASE_URL = 'https://database.example.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const emails: any[] = [];
  const writes: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/rest/v1/meta_leads') {
      if (init?.method !== 'GET') writes.push(url.pathname);
      return Response.json({ id: 'lead', first_name: 'Jane', last_name: 'Doe', deposit_paid_at: '2026-10-20T00:00:00Z', deposit_amount: 75, square_payment_id: paid.id });
    }
    if (url.pathname === '/rest/v1/clinic_appointments') {
      return Response.json({ appointment_date: '2026-10-21', square_payment_id: paid.id, refund_status: null, square_refund_id: null });
    }
    expect(url.href).toBe('https://example.test/lovable/email/transactional/send');
    emails.push(JSON.parse(String(init?.body)));
    return Response.json({ success: true });
  }) as typeof fetch;
  expect(await fulfilSquareDeposit({ ...paid, refund_ids: [], refunded_money: { amount: 0, currency: 'AUD' } }, 'https://example.test')).toEqual({ ok: true, detail: 'already processed' });
  expect(writes).toEqual([]);
  expect(emails).toHaveLength(1);
  expect(emails[0].idempotencyKey).toBe('deposit-received-square-square-payment');
});
