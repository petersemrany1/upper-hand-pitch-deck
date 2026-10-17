# Appointment confirmation calls

Open **Appointments → Confirmation calls**, or `/booked-appointments?view=confirmations`.
The screen opens on tomorrow's active appointments. Today and the date picker let the
team follow up or work ahead (for example, calling Monday's bookings on Friday).

1. Select a patient and use **Call patient** through the existing Twilio phone.
2. Confirm the address and whether the appointment still works for them.
3. Record **Confirmed they're coming**, **No answer → text**, or **Needs follow-up**.
4. For no answer, review or edit the address text, then press **Send text**.
5. Open **SMS conversation** for delivery updates and replies. Mark confirmed only
   after the patient confirms. Existing automated reminders continue independently.

The screen shows the current Perth or Sydney time. Perth is three hours behind
Sydney during Sydney daylight saving and two hours behind otherwise. Booking dates
and times retain the portal's existing Sydney convention; this feature does not
reinterpret stored appointment times.

Call outcomes are a separate audit history. They never set attendance, change lead
status, charge/refund a deposit, or disable automatic reminders. Booking updates
invalidate prior confirmations but preserve their history. Deposit copy appears only
when the booking has a payment reference and positive deposit amount.

The call guide fills in the logged-in rep's first name and says “tomorrow” only
for the next Sydney calendar day. It uses the recorded provider's doctor title
when present, otherwise consultant, with a placeholder if no provider is saved.
The reception/$395 instruction and “most senior” wording reflect Peter's
confirmation that both apply at every clinic. The SMS draft is separate.
It uses the appointment date, time, clinic and address, the verified deposit
reminder, and “Please reply YES to confirm you're coming.” The map remains
available on the calling screen.

## Release

Apply `supabase/migrations/20261015010000_appointment_confirmation_calls.sql` to
the existing Supabase project before publishing the app. It depends on the existing
sales rescheduling migration's actor/ownership functions. This migration creates a
new activity table and authenticated RPC; it does not update appointment rows.
The app uses the existing Twilio and Supabase server environment variables.

The dev-only `/confirmation-preview` route uses sample data, simulated calls and
simulated texts. Production returns “Not found” at that route.

Validation:

- `bun test`
- `./node_modules/.bin/tsc --noEmit`
- `bun run build`
- `PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-appointment-confirmations.mjs`

SMS claiming prevents duplicate sends across tabs and retries. Provider-accepted
texts are not described as delivered. Unknown provider outcomes cannot be blindly
retried; inspect the existing SMS conversation/provider status first.
# Dated callbacks and availability

Use **Call back later** on a confirmation or **Can’t choose now? Call back later** in the reschedule window. Save a date, optional time and note. All callback times use Sydney time; the patient card also shows the current time in Perth or Sydney. The **Callbacks** list shows how many are due and keeps overdue callbacks visible after the original appointment date passes. Change the callback or mark it done after the call. Confirming attendance or successfully rescheduling closes the pending callback automatically.

Scheduling a callback leaves the clinic portal, appointment, reminders, booking owner, lead status and deposit unchanged. The original slot stays booked until a reschedule is confirmed. A callback does not send any text or email. The normal confirmation text is disabled for a past/inactive appointment; its SMS conversation remains available.

Rescheduling displays a week of available days and selectable times from the existing clinic calendar, including closures, bookings, consultation lengths and buffers. Availability refreshes every 30 seconds while choosing and can be refreshed manually. Review still shows the patient text and clinic email; **Confirm reschedule & send** commits the new booking and sends them through the existing delivery process. Saving rechecks the current schedule and rejects stale/conflicting choices.

Deploy `20261016010000_confirmation_callbacks.sql` before publishing the UI. The callback table is sales-only and scoped to existing booking ownership. RPCs derive the actor from the authenticated session, serialize changes with the booking lock, reject stale callback edits, and preserve replaced/completed rows as an audit trail. Reschedule completion runs in the same transaction as the booking change, so a failed reschedule keeps the callback pending.

Validation: `bun test`, `bunx tsc --noEmit`, `bun run build`, plus `PGLITE_MODULE=<pglite-module> node scripts/test-confirmation-callbacks.mjs` and the existing confirmation/reschedule/calendar migration checks. Use the development-only `/confirmation-preview` for simulated callbacks; it never calls or texts patients.
