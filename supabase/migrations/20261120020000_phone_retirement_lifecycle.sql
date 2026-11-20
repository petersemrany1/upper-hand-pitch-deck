-- Retire immediately, retain callbacks for 60 days, then release the provider lease.
ALTER TABLE public.phone_numbers ADD COLUMN release_due_at timestamptz;
ALTER TABLE public.phone_numbers ADD COLUMN release_started_at timestamptz;
ALTER TABLE public.phone_numbers ADD COLUMN released_at timestamptz;
ALTER TABLE public.phone_numbers ADD COLUMN release_error text;
ALTER TABLE public.voice_pool_settings ADD COLUMN release_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.voice_pool_settings ADD COLUMN pickup_retirement_enabled boolean NOT NULL DEFAULT false;
-- Unknown legacy retirement dates start today; never infer age from purchase date.
UPDATE public.phone_numbers SET retired_at=coalesce(retired_at,now()),
  release_due_at=coalesce(retired_at,now())+interval '60 days' WHERE status='retired';
CREATE FUNCTION public.phone_retirement_clock() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.release_started_at IS NOT NULL AND
    (NEW.status IS DISTINCT FROM OLD.status OR NEW.number IS DISTINCT FROM OLD.number OR NEW.twilio_sid IS DISTINCT FROM OLD.twilio_sid) THEN
    RAISE EXCEPTION 'A number being released cannot be reactivated or reassigned';
  END IF;
  IF NEW.status='retired' THEN
    IF TG_OP='INSERT' THEN NEW.retired_at:=now();
    ELSIF OLD.status IS DISTINCT FROM 'retired' THEN NEW.retired_at:=now();
    ELSE NEW.retired_at:=coalesce(OLD.retired_at,now()); END IF;
    NEW.release_due_at:=NEW.retired_at+interval '60 days';
  ELSE NEW.retired_at:=NULL; NEW.release_due_at:=NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER phone_retirement_clock BEFORE INSERT OR UPDATE ON public.phone_numbers
FOR EACH ROW EXECUTE FUNCTION public.phone_retirement_clock();
CREATE INDEX phone_release_due_idx ON public.phone_numbers(release_due_at) WHERE status='retired' AND released_at IS NULL;

