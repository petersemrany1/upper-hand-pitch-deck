-- 1) Lock the search_path on normalize_phone so it can't be hijacked by
--    placing a malicious function in another schema and changing search_path.
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT regexp_replace(COALESCE(p, ''), '[^0-9]', '', 'g')
$function$;

-- 2) Add a restrictive INSERT policy on meta_leads so the table no longer
--    has a "missing policy" gap. The webhook route (api/public/meta-leads.ts)
--    uses the service role which bypasses RLS, so this policy intentionally
--    forbids any direct anon/authenticated client-side insert. If a future
--    in-app form needs to add a lead, it should go through a server function.
CREATE POLICY "No direct client inserts on meta_leads"
ON public.meta_leads
FOR INSERT
TO authenticated, anon
WITH CHECK (false);