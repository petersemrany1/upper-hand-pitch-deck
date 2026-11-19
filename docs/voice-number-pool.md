# Automatic voice number pool

The signed outbound webhook reserves a caller ID atomically in PostgreSQL. Only active numbers below their rolling 24-hour attempt limit (default 80 per number) are eligible. Existing contacts retain their current eligible caller ID; new contacts and contacts whose number is retired or full rotate to the least-used eligible number. A retired number is never a fallback, including on webhook replay. An unavailable database or exhausted pool produces a message to the rep without dialing a destination.

The hourly `voice-reputation-hourly` job reconciles actual call counters and scans transcripts. A direct caller-ID spam/scam complaint in the first 600 characters of an outbound transcript within seven days retires that source number from outbound use. Mentions of texts, SMS, messages, links or emails exclude automatic retirement. Broader matches create review signals only. These are complaint indicators, not an authoritative carrier label lookup. The lease, callback route and SMS threads remain intact. No number is released or purchased by this feature.

Retirements, fewer than three active numbers and material performance deterioration create entries in the existing error log. Settings shows the last health-check time and flags stale checks after two hours. A call lasting 15 seconds includes voicemail and is not a measured human-answer rate. The 80-attempt limit is an operational cap, not a carrier-guaranteed spam threshold. New number purchases still use the existing explicit purchase action and need a spending budget.

Incoming callbacks ring the most recent active rep and active administrators using their actual `rep_<uuid>` Voice SDK identities. Unanswered calls reach a Hair Transplant Group voicemail greeting. Destination status callbacks retain sequence numbers and error/SIP responses; late events, parent/browser completion and recording metadata cannot turn an unanswered destination into a connected call. The browser inserts call rows without overwriting existing server state. Blacklisted contacts remain blocked.

## Deployment

1. Apply `supabase/migrations/20261119090000_voice_reputation_safeguards.sql` up to the deployment-scheduling marker atomically, using the existing project's managed migration path. Record the migration version.
2. Deploy only `voice-outbound`, `voice-inbound` and `twilio-status`, including `_shared/voice-policy.ts`; preserve `verify_jwt=false` and the existing Twilio signature validation. No new secret is required.
3. Execute the scheduling section once and verify one active hourly cron job, fresh health rows, function privileges and active/retired inventory. Publish the application changes after the schema exists.
4. Test with an explicitly designated internal number; do not test by ringing a real patient. Confirm a provider destination leg and a return call with an online rep before calling this end-to-end verified.

If an operational issue occurs, stop the hourly lifecycle job with `cron.unschedule('voice-reputation-hourly')`. Do not release numbers or reactivate a reported number as a generic fallback. Database state retains the audit history and can be corrected after review.

## Validation

`PGLITE_MODULE=<PGlite module path> node scripts/test-voice-reputation.mjs` executes the migration twice on synthetic PostgreSQL fixtures and checks idempotency, balancing, rolling budgets, retirement exclusions, callback routing, status ordering, recording deduplication, counters and access isolation. Run the voice policy, registration and connection Bun tests; Deno-check the three webhooks; run TypeScript and a production build. None of these tests calls Twilio or contacts patients.
