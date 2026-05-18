UPDATE public.call_records
SET rep_id = CASE
  WHEN DATE(called_at AT TIME ZONE 'Australia/Sydney') IN ('2026-05-14','2026-05-16')
    THEN 'f2ee814e-5f92-4792-9f7f-04a35ae5779b'::uuid
  ELSE 'd9db9a1a-1c88-4668-9aee-72e2f4c3e66f'::uuid
END
WHERE called_at >= '2026-04-01'
  AND rep_id IS NULL;