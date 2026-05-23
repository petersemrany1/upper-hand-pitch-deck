UPDATE public.clinic_appointments
SET intel_notes = (SELECT call_notes FROM public.meta_leads WHERE id = 'ea083474-3b5a-43f2-848f-00484123c77d'),
    updated_at = now()
WHERE id = 'a189830a-6c40-4699-821b-5df87e04e204';