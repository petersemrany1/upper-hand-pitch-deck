-- Isolated phone test: only the two existing sandbox leads. No live-lead writes.
BEGIN;
-- Patient bearer links are hashed. Only the application server can use them.
CREATE TABLE public.norwood_preview_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.meta_leads(id) ON DELETE CASCADE CHECK (lead_id IN ('5e70f557-73ce-4bb7-a11a-6b718dbd092f','b2828129-1c28-4502-927a-11f43a0a8473')),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id),
  clinic_name text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.sales_reps(id),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  revoked_at timestamptz,
  opened_at timestamptz,
  consented_at timestamptz,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent','opened','photos_in','analysing','ready','failed','send_failed')),
  sms_sid text,
  photos jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(photos) = 'object'),
  upload_attempts integer NOT NULL DEFAULT 0,
  analysis_attempts integer NOT NULL DEFAULT 0,
  analysis_started_at timestamptz,
  analysis_run uuid,
  ai_norwood smallint CHECK (ai_norwood BETWEEN 1 AND 7),
  ai_confidence text CHECK (ai_confidence IN ('low','medium','high')),
  ai_reason text,
  ai_observations jsonb,
  photo_problems jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  prompt_version text,
  result_at timestamptz,
  final_norwood smallint CHECK (final_norwood BETWEEN 1 AND 7),
  reviewed_by uuid REFERENCES public.sales_reps(id),
  reviewed_at timestamptz
);
CREATE INDEX norwood_preview_assessments_lead_created ON public.norwood_preview_assessments(lead_id, created_at DESC);
CREATE UNIQUE INDEX norwood_preview_one_active_link ON public.norwood_preview_assessments(lead_id) WHERE revoked_at IS NULL;
ALTER TABLE public.norwood_preview_assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.norwood_preview_assessments FROM anon, authenticated;
GRANT SELECT ON public.norwood_preview_assessments TO authenticated;
GRANT ALL ON public.norwood_preview_assessments TO service_role;
CREATE POLICY "Sales staff read Norwood assessments" ON public.norwood_preview_assessments
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.booking_sales_actor()));

-- Preserve changes to the rep's judgement without overwriting the AI output.
CREATE TABLE public.norwood_preview_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.norwood_preview_assessments(id) ON DELETE CASCADE,
  norwood smallint NOT NULL CHECK (norwood BETWEEN 1 AND 7),
  rep_id uuid NOT NULL REFERENCES public.sales_reps(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.norwood_preview_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.norwood_preview_reviews FROM anon, authenticated;
GRANT SELECT ON public.norwood_preview_reviews TO authenticated;
GRANT ALL ON public.norwood_preview_reviews TO service_role;
CREATE POLICY "Sales staff read Norwood reviews" ON public.norwood_preview_reviews
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.booking_sales_actor()));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('norwood-preview-photos','norwood-preview-photos',false,2097152,ARRAY['image/jpeg'])
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=2097152, allowed_mime_types=ARRAY['image/jpeg'];
-- Restrictive policy protects this bucket even if older broad storage policies exist.
-- All uploads/downloads/signing go through the role-checked application server.
CREATE POLICY "Norwood preview images require server access" ON storage.objects AS RESTRICTIVE
  FOR ALL TO public USING (bucket_id <> 'norwood-preview-photos') WITH CHECK (bucket_id <> 'norwood-preview-photos');

CREATE FUNCTION public.create_norwood_preview(p_lead uuid, p_clinic uuid, p_rep uuid, p_hash text)
RETURNS public.norwood_preview_assessments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.norwood_preview_assessments; clinic_label text;
BEGIN
  IF p_lead IS NULL OR p_lead NOT IN ('5e70f557-73ce-4bb7-a11a-6b718dbd092f','b2828129-1c28-4502-927a-11f43a0a8473') THEN RAISE EXCEPTION 'Test leads only'; END IF;
  PERFORM 1 FROM public.meta_leads WHERE id=p_lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF EXISTS(SELECT 1 FROM public.norwood_preview_assessments WHERE lead_id=p_lead AND created_at>now()-interval '60 seconds') THEN
    RAISE EXCEPTION 'Please wait a minute before sending another link';
  END IF;
  SELECT clinic_name INTO clinic_label FROM public.partner_clinics WHERE id=p_clinic AND is_active;
  IF clinic_label IS NULL THEN RAISE EXCEPTION 'Select an active clinic'; END IF;
  UPDATE public.norwood_preview_assessments SET revoked_at=now() WHERE lead_id=p_lead AND revoked_at IS NULL;
  INSERT INTO public.norwood_preview_assessments(lead_id,clinic_id,clinic_name,created_by,token_hash)
    VALUES(p_lead,p_clinic,clinic_label,p_rep,p_hash) RETURNING * INTO s;
  RETURN s;
END $$;

