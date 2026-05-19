## Problem

The "Session Time" clock on the sales-call page lives only in the browser tab (sessionStorage). Any refresh, new tab, or browser restart resets it to 0 — even though the rep is still in the same work session. Neil's screenshot is exactly this: real start 5:01 PM, timer thinks 5:16 PM.

But: when a rep clicks **End Session** and then **Start Session** again, that genuinely IS a new session and the clock should restart.

## Fix

Move the session start/end timestamps from browser storage into the database, anchored to the rep. Browser becomes a thin display layer.

### 1. New table `rep_sessions`

```text
id            uuid pk
rep_id        uuid           -- sales_reps.id
started_at    timestamptz    -- when Start Session was clicked
ended_at      timestamptz    -- when End Session was clicked (null = still active)
created_at    timestamptz default now()
```

RLS: reps read/insert/update their own rows; admins read all.

Index on `(rep_id, ended_at, started_at desc)` so "current open session for this rep" is one fast lookup.

### 2. Server functions (`src/utils/sales-call.functions.ts`)

- `startRepSession()` — close any still-open session for the rep (defensive), insert a new row with `started_at = now()`, return it.
- `endRepSession()` — set `ended_at = now()` on the rep's open session.
- `getCurrentRepSession()` — return the rep's open session (ended_at IS NULL) or null.

All three use `requireSupabaseAuth` and act as the current rep.

### 3. Wire into `src/routes/_dashboard.sales-call.tsx`

- On mount: call `getCurrentRepSession`. If one exists, hydrate `sessionStartedAt` from `started_at` and compute `sessionSeconds = now - started_at`. This is what fixes refresh/new-tab.
- On **Start Session** click: call `startRepSession`, use the returned `started_at` as the anchor, reset `sessionSeconds` to 0.
- On **End Session** click (the existing end-session paths around lines 809, 850, 937, 977, 1025): call `endRepSession`, then clear local state as today.
- Remove the `STALE_IDLE_MS` wipe and the `inferredSessionStartedAt` fallback — DB is now source of truth. Keep sessionStorage only as an optimistic cache to avoid a flicker on load.
- Tick interval stays the same (1s local increment); every 30s reconcile `sessionSeconds` against `now - started_at` so long-running tabs don't drift.

### 4. Behaviour after fix

| Scenario | Result |
| --- | --- |
| Rep clicks Start at 5:00, refreshes at 5:16 | Timer shows 0:16:xx, keeps counting |
| Rep clicks Start at 5:00, opens 2nd tab | Both tabs show same time |
| Rep clicks End at 6:00, Start at 6:30 | New session, timer back to 0 at 6:30 |
| Rep closes browser, comes back tomorrow with old open session | Cron-style safety: `getCurrentRepSession` only returns sessions started today; older opens are auto-closed |

### 5. Out of scope

- No change to the leaderboard, call counters, or status auto-update rules.
- No change to any PROTECTED pitch-deck files.

## Files touched

- new migration: `rep_sessions` table + RLS
- `src/utils/sales-call.functions.ts` — three new server fns
- `src/routes/_dashboard.sales-call.tsx` — replace sessionStorage anchor with DB anchor
