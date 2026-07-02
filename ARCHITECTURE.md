# Architecture

Patient & clinic acquisition portal: a sales team works Meta leads by phone
(power dialler), books consultations, and hands booked patients to partner
clinics. React 19 + TanStack Start (SSR on Cloudflare via nitro) + Supabase
(Postgres, auth, realtime, edge functions) + Twilio (voice/SMS) + Stripe.

## Layers

```
src/routes/        Route files (TanStack file-based routing). Thin: wire
                   hooks + components together. No business logic.
src/components/    Feature components and shared UI (src/components/ui is
                   shadcn/ui — treated as vendored, lint-exempt).
src/data/          React Query hooks + typed repositories. The ONLY place
                   that talks to Supabase from the client. Query keys live
                   here.
src/server/        Server-only code. services/ (twilio, stripe, sms, email,
                   leads, clinics) wrap external APIs and privileged DB
                   access. Server functions must use requireSupabaseAuth
                   (via the authedServerFn wrapper) unless the endpoint is
                   deliberately public (webhooks with signature checks).
src/lib/           Pure shared logic (no UI imports, no side effects at
                   import time): pii scrubbing, timezone, slot generation.
src/utils/         Legacy grab-bag being migrated into lib/, data/ and
                   server/. Do not add new files here.
src/hooks/         Cross-cutting React hooks (auth, twilio device,
                   realtime subscription).
src/integrations/  Generated Supabase client + types + auth middleware.
supabase/          Migrations and Deno edge functions.
```

Import rules (enforced by ESLint `no-restricted-imports`):

- `routes/` and `components/` must not import `@/integrations/supabase/client`
  directly — go through `src/data` hooks. (Warn until the data-layer
  migration completes, then error.)
- `lib/`, `utils/`, `server/` must never import UI (`components/`, `routes/`).

## Data access

- All client reads/writes go through React Query hooks in `src/data`.
  Query keys are declared next to the hooks; mutations invalidate by key.
- Realtime: one `useRealtimeSubscription` hook multiplexes Postgres change
  feeds; components subscribe by table/filter instead of opening their own
  channels.
- Lead queue ordering is computed in Postgres (RPC), not client-side:
  callbacks-due first, then new leads newest-first. Paginate by cursor;
  never `.limit(5000)`.

## Error tracking

Client errors funnel through `src/lib/error-reporting.ts` (`reportError`):
window handlers and the router error boundary already do. It scrubs PII
(`src/lib/pii.ts`), dedupes repeats, rate-limits, then writes to the
`error_logs` table. Server functions use `logError` in
`src/utils/error-logger.functions.ts` (same scrubbing). `error_logs` RLS:
authenticated insert, admin-only read/update/delete; the /logs page reads
via an authenticated server function.

## Security conventions

- Every `createServerFn` takes `requireSupabaseAuth` middleware unless it is
  an explicitly public webhook that verifies a provider signature instead.
- RLS on every table; role helpers `is_admin_user()`, `has_sales_role()`,
  `current_sales_rep_id()` live in migrations.
- Never commit secrets; environment variables only.

## Product invariants

- Rep queue priority: callbacks-due ALWAYS first, then new leads
  newest-first.
- Dispositions are undoable: a rep can undo/edit their last disposition; a
  lead must never be lost to a mis-click.
