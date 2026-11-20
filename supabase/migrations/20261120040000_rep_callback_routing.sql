-- Known callbacks belong to the most recent caller. Admin reception remains
-- for callers without a rep; a busy/unavailable rep does not fan out to admins.
CREATE OR REPLACE FUNCTION public.resolve_inbound_voice(p_phone text,p_call_sid text,p_to text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='3500ms' SET lock_timeout='1500ms' AS $$
DECLARE k text:=public.sales_journey_phone(p_phone); c public.call_records; reps uuid[]; lead uuid;
BEGIN
  SELECT * INTO c FROM public.call_records WHERE public.sales_journey_phone(phone)=k AND direction='outbound' AND status IS DISTINCT FROM 'blocked' ORDER BY called_at DESC LIMIT 1;
  SELECT array_agg(id ORDER BY CASE WHEN id=c.rep_id THEN 0 ELSE 1 END,id) INTO reps FROM (
    SELECT id FROM public.sales_reps WHERE is_active AND (id=c.rep_id OR (c.rep_id IS NULL AND role='admin')) ORDER BY CASE WHEN id=c.rep_id THEN 0 ELSE 1 END,id LIMIT 10
  ) r;
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

CREATE OR REPLACE FUNCTION public.apply_voice_status(p_sid text,p_child_sid text,p_status text,p_sequence integer,p_duration integer,p_error text,p_sip text,p_recording_sid text,p_recording_url text,p_answered_rep uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.call_records; is_child boolean:=nullif(p_child_sid,'') IS NOT NULL; needs_analysis boolean:=false; accept_status boolean:=false;
BEGIN
  INSERT INTO public.call_records(twilio_call_sid) VALUES(p_sid) ON CONFLICT(twilio_call_sid) DO NOTHING;
  SELECT * INTO c FROM public.call_records WHERE twilio_call_sid=p_sid FOR UPDATE;
  IF c.status IS DISTINCT FROM 'blocked' AND nullif(p_status,'') IS NOT NULL THEN
    -- Parent completion (including voicemail) is not evidence a rep answered.
    -- Inbound client callbacks own the result, even if the parent arrives first.
    accept_status := (is_child OR (c.direction IS DISTINCT FROM 'inbound' AND c.voice_destination_sid IS NULL AND NOT EXISTS(SELECT 1 FROM public.voice_dial_decisions WHERE call_sid=p_sid)))
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

