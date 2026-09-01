# Square for the $75 patient booking fee (sales portal only)

Stripe stays in place for B2B clinic pack links, existing refunds and everything else. New patient deposits are taken on Square (AUD), routed by an explicit `payment_processor` column — never inferred.

## 1. Migration (exact SQL)

```sql
ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS payment_processor text,
  ADD COLUMN IF NOT EXISTS square_payment_id text,
  ADD COLUMN IF NOT EXISTS square_order_id text,
  ADD COLUMN IF NOT EXISTS deposit_token uuid;

ALTER TABLE public.clinic_appointments
  ADD COLUMN IF NOT EXISTS payment_processor text,
  ADD COLUMN IF NOT EXISTS square_payment_id text,
  ADD COLUMN IF NOT EXISTS square_refund_id text;

ALTER TABLE public.meta_leads
  ADD CONSTRAINT meta_leads_payment_processor_chk
  CHECK (payment_processor IS NULL OR payment_processor IN ('stripe','square'));
ALTER TABLE public.clinic_appointments
  ADD CONSTRAINT clinic_appointments_payment_processor_chk
  CHECK (payment_processor IS NULL OR payment_processor IN ('stripe','square'));

-- Backfill: everything already paid/attempted is Stripe.
UPDATE public.meta_leads
   SET payment_processor = 'stripe'
 WHERE payment_processor IS NULL
   AND (deposit_paid_at IS NOT NULL OR stripe_payment_intent_id IS NOT NULL);

UPDATE public.clinic_appointments
   SET payment_processor = 'stripe'
 WHERE payment_processor IS NULL
   AND stripe_payment_intent_id IS NOT NULL;

-- One deposit token per lead, generated for all rows now and by default later.
UPDATE public.meta_leads SET deposit_token = gen_random_uuid() WHERE deposit_token IS NULL;
ALTER TABLE public.meta_leads ALTER COLUMN deposit_token SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS meta_leads_deposit_token_key
  ON public.meta_leads (deposit_token);
CREATE INDEX IF NOT EXISTS meta_leads_square_payment_id_idx
  ON public.meta_leads (square_payment_id) WHERE square_payment_id IS NOT NULL;
```

Column lockdown: the existing payment-column guard trigger / grant pattern on `meta_leads` and `clinic_appointments` is extended to the seven new columns so only the service role can write them (clinics and reps cannot update them, and `deposit_token` is never selectable by `anon`). Exact statements are written to mirror whatever guard is already on `stripe_payment_intent_id` — I re-read that guard and copy it column-for-column rather than inventing a new scheme. No `stripe_` column or value is modified.

## 2. Files added

- `src/lib/square.server.ts` — server client (`SQUARE_ACCESS_TOKEN`, base URL from `SQUARE_ENVIRONMENT`), `createSquarePayment`, `refundSquarePayment`, `getSquareErrorMessage`, `verifySquareWebhook` (HMAC-SHA256 over notification URL + raw body, base64, **constant-time** compare via a length-checked XOR loop — not `includes`).
- `src/lib/square.ts` — browser: `loadSquareSdk(environment)` (Web Payments SDK from the sandbox or production CDN, chosen at runtime).
- `src/utils/square-config.functions.ts` — `getSquareConfig` server fn returning `{ applicationId, locationId, environment, configured }`, read from `SQUARE_APPLICATION_ID` / `SQUARE_LOCATION_ID` / `SQUARE_ENVIRONMENT` inside the handler. **No `VITE_SQUARE_*` variables anywhere** — the browser fetches this before mounting the card form, so sandbox → production is a secrets change plus publish, with no code edit or rebuild-time config.
- `src/components/SquareCardForm.tsx` — mounts the Square card field, tokenises in the browser (no PAN ever reaches our server), calls the pay server fn, renders the identical "Payment processed. You can close this payment window and continue the call." message; no redirect/navigation on success.
- `src/components/SquareTestModeBanner.tsx` — same look/wording pattern as `PaymentTestModeBanner`, shown when environment is sandbox.
- `src/utils/square-deposit.functions.ts` — `startDepositPayment` (public, token-or-uuid lookup, returns amount + configured flag, **no patient name**) and `paySquareDeposit` (takes the card nonce, calls Square CreatePayment).
- `src/utils/square-fulfilment.server.ts` — `fulfilSquareDeposit(payment)`: same logic as `fulfilDepositPayment` (idempotency, `deposit_paid_at`, `deposit_amount`, `square_payment_id`, `payment_processor='square'`, appointment backfill, status flip only when an appointment row exists, same ops email with an idempotency key derived from the Square payment id).
- `src/routes/api.public.square.webhook.ts` — `payment.updated` handler.
- `src/utils/ops-alert.server.ts` — `sendRefundFailureAlert()` and a shared `opsAlertEmail()` reading `OPS_ALERT_EMAIL`.

