# Refund notifications

New refund state changes are captured atomically in `refund_notifications`. Historical completed refunds are not backfilled. The patient message is:

> Hi, your $75 deposit has been refunded. It can take 4–14 business days to show in your account.

The amount comes from the verified provider refund (or the recorded amount for an admin-confirmed manual refund). A missing/invalid amount or phone stops the text and raises an owner alert. Marking attendance alone never sends this message.

## Delivery

- A minute-by-minute service-authenticated worker claims due records atomically. Square and both existing Stripe accounts are supported. It retrieves the provider's current refund status before sending; pending refunds wait and failures alert Peter. It never creates or retries a monetary refund.
- A unique key per provider refund prevents duplicate notifications. Manual refunds have one notification per appointment. Failure emails are captured once per transition into failed/manual-required; subsequent retries can create a new failure alert.
- Texts use the existing patient SMS number. The `sending` state is saved before contacting Twilio. A timeout, ambiguous 5xx, or crashed sender becomes `uncertain`, emails Peter, and never automatically resends. Explicit rate limiting can retry. Definitive SMS rejection or undeliverable status also emails Peter.
- Signed callbacks and a delivery polling fallback update status. Inbox logging is atomic and deduplicated by Twilio SID. Delayed callbacks cannot regress a delivered message. Failed inbox writes retry without resending.
- Owner emails go only to **peter@gobold.com.au**, through a dedicated `refund_alert_emails` queue and the existing verified sender. Enqueue and outbox status are committed together. The existing email dispatcher handles provider retries and delivery logs in a dedicated refund-only mode, without draining other queues. Suppression is honoured and remains visible as failure.
- Migration `20261015022000_refund_email_failed_run_retry.sql` supports a fresh, durably saved send reference only when the provider explicitly reports HTTP 409 `run_failed`. Ambiguous responses keep the original reference. Concurrent renewals and already-sent messages cannot create duplicate retry references.
- Provider webhooks retrieve current state to avoid out-of-order status changes. A six-hourly check of new provider refunds for 45 days also detects later bank rejection if webhooks are unavailable.

## Deployment and checks

Apply the core section of `20261015020000_refund_notifications.sql` and `20261015021000_refund_alert_email_tokens.sql` before publishing code, then activate the two schedules after publishing. They install restricted server functions and schedule `refund-notifications-every-minute` plus `refund-alert-emails-every-minute`. Both reuse the existing vault service-role credential (`SUPABASE_SERVICE_ROLE_KEY`, or this project's `email_queue_service_role_key`); no credential is copied into source or returned by health checks. Owner alerts include the provider-required stored unsubscribe token, reuse it across sends, and honour a used token or suppressed recipient. The follow-up migration also repairs missing tokens on unsent refund alerts without changing other mail.

`POST /api/public/hooks/refund-notifications` requires the service role key. `{ "dryRun": true }` reads configuration and notification states without claims, writes or sends. Public/user tokens are denied. The refund email job calls the existing `/lovable/email/queue/process` with `{ "refundAlertsOnly": true }`; default callers retain their prior behaviour. The dedicated queue has a 24-hour TTL and the dispatcher's existing five-failure budget and dead-letter audit trail.

Validate with `bun test`, `tsc --noEmit`, `bun run build`, and `PGLITE_MODULE=<installed PGlite module> node scripts/test-refund-notifications.mjs`. The SQL harness exercises the actual migration, replay, permissions, callbacks, duplicate claims, inbox writes and atomic email enqueue. Unit/transport tests never contact real patients or payment providers.

For an uncertain text, inspect Twilio history and the inbox before any manual resend. Do not repeat the refund. `refund_notifications` is readable only by admins; `email_send_log` tracks owner-email delivery. An email-provider outage can delay the email itself; failed/dead-letter entries remain available for review.

Official API references checked during implementation: [Stripe refund statuses](https://docs.stripe.com/api/refunds/object), [Square refunds](https://developer.squareup.com/docs/refunds-api/overview), [Twilio message delivery status](https://www.twilio.com/docs/messaging/api/message-resource).
