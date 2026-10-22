# Appointment reminders and confirmation calls

Implementation is prepared locally. No production database, clinic setting, SMS, email or deployment was changed during development.

## Daily use

Open **Appointments → Clinic reminder settings**. Each clinic has one dropdown that saves immediately:

- **Off:** stops appointment reminders, confirmation requests and call-alert emails. Initial booking/reschedule receipts are separate.
- **Text reminders:** ordinary three-day and day-before texts. Nitai starts here.
- **YES confirmation reminders:** normal three-day text; 9am confirmation request; 1pm second request only while unconfirmed; 3pm email to call only while unconfirmed. Boss Clinic in Perth starts here.

Use **Needs a call**, click **Call Now**, then **Confirmed by phone** or record **No answer / Left voicemail**. The booking status is labelled **Booked**; attendance confirmation is separate. YES replies clear the call flag automatically, including after an email has already been sent. An email links to the appointment; it cannot be retracted, so check the current status before calling. No response never cancels an appointment.

Times and dates use the clinic timezone, including daylight saving. Current ordinary send times are retained as local wall-clock defaults at migration time (1pm Perth and 4pm Melbourne during the October rollout). Under **Timezone, email & call days**, administrators can edit ordinary send time, timezone, alert recipient, staffed weekdays and closure dates. Default call days are Monday–Friday. Closure dates must be maintained by the team; public holidays are not automatically imported.

For Monday appointments, the YES sequence runs on Friday and includes the three-day reminder; Sunday still gets an ordinary reminder. A configured holiday moves the sequence to the previous staffed day. Late bookings wait at least ten minutes after creation/reschedule and keep at least two hours between confirmation contacts. If there is no useful confirmation window, they go to the call list/email instead of receiving several texts at once.

## One-time release

Deploy only these changes; the workspace also contains unrelated uncommitted work.

1. Confirm the deployed project's Edge Function secrets include `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `RESEND_API_KEY`. If the Resend key is a Lovable managed connection, also configure `LOVABLE_API_KEY`; the sender uses the existing connector gateway in that case. A direct Resend key uses the Resend API. The sender is `admin@bold-patients.com`. The default alert recipient is `peter@gobold.com.au`, editable per clinic.
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
