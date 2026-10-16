-- Preview-only video signalling. No video, audio or photographs in this table.
BEGIN;
CREATE TABLE public.norwood_preview_live (
 assessment_id uuid PRIMARY KEY REFERENCES public.norwood_preview_assessments(id) ON DELETE CASCADE,
 room_id uuid NOT NULL DEFAULT gen_random_uuid(), patient_client uuid NOT NULL,
 rep_id uuid REFERENCES public.sales_reps(id), rep_client uuid,
 consented_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 patient_seen timestamptz NOT NULL DEFAULT now(), rep_seen timestamptz,
 ended boolean NOT NULL DEFAULT false, starts integer NOT NULL DEFAULT 1,
 offer text CHECK(length(offer)<30000), answer text CHECK(length(answer)<30000)
);
ALTER TABLE public.norwood_preview_live ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.norwood_preview_live FROM public,anon,authenticated;
GRANT ALL ON public.norwood_preview_live TO service_role;
CREATE FUNCTION public.norwood_preview_live_action(p_assessment uuid,p_role text,p_action text,p_client uuid,p_room uuid DEFAULT NULL,p_rep uuid DEFAULT NULL,p_sdp text DEFAULT NULL)
RETURNS public.norwood_preview_live LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.norwood_preview_assessments; r public.norwood_preview_live;
BEGIN
 SELECT * INTO a FROM public.norwood_preview_assessments WHERE id=p_assessment FOR UPDATE;
 IF NOT FOUND OR a.revoked_at IS NOT NULL OR a.expires_at<=now() OR a.status NOT IN ('sent','opened') OR a.consented_at IS NULL OR a.framing_consented_at IS NULL THEN RAISE EXCEPTION 'This camera session is unavailable. Ask your advisor for a fresh link.'; END IF;
 IF p_role NOT IN ('patient','rep') OR p_client IS NULL THEN RAISE EXCEPTION 'Invalid camera request'; END IF;
 -- Expired SDP is discarded on subsequent live-service activity.
 UPDATE public.norwood_preview_live SET offer=NULL,answer=NULL,ended=true WHERE expires_at<=now() AND NOT ended;
 SELECT * INTO r FROM public.norwood_preview_live WHERE assessment_id=a.id FOR UPDATE;
 IF p_action='start' AND p_role='patient' THEN
  IF r.assessment_id IS NOT NULL AND r.starts>=12 THEN RAISE EXCEPTION 'Please ask your advisor for a fresh link.'; END IF;
  IF r.assessment_id IS NOT NULL AND NOT r.ended AND r.patient_seen>now()-interval '15 seconds' AND r.patient_client<>p_client THEN RAISE EXCEPTION 'Your camera is already open in another tab.'; END IF;
  INSERT INTO public.norwood_preview_live(assessment_id,patient_client,expires_at) VALUES(a.id,p_client,least(a.expires_at,now()+interval '10 minutes'))
  ON CONFLICT(assessment_id) DO UPDATE SET room_id=gen_random_uuid(),patient_client=p_client,rep_id=NULL,rep_client=NULL,consented_at=now(),expires_at=least(a.expires_at,now()+interval '10 minutes'),patient_seen=now(),rep_seen=NULL,ended=false,starts=norwood_preview_live.starts+1,offer=NULL,answer=NULL RETURNING * INTO r;
 ELSIF p_action='find' AND p_role='rep' THEN
  IF r.ended OR r.expires_at<=now() OR r.patient_seen<now()-interval '15 seconds' THEN RETURN NULL; END IF;
 ELSIF r.assessment_id IS NULL OR r.room_id IS DISTINCT FROM p_room OR r.ended OR r.expires_at<=now() THEN RAISE EXCEPTION 'Camera sharing stopped. Connect again.';
 ELSIF p_action='join' AND p_role='rep' THEN
  IF p_rep IS NULL OR r.patient_seen<now()-interval '15 seconds' THEN RAISE EXCEPTION 'Wait for the patient to share their camera.'; END IF;
  IF r.rep_client IS NOT NULL AND r.rep_client<>p_client THEN RAISE EXCEPTION 'An advisor already joined. Ask the patient to stop and share again.'; END IF;
  UPDATE public.norwood_preview_live SET rep_id=p_rep,rep_client=p_client,rep_seen=now() WHERE assessment_id=a.id RETURNING * INTO r;
 ELSE
  IF (p_role='patient' AND r.patient_client<>p_client) OR (p_role='rep' AND (r.rep_client IS DISTINCT FROM p_client OR r.rep_id IS DISTINCT FROM p_rep)) THEN RAISE EXCEPTION 'Camera access required'; END IF;
  IF p_action='stop' THEN
   UPDATE public.norwood_preview_live SET ended=true,offer=NULL,answer=NULL WHERE assessment_id=a.id RETURNING * INTO r;
  ELSIF p_action IN ('poll','sdp') THEN
   IF p_action='sdp' AND (p_sdp IS NULL OR length(p_sdp)>29999 OR p_sdp NOT LIKE 'v=0%') THEN RAISE EXCEPTION 'Invalid camera connection'; END IF;
   IF p_action='sdp' AND ((p_role='patient' AND r.offer IS NOT NULL AND r.offer<>p_sdp) OR (p_role='rep' AND r.answer IS NOT NULL AND r.answer<>p_sdp)) THEN RAISE EXCEPTION 'Connect the camera again.'; END IF;
   UPDATE public.norwood_preview_live SET patient_seen=CASE WHEN p_role='patient' THEN now() ELSE patient_seen END,rep_seen=CASE WHEN p_role='rep' THEN now() ELSE rep_seen END,
    offer=CASE WHEN p_action='sdp' AND p_role='patient' THEN p_sdp ELSE offer END,
    answer=CASE WHEN p_action='sdp' AND p_role='rep' THEN p_sdp ELSE answer END WHERE assessment_id=a.id RETURNING * INTO r;
  ELSE RAISE EXCEPTION 'Invalid camera action'; END IF;
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.norwood_preview_live_action(uuid,text,text,uuid,uuid,uuid,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.norwood_preview_live_action(uuid,text,text,uuid,uuid,uuid,text) TO service_role;
COMMIT;
