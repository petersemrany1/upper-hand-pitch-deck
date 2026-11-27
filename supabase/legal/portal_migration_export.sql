-- Runs in the LEGAL database (family-law-floater), not the Hair one.
-- Read-only, admin-only helpers for moving the Legal app into the Upper Hand
-- portal: one describes the real database layout, the other pages out a
-- table's rows. Neither changes anything.

CREATE OR REPLACE FUNCTION public.portal_schema_export()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT coalesce(public.is_admin_user(), false) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'tables', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'name', c.relname,
        'kind', c.relkind,
        'rls', c.relrowsecurity,
        'force_rls', c.relforcerowsecurity,
        'acl', c.relacl::text[],
        'columns', (
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'name', a.attname,
            'type', format_type(a.atttypid, a.atttypmod),
            'not_null', a.attnotnull,
            'default', pg_get_expr(d.adbin, d.adrelid),
            'identity', a.attidentity,
            'generated', a.attgenerated
          ) ORDER BY a.attnum), '[]'::jsonb)
          FROM pg_attribute a
          LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
        )
      ) ORDER BY c.relname), '[]'::jsonb)
      FROM pg_class c
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
    ),
    'constraints', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'table', c.conrelid::regclass::text, 'name', c.conname, 'type', c.contype,
        'def', pg_get_constraintdef(c.oid)
      ) ORDER BY c.conrelid::regclass::text, c.contype, c.conname), '[]'::jsonb)
      FROM pg_constraint c
      WHERE c.connamespace = 'public'::regnamespace AND c.conrelid <> 0
    ),
    'indexes', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'table', i.tablename, 'name', i.indexname, 'def', i.indexdef
      ) ORDER BY i.tablename, i.indexname), '[]'::jsonb)
      FROM pg_indexes i
      WHERE i.schemaname = 'public'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conname = i.indexname AND k.connamespace = 'public'::regnamespace)
    ),
    'views', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'name', c.relname, 'kind', c.relkind, 'def', pg_get_viewdef(c.oid, true),
        'options', c.reloptions, 'acl', c.relacl::text[]
      ) ORDER BY c.relname), '[]'::jsonb)
      FROM pg_class c
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('v', 'm')
    ),
    'sequences', (
      SELECT coalesce(jsonb_agg(c.relname ORDER BY c.relname), '[]'::jsonb)
      FROM pg_class c
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'S'
    ),
    'types', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'name', t.typname, 'kind', t.typtype,
        'labels', (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid),
        'domain_type', CASE WHEN t.typtype = 'd' THEN format_type(t.typbasetype, t.typtypmod) END
      ) ORDER BY t.typname), '[]'::jsonb)
      FROM pg_type t
      WHERE t.typnamespace = 'public'::regnamespace AND t.typtype IN ('e', 'd')
    ),
    'functions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'name', p.proname,
        'args', pg_get_function_identity_arguments(p.oid),
        'kind', p.prokind,
        'def', pg_get_functiondef(p.oid),
        'acl', p.proacl::text[]
      ) ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
      FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace AND p.prokind IN ('f', 'p')
        AND NOT EXISTS (SELECT 1 FROM pg_depend dep WHERE dep.objid = p.oid AND dep.deptype = 'e')
    ),
    'triggers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'table', t.tgrelid::regclass::text, 'name', t.tgname, 'def', pg_get_triggerdef(t.oid),
        'enabled', t.tgenabled
      ) ORDER BY t.tgrelid::regclass::text, t.tgname), '[]'::jsonb)
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE NOT t.tgisinternal AND c.relnamespace IN ('public'::regnamespace, 'auth'::regnamespace)
    ),
    'policies', (
      SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.schemaname, p.tablename, p.policyname), '[]'::jsonb)
      FROM pg_policies p
      WHERE p.schemaname IN ('public', 'storage')
    ),
    'buckets', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'public', b.public,
        'file_size_limit', b.file_size_limit, 'allowed_mime_types', b.allowed_mime_types
      ) ORDER BY b.id), '[]'::jsonb)
      FROM storage.buckets b
    ),
    'cron', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'name', j.jobname, 'schedule', j.schedule, 'command', j.command, 'active', j.active
      ) ORDER BY j.jobname), '[]'::jsonb)
      FROM cron.job j
    ),
    'row_counts', (
      SELECT coalesce(jsonb_object_agg(s.relname, s.n_live_tup), '{}'::jsonb)
      FROM pg_stat_user_tables s
      WHERE s.schemaname = 'public'
    ),
    'storage_objects', (
      SELECT coalesce(jsonb_object_agg(o.bucket_id, o.n), '{}'::jsonb)
      FROM (SELECT bucket_id, count(*) AS n FROM storage.objects GROUP BY bucket_id) o
    ),
    'auth_users', (SELECT count(*) FROM auth.users)
  ) INTO result;
  RETURN result;
END;
$$;

-- One page of a public table's rows, ordered by primary key (max 1000 rows).
CREATE OR REPLACE FUNCTION public.portal_table_export(p_table text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 1000)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rel oid;
  order_by text;
  result jsonb;
BEGIN
  IF NOT coalesce(public.is_admin_user(), false) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT c.oid INTO rel
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') AND c.relname = p_table;
  IF rel IS NULL THEN
    RAISE EXCEPTION 'Unknown table %', p_table USING ERRCODE = '22023';
  END IF;
  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(i.indkey::int2[], a.attnum))
  INTO order_by
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
  WHERE i.indrelid = rel AND i.indisprimary;
  EXECUTE format(
    'SELECT coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY %s OFFSET %s LIMIT %s) t',
    p_table,
    coalesce(order_by, 'ctid'),
    greatest(coalesce(p_offset, 0), 0),
    least(greatest(coalesce(p_limit, 1000), 1), 1000)
  ) INTO result;
  RETURN result;
END;
$$;

-- One page of auth users (id, email, phone, names, dates) so Legal people can
-- be matched to Upper Hand accounts. No passwords or tokens.
CREATE OR REPLACE FUNCTION public.portal_auth_users_export(p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT coalesce(public.is_admin_user(), false) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id, 'email', u.email, 'phone', u.phone,
    'user_metadata', u.raw_user_meta_data, 'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at,
    'banned_until', u.banned_until
  ) ORDER BY u.created_at, u.id), '[]'::jsonb)
  INTO result
  FROM (SELECT * FROM auth.users ORDER BY created_at, id OFFSET greatest(coalesce(p_offset, 0), 0) LIMIT 1000) u;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_schema_export() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_table_export(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_auth_users_export(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_schema_export() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_table_export(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_auth_users_export(integer) TO authenticated;
