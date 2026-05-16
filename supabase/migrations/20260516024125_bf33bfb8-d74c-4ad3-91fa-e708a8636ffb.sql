DROP POLICY IF EXISTS "rep reads trading hours" ON public.clinic_trading_hours;
CREATE POLICY "rep reads trading hours" ON public.clinic_trading_hours
FOR SELECT TO authenticated
USING (public.current_sales_rep_id() IS NOT NULL);

DROP POLICY IF EXISTS "rep reads blocked slots" ON public.clinic_blocked_slots;
CREATE POLICY "rep reads blocked slots" ON public.clinic_blocked_slots
FOR SELECT TO authenticated
USING (public.current_sales_rep_id() IS NOT NULL);

DROP POLICY IF EXISTS "rep read clinic_availability" ON public.clinic_availability;
CREATE POLICY "rep read clinic_availability" ON public.clinic_availability
FOR SELECT TO authenticated
USING (public.current_sales_rep_id() IS NOT NULL);