-- Only the isolated phone-test table. Live camera frames are never stored.
BEGIN;
ALTER TABLE public.norwood_preview_assessments
  ADD COLUMN framing_consented_at timestamptz,
  ADD COLUMN framing_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN framing_checked_at timestamptz;
CREATE FUNCTION public.consent_norwood_preview_camera(p_hash text)
RETURNS public.norwood_preview_assessments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.norwood_preview_assessments;
BEGIN
  s := public.norwood_preview_patient_action(p_hash,'consent');
  UPDATE public.norwood_preview_assessments SET framing_consented_at=coalesce(framing_consented_at,now()) WHERE id=s.id RETURNING * INTO s;
  RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.consent_norwood_preview_camera(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consent_norwood_preview_camera(text) TO service_role;
CREATE FUNCTION public.reserve_norwood_preview_frame(p_hash text, p_view text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.norwood_preview_assessments;
BEGIN
  SELECT * INTO s FROM public.norwood_preview_assessments WHERE token_hash=p_hash FOR UPDATE;
  IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at<=now() OR s.status NOT IN ('sent','opened') THEN
    RAISE EXCEPTION 'This link has expired or is unavailable. Ask your advisor for a new link.';
  END IF;
  IF s.consented_at IS NULL OR s.framing_consented_at IS NULL THEN RAISE EXCEPTION 'Please agree before opening the camera.'; END IF;
  IF p_view IS NULL OR p_view NOT IN ('front','top','crown','left','right') OR s.photos ? p_view THEN
    RAISE EXCEPTION 'Refresh the photo step before continuing.';
  END IF;
  IF s.framing_attempts >= 120 THEN RAISE EXCEPTION 'Please ask your advisor for a new link.'; END IF;
  IF s.framing_checked_at > now()-interval '3 seconds' THEN RETURN false; END IF;
  UPDATE public.norwood_preview_assessments SET framing_attempts=framing_attempts+1,framing_checked_at=now() WHERE id=s.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_norwood_preview_frame(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_norwood_preview_frame(text,text) TO service_role;
COMMIT;
