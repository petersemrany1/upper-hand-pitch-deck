# Rep callback routing

Known return callers ring only the rep who most recently called them. If that rep is connecting, already speaking, or answering another incoming call, the browser quietly rejects the new leg. The caller reaches the existing voicemail and the final client status queues the lead for that rep's next Next Lead click. Unknown callers still use active admin reception. A known inactive rep is not silently replaced with an admin.

The existing Next flow remains responsible for choosing and dialling queued callbacks after the current outcome is saved. No SMS is sent. Queues are isolated by signed-in account, ignore legacy unowned browser queues, and retain the existing two-hour browser persistence. Realtime queueing requires the rep's Sales Call portal to be open; this change does not add an offline callback inbox. Closed/booked leads remain excluded.

## Release

Apply `20261120040000_rep_callback_routing.sql` atomically and record its source in `supabase_migrations.schema_migrations`, then publish the application. The migration replaces two function definitions and preserves their existing service-role permissions. It does not backfill, delete, or alter past enquiry/booking/payment rows. Existing deployed `voice-inbound` and `twilio-status` functions call these RPCs; no edge redeployment or new secret is required.

This migration is independent of the pending booked-repeat-enquiry migration (`20261120030000`). Do not apply that separate change without its pending approval.

Reps must refresh the portal when not on a call to load the busy-call behavior. Existing open clients retain the former call-waiting UI until refresh.

## Validation

- Synthetic PostgreSQL regression: most recent rep only, unknown reception, inactive reps, busy status, parent voicemail before/after client status, stale events, zero-second pickup, replay, existing outbound protections and permissions.
- Mounted Voice SDK hook with a fake Device: idle incoming ring; simultaneous pending calls; busy active conversation; callback during outgoing setup; active media/lead retained. No Twilio call is placed.
- Queue classification and mounted storage hook: owner isolation, answered/missed/voicemail classification, account changes, stale async writes and refresh persistence.
- Sales-call regression suite: 100 tests, 331 assertions; voice policy/registration/connection: 8 tests, 34 assertions; device: 2 tests, 18 assertions.
- TypeScript and production build. Focused lint excludes the two pre-existing `no-explicit-any` errors in SalesCallPortal; no new lint errors. Existing hook warnings remain.

A real carrier return-call test has not been performed. Use a specifically authorized internal number for that verification.
