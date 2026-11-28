-- To Do, TickTick style: user-made lists plus priority, an optional due time,
-- manual ordering and who ticked a task off. Safe to re-run. The To Do page
-- works before this runs (it hides lists, priority and times until then).

CREATE TABLE IF NOT EXISTS public.portal_todo_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  color text,
  position int DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_todo_lists TO authenticated;

ALTER TABLE public.portal_todo_lists ENABLE ROW LEVEL SECURITY;

-- Staff (admins and reps) share the same lists, as they share the to-dos.
DROP POLICY IF EXISTS portal_todo_lists_staff_all ON public.portal_todo_lists;
CREATE POLICY portal_todo_lists_staff_all ON public.portal_todo_lists
  FOR ALL TO authenticated
  USING (public.is_admin_user() OR public.has_sales_role(ARRAY['admin', 'rep']))
  WITH CHECK (public.is_admin_user() OR public.has_sales_role(ARRAY['admin', 'rep']));

ALTER TABLE public.portal_todos
  ADD COLUMN IF NOT EXISTS list_id uuid REFERENCES public.portal_todo_lists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_time time,
  ADD COLUMN IF NOT EXISTS position int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_by_email text;

-- 0 none, 1 low, 2 medium, 3 high.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portal_todos_priority_check'
  ) THEN
    ALTER TABLE public.portal_todos
      ADD CONSTRAINT portal_todos_priority_check CHECK (priority BETWEEN 0 AND 3);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS portal_todos_list_idx ON public.portal_todos (list_id);

-- Let PostgREST see the new table and columns straight away.
NOTIFY pgrst, 'reload schema';
