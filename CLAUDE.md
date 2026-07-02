# CLAUDE.md

## Commands

- `bun run dev` — dev server on :8080
- `bun test` — unit tests (bun test runner)
- `bun run build` — production build (must stay green)
- `bun run typecheck` — `tsc --noEmit` (must stay green)
- `bun run lint` — ESLint; errors block CI, warnings are legacy debt being
  burned down — never add new ones.

## Rules

- Read ARCHITECTURE.md before structural changes; respect the layer/import
  rules there (ESLint enforces them).
- New client data access = React Query hook in `src/data`. Never call
  `supabase.from()` inside components or routes.
- New server functions must use `requireSupabaseAuth`
  (`src/integrations/supabase/auth-middleware.ts`) unless they are public
  webhooks that verify a provider signature.
- Anything written to `error_logs` must pass through the scrubbers in
  `src/lib/pii.ts` (client: `reportError`; server: `logError`).
- No new `any` types; no new inline `style={{}}` — use design tokens /
  Tailwind.
- Do not edit generated files: `src/routeTree.gen.ts`,
  `src/integrations/supabase/types.ts`, `src/integrations/supabase/auth-middleware.ts`.
- Schema changes = new file in `supabase/migrations/`; never edit an existing
  migration.

## Product invariants

- Rep queue: callbacks-due first, then new leads newest-first.
- Dispositions must be undoable (fat-finger safety).
