UPDATE public.meta_leads
SET
  first_name = regexp_replace(coalesce(raw_payload->>'first_name', first_name), '[\s,]+$', ''),
  last_name = regexp_replace(coalesce(raw_payload->>'last_name', last_name), '[\s,]+$', ''),
  funding_preference = coalesce(funding_preference, raw_payload->>'funding_preference'),
  ad_name = coalesce(ad_name, raw_payload->>'ad_name'),
  ad_set_name = coalesce(ad_set_name, raw_payload->>'ad_set_name'),
  campaign_name = coalesce(campaign_name, raw_payload->>'campaign_name')
WHERE raw_payload IS NOT NULL
  AND (
    first_name ~ '[\s,]+$'
    OR last_name ~ '[\s,]+$'
    OR (funding_preference IS NULL AND raw_payload->>'funding_preference' IS NOT NULL)
    OR (ad_name IS NULL AND raw_payload->>'ad_name' IS NOT NULL)
    OR (ad_set_name IS NULL AND raw_payload->>'ad_set_name' IS NOT NULL)
    OR (campaign_name IS NULL AND raw_payload->>'campaign_name' IS NOT NULL)
  );