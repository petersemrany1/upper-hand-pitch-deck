-- Run after the migration. Every fixture and audit entry is rolled back.
BEGIN;
DO $test$
DECLARE admin_record record; other_rep uuid; sid uuid := gen_random_uuid(); event_id uuid := gen_random_uuid();
  lead uuid := '5e70f557-73ce-4bb7-a11a-6b718dbd092f'; e public.lead_skip_events; retry public.lead_skip_events;
  candidate uuid; next_session uuid := gen_random_uuid(); old_status text; old_calls bigint; rejected boolean; before_at timestamptz := clock_timestamp();
BEGIN
  SELECT id,name,email INTO admin_record FROM public.sales_reps WHERE role='admin' AND is_active ORDER BY created_at LIMIT 1;
  SELECT id INTO other_rep FROM public.sales_reps WHERE id<>admin_record.id AND is_active LIMIT 1;
  SELECT status INTO old_status FROM public.meta_leads WHERE id=lead;
  SELECT count(*) INTO old_calls FROM public.call_records WHERE lead_id=lead;
  INSERT INTO public.rep_sessions(id,rep_id,started_at) VALUES(sid,admin_record.id,now());
  PERFORM set_config('request.jwt.claims',jsonb_build_object('email',admin_record.email,'role','authenticated')::text,true);
  e := public.record_lead_skip(event_id,lead,'  Test: review phone number  ',sid);
  IF e.rep_id<>admin_record.id OR e.rep_name<>admin_record.name OR e.created_at<before_at OR e.reason<>'Test: review phone number' THEN RAISE EXCEPTION 'Incorrect actor/time/reason'; END IF;
  retry := public.record_lead_skip(event_id,lead,'Test: review phone number',sid);
  IF retry.id<>e.id OR retry.created_at<>e.created_at OR (SELECT count(*) FROM public.lead_skip_events WHERE id=event_id)<>1 THEN RAISE EXCEPTION 'Retry not idempotent'; END IF;
  rejected:=false; BEGIN PERFORM public.record_lead_skip(event_id,lead,'Different reason',sid); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Idempotency mismatch accepted'; END IF;
  rejected:=false; BEGIN PERFORM public.record_lead_skip(gen_random_uuid(),lead,' ',sid); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Empty reason accepted'; END IF;
  IF (SELECT status FROM public.meta_leads WHERE id=lead) IS DISTINCT FROM old_status OR (SELECT count(*) FROM public.call_records WHERE lead_id=lead)<>old_calls THEN RAISE EXCEPTION 'Skip changed lead or dial count'; END IF;
  -- Use the existing test lead in a rollback-only fixture for queue membership.
  -- Calls are intentionally not deleted. A separate never-called real candidate is read only.
  IF EXISTS(SELECT 1 FROM public.untouched_sales_leads(sid,now()) WHERE id=lead) THEN RAISE EXCEPTION 'Logged skip resurfaced'; END IF;
  SELECT id INTO candidate FROM public.untouched_sales_leads(sid,now()) WHERE status='new' LIMIT 1;
  IF candidate IS NULL THEN RAISE EXCEPTION 'Missing untouched candidate for queue test'; END IF;
  PERFORM public.record_lead_skip(gen_random_uuid(),candidate,'Rollback-only queue verification',sid);
  IF EXISTS(SELECT 1 FROM public.untouched_sales_leads(sid,now()) WHERE id=candidate) THEN RAISE EXCEPTION 'Current-session skip resurfaced'; END IF;
  INSERT INTO public.rep_sessions(id,rep_id,started_at) VALUES(next_session,admin_record.id,now());
  IF NOT EXISTS(SELECT 1 FROM public.untouched_sales_leads(next_session,now()) WHERE id=candidate) THEN RAISE EXCEPTION 'Skip hid lead from next session'; END IF;
  UPDATE public.rep_sessions SET rep_id=other_rep WHERE id=sid;
  rejected:=false; BEGIN PERFORM public.record_lead_skip(gen_random_uuid(),lead,'Test reason',sid); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Foreign session accepted'; END IF;
  rejected:=false; BEGIN PERFORM public.untouched_sales_leads(sid,now()); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Foreign queue accepted'; END IF;
  PERFORM set_config('request.jwt.claims','{}',true);
  rejected:=false; BEGIN PERFORM public.record_lead_skip(gen_random_uuid(),lead,'Test reason',NULL); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Anonymous actor accepted'; END IF;
  IF has_table_privilege('authenticated','public.lead_skip_events','INSERT') OR has_table_privilege('authenticated','public.lead_skip_events','UPDATE') OR has_table_privilege('authenticated','public.lead_skip_events','DELETE') OR has_function_privilege('anon','public.record_lead_skip(uuid,uuid,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Audit permissions too broad'; END IF;
END $test$;
ROLLBACK;
SELECT 'PASS: actor, server timestamp, reason, idempotence, unchanged lead/calls, skip exclusion, session ownership, authentication and audit permissions; all test writes rolled back' AS verification;
