-- Tighten error_logs RLS.
--
-- Before: any authenticated user could read, update and delete every row.
-- Error contexts have historically contained stack traces, URLs and request
-- payloads, so reads must be restricted to admins. The /logs page reads via
-- an authenticated server function using the service role, so it keeps
-- working for staff without direct table reads.
--
-- After:
--   INSERT  -> any authenticated user (frontend error reporting)
--   SELECT/UPDATE/DELETE -> admins only

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'error_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.error_logs', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated insert error_logs"
  ON public.error_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read error_logs"
  ON public.error_logs FOR SELECT TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Admins update error_logs"
  ON public.error_logs FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins delete error_logs"
  ON public.error_logs FOR DELETE TO authenticated
  USING (public.is_admin_user());
