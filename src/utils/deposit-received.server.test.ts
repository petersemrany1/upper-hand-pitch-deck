import { expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyDepositReceived } from './deposit-received.server';
import { template } from '../lib/email-templates/deposit-received';
import { createElement } from 'react';
import { render } from '@react-email/render';

function database(paid = true, appointment = true, refund: Record<string, unknown> = {}, appointmentError: unknown = null) {
  return { from: (table: string) => {
    const q = { select: () => q, eq: () => q, order: () => q, limit: () => q,
      single: async () => ({ data: { first_name: 'Jane', last_name: 'Doe', deposit_paid_at: paid ? '2026-10-13T00:00:00Z' : null, deposit_amount: 75, stripe_checkout_session_id: 'cs_paid', square_payment_id: 'sq_paid' }, error: null }),
      maybeSingle: async () => ({ data: table === 'clinic_appointments' && appointment ? { appointment_date: '2026-10-20', appointment_time: '10:30', doctor_name: 'Consultation team', square_payment_id: 'sq_paid', ...refund } : null, error: appointmentError }),
    }; return q;
  } } as unknown as SupabaseClient;
}

test('Stripe and Square receipts send for booked and not yet booked payments, with stable retry keys', async () => {
  const original = globalThis.fetch;
  const bodies: any[] = [];
  globalThis.fetch = (async (_url, init) => { bodies.push(JSON.parse(init!.body as string)); return Response.json({ success: true }); }) as typeof fetch;
  try {
    for (const booked of [true, false]) for (const processor of ['stripe', 'square'] as const) {
      const id = processor === 'stripe' ? 'cs_paid' : 'sq_paid';
      await notifyDepositReceived(database(true, booked), 'https://example.test', 'test-key', 'lead', processor, id);
      expect(bodies.at(-1).idempotencyKey).toBe(`deposit-received-${processor}-${id}`);
      expect(bodies.at(-1).templateName).toBe('deposit-received');
      expect(bodies.at(-1).templateData.appointment).toContain(booked ? '2026-10-20' : 'No appointment');
    }
    await notifyDepositReceived(database(false), 'https://example.test', 'test-key', 'lead', 'stripe', 'cs_paid');
    await notifyDepositReceived(database(), 'https://example.test', 'test-key', 'lead', 'stripe', 'wrong-payment');
    expect(bodies).toHaveLength(4);
    globalThis.fetch = (async () => { throw new Error('Email unavailable'); }) as typeof fetch;
    await expect(notifyDepositReceived(database(), 'https://example.test', 'test-key', 'lead', 'stripe', 'cs_paid')).resolves.toBeUndefined();
  } finally { globalThis.fetch = original; }
});

test('late Square payment updates cannot send a new-deposit receipt after a refund starts', async () => {
  const original = globalThis.fetch;
  const bodies: any[] = [];
  globalThis.fetch = (async (_url, init) => { bodies.push(JSON.parse(init!.body as string)); return Response.json({ success: true }); }) as typeof fetch;
  try {
    for (const refund of [
      { square_refund_id: 'refund' },
      ...['refund_pending', 'refunded', 'refunded_manual', 'manual_required', 'failed'].map(refund_status => ({ refund_status })),
    ]) {
      await notifyDepositReceived(database(true, true, refund), 'https://example.test', 'test-key', 'lead', 'square', 'sq_paid');
    }
    // A failed lookup must not silently treat an unknown refund state as paid.
    await notifyDepositReceived(database(true, true, {}, { message: 'DB unavailable' }), 'https://example.test', 'test-key', 'lead', 'square', 'sq_paid');
    expect(bodies).toHaveLength(0);

    // A different payment's refund must not suppress a genuine new deposit.
    await notifyDepositReceived(database(true, true, { square_payment_id: 'old_payment', square_refund_id: 'old_refund', refund_status: 'refunded' }), 'https://example.test', 'test-key', 'lead', 'square', 'sq_paid');
    expect(bodies).toHaveLength(1);
  } finally { globalThis.fetch = original; }
});

test('receipt is addressed to Peter and does not claim an incomplete booking is confirmed', async () => {
  expect(template.to).toBe('peter@gobold.com.au');
  const html = await render(createElement(template.component, { patientName: 'Jane Doe', amount: '$75.00 AUD', appointment: 'No appointment details available yet' }));
  expect(html).toContain('Jane Doe');
  expect(html).toContain('$75.00 AUD');
  expect(html).toContain('No appointment details available yet');
  expect(html).not.toContain('URGENT');
});
