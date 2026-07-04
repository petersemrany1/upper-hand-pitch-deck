ALTER TABLE clinic_trading_hours ALTER COLUMN consult_duration_mins SET DEFAULT 15;
UPDATE clinic_trading_hours SET consult_duration_mins = 15 WHERE consult_duration_mins = 30;