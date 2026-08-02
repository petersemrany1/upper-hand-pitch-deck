ALTER TABLE public.clinicflow_photos DROP CONSTRAINT clinicflow_photos_stage_check;
ALTER TABLE public.clinicflow_photos ADD CONSTRAINT clinicflow_photos_stage_check
  CHECK (stage IN ('day_1','week_1_2','weeks_2_4','month_3','month_6','month_12','before_after'));