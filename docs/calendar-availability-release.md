# Calendar approval preview

This change is prepared for approval only. `CALENDAR_APPROVAL_ONLY` remains true. The database migration has not been applied to production.

Lovable's GitHub connection must select `codex/calendar-availability` for review. Confirm the served preview contains the new calendar before sharing it; an older build can remain visible while branch synchronization completes. Switching the preview branch does not publish the application.

The public `/calendar-preview` route uses example data and a shared tab-scoped preview schedule. Partner availability edits and sales bookings update the same preview schedule. Saved preview changes survive refreshing the same tab using session storage. The example-data reset button explicitly resets that demo. Closing the tab ends the preview session. Preview-host calendar edits never write to the live database. Other portal actions still use real data, as indicated in the portal banner.

## Release after approval

1. Review the calendar preview and existing appointment conflict warnings.
2. Apply `20261008010000_clinic_calendar_scheduling.sql` to the intended database, with a current backup. Verify the new schedule RPCs and booking guards using authorized accounts.
3. Set `CALENDAR_APPROVAL_ONLY` to false in the release and verify partner and sales flows against that database.
4. Publish only after the owner approves the release. Do not publish the approval branch as an activated release.

Consultation length changes require explicit confirmation before applying the new duration to all existing appointments. Dates and start times stay unchanged. The Review patients popup identifies affected patients with overlaps, blocked-time conflicts or appointments outside working hours. Bulk duration changes disable configuration-only undo; a further confirmed settings change can revise the duration again. Working-hour copies preserve closures. Consultation length and the buffer between patients are independent settings.

Manual blocks can be dragged to another time or day in the visible week, or resized using their top and bottom handles. Gestures snap to 15 minutes, preserve the duration when moving, support Escape cancellation and scroll at the calendar edges. Dropping saves one atomic command and enables Undo. Booked patients remain protected. Dragging a recurring block changes only that occurrence, excluding its source date without altering the destination day's existing repeats. Clicking a block still opens the date/time editor for keyboard and precise editing.

The calendar focuses on each week's working hours while retaining out-of-hours appointments and blocks. It keeps half-hour spacing, uses a bounded scroll area with fixed day headings and a fixed time column, and preserves the visible time when saving. Larger patient names, time labels and resize grips use an approved navy/slate palette with muted amber patient buffers.

Settings includes an admin-only **View as partner** clinic selector. It opens the shared `/clinic-portal` page with partner controls and a persistent return to Settings. The server checks existing admin access before loading the selected clinic; actual partners always use their assigned clinic, regardless of URL parameters. This is a UI view using the administrator's existing session and permissions, not an impersonation token or a test of another account's credentials. Notes written from this view retain admin attribution. The approval environment continues to isolate availability edits; other portal actions still use real data.

Rollback should restore the previous application release while retaining stored appointment lengths and the database booking guards. Removing those guards can permit overlapping appointments and should not be used as a routine rollback.

## Verification

319 application tests, TypeScript, production build and focused lint checks. The previously completed isolated PostgreSQL suite covers 89 scheduling, ownership, atomicity, recurrence, migration replay and boundary checks, including 820 booking attempts compared against the application slot generator and independent concurrent database connections. Browser checks include moving and resizing blocks, normal clicks after pointer capture, cancellation, Undo, sideways edge scrolling and sales slots updating after a partner block moves. Readability checks verify both fixed axes at desktop and narrow widths, block moving/resizing in the scroll area, and a settings save retaining its scroll position.
