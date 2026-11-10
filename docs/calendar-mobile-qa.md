# Phone calendar implementation and verification

Verified 10 November 2026 in the `codex/calendar-availability` checkout.

## Scope

The local clinic preview no longer includes the sales-booking tab. Phones now have Availability and Upcoming appointments views. Upcoming appointments are grouped by date, sorted by start time, searchable by patient name, and link to appointment details and the relevant calendar day. The list excludes finished visits and retains in-progress consultations using the existing application timezone.

Phones use a daily agenda with a week selector, date jump, working-hours control, explicit Block time action, and readable consultation, block, and buffer cards. Tapping a block opens the existing precise date/time editor. Moving a block follows its destination date. Short consultations and buffers have full-size cards, independent of duration.

The phone presentation applies up to 600 CSS pixels wide, plus coarse-pointer phone landscapes up to 960 × 600. Tablets and desktop retain the seven-day grid. Phone editors fill the visible viewport, preserve readable 16px input text, account for safe areas, keep action buttons reachable, and reveal the focused field when keyboard space reduces the viewport. Touch scrolling does not move or resize blocks. Editor focus returns to its initiating control, including Safari touch clicks.

The existing schedule commands, slot generator, validation, recurrence scopes, consultation-change confirmation, version checks, persistence APIs, and database migrations are unchanged. Existing booked patients remain protected. Repeat-hour copies preserve closed dates. Failed saves retain their drafts. The release flag and production activation are unchanged.

## Research informing the interface

| Primary source | Applied decision |
| --- | --- |
| [Apple UI design guidance](https://developer.apple.com/design/tips/) and [button guidance](https://developer.apple.com/design/human-interface-guidelines/buttons) | Fit the phone width, use clear pressed states, and provide at least 44px button targets. Main controls use 48px heights. |
| [Android touch targets](https://support.google.com/accessibility/android/answer/7101858?hl=en) | Give primary actions generous touch areas; avoid small resize handles. |
| [Google Calendar event creation on Android](https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DAndroid&hl=en) | Focus on a day and use an explicit editor with Save for precise changes. |
| [Acuity's mobile availability workflow](https://help.acuityscheduling.com/hc/en-us/articles/27889665672205-Managing-your-calendar-and-availability-in-the-Acuity-Scheduling-Admin-mobile-app) | Keep Block time prominent, expose date/start/end and weekly repetition, and provide availability settings directly on the phone. |
| [Calendly mobile capabilities](https://calendly.com/help/calendly-mobile-app-faq) | Make daily scheduling and availability management accessible from the mobile interface. |
| [W3C dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) | Every move/resize operation is available through simple taps and fields; scrolling never implicitly saves an edit. |
| [Apple sheet dismissal guidance](https://developer.apple.com/documentation/uikit/disabling-the-pull-down-gesture-for-a-sheet) | Use explicit close/cancel controls and preserve drafts after failed saves. |

These are interaction references, not a claim of native implementation or App Store certification.

## Verification

- 600 application tests passed across 82 files (including the final history integration check), including phone navigation, booked-patient protection, small-duration cards, buffer access, recurring-series scope, failure retention, and Undo.
- 142 browser assertions passed in Chrome and WebKit. Viewports: 320 × 568, 360 × 740, 375 × 667, 390 × 844, 430 × 932, and 844 × 390; a 320 × 360 reduced viewport also verifies focused inputs remain between the header and action bar.
- Browser workflows: block, move, resize, unblock, Undo, close/reopen a day, edit weekly hours, copy/repeat hours, preserve explicit closures, edit buffers, confirm consultation changes while retaining start times, repeat blocks to midnight, retry a failed save, reload persistence, reject a stale concurrent edit, and synchronize blocked times with a second clinic tab. Upcoming-appointment checks cover cross-date listings, patient search, details, and calendar navigation.
- Real Chrome touch events verify swiping on a blocked card scrolls the page without opening or changing the block.
- Both engines check page/dialog overflow, minimum button target sizes, input font sizes, and runtime exceptions.
- Desktop screenshots were compared against the current production component at commit `16c0416c`, at 768, 1280, and 1440px, for the calendar, settings, and block editor. All nine comparisons have zero perceptible changed pixels (pixelmatch threshold 0.1); eight are byte-for-byte pixel identical, and the ninth has three subthreshold raster differences. The existing desktop toolbar, calendar history, seven columns, drag/resize behavior, and base stylesheet are preserved. History loading and retry are tested at both phone and desktop widths.
- TypeScript and focused ESLint checks passed. Production build passed (existing dependency/build warnings remain).

Artifacts and logs are in `tmp/calendar-mobile-qa/`. The browser suite is `scripts/test-calendar-mobile.mjs`; it refuses non-local hosts and uses only the existing example-data preview.

```sh
bun run dev --host 127.0.0.1 --port 5173
# In another terminal, with Playwright and Chrome/WebKit available:
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/test-calendar-mobile.mjs
bun test src
./node_modules/.bin/tsc --noEmit
bun run build
```

## Delivery boundary

Prepared from current production `origin/main` (`16c0416c`) in an isolated `codex/calendar-mobile-release` checkout. Release includes only the phone presentation, read-only upcoming list, mobile dialog support, isolated local fixture cleanup, and tests/docs. No release-flag, backend, database, scheduling-rule, or desktop stylesheet changes are required. The fixture route is enabled on local development hosts only; the phone-preview.html wrapper is not shipped. Publishing uses the existing Hair Transplant Group Lovable project. Native app packaging and App Store submission are outside this web release. Browser emulation and desktop WebKit do not replace final testing on physical iOS/Android devices inside the eventual native app container.
