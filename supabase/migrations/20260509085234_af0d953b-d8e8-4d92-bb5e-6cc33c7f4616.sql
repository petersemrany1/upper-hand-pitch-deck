-- Clear AI-refusal junk that was previously written into call_notes / intel_notes
-- (e.g. "I can't process this transcript", "Please provide a transcript", etc.)
UPDATE public.meta_leads
SET call_notes = NULL,
    updated_at = now()
WHERE call_notes ~* '\m(i can''?t|i cannot|i am unable to|i don''?t have|please (provide|paste|share))\M.*\mtranscript\M'
   OR call_notes ~* 'placeholder text'
   OR call_notes ~* 'corrupted audio'
   OR call_notes ~* 'voicemail notification'
   OR call_notes ~* 'doesn''?t contain (intelligible|a sales call|patient information|any (dialogue|conversation))';

UPDATE public.clinic_appointments
SET intel_notes = NULL,
    updated_at = now()
WHERE intel_notes ~* '\m(i can''?t|i cannot|i am unable to|i don''?t have|please (provide|paste|share))\M.*\mtranscript\M'
   OR intel_notes ~* 'placeholder text'
   OR intel_notes ~* 'corrupted audio'
   OR intel_notes ~* 'voicemail notification'
   OR intel_notes ~* 'doesn''?t contain (intelligible|a sales call|patient information|any (dialogue|conversation))';