# Outstanding clinic handovers

Ending a calling session now checks the authenticated rep's paid, active appointments whose clinic handover is still missing. This includes bookings from another browser and earlier sessions. The check is enforced on the server, and the UI keeps the session and queue open on pending handovers or failed checks. The rep can open each booking directly at the handover step, without auto-dialling, then retry ending the session.

An independent database job checks every minute. After 45 minutes from the later of appointment creation and deposit payment, it queues one owner alert per appointment to peter@gobold.com.au. This works after logout or browser closure. It does not send the clinic handover or change the booking/payment. Past appointments, recorded outcomes, disqualified appointments and pending/completed refunds are excluded.

The handover queue is isolated from refund, payment and authentication emails. Duplicate protection and enqueue commit together. The dispatcher rechecks handover eligibility and recipient suppression before sending, so a completed handover cancels an unsent alert. Failed provider calls retain the same key; only explicit run_failed responses renew it. Delivery attempts appear in email_send_log under handover-overdue. The queue uses the existing 24-hour alert TTL and five-failure limit.

Apply the core of 20261017010000_pending_handovers.sql before publishing. Activate the deployment scheduling section after publication. Verify the cron run and dispatcher response. Schema application is replay-safe. Run scripts/test-pending-handovers.mjs with PGLITE_MODULE, bun test, TypeScript and the production build. Tests use synthetic records and mocked email transport.
