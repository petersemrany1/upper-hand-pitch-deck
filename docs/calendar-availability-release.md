# Calendar approval preview

This change is prepared for approval only. `CALENDAR_APPROVAL_ONLY` remains true. The database migration has not been applied to production.

Lovable's GitHub connection must select `codex/calendar-availability` for review. Confirm the served preview contains the new calendar before sharing it; an older build can remain visible while branch synchronization completes. Switching the preview branch does not publish the application.

The public `/calendar-preview` route uses example data and a shared in-memory schedule. Partner availability edits and sales bookings update the same preview schedule. Reloading resets this data. Preview-host calendar edits never write to the live database. Other portal actions still use real data, as indicated in the portal banner.

## Release after approval

1. Review the calendar preview and existing appointment conflict warnings.
2. Apply `20261008010000_clinic_calendar_scheduling.sql` to the intended database, with a current backup. Verify the new schedule RPCs and booking guards using authorized accounts.
3. Set `CALENDAR_APPROVAL_ONLY` to false in the release and verify partner and sales flows against that database.
4. Publish only after the owner approves the release. Do not publish the approval branch as an activated release.

Existing appointments retain their dates, times and stored consultation lengths. Conflicts are flagged; appointments are never moved automatically. Working-hour copies preserve closures. Consultation length and the buffer between patients are independent settings.

Rollback should restore the previous application release while retaining stored appointment lengths and the database booking guards. Removing those guards can permit overlapping appointments and should not be used as a routine rollback.

## Verification

281 application tests, TypeScript, production build and focused lint checks. The isolated PostgreSQL suite covers 68 scheduling, ownership, atomicity, recurrence, migration replay and boundary checks, including 820 booking attempts compared against the application slot generator and independent concurrent database connections. Browser checks include narrow-screen block editing and sales slots updating after a partner block.
