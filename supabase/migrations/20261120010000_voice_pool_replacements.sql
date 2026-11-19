-- Disabled until an operator records the approved budget and baseline inventory.
CREATE TABLE public.voice_pool_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  enabled boolean NOT NULL DEFAULT false,
  target_active integer NOT NULL DEFAULT 7 CHECK(target_active BETWEEN 1 AND 20),
  max_additional_numbers integer NOT NULL DEFAULT 2 CHECK(max_additional_numbers BETWEEN 0 AND 2),
  max_monthly_cents integer NOT NULL DEFAULT 1650 CHECK(max_monthly_cents BETWEEN 0 AND 1650),
  max_unit_cents integer NOT NULL DEFAULT 825 CHECK(max_unit_cents BETWEEN 1 AND 825),
  currency text NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
  baseline_numbers text[] NOT NULL DEFAULT '{}',
  approved_at timestamptz,
  lease_token uuid, lease_until timestamptz,
  checked_at timestamptz, last_result text, last_error text
);
INSERT INTO public.voice_pool_settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE public.voice_pool_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE CHECK(phone ~ '^\+614[0-9]{8}$'),
  state text NOT NULL DEFAULT 'prepared' CHECK(state IN('prepared','requested','uncertain','purchased','failed')),
  monthly_cents integer NOT NULL CHECK(monthly_cents BETWEEN 1 AND 825),
  currency text NOT NULL CHECK(currency='usd'),
  twilio_sid text UNIQUE, error text,
  created_at timestamptz NOT NULL DEFAULT now(), requested_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX voice_pool_one_pending ON public.voice_pool_purchases((true)) WHERE state IN('prepared','requested','uncertain');
ALTER TABLE public.voice_pool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_pool_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voice_pool_settings,public.voice_pool_purchases FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.voice_pool_settings,public.voice_pool_purchases TO service_role;

CREATE FUNCTION public.voice_pool_budget() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH phones AS (
    SELECT number phone FROM phone_numbers,voice_pool_settings s WHERE NOT(number=ANY(s.baseline_numbers))
    UNION SELECT phone FROM voice_pool_purchases WHERE state<>'failed'
  ), costs AS (
    SELECT p.phone,coalesce(v.monthly_cents,s.max_unit_cents) cents FROM phones p CROSS JOIN voice_pool_settings s
    LEFT JOIN voice_pool_purchases v ON v.phone=p.phone AND v.state<>'failed'
  ) SELECT jsonb_build_object('used_numbers',count(*),'committed_cents',coalesce(sum(cents),0)) FROM costs;
$$;

