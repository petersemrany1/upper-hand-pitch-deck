-- 1. Backfill duration_seconds from duration where missing (and vice versa)
UPDATE public.call_records
SET duration_seconds = duration
WHERE duration_seconds IS NULL AND duration IS NOT NULL;

UPDATE public.call_records
SET duration = duration_seconds
WHERE duration IS NULL AND duration_seconds IS NOT NULL;

-- 2. Bidirectional sync trigger: whenever one is written, mirror it to the other.
-- Uses IS DISTINCT FROM guard to prevent infinite loops / no-op writes.
CREATE OR REPLACE FUNCTION public.sync_call_duration_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If duration was set/changed and duration_seconds doesn't match, mirror it.
  IF NEW.duration IS NOT NULL
     AND NEW.duration IS DISTINCT FROM COALESCE(OLD.duration, -1)
     AND NEW.duration_seconds IS DISTINCT FROM NEW.duration THEN
    NEW.duration_seconds := NEW.duration;
  END IF;

  -- If duration_seconds was set/changed and duration doesn't match, mirror it.
  IF NEW.duration_seconds IS NOT NULL
     AND NEW.duration_seconds IS DISTINCT FROM COALESCE(OLD.duration_seconds, -1)
     AND NEW.duration IS DISTINCT FROM NEW.duration_seconds THEN
    NEW.duration := NEW.duration_seconds;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_call_duration_columns_trg ON public.call_records;
CREATE TRIGGER sync_call_duration_columns_trg
BEFORE INSERT OR UPDATE OF duration, duration_seconds
ON public.call_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_call_duration_columns();