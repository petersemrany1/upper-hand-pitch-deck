import type { SupabaseClient } from '@supabase/supabase-js';

/** Notification failures must never undo a payment or prevent a booking. */
export async function notifyDepositReceived(
  supabase: SupabaseClient, origin: string, serviceKey: string,
  leadId: string, processor: 'stripe' | 'square', paymentId: string,
) {
  try {
    const { data: lead, error } = await supabase.from('meta_leads')
      .select('first_name, last_name, deposit_paid_at, deposit_amount, stripe_checkout_session_id, square_payment_id')
      .eq('id', leadId).single();
    if (error || !lead) throw new Error('Could not read paid deposit');
    if (!lead.deposit_paid_at || lead[processor === 'stripe' ? 'stripe_checkout_session_id' : 'square_payment_id'] !== paymentId) return;
    const { data: appointment, error: appointmentError } = await supabase.from('clinic_appointments')
      .select('appointment_date, appointment_time, doctor_name, square_payment_id, square_refund_id, refund_status')
      .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (appointmentError) throw new Error('Could not check appointment refund state');
    // An older payment webhook can arrive without the latest refund fields.
    // Only suppress the matching payment, so a previous refund cannot hide a
    // genuinely new deposit receipt.
    if (processor === 'square' && appointment?.square_payment_id === paymentId &&
      (appointment.square_refund_id || appointment.refund_status)) return;
    const response = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        templateName: 'deposit-received',
        idempotencyKey: `deposit-received-${processor}-${paymentId}`,
        templateData: {
          patientName: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Patient',
          amount: lead.deposit_amount == null ? 'Deposit paid' : `$${Number(lead.deposit_amount).toFixed(2)} AUD`,
          paidAt: new Date(lead.deposit_paid_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }),
          appointment: appointment ? [appointment.appointment_date, appointment.appointment_time, appointment.doctor_name].filter(Boolean).join(' · ') : 'No appointment details available yet',
          leadId, paymentId, processor,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || !(await response.json()).success) throw new Error('Deposit notification was not queued');
  } catch (error) {
    console.warn('Deposit received notification failed; payment remains credited', error);
  }
}
