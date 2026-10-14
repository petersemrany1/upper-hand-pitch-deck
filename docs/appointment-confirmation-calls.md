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