CREATE FUNCTION public.voice_pool_lease(p_token uuid,p_release boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.voice_pool_settings;
BEGIN
  SELECT * INTO s FROM voice_pool_settings WHERE singleton FOR UPDATE;
  IF p_release THEN
    UPDATE voice_pool_settings SET lease_token=NULL,lease_until=NULL WHERE singleton AND lease_token=p_token;
    RETURN NULL;
  END IF;
  IF NOT s.enabled OR s.approved_at IS NULL OR cardinality(s.baseline_numbers)=0
     OR (s.lease_until>now() AND s.lease_token IS DISTINCT FROM p_token) THEN RETURN NULL; END IF;
  UPDATE voice_pool_settings SET lease_token=p_token,lease_until=now()+interval '5 minutes' WHERE singleton RETURNING * INTO s;
  RETURN to_jsonb(s);
END $$;

CREATE FUNCTION public.voice_pool_reserve(p_token uuid,p_phone text,p_cents integer,p_currency text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.voice_pool_settings; b jsonb; purchase public.voice_pool_purchases;
BEGIN
  SELECT * INTO s FROM voice_pool_settings WHERE singleton FOR UPDATE;
  IF NOT s.enabled OR s.approved_at IS NULL OR cardinality(s.baseline_numbers)=0 OR s.lease_token IS DISTINCT FROM p_token OR s.lease_until<=now() THEN RAISE EXCEPTION 'Replacement lease unavailable'; END IF;
  IF EXISTS(SELECT 1 FROM voice_pool_purchases WHERE state IN('prepared','requested','uncertain')) THEN RAISE EXCEPTION 'A replacement needs reconciliation'; END IF;
  IF (SELECT count(*) FROM phone_numbers WHERE status='active')>=s.target_active THEN RETURN NULL; END IF;
  IF EXISTS(SELECT 1 FROM phone_numbers WHERE number=p_phone) THEN RAISE EXCEPTION 'Number already in pool'; END IF;
  b:=public.voice_pool_budget();
  IF p_cents IS NULL OR p_cents<1 OR p_cents>s.max_unit_cents OR p_currency IS DISTINCT FROM s.currency OR (b->>'used_numbers')::int>=s.max_additional_numbers OR (b->>'committed_cents')::int+p_cents>s.max_monthly_cents THEN RAISE EXCEPTION 'Approved replacement budget exceeded'; END IF;
  INSERT INTO voice_pool_purchases(phone,monthly_cents,currency) VALUES(p_phone,p_cents,p_currency)
    ON CONFLICT(phone) DO UPDATE SET state='prepared',monthly_cents=excluded.monthly_cents,currency=excluded.currency,error=NULL,requested_at=NULL,updated_at=now()
    WHERE voice_pool_purchases.state='failed' RETURNING * INTO purchase;
  RETURN to_jsonb(purchase);
END $$;

CREATE FUNCTION public.voice_pool_begin(p_token uuid,p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.voice_pool_settings;
BEGIN
  SELECT * INTO s FROM voice_pool_settings WHERE singleton FOR UPDATE;
  IF NOT s.enabled OR s.lease_token IS DISTINCT FROM p_token OR s.lease_until<=now() THEN RETURN false; END IF;
  UPDATE voice_pool_purchases SET state='requested',requested_at=now(),updated_at=now() WHERE id=p_id AND state='prepared';
  RETURN FOUND;
END $$;

CREATE FUNCTION public.voice_pool_finish(p_id uuid,p_sid text,p_mms boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.voice_pool_purchases;
BEGIN
  PERFORM 1 FROM voice_pool_settings WHERE singleton FOR UPDATE;
  SELECT * INTO STRICT p FROM voice_pool_purchases WHERE id=p_id FOR UPDATE;
  IF p_sid IS NULL OR p_sid !~ '^PN[0-9a-fA-F]{32}$' OR p.state NOT IN('requested','uncertain','purchased') THEN RAISE EXCEPTION 'Invalid replacement completion'; END IF;
  IF p.twilio_sid IS NOT NULL AND p.twilio_sid<>p_sid THEN RAISE EXCEPTION 'Replacement identity mismatch'; END IF;
  INSERT INTO phone_numbers(number,twilio_sid,friendly_name,status,mms_enabled)
    VALUES(p.phone,p_sid,'HTG-Replacement-'||p.id,'active',p_mms) ON CONFLICT(number) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM phone_numbers WHERE number=p.phone AND twilio_sid=p_sid) THEN RAISE EXCEPTION 'Pool identity mismatch'; END IF;
  -- Never reactivate an already retired number during a repeated completion.
  UPDATE voice_pool_purchases SET state='purchased',twilio_sid=p_sid,error=NULL,updated_at=now() WHERE id=p_id;
END $$;

CREATE FUNCTION public.voice_pool_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.voice_pool_settings;
BEGIN
  IF NOT coalesce(public.is_admin_user() OR public.has_sales_role(ARRAY['admin']),false) THEN RAISE EXCEPTION 'Administrator required'; END IF;
  SELECT * INTO s FROM voice_pool_settings WHERE singleton;
  RETURN jsonb_build_object('enabled',s.enabled,'target_active',s.target_active,'max_additional_numbers',s.max_additional_numbers,
    'max_monthly_cents',s.max_monthly_cents,'currency',s.currency,'checked_at',s.checked_at,'last_result',s.last_result,'last_error',s.last_error,
    'active_numbers',(SELECT count(*) FROM phone_numbers WHERE status='active')) || public.voice_pool_budget();
END $$;

REVOKE ALL ON FUNCTION public.voice_pool_budget(),public.voice_pool_lease(uuid,boolean),public.voice_pool_reserve(uuid,text,integer,text),public.voice_pool_begin(uuid,uuid),public.voice_pool_finish(uuid,text,boolean),public.voice_pool_status() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.voice_pool_budget(),public.voice_pool_lease(uuid,boolean),public.voice_pool_reserve(uuid,text,integer,text),public.voice_pool_begin(uuid,uuid),public.voice_pool_finish(uuid,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.voice_pool_status() TO authenticated;

-- Single-use, purpose-bound tickets let pg_cron call only this worker without
-- reading the credential vault. The plaintext ticket exists only for dispatch.
CREATE TABLE public.voice_pool_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL,
  dry_run boolean NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), consumed_at timestamptz
);
ALTER TABLE public.voice_pool_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voice_pool_jobs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.voice_pool_jobs TO service_role;
CREATE FUNCTION public.consume_voice_pool_job(p_id uuid,p_token text,p_dry_run boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
  UPDATE voice_pool_jobs SET consumed_at=now() WHERE id=p_id AND consumed_at IS NULL AND expires_at>now()
    AND dry_run=p_dry_run AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.consume_voice_pool_job(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_voice_pool_job(uuid,text,boolean) TO service_role;

-- Scheduler dispatch; no existing credentials are read or changed.
CREATE FUNCTION public.voice_pool_tick(p_dry_run boolean DEFAULT false) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''); request_id bigint; job_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM voice_pool_settings WHERE enabled AND approved_at IS NOT NULL) AND NOT p_dry_run THEN RETURN NULL; END IF;
  INSERT INTO voice_pool_jobs(token_hash,dry_run,expires_at) VALUES(encode(sha256(convert_to(token,'UTF8')),'hex'),p_dry_run,now()+interval '2 minutes') RETURNING id INTO job_id;
  SELECT net.http_post(url:='https://sfwokpeeffgrkxaptqji.supabase.co/functions/v1/voice-pool-maintenance',
    headers:=jsonb_build_object('Content-Type','application/json'),
    body:=jsonb_build_object('dry_run',p_dry_run,'job_id',job_id,'job_token',token),timeout_milliseconds:=120000) INTO request_id;
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.voice_pool_tick(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.voice_pool_tick(boolean) TO service_role;
-- Install only after deploying the worker; remains inert until explicitly enabled.
SELECT cron.schedule('voice-pool-replacements-hourly','19 * * * *','SELECT public.voice_pool_tick()');
