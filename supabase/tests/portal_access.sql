-- Run as a migration owner. Scope role tests to existing rows and one temporary
-- blacklist entry. The exception subtransaction removes that fixture on success.
DO $test$
DECLARE
  actor record;
  admin_id uuid;
  rep_id_with_job uuid;
  clinic_user uuid;
  clinic_folder uuid;
  fixture uuid := gen_random_uuid();
  expected_own_jobs bigint;
  all_jobs bigint;
  all_logos bigint;
  clinic_logos bigint;
  blocked boolean;
  affected bigint;
BEGIN
  SELECT id INTO STRICT admin_id FROM public.sales_reps WHERE role = 'admin' AND is_active LIMIT 1;
  SELECT s.id INTO STRICT rep_id_with_job FROM public.sales_reps s
    JOIN public.rep_performance_jobs j ON j.rep_id = s.id WHERE s.role = 'rep' AND s.is_active LIMIT 1;
  SELECT u.id, u.clinic_id INTO STRICT clinic_user, clinic_folder FROM public.clinic_portal_users u
    JOIN storage.objects o ON o.bucket_id = 'clinicflow-logos' AND (storage.foldername(o.name))[1] = u.clinic_id::text LIMIT 1;
  SELECT count(*), count(*) FILTER (WHERE rep_id = rep_id_with_job) INTO all_jobs, expected_own_jobs FROM public.rep_performance_jobs;
  SELECT count(*), count(*) FILTER (WHERE (storage.foldername(name))[1] = clinic_folder::text)
    INTO all_logos, clinic_logos FROM storage.objects WHERE bucket_id = 'clinicflow-logos';
  IF expected_own_jobs NOT BETWEEN 1 AND all_jobs - 1 OR clinic_logos NOT BETWEEN 1 AND all_logos - 1 THEN
    RAISE EXCEPTION 'Need own and other records to exercise isolation';
  END IF;
  BEGIN
    FOR actor IN SELECT * FROM (VALUES
      ('admin',admin_id,all_jobs,all_logos,true), ('rep',rep_id_with_job,expected_own_jobs,0::bigint,true),
      ('clinic',clinic_user,0::bigint,clinic_logos,false), ('unassigned',gen_random_uuid(),0::bigint,0::bigint,false)
    ) AS a(kind,uid,jobs,logos,can_add) LOOP
      IF NOT actor.can_add THEN
        INSERT INTO public.lead_blacklist(id,reason) VALUES (fixture,'Permission test');
      END IF;
      PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',actor.uid,'role','authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      IF (SELECT count(*) FROM public.rep_performance_jobs) <> actor.jobs THEN RAISE EXCEPTION '% report access', actor.kind; END IF;
      IF (SELECT count(*) FROM storage.objects WHERE bucket_id='clinicflow-logos') <> actor.logos THEN RAISE EXCEPTION '% logo access', actor.kind; END IF;

      blocked := false;
      BEGIN
        INSERT INTO public.lead_blacklist(id,reason) VALUES (CASE WHEN actor.can_add THEN fixture ELSE gen_random_uuid() END,'Permission test');
      EXCEPTION WHEN insufficient_privilege THEN blocked := true;
      END;
      IF blocked = actor.can_add THEN RAISE EXCEPTION '% blacklist insert', actor.kind; END IF;
      IF (SELECT count(*) FROM public.lead_blacklist WHERE id=fixture) <> (actor.can_add::int) THEN
        RAISE EXCEPTION '% blacklist read', actor.kind;
      END IF;
      DELETE FROM public.lead_blacklist WHERE id=fixture;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> ((actor.kind='admin')::int) THEN RAISE EXCEPTION '% blacklist delete', actor.kind; END IF;
      RESET ROLE;
      DELETE FROM public.lead_blacklist WHERE id=fixture;
    END LOOP;
    SET LOCAL ROLE service_role;
    IF (SELECT count(*) FROM public.rep_performance_jobs) <> all_jobs
      OR (SELECT count(*) FROM storage.objects WHERE bucket_id='clinicflow-logos') <> all_logos
      OR NOT EXISTS (SELECT FROM public.lead_blacklist)
    THEN RAISE EXCEPTION 'Worker access'; END IF;
    RESET ROLE;
    RAISE EXCEPTION SQLSTATE 'Z0001' USING MESSAGE = 'Undo test writes';
  EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
  END;
END
$test$;
