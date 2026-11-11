-- Isolated, additive infrastructure for the administrator Meta Ads wizard.
CREATE TABLE IF NOT EXISTS public.meta_ads_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL DEFAULT 'Untitled batch',
  config jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','running','complete','needs_attention','cancelled')),
  requested_mode text CHECK (requested_mode IN ('PAUSED','ACTIVE')),
  progress jsonb NOT NULL DEFAULT '{"items":{}}',
  error text,
  review_hash text,
  review_plan jsonb,
  review_expires_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  pause_requested boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meta_ads_drafts_owner_idx ON public.meta_ads_drafts(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS meta_ads_drafts_queue_idx ON public.meta_ads_drafts(next_attempt_at) WHERE status IN ('queued','running');
CREATE TABLE IF NOT EXISTS public.meta_ads_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.meta_ads_drafts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  size bigint NOT NULL CHECK (size > 0 AND size <= 1073741824),
  mime text NOT NULL CHECK (mime IN ('video/mp4','video/quicktime','video/webm')),
  width integer NOT NULL CHECK(width > 0),
  height integer NOT NULL CHECK(height > 0),
  duration double precision NOT NULL CHECK(duration > 0),
  path text NOT NULL UNIQUE,
  thumbnail_path text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'uploading' CHECK(status IN ('uploading','ready')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meta_ads_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  draft_id uuid REFERENCES public.meta_ads_drafts(id),
  actor_id uuid,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meta_ads_runtime (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  heartbeat_at timestamptz,
  version text
);
INSERT INTO public.meta_ads_runtime(id) VALUES(true) ON CONFLICT DO NOTHING;
ALTER TABLE public.meta_ads_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_runtime ENABLE ROW LEVEL SECURITY;
-- All access passes through the Edge API's verified administrator check.
REVOKE ALL ON public.meta_ads_drafts, public.meta_ads_assets, public.meta_ads_events, public.meta_ads_runtime FROM anon, authenticated;
GRANT ALL ON public.meta_ads_drafts, public.meta_ads_assets, public.meta_ads_events, public.meta_ads_runtime TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.meta_ads_events_id_seq TO service_role;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('meta-ad-videos','meta-ad-videos',false,1073741824,ARRAY['video/mp4','video/quicktime','video/webm','image/jpeg','image/png'])
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS meta_ads_private_objects ON storage.objects;
CREATE POLICY meta_ads_private_objects ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
USING (bucket_id <> 'meta-ad-videos') WITH CHECK (bucket_id <> 'meta-ad-videos');

CREATE OR REPLACE FUNCTION public.meta_ads_save(p_id uuid, p_owner uuid, p_revision integer, p_config jsonb, p_name text)
RETURNS public.meta_ads_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.meta_ads_drafts;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO meta_ads_drafts(owner_id,config,name) VALUES(p_owner,p_config,left(p_name,200)) RETURNING * INTO r;
  ELSE
    UPDATE meta_ads_drafts SET config=p_config,name=left(p_name,200),revision=revision+1,review_hash=NULL,review_plan=NULL,review_expires_at=NULL,updated_at=now()
    WHERE id=p_id AND owner_id=p_owner AND revision=p_revision AND status='draft' RETURNING * INTO r;
    IF NOT FOUND THEN RAISE EXCEPTION 'This draft changed in another window or has already been submitted. Reload it before editing.'; END IF;
  END IF;
  RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.meta_ads_asset(p_draft uuid, p_owner uuid, p_asset jsonb, p_complete boolean DEFAULT false)
RETURNS public.meta_ads_assets LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.meta_ads_assets;
BEGIN
  PERFORM 1 FROM meta_ads_drafts WHERE id=p_draft AND owner_id=p_owner AND status='draft' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This batch is no longer editable.'; END IF;
  IF p_complete THEN
    UPDATE meta_ads_assets SET status='ready',path=coalesce(p_asset->>'path',path),thumbnail_path=coalesce(p_asset->>'thumbnail_path',thumbnail_path) WHERE id=(p_asset->>'id')::uuid AND draft_id=p_draft RETURNING * INTO r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Upload not found.'; END IF;
  ELSE
    IF (SELECT count(*) FROM meta_ads_assets WHERE draft_id=p_draft)>=100 THEN RAISE EXCEPTION 'This draft has reached its upload limit. Start a new batch.'; END IF;
    INSERT INTO meta_ads_assets(id,draft_id,file_name,size,mime,width,height,duration,path,thumbnail_path)
    VALUES((p_asset->>'id')::uuid,p_draft,left(p_asset->>'file_name',255),(p_asset->>'size')::bigint,p_asset->>'mime',(p_asset->>'width')::int,(p_asset->>'height')::int,(p_asset->>'duration')::float,p_asset->>'path',p_asset->>'thumbnail_path') RETURNING * INTO r;
  END IF;
  UPDATE meta_ads_drafts SET review_hash=NULL,review_plan=NULL,updated_at=now() WHERE id=p_draft;
  RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.meta_ads_queue(p_id uuid,p_owner uuid,p_revision integer,p_hash text,p_mode text)
RETURNS public.meta_ads_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.meta_ads_drafts;
BEGIN
  IF p_mode NOT IN ('PAUSED','ACTIVE') THEN RAISE EXCEPTION 'Invalid publishing mode.'; END IF;
  SELECT * INTO r FROM meta_ads_drafts WHERE id=p_id AND owner_id=p_owner FOR UPDATE;
  IF r.id IS NULL OR r.status<>'draft' OR r.revision<>p_revision OR r.review_hash IS DISTINCT FROM p_hash OR r.review_expires_at<=now() THEN RAISE EXCEPTION 'Your review has expired or this batch changed. Review it again.'; END IF;
  IF p_mode='ACTIVE' AND NOT coalesce((r.review_plan->>'canActivate')::boolean,false) THEN RAISE EXCEPTION 'This batch can only be created paused. Review the activation blockers.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(r.config->'creatives') c LEFT JOIN meta_ads_assets a ON a.id::text=c->>'assetId' AND a.draft_id=r.id WHERE a.id IS NULL OR a.status<>'ready') THEN RAISE EXCEPTION 'Complete all uploads before publishing.'; END IF;
  UPDATE meta_ads_drafts SET status='queued',requested_mode=p_mode,next_attempt_at=now(),updated_at=now(),error=NULL WHERE id=p_id RETURNING * INTO r;
  INSERT INTO meta_ads_events(draft_id,actor_id,event,detail) VALUES(p_id,p_owner,'publish_requested',jsonb_build_object('mode',p_mode,'revision',p_revision,'review_hash',p_hash,'location_expansion',r.config->'locationExpansion'));
  RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.meta_ads_claim()
RETURNS SETOF public.meta_ads_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE selected uuid;
BEGIN
  SELECT id INTO selected FROM meta_ads_drafts WHERE (status IN ('queued','running') OR pause_requested) AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1;
  IF selected IS NOT NULL THEN
    RETURN QUERY UPDATE meta_ads_drafts SET status='running',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',updated_at=now() WHERE id=selected RETURNING *;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.meta_ads_save(uuid,uuid,integer,jsonb,text), public.meta_ads_asset(uuid,uuid,jsonb,boolean), public.meta_ads_queue(uuid,uuid,integer,text,text), public.meta_ads_claim() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.meta_ads_save(uuid,uuid,integer,jsonb,text), public.meta_ads_asset(uuid,uuid,jsonb,boolean), public.meta_ads_queue(uuid,uuid,integer,text,text), public.meta_ads_claim() TO service_role;