## 3. Files changed

- `src/routes/pay-deposit.tsx` — accepts `?t=<token>` (new) and `?lead=<uuid>` (legacy, strict UUID, 30-day sunset comment); renders `SquareCardForm` instead of `DepositEmbeddedCheckout`. Copy, headings and meta unchanged.
- `src/components/ChargeCardOverPhoneModal.tsx` — swaps the embedded Stripe checkout for `SquareCardForm` in assisted mode; still no navigation on completion.
- `src/utils/stripe.functions.ts` / `src/utils/resend.functions.ts` — the deposit SMS link becomes `…/pay-deposit?t=<deposit_token>`. Message bodies otherwise byte-identical, including clinic/doctor merge fields and the 10s auto-send countdown.
- `src/utils/deposit-refund.server.ts` — `refundDeposit(...)` becomes a processor-aware router: `square` → Square RefundPayment (idempotency key, 7500 AUD, payment_id) returning `square_refund_id`; `stripe` → existing managed→legacy paths untouched. Double-refund guard preserved (returns early if a refund id already exists). Square acceptance writes `refund_status='refund_pending'`, never `'refunded'` (see section 5b).
- `src/components/ClinicPortalView.tsx` — refund status labels only: `refund_pending` renders "Refund processing", `manual_required` keeps today's "mark refunded manually" action, `failed` now means a genuine processor error. No logic or wording changes beyond these labels.
- `src/utils/consult-outcome.functions.ts` — `processConsultOutcome` passes the processor + payment id; `resolveAppointmentDeposit` and `disqualifyAppointment` stop calling `STRIPE_HTG_SECRET_KEY` directly and go through the router (bug (a)); every failure path also fires the refund-failure alert email (bug (b)). Triggers unchanged: show/proceeded refund, no-show never refunds, admin disqualify refunds.
- `src/utils/deposit-fulfilment.server.ts` and `src/utils/chase.functions.ts` — hard-coded `peter@gobold.com.au` replaced with `OPS_ALERT_EMAIL` (falling back to the current address if unset).
- `src/utils/payments.functions.ts` — `createDepositCheckout` stops returning `patientName`; kept only for legacy in-flight Stripe sessions.
- `src/integrations/supabase/types.ts` regenerates after the migration.

Untouched: `sent-links.tsx` B2B pack links, reminder edge function, booking gates, status-lock trigger, leaderboard, `dashboard_conversion_stats`.

## 4. Square payment call

CreatePayment body: `source_id` (browser token), `amount_money {amount: 7500, currency: "AUD"}`, `location_id` from `SQUARE_LOCATION_ID`, `autocomplete: true`, `idempotency_key` = deterministic hash of lead id + attempt counter, `reference_id` = lead id, `note` = "Booking fee — <patient> — <clinic>". No `statement_description_identifier` (US-only). Statement text comes from the Square location business name.

## 5. Webhook

`POST /api/public/square/webhook` → read raw body, verify `x-square-hmacsha256-signature` against `SQUARE_WEBHOOK_SIGNATURE_KEY` with a constant-time compare, reject 401 on mismatch. On `payment.updated` with `status === "COMPLETED"` call `fulfilSquareDeposit`. Idempotency: return early when `deposit_paid_at` is set and `square_payment_id` matches; the ops email uses `idempotencyKey: payment-received-<square_payment_id>`, so replays never double-credit or re-send. Any other status → `{received:true, ignored:...}`.

