-- Patient intel on clinic_appointments is now a frozen snapshot of what
-- was emailed to the clinic. Drop the auto-sync trigger so later edits to
-- meta_leads.call_notes don't silently mutate the clinic's view.
DROP TRIGGER IF EXISTS trg_sync_intel_to_clinic_appointments ON public.meta_leads;
DROP FUNCTION IF EXISTS public.sync_intel_to_clinic_appointments();

-- Restore intel for appointments whose intel_notes was cleared by the
-- previous cleanup, using the lead's pipeline_summary as a sensible
-- fallback (this is what we have closest to "what was sent").
UPDATE public.clinic_appointments ca
SET intel_notes = ml.pipeline_summary,
    updated_at = now()
FROM public.meta_leads ml
WHERE ca.lead_id = ml.id
  AND ca.intel_notes IS NULL
  AND ml.pipeline_summary IS NOT NULL
  AND length(btrim(ml.pipeline_summary)) > 0;