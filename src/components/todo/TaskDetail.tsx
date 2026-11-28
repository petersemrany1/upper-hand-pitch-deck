import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Briefcase, CalendarDays, Clock, Flag, Inbox, Trash2, X } from "lucide-react";
import { BUSINESS_COLOR } from "@/lib/business";
import { addDaysISO, dueLabel, nextMondayISO, PRIORITIES, type Todo, type TodoBusiness, type TodoList } from "@/lib/todo";
import type { TodoPatch } from "./useTodos";
import { C, ListDot, TaskCheckbox } from "./bits";

export function TaskDetail({
  todo,
  today,
  lists,
  extended,
  listsOn,
  onChange,
  onToggle,
  onDelete,
  onClose,
}: {
  todo: Todo;
  today: string;
  lists: TodoList[];
  extended: boolean;
  listsOn: boolean;
  onChange: (patch: TodoPatch) => void;
  onToggle: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes ?? "");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const done = !!todo.done_at;

  // The page keys this panel by task id, so drafts start fresh for each task.

  // Grow the notes box with its content.
  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(120, el.scrollHeight)}px`;
  }, [notes, todo.id]);

  const saveTitle = () => {
    const t = title.trim();
    if (!t) setTitle(todo.title);
    else if (t !== todo.title) onChange({ title: t });
  };
  const saveNotes = () => {
    const n = notes.trim() ? notes : null;
    if ((n ?? null) !== (todo.notes ?? null)) onChange({ notes: n });
  };

  // Save drafts if the panel closes or switches task mid-edit.
  const latest = useRef({ saveTitle, saveNotes });
  latest.current = { saveTitle, saveNotes };
  useEffect(
    () => () => {
      latest.current.saveTitle();
      latest.current.saveNotes();
    },
    [],
  );

  const setDue = (iso: string | null) => onChange({ due_date: iso, ...(iso === null && extended ? { due_time: null } : {}) });

  const createdLine = [
    todo.created_by_email ? `Added by ${todo.created_by_email.split("@")[0]}` : "Added",
    new Date(todo.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
  ].join(" · ");

  return (
    <div className="flex h-full flex-col" style={{ background: C.card }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 lg:pr-14" style={{ borderBottom: `1px solid ${C.soft}` }}>
        <button type="button" onClick={onClose} aria-label="Back" className="-ml-1 rounded-md p-1 md:hidden" style={{ color: C.muted }}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <TaskCheckbox checked={done} priority={todo.priority} onChange={onToggle} size={20} />
        <span
          className="truncate text-xs"
          style={{ color: done ? "#1a7a4a" : todo.due_date && todo.due_date < today ? C.red : C.muted }}
        >
          {done
            ? `Completed ${new Date(todo.done_at!).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}${
                todo.completed_by_email ? ` by ${todo.completed_by_email.split("@")[0]}` : ""
              }`
            : todo.due_date
              ? `${todo.due_date < today ? "Overdue · " : "Due "}${dueLabel(todo.due_date, today)}`
              : "No due date"}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="ml-auto hidden rounded-md p-1 hover:bg-[#f3f3f1] md:block" style={{ color: C.muted }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveTitle();
              notesRef.current?.focus();
            }
          }}
          rows={1}
          maxLength={500}
          aria-label="Title"
          className="w-full resize-none border-0 bg-transparent p-0 text-[18px] font-semibold leading-snug outline-none"
          style={{ color: done ? C.faint : C.text, textDecoration: done ? "line-through" : "none", fieldSizing: "content" } as React.CSSProperties}
        />

        <div className="mt-4 space-y-1">
          <Field icon={<CalendarDays className="h-4 w-4" />} label="Due">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={todo.due_date ?? ""}
                onChange={(e) => setDue(e.target.value || null)}
                aria-label="Due date"
                className="rounded-md px-2 py-1 text-sm outline-none"
                style={{ border: `1px solid ${C.border}`, color: todo.due_date && todo.due_date < today && !done ? C.red : C.text }}
              />
              {[
                { label: "Today", iso: today },
                { label: "Tomorrow", iso: addDaysISO(today, 1) },
                { label: "Next week", iso: nextMondayISO(today) },
              ].map((q) => (
                <Pill key={q.label} on={todo.due_date === q.iso} onClick={() => setDue(q.iso)}>
                  {q.label}
                </Pill>
              ))}
              {todo.due_date && (
                <Pill on={false} onClick={() => setDue(null)}>
                  Clear
                </Pill>
              )}
            </div>
          </Field>

          {extended && (
            <Field icon={<Clock className="h-4 w-4" />} label="Time">
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={(todo.due_time ?? "").slice(0, 5)}
                  onChange={(e) =>
                    onChange({ due_time: e.target.value || null, ...(e.target.value && !todo.due_date ? { due_date: today } : {}) })
                  }
                  aria-label="Due time"
                  className="rounded-md px-2 py-1 text-sm outline-none"
                  style={{ border: `1px solid ${C.border}` }}
                />
                {todo.due_time && (
                  <Pill on={false} onClick={() => onChange({ due_time: null })}>
                    Clear
                  </Pill>
                )}
              </div>
            </Field>
          )}

          {extended && (
            <Field icon={<Flag className="h-4 w-4" />} label="Priority">
              <div className="inline-flex rounded-lg p-0.5" style={{ background: "#f4f4f2" }}>
                {[...PRIORITIES].reverse().map((p) => {
                  const on = (todo.priority ?? 0) === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => onChange({ priority: p.value })}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                      style={{ background: on ? "#fff" : "transparent", color: on ? C.text : C.muted, boxShadow: on ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}
                      aria-pressed={on}
                    >
                      <Flag className="h-3.5 w-3.5" style={{ color: p.color, fill: p.value ? p.color : "none" }} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {listsOn && (
            <Field icon={<Inbox className="h-4 w-4" />} label="List">
              <div className="flex items-center gap-2">
                <ListDot color={lists.find((l) => l.id === todo.list_id)?.color ?? null} />
                <select
                  value={todo.list_id ?? ""}
                  onChange={(e) => onChange({ list_id: e.target.value || null })}
                  aria-label="List"
                  className="rounded-md px-2 py-1 text-sm outline-none"
                  style={{ border: `1px solid ${C.border}`, background: "#fff" }}
                >
                  <option value="">Inbox</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          )}

          <Field icon={<Briefcase className="h-4 w-4" />} label="Business">
            <div className="inline-flex rounded-lg p-0.5" style={{ background: "#f4f4f2" }}>
              {(["hair", "legal", "both"] as TodoBusiness[]).map((b) => {
                const on = todo.business === b;
                const col = b === "both" ? { fg: C.text, bg: "#fff" } : BUSINESS_COLOR[b];
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onChange({ business: b })}
                    className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                    style={{ background: on ? col.bg : "transparent", color: on ? col.fg : C.muted }}
                    aria-pressed={on}
                  >
                    {b === "hair" ? "Hair Transplants" : b === "legal" ? "Legal" : "Both"}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="mt-5">
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Notes"
            aria-label="Notes"
            className="w-full resize-none rounded-lg px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:bg-white"
            style={{ background: "#fafaf9", border: `1px solid ${C.soft}`, color: C.text }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 text-xs" style={{ borderTop: `1px solid ${C.soft}`, color: C.faint }}>
        <span className="truncate">{createdLine}</span>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors hover:bg-[#fdf0f0]"
          style={{ color: "#b83232" }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="flex w-[84px] shrink-0 items-center gap-2 pt-1 text-xs" style={{ color: C.muted }}>
        <span className="flex w-4 justify-center" style={{ color: C.faint }}>
          {icon}
        </span>
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-xs transition-colors"
      style={{ background: on ? C.accentSoft : "#f4f4f2", color: on ? C.accent : C.muted, fontWeight: on ? 600 : 400 }}
    >
      {children}
    </button>
  );
}
