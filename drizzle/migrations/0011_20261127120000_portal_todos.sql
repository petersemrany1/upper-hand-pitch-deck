-- To Do list for the Upper Hand portal (replaces the Chase Queue tab; clinic
-- chase requests now show inside To Do). Each to-do belongs to a business so
-- Hair Transplants and Legal work stay clearly apart.

CREATE TABLE IF NOT EXISTS public.portal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 500),
  notes text,
  business text NOT NULL DEFAULT 'hair' CHECK (business IN ('hair', 'legal', 'both')),
  due_date date,
  assignee_email text,
  created_by uuid DEFAULT auth.uid(),
  created_by_email text,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_todos_open_idx ON public.portal_todos (done_at, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_todos TO authenticated;

ALTER TABLE public.portal_todos ENABLE ROW LEVEL SECURITY;

-- Staff (admins and reps) share one list.
DROP POLICY IF EXISTS portal_todos_staff_all ON public.portal_todos;
CREATE POLICY portal_todos_staff_all ON public.portal_todos
  FOR ALL TO authenticated
  USING (public.is_admin_user() OR public.has_sales_role(ARRAY['admin', 'rep']))
  WITH CHECK (public.is_admin_user() OR public.has_sales_role(ARRAY['admin', 'rep']));

CREATE OR REPLACE FUNCTION public.portal_todos_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portal_todos_touch ON public.portal_todos;
CREATE TRIGGER portal_todos_touch BEFORE UPDATE ON public.portal_todos
  FOR EACH ROW EXECUTE FUNCTION public.portal_todos_touch();
