CREATE TABLE public.sales_test_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  city TEXT,
  state TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'sam',
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_test_leads TO authenticated;
GRANT ALL ON public.sales_test_leads TO service_role;

ALTER TABLE public.sales_test_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all sales_test_leads"
  ON public.sales_test_leads FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Admins can insert sales_test_leads"
  ON public.sales_test_leads FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update sales_test_leads"
  ON public.sales_test_leads FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can delete sales_test_leads"
  ON public.sales_test_leads FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

CREATE INDEX idx_sales_test_leads_created_at ON public.sales_test_leads(created_at DESC);
CREATE INDEX idx_sales_test_leads_phone ON public.sales_test_leads(phone);
CREATE INDEX idx_sales_test_leads_email ON public.sales_test_leads(email);

CREATE TRIGGER update_sales_test_leads_updated_at
  BEFORE UPDATE ON public.sales_test_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();