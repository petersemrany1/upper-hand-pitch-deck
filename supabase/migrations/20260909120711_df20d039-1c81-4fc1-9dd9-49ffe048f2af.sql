CREATE TABLE public.lead_blacklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  phone text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.lead_blacklist TO authenticated;
GRANT ALL ON public.lead_blacklist TO service_role;
ALTER TABLE public.lead_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view blacklist" ON public.lead_blacklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add blacklist entries" ON public.lead_blacklist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can remove blacklist entries" ON public.lead_blacklist FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.meta_lead_blacklist_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _digits text;
BEGIN
  _digits := regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g');
  IF EXISTS (
    SELECT 1 FROM public.lead_blacklist b
    WHERE (b.email IS NOT NULL AND NEW.email IS NOT NULL AND lower(b.email) = lower(NEW.email))
       OR (b.phone IS NOT NULL AND length(_digits) >= 9
           AND length(regexp_replace(b.phone, '\D', '', 'g')) >= 9
           AND right(regexp_replace(b.phone, '\D', '', 'g'), 9) = right(_digits, 9))
  ) THEN
    NEW.status := 'blacklisted';
    NEW.lead_class := 'blacklisted';
    NEW.lead_class_reason := 'On blacklist';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meta_lead_blacklist
BEFORE INSERT ON public.meta_leads
FOR EACH ROW EXECUTE FUNCTION public.meta_lead_blacklist_check();

INSERT INTO public.lead_blacklist (email, phone, reason)
VALUES ('in2audiosam@hotmail.com', '0408368937', 'Requested by Peter — do not let through the portal');

UPDATE public.meta_leads
SET status = 'blacklisted', lead_class = 'blacklisted', lead_class_reason = 'On blacklist', updated_at = now()
WHERE lower(email) = 'in2audiosam@hotmail.com' AND status = 'new';