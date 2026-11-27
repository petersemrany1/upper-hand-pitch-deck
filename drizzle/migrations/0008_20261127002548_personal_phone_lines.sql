-- Personal lines are separate leases, never members of the rotating pool.
-- Managed Auth IDs are verified at assignment, without cross-schema foreign
-- keys (Lovable Cloud owns auth.users and prohibits external FKs into it).
CREATE TABLE public.personal_phone_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  rep_id uuid NOT NULL UNIQUE REFERENCES public.sales_reps(id),
  number text NOT NULL UNIQUE CHECK (number ~ '^\+614[0-9]{8}$'),
  twilio_sid text NOT NULL UNIQUE CHECK (twilio_sid ~ '^PN[0-9a-fA-F]{32}$'),
  enabled boolean NOT NULL DEFAULT true,
  mms_enabled boolean NOT NULL DEFAULT true,
  outbound_daily_limit integer NOT NULL DEFAULT 80 CHECK (outbound_daily_limit BETWEEN 10 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_phone_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.personal_phone_lines FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.personal_phone_lines TO authenticated;
GRANT ALL ON public.personal_phone_lines TO service_role;
CREATE POLICY personal_line_owner ON public.personal_phone_lines FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.validate_personal_phone_line() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM phone_numbers WHERE number=NEW.number) THEN
    RAISE EXCEPTION 'A shared or retired pool number cannot become a personal line';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sales_reps r JOIN auth.users u ON u.id=NEW.user_id
    WHERE r.id=NEW.rep_id AND r.is_active AND (r.id=u.id OR lower(r.email)=lower(u.email))) THEN
    RAISE EXCEPTION 'The personal line must belong to the verified active account';
  END IF;
  IF TG_OP='UPDATE' AND (NEW.user_id,NEW.rep_id,NEW.number,NEW.twilio_sid)
      IS DISTINCT FROM (OLD.user_id,OLD.rep_id,OLD.number,OLD.twilio_sid) THEN
    RAISE EXCEPTION 'Personal line ownership and provider identity are permanent';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_personal_phone_line BEFORE INSERT OR UPDATE ON personal_phone_lines
FOR EACH ROW EXECUTE FUNCTION validate_personal_phone_line();

CREATE FUNCTION public.my_personal_sms_sender(p_mms boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE line personal_phone_lines;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO line FROM personal_phone_lines WHERE user_id=auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT line.enabled OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=line.user_id) OR NOT EXISTS(SELECT 1 FROM sales_reps WHERE id=line.rep_id AND is_active) THEN
    RAISE EXCEPTION 'Your personal line is unavailable; no shared number will be substituted';
  END IF;
  IF p_mms AND NOT line.mms_enabled THEN RAISE EXCEPTION 'Your personal line does not support images'; END IF;
  RETURN line.number;
END $$;
REVOKE ALL ON FUNCTION public.my_personal_sms_sender(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_personal_sms_sender(boolean) TO authenticated;

-- Keep the original single conversation per contact. Participation controls
-- notifications only; messages and conversation history are never split/moved.
CREATE TABLE public.sms_thread_participants (
  thread_id uuid NOT NULL REFERENCES sms_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  first_involved_at timestamptz NOT NULL DEFAULT now(),
  last_involved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id,user_id)
);
CREATE INDEX sms_participants_user_thread ON sms_thread_participants(user_id,thread_id);
ALTER TABLE sms_thread_participants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sms_thread_participants FROM PUBLIC,anon,authenticated;
GRANT SELECT ON sms_thread_participants TO authenticated;
GRANT ALL ON sms_thread_participants TO service_role;
CREATE POLICY own_conversation_participation ON sms_thread_participants FOR SELECT TO authenticated
  USING(user_id=(SELECT auth.uid()));
ALTER TABLE sms_messages ADD COLUMN sender_user_id uuid;

