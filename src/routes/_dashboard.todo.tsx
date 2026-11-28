import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ExternalLink, ListTodo, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChaseQueuePanel } from "@/components/ChaseQueuePanel";
import { BusinessChip } from "@/components/business/BusinessSwitch";
import { RequireLegal } from "@/components/business/LegalConnect";
import { legalAppLink, legalDb } from "@/lib/legal/client";
import { BUSINESS_COLOR } from "@/lib/business";
import { sydneyTodayISO } from "@/lib/timezone";

export const Route = createFileRoute("/_dashboard/todo")({
  head: () => ({ meta: [{ title: "To Do" }] }),
  component: TodoPage,
});

type TodoBusiness = "hair" | "legal" | "both";
type Todo = {
  id: string;
  title: string;
  notes: string | null;
  business: TodoBusiness;
  due_date: string | null;
  assignee_email: string | null;
  created_by_email: string | null;
  done_at: string | null;
  created_at: string;
};
type Filter = "all" | "hair" | "legal";

// portal_todos is newer than the generated types file.
const todos = () => (supabase as unknown as { from: (t: string) => any }).from("portal_todos");

function fmtDue(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

function TodoPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const [chaseCount, setChaseCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await todos()
      .select("id, title, notes, business, due_date, assignee_email, created_by_email, done_at, created_at")
      .order("done_at", { ascending: false, nullsFirst: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      if (/portal_todos|schema cache|does not exist/i.test(error.message)) setMissingTable(true);
      else toast.error(error.message);
    } else {
      setMissingTable(false);
      setItems((data ?? []) as Todo[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = sydneyTodayISO();
  const visible = items.filter((t) => filter === "all" || t.business === filter || t.business === "both");
  const open = visible.filter((t) => !t.done_at);
  const done = visible.filter((t) => t.done_at);
  const groups = useMemo(
    () => [
      { key: "overdue", label: "Overdue", tone: "#b83232", rows: open.filter((t) => t.due_date && t.due_date < today) },
      { key: "today", label: "Today", tone: "#111111", rows: open.filter((t) => t.due_date === today) },
      { key: "upcoming", label: "Upcoming", tone: "#111111", rows: open.filter((t) => t.due_date && t.due_date > today) },
      { key: "anytime", label: "No date", tone: "#6b6b68", rows: open.filter((t) => !t.due_date) },
    ],
    [open, today],
  );

  const add = async (draft: { title: string; business: TodoBusiness; due_date: string | null; notes: string | null }) => {
    const { data, error } = await todos()
      .insert({ ...draft, created_by_email: user?.email ?? null })
      .select("id, title, notes, business, due_date, assignee_email, created_by_email, done_at, created_at")
      .single();
    if (error) {
      toast.error(error.message);
      return false;
    }
    setItems((prev) => [...prev, data as Todo]);
    return true;
  };

  const toggle = async (t: Todo) => {
    const done_at = t.done_at ? null : new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, done_at } : x)));
    const { error } = await todos().update({ done_at }).eq("id", t.id);
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  const remove = async (t: Todo) => {
    setItems((prev) => prev.filter((x) => x.id !== t.id));
    const { error } = await todos().delete().eq("id", t.id);
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <ListTodo className="h-6 w-6" style={{ color: "#f4522d" }} />
        <h1 className="text-2xl font-extrabold" style={{ color: "#111" }}>To Do</h1>
        <span className="text-sm" style={{ color: "#6b6b68" }}>
          {open.length} open{chaseCount ? ` · ${chaseCount} clinic chase${chaseCount === 1 ? "" : "s"}` : ""}
        </span>
        <div className="ml-auto inline-flex rounded-full p-0.5" style={{ background: "#f1f1ef", border: "1px solid #e6e6e3" }}>
          {(["all", "hair", "legal"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: filter === f ? (f === "all" ? "#fff" : BUSINESS_COLOR[f].bg) : "transparent",
                color: filter === f ? (f === "all" ? "#111" : BUSINESS_COLOR[f].fg) : "#6b6b68",
              }}
            >
              {f === "all" ? "Everything" : f === "hair" ? "Hair Transplants" : "Legal"}
            </button>
          ))}
        </div>
      </header>

      {missingTable ? (
        <div className="mb-6 rounded-xl p-4 text-sm" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
          The to-do list needs one database update before it can save tasks (migration
          <code className="mx-1">20261127120000_portal_todos.sql</code>). Clinic chase requests below work already.
        </div>
      ) : (
        <AddTodo defaultBusiness={filter === "legal" ? "legal" : "hair"} onAdd={add} />
      )}

      {!missingTable && (
        <section className="mb-8 space-y-5">
          {loading ? (
            <p className="text-sm" style={{ color: "#6b6b68" }}>Loading…</p>
          ) : open.length === 0 ? (
            <div className="rounded-xl p-6 text-center text-sm" style={{ background: "#fff", border: "1px solid #ebebeb", color: "#6b6b68" }}>
              Nothing on the list. Add a to-do above.
            </div>
          ) : (
            groups
              .filter((g) => g.rows.length > 0)
              .map((g) => (
                <div key={g.key}>
                  <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: g.tone }}>
                    {g.label} · {g.rows.length}
                  </h2>
                  <ul className="overflow-hidden rounded-xl" style={{ background: "#fff", border: "1px solid #ebebeb" }}>
                    {g.rows.map((t) => (
                      <TodoRow key={t.id} todo={t} overdue={g.key === "overdue"} onToggle={toggle} onRemove={remove} />
                    ))}
                  </ul>
                </div>
              ))
          )}
          {done.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "#8a8a86" }}
              >
                <ChevronDown className="h-3 w-3" style={{ transform: showDone ? "none" : "rotate(-90deg)" }} />
                Done · {done.length}
              </button>
              {showDone && (
                <ul className="overflow-hidden rounded-xl" style={{ background: "#fff", border: "1px solid #ebebeb" }}>
                  {done.slice(0, 100).map((t) => (
                    <TodoRow key={t.id} todo={t} onToggle={toggle} onRemove={remove} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {filter !== "legal" && (
        <section className="mb-8">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#111" }}>
            Clinic chase requests <BusinessChip business="hair" />
          </h2>
          <ChaseQueuePanel onCount={setChaseCount} />
        </section>
      )}

      {filter !== "hair" && (
        <section className="mb-8">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#111" }}>
            Firm chase requests <BusinessChip business="legal" />
          </h2>
          <RequireLegal compact>
            <LegalChaseList />
          </RequireLegal>
        </section>
      )}
    </div>
  );
}

function AddTodo({
  defaultBusiness,
  onAdd,
}: {
  defaultBusiness: TodoBusiness;
  onAdd: (d: { title: string; business: TodoBusiness; due_date: string | null; notes: string | null }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [business, setBusiness] = useState<TodoBusiness>(defaultBusiness);
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusiness(defaultBusiness), [defaultBusiness]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const ok = await onAdd({ title: title.trim(), business, due_date: due || null, notes: null });
    setBusy(false);
    if (ok) {
      setTitle("");
      setDue("");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl p-2"
      style={{ background: "#fff", border: "1px solid #ebebeb" }}
    >
      <Plus className="ml-1 h-4 w-4" style={{ color: "#8a8a86" }} />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a to-do…"
        className="min-w-[180px] flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
        maxLength={500}
      />
      <select
        value={business}
        onChange={(e) => setBusiness(e.target.value as TodoBusiness)}
        className="rounded-md px-2 py-1.5 text-xs"
        style={{ border: "1px solid #e6e6e3", background: "#fafaf9" }}
        aria-label="Business"
      >
        <option value="hair">Hair Transplants</option>
        <option value="legal">Legal</option>
        <option value="both">Both</option>
      </select>
      <label className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs" style={{ border: "1px solid #e6e6e3", background: "#fafaf9" }}>
        <CalendarDays className="h-3.5 w-3.5" style={{ color: "#8a8a86" }} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-transparent outline-none" aria-label="Due date" />
      </label>
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        style={{ background: "#f4522d" }}
      >
        Add
      </button>
    </form>
  );
}

function TodoRow({
  todo,
  overdue,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  overdue?: boolean;
  onToggle: (t: Todo) => void;
  onRemove: (t: Todo) => void;
}) {
  const done = !!todo.done_at;
  return (
    <li className="group flex items-center gap-3 px-3 py-2.5" style={{ borderTop: "1px solid #f3f3f1" }}>
      <button
        type="button"
        onClick={() => onToggle(todo)}
        aria-label={done ? "Mark not done" : "Mark done"}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ border: `1.5px solid ${done ? "#1a7a4a" : "#cfcfcb"}`, background: done ? "#1a7a4a" : "transparent" }}
      >
        {done && <Check className="h-3 w-3 text-white" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm" style={{ color: done ? "#8a8a86" : "#111", textDecoration: done ? "line-through" : "none" }}>
          {todo.title}
        </div>
        {todo.created_by_email && (
          <div className="truncate text-[11px]" style={{ color: "#a3a3a0" }}>Added by {todo.created_by_email.split("@")[0]}</div>
        )}
      </div>
      {todo.due_date && (
        <span className="shrink-0 text-xs" style={{ color: overdue ? "#b83232" : "#6b6b68", fontWeight: overdue ? 600 : 400 }}>
          {fmtDue(todo.due_date)}
        </span>
      )}
      {todo.business === "both" ? (
        <span className="flex gap-1"><BusinessChip business="hair" /><BusinessChip business="legal" /></span>
      ) : (
        <BusinessChip business={todo.business} />
      )}
      <button
        type="button"
        onClick={() => onRemove(todo)}
        aria-label="Delete to-do"
        className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        style={{ color: "#a3a3a0" }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

type LegalChase = {
  id: string;
  client_name: string | null;
  appointment_date: string | null;
  chase_note: string | null;
  chase_requested_at: string | null;
  firms: { firm_name: string | null } | null;
};

function LegalChaseList() {
  const [rows, setRows] = useState<LegalChase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    legalDb()
      .from("firm_appointments")
      .select("id, client_name, appointment_date, chase_note, chase_requested_at, firms(firm_name)")
      .eq("chase_status", "requested")
      .order("chase_requested_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data ?? []) as unknown as LegalChase[]);
      });
  }, []);
  if (error) return <p className="text-sm" style={{ color: "#b83232" }}>{error}</p>;
  if (!rows) return <p className="text-sm" style={{ color: "#6b6b68" }}>Loading…</p>;
  if (rows.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center text-sm" style={{ background: "#fff", border: "1px solid #ebebeb", color: "#6b6b68" }}>
        No firm chase requests right now.
      </div>
    );
  }
  return (
    <ul className="overflow-hidden rounded-xl" style={{ background: "#fff", border: "1px solid #ebebeb" }}>
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: "1px solid #f3f3f1" }}>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" style={{ color: "#111" }}>
              {r.client_name ?? "Client"} <span style={{ color: "#8a8a86" }}>· {r.firms?.firm_name ?? "Firm"}</span>
            </div>
            {r.chase_note && <div className="truncate text-xs" style={{ color: "#6b6b68" }}>{r.chase_note}</div>}
          </div>
          {r.appointment_date && <span className="text-xs" style={{ color: "#6b6b68" }}>{fmtDue(r.appointment_date)}</span>}
          <a
            href={legalAppLink("/booked-appointments").href}
            target={legalAppLink("/booked-appointments").external ? "_blank" : undefined}
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: BUSINESS_COLOR.legal.fg }}
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}
