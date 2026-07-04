-- Replace the wide-open "authenticated USING (true)" policies on public.clinics
-- with properly scoped policies. Sales-team roles (admin/rep/caller/clinic_setter)
-- keep full CRM access. Clinic portal users can only see their own clinic row
-- (matching the pattern used on clinic_appointments / clinic_availability).
-- Deletes are restricted to admins.

DROP POLICY IF EXISTS "Authenticated read clinics"   ON public.clinics;
DROP POLICY IF EXISTS "Authenticated insert clinics" ON public.clinics;
DROP POLICY IF EXISTS "Authenticated update clinics" ON public.clinics;
DROP POLICY IF EXISTS "Authenticated delete clinics" ON public.clinics;

CREATE POLICY "Sales team and own clinic can read clinics"
  ON public.clinics
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR public.has_sales_role(ARRAY['rep','caller','clinic_setter'])
    OR public.is_clinic_user_for(id)
  );

CREATE POLICY "Sales team can insert clinics"
  ON public.clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_user()
    OR public.has_sales_role(ARRAY['rep','caller','clinic_setter'])
  );

CREATE POLICY "Sales team can update clinics"
  ON public.clinics
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_user()
    OR public.has_sales_role(ARRAY['rep','caller','clinic_setter'])
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.has_sales_role(ARRAY['rep','caller','clinic_setter'])
  );

CREATE POLICY "Admins can delete clinics"
  ON public.clinics
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());