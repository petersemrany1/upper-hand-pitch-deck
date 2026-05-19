UPDATE call_records
SET call_analysis = call_analysis - 'summary'
WHERE duration IS NULL
  AND outcome IS NULL
  AND call_analysis ? 'summary';