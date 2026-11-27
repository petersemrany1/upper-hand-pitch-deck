# Porting Legal pages into the portal

`python3 scripts/legal-port/port.py leads.tsx pitch-deck.tsx` copies a Legal page
(from `~/Documents/GitHub/family-law-floater/src/routes/_authenticated/`) and every
file it imports into `src/legal/`, rewrites `@/` imports to `@/legal/`, points
Supabase at the Legal database (`src/legal/integrations/supabase/client.ts`), and
turns the route into an exported `LegalPage` component. Then register it in
`NATIVE` in `src/legal/LegalView.tsx`.

Re-running overwrites the copies, so keep portal-specific changes out of
`src/legal/` (except `LegalView.tsx`, `legal.css` and the Supabase client shim).

Pages that import `*.functions.ts` / `*.server.ts` are reported and not copied:
they need the Legal server keys (service role, Twilio, Anthropic…) in this
project's environment before they can be ported.
