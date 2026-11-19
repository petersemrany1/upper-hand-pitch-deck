-- Automatic number-pool rotation/retirement, callback routing and health checks.
-- Only signed Twilio webhooks (service_role) may reserve or update calls.
ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS outbound_daily_limit integer NOT NULL DEFAULT 80 CHECK(outbound_daily_limit BETWEEN 10 AND 500);
ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS retired_at timestamptz;
ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS retirement_reason text;
CREATE INDEX IF NOT EXISTS call_records_voice_number_time_idx ON public.call_records(from_number,called_at DESC);
CREATE TABLE IF NOT EXISTS public.voice_destination_routes (
  phone text PRIMARY KEY, caller_id text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.voice_dial_decisions (
  call_sid text PRIMARY KEY, phone text NOT NULL, caller_id text,
  allowed boolean NOT NULL, reason text NOT NULL, retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS voice_decisions_created_idx ON public.voice_dial_decisions(created_at);
CREATE TABLE IF NOT EXISTS public.voice_number_health (
  number text PRIMARY KEY, checked_at timestamptz NOT NULL, attempts_7d integer NOT NULL,
  connected_15s_7d integer NOT NULL, failures_7d integer NOT NULL,
  baseline_connected_rate numeric, alert text, transcript_signals integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.voice_reputation_signals (
  call_id uuid PRIMARY KEY REFERENCES public.call_records(id), from_number text,
  detected_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL
);
ALTER TABLE public.voice_destination_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_dial_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_number_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_reputation_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voice_destination_routes,public.voice_dial_decisions,public.voice_number_health,public.voice_reputation_signals FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.voice_destination_routes,public.voice_dial_decisions,public.voice_number_health,public.voice_reputation_signals TO service_role;
GRANT SELECT ON public.voice_number_health,public.voice_reputation_signals TO authenticated;
DROP POLICY IF EXISTS voice_health_admin ON public.voice_number_health;
CREATE POLICY voice_health_admin ON public.voice_number_health FOR SELECT TO authenticated USING(public.is_admin_user() OR public.has_sales_role(ARRAY['admin']));
DROP POLICY IF EXISTS voice_signals_admin ON public.voice_reputation_signals;
CREATE POLICY voice_signals_admin ON public.voice_reputation_signals FOR SELECT TO authenticated USING(public.is_admin_user() OR public.has_sales_role(ARRAY['admin']));
CREATE INDEX IF NOT EXISTS call_records_voice_phone_time_idx ON public.call_records(public.sales_journey_phone(phone),called_at DESC);
CREATE INDEX IF NOT EXISTS clinics_voice_phone_idx ON public.clinics(public.sales_journey_phone(phone));
CREATE INDEX IF NOT EXISTS lead_blacklist_voice_phone_idx ON public.lead_blacklist(public.sales_journey_phone(phone));
ALTER TABLE public.call_records ADD COLUMN IF NOT EXISTS voice_destination_sid text;
ALTER TABLE public.call_records ADD COLUMN IF NOT EXISTS voice_status_sequence integer;
ALTER TABLE public.call_records ADD COLUMN IF NOT EXISTS voice_error_code text;
ALTER TABLE public.call_records ADD COLUMN IF NOT EXISTS voice_sip_response text;

CREATE OR REPLACE FUNCTION public.claim_outbound_call(p_call_sid text,p_phone text,p_rep_id uuid,p_lead_id uuid DEFAULT NULL,p_clinic_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='3500ms' SET lock_timeout='1500ms' AS $$
DECLARE k text := public.sales_journey_phone(p_phone); d public.voice_dial_decisions;
  caller text;
  why text := 'allowed'; retry timestamptz; actual_lead uuid := p_lead_id;
BEGIN
  IF regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') ~ '^(1[38]00[0-9]{6}|13[0-9]{4})$' THEN
    k:='61'||regexp_replace(p_phone,'[^0-9]','','g');
  END IF;
  IF k IS NULL OR p_call_sid !~ '^CA[0-9a-fA-F]{32}$' OR p_call_sid IS NULL THEN RAISE EXCEPTION 'Invalid call reservation'; END IF;
  -- Lock order is always CallSid then contact, across reps, devices and webhook retries.
  PERFORM pg_advisory_xact_lock(hashtextextended('voice-sid:'||p_call_sid,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('voice-phone:'||k,0));
  SELECT * INTO d FROM public.voice_dial_decisions WHERE call_sid=p_call_sid;
  IF FOUND THEN
    IF d.phone<>k THEN RAISE EXCEPTION 'CallSid destination mismatch'; END IF;
    IF d.allowed AND NOT EXISTS(SELECT 1 FROM public.phone_numbers WHERE number=d.caller_id AND status='active') THEN
      RETURN jsonb_build_object('allowed',false,'reason','no_active_number');
    END IF;
    RETURN jsonb_build_object('allowed',d.allowed,'reason',d.reason,'caller_id',d.caller_id,'retry_at',d.retry_at,'phone',d.phone);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.sales_reps WHERE id=p_rep_id AND is_active) THEN
    why := 'unknown_rep';
  ELSIF EXISTS(SELECT 1 FROM public.lead_blacklist WHERE public.sales_journey_phone(phone)=k)
     OR EXISTS(SELECT 1 FROM public.meta_leads l WHERE public.sales_journey_phone(l.phone)=k AND
       (l.status IN('blacklisted','do_not_call','do_not_contact','wrong_number') OR EXISTS(SELECT 1 FROM public.lead_blacklist b WHERE lower(b.email)=lower(l.email)))) THEN
    why := 'do_not_call';
  END IF;
  IF actual_lead IS NULL AND p_clinic_id IS NULL THEN
    SELECT id INTO actual_lead FROM public.meta_leads WHERE public.sales_journey_phone(phone)=k ORDER BY updated_at DESC LIMIT 1;
  END IF;
  IF why='allowed' THEN
    -- Serialize only the short pool reservation, so concurrent reps cannot
    -- exhaust one number while other healthy numbers sit unused.
    PERFORM pg_advisory_xact_lock(hashtextextended('voice-number-pool',0));
    -- Preserve a familiar caller ID until it retires or reaches its rolling
    -- daily budget; then automatically rotate to the least-used eligible DID.
    SELECT r.caller_id INTO caller FROM public.voice_destination_routes r JOIN public.phone_numbers n ON n.number=r.caller_id AND n.status='active' WHERE r.phone=k AND (SELECT count(*) FROM public.call_records c WHERE c.from_number=n.number AND c.direction='outbound' AND c.status IS DISTINCT FROM 'blocked' AND c.called_at>=now()-interval '24 hours')<n.outbound_daily_limit;
    IF caller IS NULL THEN
      SELECT c.from_number INTO caller FROM public.call_records c JOIN public.phone_numbers n ON n.number=c.from_number AND n.status='active'
      WHERE public.sales_journey_phone(c.phone)=k AND coalesce(c.direction,'outbound')='outbound' AND (SELECT count(*) FROM public.call_records usage WHERE usage.from_number=n.number AND usage.direction='outbound' AND usage.status IS DISTINCT FROM 'blocked' AND usage.called_at>=now()-interval '24 hours')<n.outbound_daily_limit ORDER BY c.called_at DESC LIMIT 1;
    END IF;
    IF caller IS NULL THEN
      SELECT n.number INTO caller FROM public.phone_numbers n
        CROSS JOIN LATERAL (SELECT count(*) used FROM public.call_records c WHERE c.from_number=n.number AND c.direction='outbound' AND c.status IS DISTINCT FROM 'blocked' AND c.called_at>=now()-interval '24 hours') usage
        WHERE n.status='active' AND usage.used<n.outbound_daily_limit
        ORDER BY usage.used,n.last_used_at NULLS FIRST,md5(k||n.number),n.number LIMIT 1;
    END IF;
    IF caller IS NULL THEN why:='no_eligible_number';
    ELSE
      INSERT INTO public.voice_destination_routes(phone,caller_id) VALUES(k,caller) ON CONFLICT(phone) DO UPDATE SET caller_id=excluded.caller_id,updated_at=now();
    END IF;
  END IF;
  INSERT INTO public.voice_dial_decisions(call_sid,phone,caller_id,allowed,reason,retry_at)
    VALUES(p_call_sid,k,caller,why='allowed',why,retry);
  INSERT INTO public.call_records(twilio_call_sid,phone,from_number,rep_id,lead_id,clinic_id,direction,status)
    VALUES(p_call_sid,'+'||k,caller,p_rep_id,actual_lead,p_clinic_id,'outbound',CASE WHEN why='allowed' THEN 'initiated' ELSE 'blocked' END)
    ON CONFLICT(twilio_call_sid) DO UPDATE SET phone=excluded.phone,from_number=excluded.from_number,
      rep_id=excluded.rep_id,lead_id=coalesce(excluded.lead_id,call_records.lead_id),clinic_id=excluded.clinic_id,status=excluded.status;
  IF why='allowed' THEN UPDATE public.phone_numbers SET last_used_at=now(),call_count=call_count+1 WHERE number=caller; END IF;
  RETURN jsonb_build_object('allowed',why='allowed','reason',why,'caller_id',caller,'retry_at',retry,'phone',k);
END $$;
REVOKE ALL ON FUNCTION public.claim_outbound_call(text,text,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbound_call(text,text,uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_inbound_voice(p_phone text,p_call_sid text,p_to text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='3500ms' SET lock_timeout='1500ms' AS $$
DECLARE k text:=public.sales_journey_phone(p_phone); c public.call_records; reps uuid[]; lead uuid;
BEGIN
  SELECT * INTO c FROM public.call_records WHERE public.sales_journey_phone(phone)=k AND direction='outbound' AND status IS DISTINCT FROM 'blocked' ORDER BY called_at DESC LIMIT 1;
  SELECT array_agg(id ORDER BY CASE WHEN id=c.rep_id THEN 0 ELSE 1 END,id) INTO reps FROM (
    SELECT id FROM public.sales_reps WHERE is_active AND (id=c.rep_id OR role='admin') ORDER BY CASE WHEN id=c.rep_id THEN 0 ELSE 1 END,id LIMIT 10
  ) r;
  lead:=c.lead_id;
  IF lead IS NULL AND c.clinic_id IS NULL THEN
    SELECT id INTO lead FROM public.meta_leads WHERE public.sales_journey_phone(phone)=k ORDER BY updated_at DESC LIMIT 1;
  END IF;
  IF lead IS NULL AND c.clinic_id IS NULL THEN
    SELECT id INTO c.clinic_id FROM public.clinics WHERE public.sales_journey_phone(phone)=k LIMIT 1;
  END IF;
  INSERT INTO public.call_records(twilio_call_sid,phone,from_number,direction,status,rep_id,lead_id,clinic_id)
    VALUES(p_call_sid,p_phone,p_to,'inbound','ringing',reps[1],lead,c.clinic_id)
    ON CONFLICT(twilio_call_sid) DO NOTHING;
  RETURN jsonb_build_object('rep_ids',coalesce(to_jsonb(reps),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.resolve_inbound_voice(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_inbound_voice(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_voice_status(p_sid text,p_child_sid text,p_status text,p_sequence integer,p_duration integer,p_error text,p_sip text,p_recording_sid text,p_recording_url text,p_answered_rep uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.call_records; is_child boolean:=nullif(p_child_sid,'') IS NOT NULL; needs_analysis boolean:=false; accept_status boolean:=false;
BEGIN
  INSERT INTO public.call_records(twilio_call_sid) VALUES(p_sid) ON CONFLICT(twilio_call_sid) DO NOTHING;
  SELECT * INTO c FROM public.call_records WHERE twilio_call_sid=p_sid FOR UPDATE;
  IF c.status IS DISTINCT FROM 'blocked' AND nullif(p_status,'') IS NOT NULL THEN
    -- Parent browser completion is not evidence that the destination answered.
    accept_status := (is_child OR (c.voice_destination_sid IS NULL AND NOT EXISTS(SELECT 1 FROM public.voice_dial_decisions WHERE call_sid=p_sid)))
      AND (NOT is_child OR c.voice_status_sequence IS NULL OR p_sequence>c.voice_status_sequence)
      AND (coalesce(c.status,'initiated') NOT IN('completed','failed','busy','no-answer','canceled') OR p_status IN('completed','failed','busy','no-answer','canceled'));
    -- A new child leg (e.g. callback client) uses its own sequence.
    IF is_child AND c.voice_destination_sid IS DISTINCT FROM p_child_sid AND c.direction='inbound' THEN
      accept_status:=p_status IN('in-progress','completed') OR c.status IN('initiated','ringing');
    END IF;
  END IF;
  needs_analysis:=nullif(p_recording_url,'') IS NOT NULL AND c.recording_sid IS DISTINCT FROM p_recording_sid;
  UPDATE public.call_records SET
    status=CASE WHEN accept_status THEN p_status ELSE status END,
    duration=CASE WHEN accept_status AND p_duration IS NOT NULL THEN greatest(0,p_duration) ELSE duration END,
    duration_seconds=CASE WHEN accept_status AND p_duration IS NOT NULL THEN greatest(0,p_duration) ELSE duration_seconds END,
    voice_destination_sid=CASE WHEN is_child AND accept_status THEN p_child_sid ELSE voice_destination_sid END,
    voice_status_sequence=CASE WHEN is_child AND accept_status THEN p_sequence ELSE voice_status_sequence END,
    voice_error_code=CASE WHEN accept_status THEN nullif(p_error,'') ELSE voice_error_code END,
    voice_sip_response=CASE WHEN accept_status THEN nullif(p_sip,'') ELSE voice_sip_response END,
    rep_id=CASE WHEN direction='inbound' AND accept_status AND p_status IN('in-progress','completed') THEN coalesce(p_answered_rep,rep_id) ELSE rep_id END,
    recording_sid=CASE WHEN needs_analysis THEN p_recording_sid ELSE recording_sid END,
    recording_url=CASE WHEN needs_analysis THEN p_recording_url ELSE recording_url END,
    analysis_stage=CASE WHEN needs_analysis THEN 'transcribing' ELSE analysis_stage END
  WHERE id=c.id;
  RETURN jsonb_build_object('id',c.id,'clinic_id',c.clinic_id,'lead_id',c.lead_id,'analyse',needs_analysis);
END $$;
REVOKE ALL ON FUNCTION public.apply_voice_status(text,text,text,integer,integer,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_voice_status(text,text,text,integer,integer,text,text,text,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_voice_number_health()
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
    INSERT INTO public.error_logs(function_name,error_message,context) VALUES('voice-pool','Fewer than three active caller IDs remain.',jsonb_build_object('active_numbers',remaining,'action','Replenishment requires an approved purchase budget; no number is bought or released automatically.'));
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
    INSERT INTO public.voice_number_health VALUES(r.number,now(),r.attempts,r.connected,r.failures,r.baseline_rate,warning,r.signals)
      ON CONFLICT(number) DO UPDATE SET checked_at=excluded.checked_at,attempts_7d=excluded.attempts_7d,connected_15s_7d=excluded.connected_15s_7d,failures_7d=excluded.failures_7d,baseline_connected_rate=excluded.baseline_connected_rate,alert=excluded.alert,transcript_signals=excluded.transcript_signals;
  END LOOP;
  -- Reconcile the legacy counters from actual call history, not SMS selection.
  UPDATE public.phone_numbers n SET call_count=x.n,last_used_at=x.last_call FROM (
    SELECT from_number,count(*)::int n,max(called_at) last_call FROM public.call_records WHERE direction='outbound' AND status IS DISTINCT FROM 'blocked' GROUP BY from_number
  ) x WHERE n.number=x.from_number;
END $$;
REVOKE ALL ON FUNCTION public.refresh_voice_number_health() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_voice_number_health() TO service_role;

-- Deployment scheduling: apply after the core schema and signed webhooks are deployed.
SELECT cron.schedule('voice-reputation-hourly','17 * * * *','SELECT public.refresh_voice_number_health()');
SELECT public.refresh_voice_number_health();