CREATE FUNCTION public.voice_pool_begin_release(p_token uuid,p_number text,p_sid text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM 1 FROM voice_pool_settings WHERE singleton AND release_enabled AND lease_token=p_token AND lease_until>now() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE phone_numbers SET release_started_at=coalesce(release_started_at,now()),release_error=NULL
    WHERE number=p_number AND twilio_sid=p_sid AND p_sid ~ '^PN[0-9a-fA-F]{32}$' AND status='retired'
      AND released_at IS NULL AND retired_at<=now()-interval '60 days' AND release_due_at<=now();
  RETURN FOUND;
END $$;
CREATE FUNCTION public.voice_pool_finish_release(p_number text,p_sid text,p_error text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE phone_numbers SET released_at=CASE WHEN p_error IS NULL THEN coalesce(released_at,now()) ELSE released_at END,
    release_error=p_error WHERE number=p_number AND twilio_sid=p_sid AND status='retired' AND release_started_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Release was not claimed for this number'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.voice_pool_begin_release(uuid,text,text),public.voice_pool_finish_release(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.voice_pool_begin_release(uuid,text,text),public.voice_pool_finish_release(text,text,text) TO service_role;

-- Stable SMS preference moves to an active number automatically after retirement.
CREATE FUNCTION public.select_sms_sender(p_preferred text DEFAULT NULL,p_mms boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE sender text;
BEGIN
  SELECT number INTO sender FROM phone_numbers WHERE status='active' AND released_at IS NULL AND release_started_at IS NULL
    AND number ~ '^\+614[0-9]{8}$' AND twilio_sid IS NOT NULL AND (NOT p_mms OR mms_enabled)
    ORDER BY (number IS NOT DISTINCT FROM p_preferred) DESC,created_at,number LIMIT 1;
  IF sender IS NULL THEN RAISE EXCEPTION 'No active SMS sender is available'; END IF;
  RETURN sender;
END $$;
REVOKE ALL ON FUNCTION public.select_sms_sender(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.select_sms_sender(text,boolean) TO service_role;

-- Aggregate in the database: API row limits must not distort the displayed rate.
CREATE FUNCTION public.voice_pickup_rate(p_since timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT jsonb_build_object('total',count(*),'answered',count(*) FILTER(WHERE coalesce(duration_seconds,duration,0)>=10))
 FROM call_records WHERE direction='outbound' AND status IS DISTINCT FROM 'blocked' AND (p_since IS NULL OR called_at>=p_since);
$$;
REVOKE ALL ON FUNCTION public.voice_pickup_rate(timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.voice_pickup_rate(timestamptz) TO authenticated,service_role;

ALTER TABLE public.voice_number_health ADD COLUMN connected_10s_7d integer NOT NULL DEFAULT 0;
ALTER FUNCTION public.refresh_voice_number_health() RENAME TO refresh_voice_number_health_base;
CREATE OR REPLACE FUNCTION public.refresh_voice_number_health_base()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; warning text; remaining integer;
BEGIN
  -- Soft retirement keeps the Twilio lease, inbound calls and existing SMS threads.
  -- One exact early voice-label report is actionable; ambiguous/SMS mentions only flag review.
  FOR r IN SELECT DISTINCT ON(c.from_number) c.from_number,c.id FROM public.call_records c
    JOIN public.phone_numbers n ON n.number=c.from_number AND n.status='active'
    WHERE c.direction='outbound' AND c.called_at>=now()-interval '7 days'
      AND lower(left(c.call_analysis->>'transcript',600)) ~ '(keeps coming up as a scam|your (phone )?number (came|comes|shows|is showing|showed|appears|is marked|is flagged|is labelled|is labeled).{0,25}(spam|scam))'
      AND lower(left(c.call_analysis->>'transcript',600)) !~ '(text|sms|message|link|email)'
    ORDER BY c.from_number,c.called_at DESC
  LOOP
    UPDATE public.phone_numbers SET status='retired',retired_at=now(),retirement_reason='Direct caller-ID spam/scam report in a recent outbound transcript.' WHERE number=r.from_number AND status='active';
    IF FOUND THEN INSERT INTO public.error_logs(function_name,error_message,context) VALUES('voice-pool','Automatically retired a caller ID from outbound use; callbacks and texts are retained.',jsonb_build_object('number',r.from_number,'source_call_id',r.id)); END IF;
  END LOOP;
  SELECT count(*) INTO remaining FROM public.phone_numbers WHERE status='active';
  IF remaining<3 AND NOT EXISTS(SELECT 1 FROM public.error_logs WHERE function_name='voice-pool' AND error_message='Fewer than three active caller IDs remain.' AND NOT resolved) THEN
    INSERT INTO public.error_logs(function_name,error_message,context) VALUES('voice-pool','Fewer than three active caller IDs remain.',jsonb_build_object('active_numbers',remaining,'action','Replenishment requires an approved purchase budget; the bounded maintenance worker replenishes and releases eligible retired numbers.'));
  END IF;
  -- Review signals, never automatic proof of a label or an automatic number swap.
  INSERT INTO public.voice_reputation_signals(call_id,from_number,reason)
    SELECT id,from_number,'Transcript mentions a possible spam/scam label; review voice versus SMS context.'
    FROM public.call_records WHERE call_analysis->>'transcript' ~* '(number.{0,60}(spam|scam)|coming up as a (spam|scam)|showing (up )?as (a )?(spam|scam)|identified as spam)'
    ON CONFLICT(call_id) DO NOTHING;
  FOR r IN
    SELECT n.number,count(c.id) FILTER(WHERE c.called_at>=now()-interval '7 days')::int attempts,
      count(c.id) FILTER(WHERE c.called_at>=now()-interval '7 days' AND coalesce(c.duration_seconds,c.duration,0)>=15)::int connected,
      count(c.id) FILTER(WHERE c.called_at>=now()-interval '7 days' AND c.status IN('failed','busy','no-answer','canceled'))::int failures,
      count(c.id) FILTER(WHERE c.called_at<now()-interval '7 days')::int baseline_attempts,
      avg((coalesce(c.duration_seconds,c.duration,0)>=15)::int) FILTER(WHERE c.called_at<now()-interval '7 days') baseline_rate,
      (SELECT count(*)::int FROM public.voice_reputation_signals s JOIN public.call_records sc ON sc.id=s.call_id WHERE s.from_number=n.number AND sc.called_at>=now()-interval '30 days') signals
    FROM public.phone_numbers n LEFT JOIN public.call_records c ON c.from_number=n.number AND c.direction='outbound' AND c.status IS DISTINCT FROM 'blocked' AND c.called_at>=now()-interval '28 days'
    WHERE n.status='active' GROUP BY n.number
  LOOP
    warning:=CASE WHEN r.attempts>=30 AND r.baseline_attempts>=30 AND r.connected::numeric/nullif(r.attempts,0)<r.baseline_rate*0.65 THEN 'Connection rate fell more than 35% against the preceding 21 days.'
      WHEN r.attempts>=30 AND r.failures::numeric/nullif(r.attempts,0)>0.25 THEN 'More than 25% of attempts have an explicit failure or unanswered status.' ELSE NULL END;
    IF warning IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.voice_number_health WHERE number=r.number AND alert=warning) THEN
      INSERT INTO public.error_logs(function_name,error_message,context) VALUES('voice-reputation',warning,jsonb_build_object('number',r.number,'attempts_7d',r.attempts,'connected_15s_7d',r.connected,'note','Proxy includes voicemail; does not certify carrier label.'));
    END IF;
    INSERT INTO public.voice_number_health(number,checked_at,attempts_7d,connected_15s_7d,failures_7d,baseline_connected_rate,alert,transcript_signals) VALUES(r.number,now(),r.attempts,r.connected,r.failures,r.baseline_rate,warning,r.signals)
      ON CONFLICT(number) DO UPDATE SET checked_at=excluded.checked_at,attempts_7d=excluded.attempts_7d,connected_15s_7d=excluded.connected_15s_7d,failures_7d=excluded.failures_7d,baseline_connected_rate=excluded.baseline_connected_rate,alert=excluded.alert,transcript_signals=excluded.transcript_signals;
  END LOOP;
  -- Reconcile the legacy counters from actual call history, not SMS selection.
  UPDATE public.phone_numbers n SET call_count=x.n,last_used_at=x.last_call FROM (
    SELECT from_number,count(*)::int n,max(called_at) last_call FROM public.call_records WHERE direction='outbound' AND status IS DISTINCT FROM 'blocked' GROUP BY from_number
  ) x WHERE n.number=x.from_number;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_voice_number_health() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.voice_pool_settings; b jsonb; worst record;
BEGIN
  PERFORM public.refresh_voice_number_health_base();
  UPDATE voice_number_health h SET connected_10s_7d=(SELECT count(*) FROM call_records c
    WHERE c.from_number=h.number AND c.direction='outbound' AND c.status IS DISTINCT FROM 'blocked'
      AND c.called_at>=now()-interval '7 days' AND coalesce(c.duration_seconds,c.duration,0)>=10);
  UPDATE voice_number_health SET alert='Pickup rate below the 25% minimum over the past 7 days.'
    WHERE attempts_7d>=30 AND connected_10s_7d::numeric/attempts_7d<0.25;
  -- One performance retirement at a time, only when its replacement is funded.
  SELECT * INTO s FROM voice_pool_settings WHERE singleton FOR UPDATE;
  IF NOT s.pickup_retirement_enabled OR NOT s.enabled OR s.approved_at IS NULL OR cardinality(s.baseline_numbers)=0
    OR s.lease_until>now() OR EXISTS(SELECT 1 FROM voice_pool_purchases WHERE state IN('prepared','requested','uncertain')) THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('voice-number-pool',0));
  IF (SELECT count(*) FROM phone_numbers WHERE status='active')<s.target_active THEN RETURN; END IF;
  b:=public.voice_pool_budget();
  IF (b->>'used_numbers')::int>=s.max_additional_numbers OR (b->>'committed_cents')::int+s.max_unit_cents>s.max_monthly_cents THEN RETURN; END IF;
  SELECT h.* INTO worst FROM voice_number_health h JOIN phone_numbers n USING(number)
    WHERE n.status='active' AND h.attempts_7d>=30 AND h.connected_10s_7d::numeric/h.attempts_7d<0.25
    ORDER BY h.connected_10s_7d::numeric/h.attempts_7d,h.attempts_7d DESC,n.number LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE phone_numbers SET status='retired',retirement_reason='Pickup rate below 25% over 7 days with at least 30 calls; bounded automatic replacement.' WHERE number=worst.number AND status='active';
  INSERT INTO error_logs(function_name,error_message,context) VALUES('voice-pool','Automatically retired a number below the 25% pickup minimum; replacement queued.',
    jsonb_build_object('number',worst.number,'attempts_7d',worst.attempts_7d,'connected_10s_7d',worst.connected_10s_7d,'retention_days',60));
END $$;
REVOKE ALL ON FUNCTION public.refresh_voice_number_health(),public.refresh_voice_number_health_base() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_voice_number_health() TO service_role;
CREATE OR REPLACE FUNCTION public.voice_pool_lease(p_token uuid,p_release boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.voice_pool_settings;
BEGIN
  SELECT * INTO s FROM voice_pool_settings WHERE singleton FOR UPDATE;
  IF p_release THEN
    UPDATE voice_pool_settings SET lease_token=NULL,lease_until=NULL WHERE singleton AND lease_token=p_token;
    RETURN NULL;
  END IF;
  IF (NOT s.release_enabled AND (NOT s.enabled OR s.approved_at IS NULL OR cardinality(s.baseline_numbers)=0))
     OR (s.lease_until>now() AND s.lease_token IS DISTINCT FROM p_token) THEN RETURN NULL; END IF;
  UPDATE voice_pool_settings SET lease_token=p_token,lease_until=now()+interval '5 minutes' WHERE singleton RETURNING * INTO s;
  RETURN to_jsonb(s);
END $$;

CREATE OR REPLACE FUNCTION public.voice_pool_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.voice_pool_settings;
BEGIN
  IF NOT coalesce(public.is_admin_user() OR public.has_sales_role(ARRAY['admin']),false) THEN RAISE EXCEPTION 'Administrator required'; END IF;
  SELECT * INTO s FROM voice_pool_settings WHERE singleton;
  RETURN jsonb_build_object('enabled',s.enabled,'release_enabled',s.release_enabled,'pickup_retirement_enabled',s.pickup_retirement_enabled,'retention_days',60,'target_active',s.target_active,'max_additional_numbers',s.max_additional_numbers,
    'max_monthly_cents',s.max_monthly_cents,'currency',s.currency,'checked_at',s.checked_at,'last_result',s.last_result,'last_error',s.last_error,
    'active_numbers',(SELECT count(*) FROM phone_numbers WHERE status='active')) || public.voice_pool_budget();
END $$;

CREATE OR REPLACE FUNCTION public.voice_pool_tick(p_dry_run boolean DEFAULT false) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''); request_id bigint; job_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM voice_pool_settings WHERE release_enabled OR (enabled AND approved_at IS NOT NULL)) AND NOT p_dry_run THEN RETURN NULL; END IF;
  INSERT INTO voice_pool_jobs(token_hash,dry_run,expires_at) VALUES(encode(sha256(convert_to(token,'UTF8')),'hex'),p_dry_run,now()+interval '2 minutes') RETURNING id INTO job_id;
  SELECT net.http_post(url:='https://sfwokpeeffgrkxaptqji.supabase.co/functions/v1/voice-pool-maintenance',
    headers:=jsonb_build_object('Content-Type','application/json'),
    body:=jsonb_build_object('dry_run',p_dry_run,'job_id',job_id,'job_token',token),timeout_milliseconds:=120000) INTO request_id;
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.voice_pool_tick(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.voice_pool_tick(boolean) TO service_role;

ALTER TABLE public.refund_notifications ADD COLUMN sms_from_number text;