CREATE FUNCTION public.ensure_sms_thread(p_phone text,p_local_number text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET lock_timeout='1500ms' AS $$
DECLARE thread uuid; normalized text:=public.sales_journey_phone(p_phone);
BEGIN
  IF normalized IS NULL OR normalized='' THEN RAISE EXCEPTION 'Recipient phone required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('sms-thread:'||normalized,0));
  SELECT id INTO thread FROM sms_threads WHERE public.sales_journey_phone(phone)=normalized ORDER BY created_at LIMIT 1;
  IF thread IS NULL THEN INSERT INTO sms_threads(phone) VALUES('+'||normalized) RETURNING id INTO thread; END IF;
  RETURN thread;
END $$;
REVOKE ALL ON FUNCTION public.ensure_sms_thread(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_sms_thread(text,text) TO service_role;

CREATE FUNCTION public.record_message_participation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM personal_phone_lines
  WHERE number=CASE WHEN NEW.direction='inbound' THEN NEW.to_number ELSE NEW.from_number END;
  -- Only a trusted server writer can attribute an outgoing send to another user.
  IF NEW.sender_user_id IS NOT NULL AND auth.uid() IS NOT NULL AND NEW.sender_user_id<>auth.uid() THEN
    RAISE EXCEPTION 'Message sender does not match the authenticated user';
  END IF;
  IF NEW.direction='outbound' AND NEW.sender_user_id IS NOT NULL THEN
    INSERT INTO sms_thread_participants(thread_id,user_id) VALUES(NEW.thread_id,NEW.sender_user_id)
    ON CONFLICT(thread_id,user_id) DO UPDATE SET last_involved_at=now();
  END IF;
  IF owner_id IS NOT NULL THEN
    INSERT INTO sms_thread_participants(thread_id,user_id) VALUES(NEW.thread_id,owner_id)
    ON CONFLICT(thread_id,user_id) DO UPDATE SET last_involved_at=now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER record_message_participation AFTER INSERT ON sms_messages
FOR EACH ROW EXECUTE FUNCTION record_message_participation();

CREATE FUNCTION public.record_call_participation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.rep_id IS NOT NULL AND NEW.status IS DISTINCT FROM 'blocked' THEN
    INSERT INTO sms_thread_participants(thread_id,user_id)
    SELECT t.id,u.id FROM sms_threads t JOIN sales_reps r ON r.id=NEW.rep_id
      JOIN auth.users u ON u.id=r.id OR lower(u.email)=lower(r.email)
    WHERE public.sales_journey_phone(t.phone)=public.sales_journey_phone(NEW.phone)
    ON CONFLICT(thread_id,user_id) DO UPDATE SET last_involved_at=now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER record_call_participation AFTER INSERT OR UPDATE OF rep_id,phone ON call_records
FOR EACH ROW EXECUTE FUNCTION record_call_participation();

CREATE FUNCTION public.restore_conversation_participants() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO sms_thread_participants(thread_id,user_id,first_involved_at,last_involved_at)
  SELECT NEW.id,u.id,min(c.called_at),max(c.called_at)
    FROM call_records c JOIN sales_reps r ON r.id=c.rep_id
    JOIN auth.users u ON u.id=r.id OR lower(u.email)=lower(r.email)
    WHERE public.sales_journey_phone(c.phone)=public.sales_journey_phone(NEW.phone) AND c.status IS DISTINCT FROM 'blocked'
    GROUP BY u.id ON CONFLICT(thread_id,user_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER restore_conversation_participants AFTER INSERT ON sms_threads
FOR EACH ROW EXECUTE FUNCTION restore_conversation_participants();

-- Existing callers remain participants in existing conversations. No messages
-- are altered, copied, deleted or marked read by this backfill.
INSERT INTO sms_thread_participants(thread_id,user_id,first_involved_at,last_involved_at)
SELECT t.id,u.id,min(c.called_at),max(c.called_at)
FROM sms_threads t JOIN call_records c ON public.sales_journey_phone(c.phone)=public.sales_journey_phone(t.phone)
JOIN sales_reps r ON r.id=c.rep_id JOIN auth.users u ON u.id=r.id OR lower(u.email)=lower(r.email)
WHERE c.status IS DISTINCT FROM 'blocked' GROUP BY t.id,u.id
ON CONFLICT(thread_id,user_id) DO NOTHING;

REVOKE ALL ON FUNCTION public.validate_personal_phone_line(),public.record_message_participation(),public.record_call_participation(),public.restore_conversation_participants() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.claim_outbound_call(p_call_sid text,p_phone text,p_rep_id uuid,p_lead_id uuid DEFAULT NULL,p_clinic_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='3500ms' SET lock_timeout='1500ms' AS $$
DECLARE k text := public.sales_journey_phone(p_phone); d public.voice_dial_decisions;
  caller text; personal public.personal_phone_lines;
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
    IF d.allowed AND NOT EXISTS(SELECT 1 FROM public.phone_numbers WHERE number=d.caller_id AND status='active') AND NOT EXISTS(SELECT 1 FROM public.personal_phone_lines WHERE number=d.caller_id AND rep_id=p_rep_id AND enabled AND EXISTS(SELECT 1 FROM auth.users WHERE id=personal_phone_lines.user_id) AND EXISTS(SELECT 1 FROM sales_reps WHERE id=p_rep_id AND is_active)) THEN
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
  SELECT * INTO personal FROM public.personal_phone_lines WHERE rep_id=p_rep_id;
  IF why='allowed' AND personal.id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('personal-voice:'||personal.id::text,0));
    IF NOT personal.enabled OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=personal.user_id) THEN why:='personal_line_unavailable';
    ELSIF (SELECT count(*) FROM call_records WHERE from_number=personal.number AND direction='outbound' AND status IS DISTINCT FROM 'blocked' AND called_at>=now()-interval '24 hours') >= personal.outbound_daily_limit THEN why:='personal_line_daily_limit';
    ELSE caller:=personal.number;
    END IF;
  END IF;
  IF why='allowed' AND personal.id IS NULL THEN
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


-- Known callbacks belong to the most recent caller. Admin reception remains
-- for callers without a rep; a busy/unavailable rep does not fan out to admins.
CREATE OR REPLACE FUNCTION public.resolve_inbound_voice(p_phone text,p_call_sid text,p_to text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='3500ms' SET lock_timeout='1500ms' AS $$
DECLARE k text:=public.sales_journey_phone(p_phone); c public.call_records; reps uuid[]; lead uuid; personal public.personal_phone_lines;
BEGIN
  SELECT * INTO personal FROM public.personal_phone_lines WHERE number=p_to;
  SELECT * INTO c FROM public.call_records WHERE (personal.id IS NULL OR from_number=personal.number) AND public.sales_journey_phone(phone)=k AND direction='outbound' AND status IS DISTINCT FROM 'blocked' ORDER BY called_at DESC LIMIT 1;
  SELECT array_agg(id ORDER BY CASE WHEN id=c.rep_id THEN 0 ELSE 1 END,id) INTO reps FROM (
    SELECT id FROM public.sales_reps WHERE is_active AND (id=c.rep_id OR (c.rep_id IS NULL AND role='admin')) ORDER BY CASE WHEN id=c.rep_id THEN 0 ELSE 1 END,id LIMIT 10
  ) r;
  IF personal.id IS NOT NULL THEN
    SELECT array_agg(id) INTO reps FROM sales_reps WHERE id=personal.rep_id AND is_active AND personal.enabled AND EXISTS(SELECT 1 FROM auth.users WHERE id=personal.user_id);
    c.rep_id:=personal.rep_id;
  END IF;
  lead:=c.lead_id;
  IF lead IS NULL AND c.clinic_id IS NULL THEN
    SELECT id INTO lead FROM public.meta_leads WHERE public.sales_journey_phone(phone)=k ORDER BY updated_at DESC LIMIT 1;
  END IF;
  IF lead IS NULL AND c.clinic_id IS NULL THEN
    SELECT id INTO c.clinic_id FROM public.clinics WHERE public.sales_journey_phone(phone)=k LIMIT 1;
  END IF;
  INSERT INTO public.call_records(twilio_call_sid,phone,from_number,direction,status,rep_id,lead_id,clinic_id)
    VALUES(p_call_sid,p_phone,p_to,'inbound',CASE WHEN coalesce(cardinality(reps),0)>0 THEN 'ringing' ELSE 'no-answer' END,coalesce(c.rep_id,reps[1]),lead,c.clinic_id)
    ON CONFLICT(twilio_call_sid) DO NOTHING;
  RETURN jsonb_build_object('rep_ids',coalesce(to_jsonb(reps),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.resolve_inbound_voice(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_inbound_voice(text,text,text) TO service_role;


-- Unread state is per person, independent of the shared inbox read flag.
CREATE INDEX IF NOT EXISTS sms_inbound_thread_time ON sms_messages(thread_id,created_at DESC) WHERE direction='inbound';
CREATE FUNCTION public.my_involved_sms_notifications()
RETURNS TABLE(thread_id uuid,phone text,display_name text,clinic_name text,unread_count bigint,last_message_preview text,last_message_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
  SELECT t.id,t.phone,t.display_name,c.clinic_name,unread.total,latest.body,latest.created_at
  FROM sms_thread_participants p JOIN sms_threads t ON t.id=p.thread_id
  LEFT JOIN clinics c ON c.id=t.clinic_id
  LEFT JOIN notification_acknowledgements a ON a.user_id=p.user_id AND a.notification_type='sms_thread' AND a.notification_key=t.id::text
  CROSS JOIN LATERAL (
    SELECT count(*) AS total FROM sms_messages m WHERE m.thread_id=t.id AND m.direction='inbound'
      AND m.created_at>=p.first_involved_at AND m.created_at>coalesce(a.acknowledged_at,'-infinity'::timestamptz)
  ) unread
  CROSS JOIN LATERAL (
    SELECT m.body,m.created_at FROM sms_messages m WHERE m.thread_id=t.id AND m.direction='inbound' ORDER BY m.created_at DESC,m.id LIMIT 1
  ) latest
  WHERE p.user_id=(SELECT auth.uid()) AND unread.total>0
  ORDER BY latest.created_at DESC LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.my_involved_sms_notifications() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_involved_sms_notifications() TO authenticated;
