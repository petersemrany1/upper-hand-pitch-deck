# Conversation reply notifications

Peter's notification preference is independent of phone-number ownership. `20261127010000_involved_conversation_alerts.sql` enables involved-only alerts for his verified existing account, with owner-only read access. No number rental, caller-ID change or new conversation is needed. Replies create a toast and badge on the existing phone/message widget; **Open** opens the same thread inside that widget. Sending a manual message or making a call records involvement. Existing call involvement is already backfilled, and **Notify me** covers old text-only conversations without historical sender attribution.

Deploy the new preference migration before publishing the frontend. The previously installed participation/RPC/webhook migration remains required. Other accounts keep their existing notification behavior. No real texts or calls are needed for verification.

The isolated database suite verifies the account preference, row access and alerts with zero personal phone lines. `bun scripts/test-personal-phone-alerts.ts` verifies toast filtering and opening the original thread in the widget. TypeScript and the production build also pass.

## Earlier personal-line implementation

The implementation below is inactive unless a personal line is separately assigned. The user's final request is conversation notifications only; no lease is to be purchased or assigned for this release.


Managed Auth identities are validated when a line is assigned. Cloud does not allow foreign keys into its managed Auth table, so application rows store verified UUIDs without cross-schema constraints.

A personal line is a separate Twilio mobile lease assigned to one authenticated user and their verified active sales rep. It is excluded from the rotating pool, retirement jobs, and replacement allowance. All manual portal SMS/MMS paths and server-authorized outbound calls use that line. An unavailable line, unsupported MMS or exhausted daily call allowance stops the request instead of substituting a shared number. Automated reminders retain their existing sender.

Each contact retains the same `sms_threads` record. Incoming messages to an old shared number and the personal number append to that conversation. Participation is restored from historical calls and recorded for new calls and manual messages. Replies trigger personal toasts and Messages & Phone badges only for involved conversations; opening a shared conversation under another account does not clear the owner's notification. Older text-only history has no sender attribution, so the owner can use **Notify me** on an existing conversation. These are in-portal alerts; this change does not register operating-system push notifications while the portal is closed.

Release order:

1. Apply `20261127002548_personal_phone_lines.sql` transactionally to project `sfwokpeeffgrkxaptqji`, recording the migration. No lease is purchased or assigned by the migration. Before deployment, live function-body hashes matched the baseline claim and inbound callback migrations.
2. Deploy `sms-inbound` and `voice-outbound` from the same commit, preserving the current public webhook/JWT configuration and Twilio signature validation.
3. Publish the matching frontend/server build.
4. After explicit recurring-cost approval, acquire a separate AU mobile number with voice, SMS and MMS enabled, using the existing approved regulatory bundle and its matching address. Configure the same voice and SMS webhooks/status callbacks as the shared lines. Insert the verified provider SID and actual number into `personal_phone_lines` with the user's verified auth and sales-rep IDs. Never repurpose an existing shared or retired number. Ownership and provider identity are immutable.
5. Verify the assigned number appears in Messages & Phone and Sales Call, own-account sender RPC returns it, other accounts cannot read/use it, and notification participation is loaded. Do not place real calls or send real SMS as release tests without a specific recipient/message authorized by the user.

Validation: `npx tsc --noEmit`, `npm run build`, `bun scripts/test-personal-phone-alerts.ts`, `bun test src/hooks/useTwilioDevice.incoming.test.tsx`, and the PGlite suites `scripts/test-personal-phone-lines.mjs` / `scripts/test-voice-reputation.mjs` (`PGLITE_MODULE` may point to an isolated install). These cover unchanged thread identity/history, both-number replies, historical involvement, personal unread acknowledgements, toast filtering, owner isolation, retries, callbacks, blacklist, daily limits, pool rotation and retirement.
