UPDATE public.clinic_trading_hours SET open_time='14:00', close_time='14:30', is_closed=false WHERE clinic_id='d43dfd17-ecc5-4ec9-95ad-2427f4bdf425' AND day_of_week=0;
UPDATE public.clinic_trading_hours SET is_closed=true WHERE clinic_id='d43dfd17-ecc5-4ec9-95ad-2427f4bdf425' AND day_of_week=1;
UPDATE public.clinic_trading_hours SET open_time='11:00', close_time='11:30', is_closed=false WHERE clinic_id='d43dfd17-ecc5-4ec9-95ad-2427f4bdf425' AND day_of_week=2;
UPDATE public.clinic_trading_hours SET is_closed=true WHERE clinic_id='d43dfd17-ecc5-4ec9-95ad-2427f4bdf425' AND day_of_week=3;
UPDATE public.clinic_trading_hours SET open_time='14:00', close_time='14:30', is_closed=false WHERE clinic_id='d43dfd17-ecc5-4ec9-95ad-2427f4bdf425' AND day_of_week=4;
UPDATE public.clinic_trading_hours SET is_closed=true WHERE clinic_id='d43dfd17-ecc5-4ec9-95ad-2427f4bdf425' AND day_of_week=5;
UPDATE public.clinic_trading_hours SET is_closed=true WHERE clinic_id='d43dfd17-ecc5-4ec9-95ad-2427f4bdf425' AND day_of_week=6;