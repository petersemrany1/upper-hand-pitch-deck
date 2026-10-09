# Demo Clinic

Open `/demo-clinic`, or use **Open demo clinic** in Partner Clinics or Settings → View as partner. This public training page contains fictional fixtures only; it does not create a clinic account or database row.

The shared partner appointment list, calendar, detail forms, availability editor, history dialog and credit card use a per-page `DemoClinicStore`. The store has no database, auth, storage, payment or messaging dependencies. Each load seeds 12 patients, a 20-credit example pack, a block and example history. Upcoming appointments move with the date. Refresh or **Reset demo** clears all edits and notes. Separate browser tabs have independent demos.

Demo outcome/refund and chase actions are simulated. No contacts are callable, addresses use `example.invalid`, and no real Stripe/Square/lead identifiers are present. Production auth, the call layer and production error logging do not mount on the exact demo route. Existing live routes retain their behavior and authorization. Calendar preview auth now starts only when its store is actually used.

## Verification

Run `bun test src/components/DemoClinicPortal.test.ts` separately (its production-boundary mocks intentionally throw). It exercises packs/help, notes, chase, rescheduling, outcomes, reset, settings and history and asserts no production calls. Run the model and existing calendar/preview/history tests separately from that mocked process. Also run TypeScript, the production build, and `node scripts/check-clinic-portal-build.mjs`.

Do not replace this with real test rows: production triggers can send reminders, consume credits and create audit/reporting records even if the patient name says “test”. New shared actions must have a demo implementation before being exposed here.
