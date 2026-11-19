# Automatic voice number pool

The signed outbound webhook reserves a caller ID atomically in PostgreSQL. Only active numbers below their rolling 24-hour attempt limit (default 80 per number) are eligible. Existing contacts retain their current eligible caller ID; new contacts and contacts whose number is retired or full rotate to the least-used eligible number. A retired number is never a fallback, including on webhook replay. An unavailable database or exhausted pool produces a message to the rep without dialing a destination.

The hourly `voice-reputation-hourly` job reconciles actual call counters and scans transcripts. A direct caller-ID spam/scam complaint in the first 600 characters of an outbound transcript within seven days retires that source number from outbound use. Mentions of texts, SMS, messages, links or emails exclude automatic retirement. Broader matches create review signals only. These are complaint indicators, not an authoritative carrier label lookup. The lease, callback route and SMS threads remain intact. No number is released or purchased by this feature.

Retirements, fewer than three active numbers and material performance deterioration create entries in the existing error log. Settings shows the last health-check time and flags stale checks after two hours. A call lasting 15 seconds includes voicemail and is not a measured human-answer rate. The 80-attempt limit is an operational cap, not a carrier-guaranteed spam threshold.

## Bounded replacements

`voice-pool-maintenance` runs hourly at minute 19, after reputation checks. It is disabled until an operator records the approved budget, approval timestamp and baseline number inventory. The current maximum authorization is two additional numbers at US$8.25 each / US$16.50 monthly rental, with a target of seven active numbers. The worker buys only when below target, at most one per execution. It verifies account-specific AU mobile pricing and reuses an approved regulatory bundle/address attached to an existing HTG mobile, never a different business's account-wide bundle. Voice and SMS capabilities are required; MMS is preferred. Callback and SMS webhooks are configured on purchase.

The allowance counts pending and purchased replacements, including retired replacements and missing local rows. Manual additions after the baseline also consume allowance. It does not reset each month and does not authorize releasing any number. A database lease, atomic budget reservation and one-way request-intent transition prevent overlapping jobs from buying twice. A timeout or uncertain provider response pauses further purchases and only reconciles the exact reserved number and unique friendly name. A confirmed success with a failed database write is recovered from Twilio. An unresolved ambiguous outcome requires review; it is never retried as a fresh purchase. Prices above the approved cap fail closed.

Deploy the worker and apply `20261120010000_voice_pool_replacements.sql`. Once approval exists, record `approved_at=now()` and `baseline_numbers=ARRAY(SELECT number FROM public.phone_numbers)` only if `approved_at IS NULL`, leaving `enabled=false`; never rebase an already approved allowance. Inspect a read-only `voice_pool_tick(true)` result. If ready within the approved price, enable the setting and run `voice_pool_tick()`. Verify the ledger, Twilio response and local pool. The worker uses the existing internal scheduler credential without a new secret or user-session access. `voice_pool_status()` exposes the summary only to administrators. No calls or messages are sent during maintenance.

Incoming callbacks ring the most recent active rep and active administrators using their actual `rep_<uuid>` Voice SDK identities. Unanswered calls reach a Hair Transplant Group voicemail greeting. Destination status callbacks retain sequence numbers and error/SIP responses; late events, parent/browser completion and recording metadata cannot turn an unanswered destination into a connected call. The browser inserts call rows without overwriting existing server state. Blacklisted contacts remain blocked.

## Deployment

1. Apply `supabase/migrations/20261119090000_voice_reputation_safeguards.sql` up to the deployment-scheduling marker atomically, using the existing project's managed migration path. Record the migration version.
2. Deploy only `voice-outbound`, `voice-inbound` and `twilio-status`, including `_shared/voice-policy.ts`; preserve `verify_jwt=false` and the existing Twilio signature validation. No new secret is required.
3. Execute the scheduling section once and verify one active hourly cron job, fresh health rows, function privileges and active/retired inventory. Publish the application changes after the schema exists.
4. Test with an explicitly designated internal number; do not test by ringing a real patient. Confirm a provider destination leg and a return call with an online rep before calling this end-to-end verified.

If an operational issue occurs, stop the hourly lifecycle job with `cron.unschedule('voice-reputation-hourly')`. Do not release numbers or reactivate a reported number as a generic fallback. Database state retains the audit history and can be corrected after review.

## Validation

`PGLITE_MODULE=<PGlite module path> node scripts/test-voice-reputation.mjs` executes the migration twice on synthetic PostgreSQL fixtures and checks idempotency, balancing, rolling budgets, retirement exclusions, callback routing, status ordering, recording deduplication, counters and access isolation. Run the voice policy, registration and connection Bun tests; Deno-check the three webhooks; run TypeScript and a production build. None of these tests calls Twilio or contacts patients.
