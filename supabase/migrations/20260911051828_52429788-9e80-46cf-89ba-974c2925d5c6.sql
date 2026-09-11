DO $$
DECLARE
  r record;
  fn_pattern text := '(public\.)?(has_sales_role|is_admin_user|is_clinic_setter_user|current_clinic_id|current_sales_rep_id|current_sales_rep_role|jwt_email_trusted)\(([^()]*)\)';
  auth_pattern text := '(auth\.uid|auth\.jwt|auth\.role)\(\)';
  new_qual text;
  new_check text;
  sql text;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname AS name,
           pg_get_expr(p.polqual, p.polrelid) AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid) AS chk
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  LOOP
    new_qual := r.qual;
    new_check := r.chk;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, fn_pattern, '(SELECT \1\2(\3))', 'g');
      new_qual := regexp_replace(new_qual, auth_pattern, '(SELECT \1())', 'g');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, fn_pattern, '(SELECT \1\2(\3))', 'g');
      new_check := regexp_replace(new_check, auth_pattern, '(SELECT \1())', 'g');
    END IF;

    IF new_qual IS NOT DISTINCT FROM r.qual AND new_check IS NOT DISTINCT FROM r.chk THEN
      CONTINUE;
    END IF;

    sql := format('ALTER POLICY %I ON public.%I', r.name, r.tbl);
    IF new_qual IS NOT NULL THEN
      sql := sql || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE sql;
  END LOOP;
END $$;

-- Duplicate indexes on call_records: identical definitions slow every write
-- and bloat the table. Keep one of each pair.
DROP INDEX IF EXISTS public.idx_call_records_lead_id_called_at;
DROP INDEX IF EXISTS public.idx_call_records_direction_called_at;
DROP INDEX IF EXISTS public.idx_call_records_lead_id;

-- Serve "first call per lead" and recent-attempt lookups from an index-only scan.
CREATE INDEX IF NOT EXISTS idx_call_records_lead_called_at_dir
  ON public.call_records (lead_id, called_at, direction);

ANALYZE public.call_records;
ANALYZE public.meta_leads;