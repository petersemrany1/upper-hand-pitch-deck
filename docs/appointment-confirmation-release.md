# Appointment reminders and confirmation calls

Implementation is prepared locally. No production database, clinic setting, SMS, email or deployment was changed during development.

## Daily use

Open **Appointments → Clinic reminder settings**. Each clinic has one dropdown that saves immediately:

- **Off:** stops appointment reminders, confirmation requests and call-alert emails. Initial booking/reschedule receipts are separate.
- **Text reminders:** ordinary three-day and day-before texts. Nitai starts here.
- **YES confirmation reminders:** normal three-day text; 9am confirmation request; 1pm second request only while unconfirmed; 4:30pm Sydney call-alert email only after an unanswered second request. Boss Clinic in Perth starts here.

Use **Needs a call**, click **Call Now**, then **Confirmed by phone** or record **No answer / Left voicemail**. The booking status is labelled **Booked**; attendance confirmation is separate. A matched YES reply confirms attendance and clears the call flag without sending a thank-you text, including after a call-alert email has already been sent. An email links to the appointment; it cannot be retracted, so check the current status before calling. No response never cancels an appointment.

Patient text times and booking dates use the clinic timezone, including daylight saving. Call-alert emails use Australia/Sydney: 4:30pm on staffed days, with at least 30 minutes after the second text. The five-minute worker can catch up until 5pm; it never sends these alerts after the team’s shift. A first text alone, a patient reply, a recorded call, or a delivery problem does not qualify for this no-response email. Current ordinary send times are retained as local wall-clock defaults at migration time (1pm Perth and 4pm Melbourne during the October rollout). Under **Timezone, email & call days**, administrators can edit ordinary send time, timezone, comma-separated alert recipients, staffed weekdays and closure dates. Default call days are Monday–Friday. Closure dates must be maintained by the team; public holidays are not automatically imported.

For Monday appointments, the YES sequence runs on Friday and includes the three-day reminder; Sunday still gets an ordinary reminder. A configured holiday moves the sequence to the previous staffed day. Late bookings wait at least ten minutes after creation/reschedule and keep at least two hours between the two confirmation texts. Short-notice bookings, patient questions and failed texts remain available in Confirmation calls; they are excluded from the unanswered-second-text email.

## One-time release

Deploy only these changes; the workspace also contains unrelated uncommitted work.

1. Confirm the deployed project's Edge Function secrets include `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `RESEND_API_KEY`. If the Resend key is a Lovable managed connection, also configure `LOVABLE_API_KEY`; the sender uses the existing connector gateway in that case. A direct Resend key uses the Resend API. The sender is `admin@bold-patients.com`. The default alert recipients are `peter@gobold.com.au,nina@bold-marketing.com.au`, editable per clinic. The Sydney-alert migration adds Nina to existing Peter-only destinations without changing clinic modes or text times.
2. Set `REMINDER_DATABASE_URL` and `SUPABASE_ACCESS_TOKEN` in the operator's environment. Install the PostgreSQL client and Supabase CLI. Run:

   ```sh
   bash scripts/release-appointment-reminders.sh
   ```

   The script checks the project identity and required secrets, applies only this feature's schema migration, links the existing manual call confirmations, deploys `send-appointment-reminders` and `sms-inbound`, runs a read-only preview, then installs the five-minute scheduler. It records all three migration versions. It does not push unrelated pending migrations or publish the web application.
3. Publish the corresponding web application changes through the normal release process. In Appointments, verify Boss Clinic is **YES confirmation reminders**, Nitai is **Text reminders**, and the recipient/timezones/call days are correct. Verify the `send-appointment-reminders-local` cron job and function logs after its first run.

The existing Twilio number and inbound webhook URL remain the same. SMS requests now include the existing signed delivery-status callback. Database triggers propagate delivery failures from the inbox to the appointment. The old daily cron is replaced rather than run alongside the new scheduler.

## Reliability and checks

