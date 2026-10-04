-- Deploy this migration BEFORE the app version that calls the new session RPC.
-- Then run: bun scripts/check-invoice-setup.ts (in the server environment).
-- Historical sessions/booking attribution remain unverified by design.
-- No customer emails are sent by this migration or setup check.
-- Invoice audit is deliberately separate from estimated labour reports.
CREATE TABLE public.rep_invoice_config (
  rep_id uuid PRIMARY KEY REFERENCES public.sales_reps(id),
  hourly_rate_cents integer NOT NULL CHECK (hourly_rate_cents > 0),
  timezone text NOT NULL DEFAULT 'Australia/Perth'
);
-- Exact Nina identity supplied on her invoice. Bec must be uniquely identifiable.
INSERT INTO public.rep_invoice_config(rep_id, hourly_rate_cents)
SELECT id, 2500 FROM public.sales_reps WHERE lower(email) = 'sinclair.nina1@gmail.com';
INSERT INTO public.rep_invoice_config(rep_id, hourly_rate_cents)
SELECT id, 3500 FROM public.sales_reps
WHERE is_active AND (lower(split_part(trim(name),' ',1)) IN ('bec','rebecca'))
AND (SELECT count(*) FROM public.sales_reps WHERE is_active AND lower(split_part(trim(name),' ',1)) IN ('bec','rebecca')) = 1
ON CONFLICT DO NOTHING;
ALTER TABLE public.rep_invoice_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rep_invoice_tracking (id boolean PRIMARY KEY DEFAULT true CHECK(id), started_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.rep_invoice_tracking DEFAULT VALUES;
ALTER TABLE public.rep_invoice_tracking ENABLE ROW LEVEL SECURITY;

-- Immutable attribution at the first transition into deposit paid/booked.
CREATE TABLE public.rep_booking_earnings (
  lead_id uuid PRIMARY KEY,
  rep_id uuid,
  earned_at timestamptz NOT NULL,
  patient_name text NOT NULL,
  verified boolean NOT NULL DEFAULT false
);
ALTER TABLE public.rep_booking_earnings ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.rep_booking_earnings(rep_id, earned_at);
INSERT INTO public.rep_booking_earnings(lead_id,rep_id,earned_at,patient_name,verified)
SELECT l.id,l.rep_id,coalesce(l.deposit_paid_at,(SELECT min(a.booked_at) FROM public.clinic_appointments a WHERE a.lead_id=l.id),l.updated_at),
concat_ws(' ',l.first_name,l.last_name),false
FROM public.meta_leads l WHERE l.status='booked_deposit_paid';
CREATE FUNCTION public.capture_rep_booking_earning() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='booked_deposit_paid' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'booked_deposit_paid') THEN
    INSERT INTO public.rep_booking_earnings(lead_id,rep_id,earned_at,patient_name,verified)
    VALUES(NEW.id,NEW.rep_id,clock_timestamp(),concat_ws(' ',NEW.first_name,NEW.last_name),NEW.rep_id IS NOT NULL)
    ON CONFLICT(lead_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER capture_rep_booking_earning AFTER INSERT OR UPDATE OF status ON public.meta_leads
FOR EACH ROW EXECUTE FUNCTION public.capture_rep_booking_earning();

-- Old sessions cannot prove when a browser disconnected. Never backfill trust.
ALTER TABLE public.rep_sessions ADD COLUMN invoice_tracking boolean NOT NULL DEFAULT false,
 ADD COLUMN last_seen_at timestamptz,
 ADD COLUMN connection_gap boolean NOT NULL DEFAULT false,
 ADD COLUMN close_reason text;
-- Reps must not edit the timestamps being used to authorise their invoices.
DROP POLICY IF EXISTS "Reps insert own sessions" ON public.rep_sessions;
DROP POLICY IF EXISTS "Reps update own sessions, admins update all" ON public.rep_sessions;

CREATE FUNCTION public.rep_invoice_session_action(p_rep uuid,p_action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.rep_sessions; t timestamptz := clock_timestamp();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_rep::text,0));
  IF p_action='start' THEN
    UPDATE public.rep_sessions SET ended_at=coalesce(last_seen_at,started_at),close_reason='abandoned',connection_gap=true WHERE rep_id=p_rep AND ended_at IS NULL;
    INSERT INTO public.rep_sessions(rep_id,started_at,last_seen_at,invoice_tracking) VALUES(p_rep,t,t,true) RETURNING * INTO s;
  ELSIF p_action='heartbeat' THEN
    UPDATE public.rep_sessions SET connection_gap=connection_gap OR last_seen_at IS NULL OR t-last_seen_at>interval '3 minutes',last_seen_at=t
    WHERE rep_id=p_rep AND ended_at IS NULL RETURNING * INTO s;
  ELSIF p_action='end' THEN
    UPDATE public.rep_sessions SET connection_gap=connection_gap OR last_seen_at IS NULL OR t-last_seen_at>interval '3 minutes',
      ended_at=t,close_reason='explicit',last_seen_at=t WHERE rep_id=p_rep AND ended_at IS NULL RETURNING * INTO s;
  ELSIF p_action='current' THEN
    UPDATE public.rep_sessions SET ended_at=coalesce(last_seen_at,started_at),close_reason='abandoned',connection_gap=true
    WHERE rep_id=p_rep AND ended_at IS NULL AND (started_at AT TIME ZONE 'Australia/Perth')::date < (t AT TIME ZONE 'Australia/Perth')::date;
    SELECT * INTO s FROM public.rep_sessions WHERE rep_id=p_rep AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1;
  ELSE RAISE EXCEPTION 'Invalid session action'; END IF;
  IF s.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id',s.id,'started_at',s.started_at);