**Exact URL to register in the Square dashboard** (both events on one subscription, no trailing slash):

```text
https://hairtransplantgroup.lovable.app/api/public/square/webhook
```

Subscribed events: `payment.updated` and `refund.updated`. The same signature key covers both. The signature is computed over this URL string plus the raw body, so it must be registered character-for-character as above — any trailing slash or `www.` would break verification.

## 5b. Refund lifecycle (Amendment 1)

`refund_status` becomes an explicit four-value vocabulary, replacing the current overloaded `'failed'`:

| value | meaning |
| --- | --- |
| `refund_pending` | processor accepted the refund, not yet settled |
| `refunded` | processor confirmed COMPLETED (`refund_processed_at` set here, and only here) |
| `failed` | processor error — retryable |
| `manual_required` | no processor path exists (old closed Stripe account, no payment id) — needs a bank transfer |

Flow for Square: RefundPayment accepted → write `square_refund_id` + `refund_status='refund_pending'`, leave `refund_processed_at` null. Then `refund.updated`:
- `COMPLETED` → `refund_status='refunded'`, `refund_processed_at=now()`.
- `FAILED` / `REJECTED` → `refund_status='failed'` and fire the refund-failure alert email (patient, lead id, processor, Square error) to `OPS_ALERT_EMAIL`.
- `PENDING` → no change.

Matched by `square_refund_id`, and idempotent: a replayed `refund.updated` for a refund already at `refunded` is a no-op, and the alert email is keyed `refund-failed-<square_refund_id>` so it sends once.

Existing Stripe rows that today read `refund_status='failed'` are left as-is (migration does not reinterpret history); the manual-refund paths in `consult-outcome.functions.ts` switch to writing `manual_required` going forward.

## 6. Test plan

1. **Patient link** — send a deposit SMS to a sandbox lead, open `?t=token`, confirm no name is shown, pay with Square's sandbox card, confirm the banner shows sandbox mode; verify `?lead=<uuid>` still loads and a non-UUID/unknown id returns the generic "couldn't find your booking" copy with no data leak.
2. **Rep-assisted modal** — with an active Twilio test call, take a payment in the modal; assert the call stays connected, no navigation occurs, and the "Payment processed…" message renders.
3. **Webhook fulfilment** — replay the sandbox `payment.updated` event twice: first credits `deposit_paid_at`/`square_payment_id`/`payment_processor='square'`, backfills the appointment and flips to `booked_deposit_paid`; second returns "already processed" with no second email. Also send a tampered signature and expect 401.
4. **Refund on show** — mark a sandbox Square-paid consult "show": expect `square_refund_id` written with `refund_status='refund_pending'` and `refund_processed_at` still null; then replay `refund.updated` COMPLETED and confirm it flips to `refunded` with a timestamp; replay it again and confirm no-op. Separately drive a `refund.updated` FAILED and confirm `refund_status='failed'` plus one alert email to `OPS_ALERT_EMAIL`. Re-run "show" on an already-refunded row to confirm the guard blocks a second refund; repeat "show" on an old Stripe-paid appointment to confirm the Stripe path is unchanged; confirm "no show" refunds nothing; and confirm an appointment with no payment id lands on `manual_required`, not `failed`.

## 7. GST treatment (Amendment 2) — reported, not replicated

