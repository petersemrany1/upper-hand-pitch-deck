import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaError, type Todo, type TodoList } from "@/lib/todo";

// portal_todos / portal_todo_lists are newer than the generated types file.
const db = (t: string) => (supabase as unknown as { from: (t: string) => any }).from(t);
const todos = () => db("portal_todos");
const lists = () => db("portal_todo_lists");

const BASE_COLS = "id, title, notes, business, due_date, assignee_email, created_by_email, done_at, created_at";
const FULL_COLS = `${BASE_COLS}, list_id, priority, due_time, position, completed_by_email`;
// Columns added by 20261128150000_portal_todo_lists.sql.
const EXTENDED_KEYS = ["list_id", "priority", "due_time", "position", "completed_by_email"] as const;

type Err = { message?: string; code?: string } | null;

export type TodoPatch = Partial<Omit<Todo, "id" | "created_at">>;
export type TodoDraft = Pick<Todo, "title" | "business"> & TodoPatch;

function strip<T extends Record<string, unknown>>(row: T, extended: boolean): T {
  if (extended) return row;
  const copy = { ...row };
  for (const k of EXTENDED_KEYS) delete copy[k];
  return copy;
}

/**
 * Loads and edits to-dos and lists. Before the lists migration has run it
 * quietly falls back to the original columns: `extended` and `listsOn` turn
 * false and the page hides lists, priority and times.
 */
export function useTodos(userEmail: string | null) {
  const [items, setItems] = useState<Todo[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [extended, setExtended] = useState(true);
  const [listsOn, setListsOn] = useState(true);
  const extendedRef = useRef(true);
  extendedRef.current = extended;

  const load = useCallback(async () => {
    let res = await todos().select(FULL_COLS).order("created_at", { ascending: true }).limit(2000);
    let ext = true;
    if (res.error && isMissingSchemaError(res.error)) {
      ext = false;
      res = await todos().select(BASE_COLS).order("created_at", { ascending: true }).limit(2000);
    }
    if (res.error) {
      if (isMissingSchemaError(res.error) || /portal_todos/i.test(res.error.message)) setMissingTable(true);
      else toast.error(res.error.message);
    } else {
      setMissingTable(false);
      setItems((res.data ?? []) as Todo[]);
    }
    setExtended(ext);

    const l = await lists().select("id, name, color, position, created_at").order("position", { ascending: true }).order("created_at", { ascending: true });
    if (l.error) {
      setListsOn(false);
      if (!isMissingSchemaError(l.error)) console.warn("portal_todo_lists:", l.error.message);
    } else {
      setListsOn(ext);
      setTodoLists((l.data ?? []) as TodoList[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Retry once without the new columns if the database turns out not to have them.
  const run = useCallback(
    async (fn: (ext: boolean) => PromiseLike<{ data?: unknown; error: Err }>) => {
      let res = await fn(extendedRef.current);
      if (res.error && extendedRef.current && isMissingSchemaError(res.error)) {
        extendedRef.current = false;
        setExtended(false);
        setListsOn(false);
        res = await fn(false);
      }
      return res;
    },
    [],
  );

  const addTask = useCallback(
    async (draft: TodoDraft): Promise<Todo | null> => {
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const row = { ...draft, created_by_email: userEmail };
      const optimistic: Todo = {
        id: tempId,
        notes: null,
        due_date: null,
        assignee_email: null,
        done_at: null,
        created_at: new Date().toISOString(),
        ...row,
      } as Todo;
      setItems((prev) => [...prev, optimistic]);
      const res = await run((ext) => todos().insert(strip(row, ext)).select(ext ? FULL_COLS : BASE_COLS).single());
      if (res.error) {
        setItems((prev) => prev.filter((t) => t.id !== tempId));
        toast.error(res.error.message ?? "Couldn't add the task");
        return null;
      }
      const saved = res.data as Todo;
      setItems((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
      return saved;
    },
    [run, userEmail],
  );

  const updateTask = useCallback(
    async (id: string, patch: TodoPatch) => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (id.startsWith("tmp-")) return;
      const res = await run((ext) => {
        const body = strip(patch as Record<string, unknown>, ext);
        if (Object.keys(body).length === 0) return Promise.resolve({ error: null });
        return todos().update(body).eq("id", id);
      });
      if (res.error) {
        toast.error(res.error.message ?? "Couldn't save the task");
        void load();
      }
    },
    [run, load],
  );

  const toggleTask = useCallback(
    (t: Todo) => {
      const done = !t.done_at;
      return updateTask(t.id, {
        done_at: done ? new Date().toISOString() : null,
        ...(extendedRef.current ? { completed_by_email: done ? userEmail : null } : {}),
      });
    },
    [updateTask, userEmail],
  );

  const removeTask = useCallback(
    async (t: Todo) => {
      setItems((prev) => prev.filter((x) => x.id !== t.id));
      const { error } = await todos().delete().eq("id", t.id);
      if (error) {
        toast.error(error.message);
        void load();
        return;
      }
      toast("Task deleted", {
        description: t.title,
        action: {
          label: "Undo",
          onClick: async () => {
            setItems((prev) => [...prev, t]);
            const res = await run((ext) => todos().insert(strip({ ...t }, ext)));
            if (res.error) {
              toast.error(res.error.message ?? "Couldn't restore the task");
              void load();
            }
          },
        },
      });
    },
    [load, run],
  );

  const createList = useCallback(async (name: string, color: string): Promise<TodoList | null> => {
    const position = todoLists.reduce((m, l) => Math.max(m, l.position ?? 0), 0) + 1;
    const { data, error } = await lists().insert({ name, color, position }).select("id, name, color, position, created_at").single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setTodoLists((prev) => [...prev, data as TodoList]);
    return data as TodoList;
  }, [todoLists]);

  const updateList = useCallback(
    async (id: string, patch: Partial<Pick<TodoList, "name" | "color">>) => {
      setTodoLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      const { error } = await lists().update(patch).eq("id", id);
      if (error) {
        toast.error(error.message);
        void load();
      }
    },
    [load],
  );

  const deleteList = useCallback(
    async (id: string) => {
      setTodoLists((prev) => prev.filter((l) => l.id !== id));
      // The foreign key moves its tasks to the Inbox; mirror that locally.
      setItems((prev) => prev.map((t) => (t.list_id === id ? { ...t, list_id: null } : t)));
      const { error } = await lists().delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        void load();
      }
    },
    [load],
  );

  return {
    items,
    lists: todoLists,
    loading,
    missingTable,
    extended,
    listsOn,
    reload: load,
    addTask,
    updateTask,
    toggleTask,
    removeTask,
    createList,
    updateList,
    deleteList,
  };
}