END $$;
REVOKE ALL ON FUNCTION public.rep_invoice_session_action(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rep_invoice_session_action(uuid,text) TO service_role;

CREATE TABLE public.rep_invoices (
  id uuid PRIMARY KEY,
  rep_id uuid NOT NULL REFERENCES public.sales_reps(id),
  invoice_number text NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL CHECK(period_to>=period_from AND period_to-period_from<7),
  file_path text NOT NULL UNIQUE,
  file_hash text NOT NULL,
  claim jsonb NOT NULL,
  evidence jsonb NOT NULL,
  result jsonb,
  status text NOT NULL DEFAULT 'checking' CHECK(status IN ('checking','approved','needs_review')),
  email_status text NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sending','sent','failed')),
  email_error text,
  email_sent_at timestamptz,
  email_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rep_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own invoices or admin" ON public.rep_invoices FOR SELECT TO authenticated
USING(rep_id=public.current_sales_rep_id() OR public.has_sales_role(ARRAY['admin']::text[]));
CREATE INDEX ON public.rep_invoices(rep_id,period_from,period_to);
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('rep-invoices','rep-invoices',false,5242880,ARRAY['application/pdf']) ON CONFLICT(id) DO NOTHING;

-- Serialise submissions for a rep. Snapshot the evidence and duplicate flags
-- together; no unpaginated API reads and no race allowing two approvals.
CREATE FUNCTION public.submit_rep_invoice(p_id uuid,p_rep uuid,p_claim jsonb,p_path text,p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a date := (p_claim->>'from')::date; b date := (p_claim->>'to')::date;
  t0 timestamptz; t1 timestamptz; ev jsonb; cfg public.rep_invoice_config;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_rep::text,0));
  IF b<a OR b-a>=7 THEN RAISE EXCEPTION 'Select up to seven invoice dates'; END IF;
  SELECT * INTO cfg FROM public.rep_invoice_config WHERE rep_id=p_rep;
  t0:=a::timestamp AT TIME ZONE 'Australia/Perth'; t1:=(b+1)::timestamp AT TIME ZONE 'Australia/Perth';
  ev:=jsonb_build_object(
    'period_start',t0,'period_end',t1,'captured_at',clock_timestamp(),
    'coverage_started_at',(SELECT started_at FROM public.rep_invoice_tracking WHERE id),
    'hourly_rate_cents',cfg.hourly_rate_cents,'rep_name',(SELECT name FROM public.sales_reps WHERE id=p_rep),
    'duplicates',coalesce((SELECT jsonb_agg(invoice_number) FROM public.rep_invoices WHERE rep_id=p_rep AND
      (lower(invoice_number)=lower(p_claim->>'number') OR file_hash=p_hash OR (period_from<=b AND period_to>=a))),'[]'::jsonb),
    'sessions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'started_at',s.started_at,'ended_at',s.ended_at,
      'verified',s.invoice_tracking AND NOT s.connection_gap AND s.close_reason='explicit' AND s.ended_at IS NOT NULL,
      'seconds',greatest(0,extract(epoch FROM least(coalesce(s.ended_at,clock_timestamp()),t1)-greatest(s.started_at,t0))),
      'has_calls',EXISTS(SELECT 1 FROM public.call_records c WHERE c.rep_id=s.rep_id AND c.called_at>=s.started_at AND c.called_at<coalesce(s.ended_at,clock_timestamp()))))
      FROM public.rep_sessions s WHERE s.rep_id=p_rep AND s.started_at<t1 AND coalesce(s.ended_at,clock_timestamp())>t0),'[]'::jsonb),
    'bookings',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM public.rep_booking_earnings e WHERE e.rep_id=p_rep AND e.earned_at>=t0 AND e.earned_at<t1),'[]'::jsonb)
  );
  -- Unattributed events could belong to this rep: block approval, don't guess.
  IF EXISTS(SELECT 1 FROM public.rep_booking_earnings WHERE rep_id IS NULL AND earned_at>=t0 AND earned_at<t1) THEN
    ev:=ev || jsonb_build_object('unattributed_bookings',true);
  END IF;
  INSERT INTO public.rep_invoices(id,rep_id,invoice_number,period_from,period_to,file_path,file_hash,claim,evidence)
  VALUES(p_id,p_rep,p_claim->>'number',a,b,p_path,p_hash,p_claim,ev);
  RETURN ev;
END $$;
REVOKE ALL ON FUNCTION public.submit_rep_invoice(uuid,uuid,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rep_invoice(uuid,uuid,jsonb,text,text) TO service_role;

-- Add the tab even for existing rep-specific tab overrides.
UPDATE public.sales_reps SET allowed_tabs=array_append(allowed_tabs,'invoices')
WHERE role='rep' AND array_length(allowed_tabs,1)>0 AND NOT ('invoices'=ANY(allowed_tabs));