- **Today on Stripe:** patient links set `automatic_tax: { enabled: true }`, so Stripe collects the payer's country/postcode and calculates AU GST on the $75 itself. Because the Stripe price is $75 and automatic tax is on, Stripe's behaviour depends on whether that price is flagged tax-inclusive — if inclusive, the patient pays $75 and Stripe reports ~$6.82 GST inside it; if exclusive, Stripe adds 10% on top. The rep-assisted modal already has automatic tax **off**, so assisted payments have never been tax-calculated at all — the two entry points are already inconsistent today.
- **On Square:** there is no automatic tax on the Payments API. CreatePayment charges exactly `amount_money` — the patient is charged **$75.00 AUD flat, every time, both entry points**. No line-item tax is calculated or reported by Square, and nothing is added on top.
- **Net effect:** patient-facing price is unchanged ($75). What changes is that Square will not report a GST component per payment. Since the fee is fully refunded on attendance, most of these are not really revenue anyway — but this is a question for your accountant, not something I should decide.
- **What can be configured on the Square location:** Square AU lets you set tax rates and mark the business as GST-registered under Settings → Taxes, but those rates apply to Square Point of Sale / Invoices / Online Checkout item lines — they do **not** apply to raw Payments API charges like ours. So there is nothing to configure that would restore automatic tax on this flow. If you need per-payment GST reporting, the options are Square Invoices (different patient experience) or treating it in your bookkeeping.
- I am not attempting to replicate automatic tax.

## 8. Confirmed facts

- Square location name (production): **Hair Transplant Group**, location id **LYXMY9D6HZT1X**. Held in `SQUARE_LOCATION_ID` only; never hard-coded.
- **Sandbox verified live via list-locations:** location `LNS0EYRXFK2XX` — "Default Test Account", **country AU, currency AUD**, en-AU, Parliament Dr, Canberra ACT 2600, ACTIVE, CREDIT_CARD_PROCESSING enabled. A 7500 AUD CreatePayment is valid here, so the sandbox test exercises the real Australian flow. No new sandbox account needed.
- **Config now in place:** `SQUARE_APPLICATION_ID`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` (= `LNS0EYRXFK2XX`), `SQUARE_ENVIRONMENT` (= `sandbox`), `SQUARE_WEBHOOK_SIGNATURE_KEY`, `OPS_ALERT_EMAIL` (= peter@gobold.com.au). Nothing further is needed before build.
- Webhook URL to register (repeated for clarity, exact, no trailing slash): `https://hairtransplantgroup.lovable.app/api/public/square/webhook`

## 9. Things to flag


- **Square has no hosted embedded checkout equal to Stripe's.** The Web Payments SDK card form is the closest match and is what this plan uses, so the patient page layout will be our own markup rather than a Stripe iframe. Visually it can be made to match, but it is not pixel-identical to today's Stripe frame — that is the one place "identical screens" can't be literal.
- **Upside:** the assisted flow finally becomes exactly card number + expiry + CVC (plus postcode, which Square AU normally requires) — no email, no cardholder name, no Apple Pay row. That is what you originally wanted and Stripe wouldn't allow.
- Square AU may require a postal code on the card form depending on the location settings; if so it's one extra field and cannot be removed.
- The browser gets the application id and location id from the `getSquareConfig` server fn; the payment handler always reads `SQUARE_LOCATION_ID` server-side and never trusts a location id sent from the client, so a tampered client can't redirect funds.
- Square sandbox and production have separate application IDs, access tokens, location ids and webhook signature keys — switching `SQUARE_ENVIRONMENT` alone is not enough, all five values must be swapped together.
- Square webhook signing uses the **exact** notification URL string configured in the Square dashboard; if the published URL differs by even a trailing slash, verification fails. Needs to be set to `https://hairtransplantgroup.lovable.app/api/public/square/webhook`.
- `resolveAppointmentDeposit` looks the appointment up with `.maybeSingle()` by lead, which errors if a lead ever has two appointment rows. Not in scope, but it will bite eventually.
- Square refunds settle asynchronously, now handled properly via `refund.updated` (section 5b). One consequence to accept: between acceptance and settlement the portal shows "Refund processing" rather than "Refunded", which is a visible difference from today's instant-looking Stripe behaviour — but it is the honest state.
- Adding `refund_pending` / `manual_required` means any place that string-compares `refund_status === 'refunded'` or `'failed'` must be audited. I'll grep for every read of `refund_status` before changing it so no portal badge or filter silently stops matching.
- Square identity verification still applies to the Square account; if it isn't verified, payments will decline exactly like Stripe does now. The bypass button stays in place as the fallback.