Delivery records are unique per appointment revision and message kind. Claims recheck the active booking, current clinic mode, settings version, opt-out state and latest confirmation. Unknown provider outcomes retain their claim and require review; interrupted claims become visible delivery issues. Definite failures have at most three attempts. Emails carry an idempotency key. All reply processing is signed at the existing Twilio boundary and deduplicated by provider message ID. Shared phones, multiple pending appointments and unrelated conversations require human review rather than guessing which appointment a YES confirms. Rescheduling or changing the clinic/phone resets confirmation for the new appointment revision.

Verification commands:

```sh
bun test supabase/functions/send-appointment-reminders/
PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-appointment-confirmation.mjs
npx tsc --noEmit
npm run build
```

Browser verification uses the actual Appointments component with isolated example data and mocked backend calls. It covers changing clinic mode, filtering the call list, recording phone confirmation, and narrow-screen overflow. No real patient was contacted.

To stop the new confirmation workflow for a clinic, select **Text reminders** or **Off**. Existing patient requests remain visible. Do not restore the legacy reminder sender while keeping these controls live, because the legacy sender does not enforce the new modes.

The production scheduler uses the existing Vault entry `internal_function_secret` and the `x-internal-secret` header. Do not replace it with missing uppercase Vault names. The existing Confirmation calls tab remains available; its phone confirmations stop automated chasing and automatic YES replies appear confirmed there.

## 20 November 2026 alert update

Apply `supabase/migrations/20261120050000_sydney_confirmation_call_alerts.sql` and deploy `send-appointment-reminders` from the same source, preserving all current imports and authentication. Publish the matching settings copy/input update. The migration retains atomic claims, idempotency and service-only permissions, and rechecks the latest reply/call at claim time. Existing sent alerts are not resent. No patient SMS schedule changes. Verify both recipients on the enabled clinics and the existing five-minute scheduler. Tests use isolated data and mocked providers; do not send test messages to patients.


## 23 November 2026 replacement-number reply repair

Retiring the preferred SMS number exposed an old fixed receiving-number check in
`consume_appointment_confirmation_reply`: replies to replacement senders reached
the inbox but never updated attendance. Apply
`supabase/migrations/20261123010000_confirmation_reply_sender_matching.sql` before
deploying `send-appointment-reminders` and `sms-inbound` from the same revision.
No website publish is required for this backend change.

Matching now proves both SMS endpoints from the actual outbound provider message
and the current booking revision. It works after sender replacement or retirement,
including when request and follow-up use different numbers. Unrelated destinations,
shared phones and unrelated conversations cannot silently confirm a booking.

The worker reconciles stored replies before loading its queue. A recovery error
aborts the run, and the atomic send claim independently suppresses chasing whenever
a matching reply is already in the inbox. Storage/processing exceptions in the
inbound webhook return HTTP 500 rather than acknowledging a failed operation.

For existing missed replies, inspect the current upcoming bookings and run only
`SELECT public.reconcile_appointment_confirmation_replies(500);` (repeat if the
batch is full). This processes existing messages and sends no SMS or email.
Recovery uses original receipt times and current booking revisions, preserves newer
staff/reply decisions, and does not change completed/cancelled/rescheduled bookings.
Check resulting attendance, method, original confirmation timestamp, and repeat the
call to verify no remaining eligible replies. Previously sent call emails remain in
history; the confirmed booking leaves the call list.

Run the existing reminder suite and PostgreSQL suite plus the new routing suite:

```sh
bun test supabase/functions/send-appointment-reminders/reminders.test.ts supabase/functions/send-appointment-reminders/confirmation-workflow.test.ts supabase/functions/send-appointment-reminders/twilio.test.ts
bun test supabase/functions/send-appointment-reminders/reply-recovery.test.ts
bun test supabase/functions/sms-inbound/reply-processing.test.ts
PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-appointment-confirmation.mjs
PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-confirmation-reply-routing.mjs
```

The routing suite reproduces the original failure before applying the migration,
then verifies both YES replies recover, current/legacy/rotated sender matching,
inbox chase suppression before processing, replay/race safety, original timestamps,
reschedules, unrelated conversations, shared phones, opt-outs and service-only
permissions. Keep the new migration last in the one-time release script so re-running
that script cannot restore the obsolete fixed-number check.
