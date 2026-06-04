## Per-user tab access

Add a per-user `allowed_tabs` list so admins can pick exactly which sidebar tabs each user sees, on top of the existing role.

### Tab keys (one per sidebar item)
`dashboard`, `training`, `partner_clinics`, `sales_portal`, `leaderboard`, `appointments`, `leads`, `analytics`, `phone`, `pitch_deck`, `clinics`, `sent_links`

### Database
- Add `allowed_tabs text[]` to `public.sales_reps` (nullable).
- `null` = fall back to existing role defaults (so nothing breaks for current users).
- Admins always see everything regardless of the column.

### Invite dialog (Settings → Invite Rep)
After the existing "Access level" buttons, add a "Tab access" section:
- 12 checkboxes grouped: General (Dashboard, Training, Partner Clinics), Sales (Sales Portal, Leaderboard, Appointments, Leads, Analytics, Phone), Clinic Acquisition (Pitch Deck, Clinics, Sent Links).
- Selecting a role pre-checks its sensible defaults (rep → Dashboard, Training, Sales Portal; admin → all; clinic setter → Clinics, Phone), but the admin can tick/untick anything.
- Hidden if role = admin (admins always get everything).
- Saved through `inviteRep` as a new `allowedTabs` field.

### Edit user dialog
Same checkbox section so admins can change access for an existing user. Saved via `updateRep`.

### Sidebar enforcement
`AppSidebar` reads `allowed_tabs` from the user's `sales_reps` row (already fetched there) and filters `topItem`, `trainingItem`, `partnerClinicsItem`, and each folder's `items` to only those whose key is allowed. Empty folders are hidden.

### Route enforcement
Lightweight guard: a `useTabAccess(tab)` hook used by each gated route to redirect to `/` (or the first allowed tab) if the user opens a URL they can't access. Admins bypass.

### Files to touch
- new migration: add `allowed_tabs text[]` column
- `src/utils/sales-call.functions.ts` — accept/save `allowedTabs` in `inviteRep` + `updateRep`
- `src/routes/_dashboard.settings.tsx` — checkbox UI in invite + edit dialogs
- `src/components/AppSidebar.tsx` — filter nav by `allowed_tabs`
- `src/hooks/useAuth.ts` (or new `useTabAccess`) — expose allowed tabs
- guarded route files — call `useTabAccess` at the top

Want me to go ahead and build this?