-- Serialise uploads and analysis. Late uploads cannot mutate an analysis snapshot;
-- a run ID fences off late model responses after a retry.
CREATE FUNCTION public.norwood_preview_patient_action(p_hash text,p_action text,p_view text DEFAULT NULL,p_photo jsonb DEFAULT NULL)
RETURNS public.norwood_preview_assessments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.norwood_preview_assessments;
BEGIN
  SELECT * INTO s FROM public.norwood_preview_assessments WHERE token_hash=p_hash FOR UPDATE;
  IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at<=now() OR s.status IN ('sending','send_failed') THEN
    RAISE EXCEPTION 'This link has expired or is unavailable. Ask your advisor for a new link.';
  END IF;
  IF p_action='open' THEN
    UPDATE public.norwood_preview_assessments SET opened_at=coalesce(opened_at,now()),status=CASE WHEN status='sent' THEN 'opened' ELSE status END WHERE id=s.id;
  ELSIF p_action='consent' THEN
    UPDATE public.norwood_preview_assessments SET consented_at=coalesce(consented_at,now()) WHERE id=s.id;
  ELSIF p_action IN ('reserve_upload','photo') THEN
    IF s.consented_at IS NULL OR s.status NOT IN ('sent','opened','photos_in') THEN RAISE EXCEPTION 'Photos cannot be changed now'; END IF;
    IF p_action='reserve_upload' THEN
      IF s.upload_attempts>=30 THEN RAISE EXCEPTION 'Please ask your advisor for a new link'; END IF;
      UPDATE public.norwood_preview_assessments SET upload_attempts=upload_attempts+1 WHERE id=s.id;
    ELSE
      IF p_view IS NULL OR p_view NOT IN ('front','top','crown','left','right') OR p_photo IS NULL
        OR coalesce(p_photo->>'path','') NOT LIKE s.id::text || '/%'
        OR coalesce(p_photo->>'sha256','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid photo'; END IF;
      IF EXISTS(SELECT 1 FROM jsonb_each(s.photos) p WHERE p.key<>p_view AND p.value->>'sha256'=p_photo->>'sha256') THEN
        RAISE EXCEPTION 'Please take a different photo for each angle';
      END IF;
      s.photos=jsonb_set(s.photos,ARRAY[p_view],p_photo);
      UPDATE public.norwood_preview_assessments SET photos=s.photos,
        status=CASE WHEN s.photos ?& ARRAY['front','top','crown','left','right'] THEN 'photos_in' ELSE 'opened' END WHERE id=s.id;
    END IF;
  ELSIF p_action='analyse' THEN
    IF s.status='ready' THEN RETURN s; END IF;
    IF s.consented_at IS NULL OR NOT(s.photos ?& ARRAY['front','top','crown','left','right']) THEN RAISE EXCEPTION 'All five photos are required'; END IF;
    IF s.status='analysing' AND s.analysis_started_at>now()-interval '90 seconds' THEN RETURN s; END IF;
    IF s.analysis_attempts>=3 THEN RAISE EXCEPTION 'Please ask your advisor to review the photos'; END IF;
    UPDATE public.norwood_preview_assessments SET status='analysing',analysis_started_at=now(),
      analysis_attempts=analysis_attempts+1,analysis_run=(p_photo->>'run')::uuid WHERE id=s.id;
  ELSE RAISE EXCEPTION 'Unsupported action';
  END IF;
  SELECT * INTO s FROM public.norwood_preview_assessments WHERE id=s.id;
  RETURN s;
END $$;

-- Called with the authenticated user's JWT, never a client-provided rep identity.
-- The existing booking gate/expectations check still applies after this save.
CREATE FUNCTION public.confirm_norwood_preview(p_assessment uuid,p_lead uuid,p_norwood integer,p_expectations boolean DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor record; s public.norwood_preview_assessments;
BEGIN
  SELECT * INTO actor FROM public.booking_sales_actor();
  IF actor.id IS NULL THEN RAISE EXCEPTION 'Sales access required'; END IF;
  IF p_norwood IS NULL OR p_norwood NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'Invalid Norwood number'; END IF;
  SELECT * INTO s FROM public.norwood_preview_assessments WHERE id=p_assessment AND lead_id=p_lead FOR UPDATE;
  IF NOT FOUND OR s.status<>'ready' OR s.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Refresh the assessment before confirming'; END IF;
  -- The existing selector saves the test lead. This RPC records the independent audit only.
  IF s.final_norwood IS DISTINCT FROM p_norwood OR s.reviewed_by IS DISTINCT FROM actor.id THEN
    INSERT INTO public.norwood_preview_reviews(assessment_id,norwood,rep_id) VALUES(s.id,p_norwood,actor.id);
  END IF;
  UPDATE public.norwood_preview_assessments SET final_norwood=p_norwood,reviewed_by=actor.id,reviewed_at=now() WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.create_norwood_preview(uuid,uuid,uuid,text),public.norwood_preview_patient_action(text,text,text,jsonb),public.confirm_norwood_preview(uuid,uuid,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_norwood_preview(uuid,uuid,uuid,text),public.norwood_preview_patient_action(text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_norwood_preview(uuid,uuid,integer,boolean) TO authenticated;

-- Staff-only comparison. Agreement with a rep is not clinical accuracy.
CREATE VIEW public.norwood_preview_comparison WITH (security_invoker=true) AS
SELECT id,lead_id,clinic_id,created_at,model,prompt_version,ai_norwood,ai_confidence,
  final_norwood,reviewed_by,reviewed_at,
  CASE WHEN final_norwood IS NOT NULL THEN ai_norwood=final_norwood END AS exact_agreement,
  abs(ai_norwood-final_norwood) AS stage_difference
FROM public.norwood_preview_assessments WHERE status='ready';
REVOKE ALL ON public.norwood_preview_comparison FROM anon,authenticated;
GRANT SELECT ON public.norwood_preview_comparison TO authenticated;

COMMIT;
