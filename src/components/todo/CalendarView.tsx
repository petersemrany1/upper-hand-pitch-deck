import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  compareTodos,
  monthGrid,
  monthTitle,
  priorityColor,
  shiftMonth,
  timeLabel,
  WEEKDAY_HEADERS,
  type Todo,
} from "@/lib/todo";
import { C, TaskCheckbox } from "./bits";

const MAX_CHIPS = 3;

export function CalendarView({
  tasks,
  today,
  selectedId,
  isDone,
  onOpen,
  onToggle,
  onMove,
  onAdd,
}: {
  tasks: Todo[];
  today: string;
  selectedId: string | null;
  isDone: (t: Todo) => boolean;
  onOpen: (t: Todo) => void;
  onToggle: (t: Todo) => void;
  onMove: (t: Todo, iso: string) => void;
  onAdd: (iso: string, text: string) => void;
}) {
  const [ym, setYm] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const weeks = useMemo(() => monthGrid(ym.year, ym.month, today), [ym, today]);
  const byDay = useMemo(() => {
    const m = new Map<string, Todo[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const arr = m.get(t.due_date) ?? [];
      arr.push(t);
      m.set(t.due_date, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => Number(!!a.done_at) - Number(!!b.done_at) || compareTodos(a, b));
    return m;
  }, [tasks]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const isCurrentMonth = ym.year === Number(today.slice(0, 4)) && ym.month === Number(today.slice(5, 7));

  const openPopover = (iso: string) => {
    setDraft("");
    setOpenDay(iso);
  };

  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4" style={{ borderBottom: `1px solid ${C.soft}` }}>
        <h2 className="text-[15px] font-semibold" style={{ color: C.text }}>
          {monthTitle(ym.year, ym.month)}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setYm({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })}
              className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[#f3f3f1]"
              style={{ color: C.muted, border: `1px solid ${C.border}` }}
            >
              Today
            </button>
          )}
          <button type="button" aria-label="Previous month" onClick={() => setYm((v) => shiftMonth(v.year, v.month, -1))} className="rounded-md p-1.5 hover:bg-[#f3f3f1]" style={{ color: C.muted }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setYm((v) => shiftMonth(v.year, v.month, 1))} className="rounded-md p-1.5 hover:bg-[#f3f3f1]" style={{ color: C.muted }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${C.soft}` }}>
        {WEEKDAY_HEADERS.map((d, i) => (
          <div key={d} className="py-1.5 text-center text-[11px] font-medium uppercase tracking-wide" style={{ color: i >= 5 ? C.faint : C.muted }}>
            <span className="sm:hidden">{d.slice(0, 1)}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {weeks.flat().map((day, i) => {
          const list = byDay.get(day.iso) ?? [];
          const extra = list.length - MAX_CHIPS;
          const isOpen = openDay === day.iso;
          return (
            <Popover key={day.iso} open={isOpen} onOpenChange={(o) => setOpenDay(o ? day.iso : null)}>
              <PopoverAnchor asChild>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${day.iso}, ${list.length} task${list.length === 1 ? "" : "s"}`}
                  onClick={() => openPopover(day.iso)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPopover(day.iso);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dropDay !== day.iso) setDropDay(day.iso);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropDay((d) => (d === day.iso ? null : d));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropDay(null);
                    const t = byId.get(e.dataTransfer.getData("text/todo-id"));
                    if (t && t.due_date !== day.iso) onMove(t, day.iso);
                  }}
                  className="group relative flex min-h-[68px] cursor-pointer flex-col gap-0.5 overflow-hidden p-1 outline-none transition-colors hover:bg-[#fafaf9] focus-visible:bg-[#fafaf9] sm:min-h-[104px] sm:p-1.5"
                  style={{
                    borderRight: i % 7 === 6 ? "none" : `1px solid ${C.soft}`,
                    borderBottom: i >= 35 ? "none" : `1px solid ${C.soft}`,
                    background: dropDay === day.iso ? C.accentSoft : isOpen ? "#fafaf9" : day.inMonth ? undefined : "#fcfcfb",
                    boxShadow: dropDay === day.iso ? `inset 0 0 0 1.5px ${C.accent}` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums"
                      style={{
                        background: day.isToday ? C.accent : "transparent",
                        color: day.isToday ? "#fff" : day.inMonth ? (day.weekend ? C.muted : C.text) : "#c8c8c4",
                        fontWeight: day.isToday ? 700 : 500,
                      }}
                    >
                      {day.day}
                    </span>
                    <Plus className="hidden h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 sm:block" style={{ color: C.faint }} />
                  </div>

                  {/* Phones: dots. Wider: draggable chips. */}
                  {list.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 px-0.5 sm:hidden">
                      {list.slice(0, 4).map((t) => (
                        <span key={t.id} className="h-1.5 w-1.5 rounded-full" style={{ background: isDone(t) ? "#d4d4d0" : (t.priority ?? 0) > 0 ? priorityColor(t.priority) : C.accent }} />
                      ))}
                    </div>
                  )}
                  <div className="hidden flex-col gap-0.5 sm:flex">
                    {list.slice(0, MAX_CHIPS).map((t) => (
                      <TaskChip key={t.id} todo={t} done={isDone(t)} selected={selectedId === t.id} onOpen={() => onOpen(t)} />
                    ))}
                    {extra > 0 && (
                      <span className="px-1.5 text-[11px] font-medium" style={{ color: C.muted }}>
                        +{extra} more
                      </span>
                    )}
                  </div>
                </div>
              </PopoverAnchor>
              <PopoverContent align="start" sideOffset={4} className="w-72 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="px-3 pb-1 pt-2.5 text-xs font-semibold" style={{ color: C.text }}>
                  {new Date(`${day.iso}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                </div>
                {list.length > 0 && (
                  <ul className="max-h-60 overflow-y-auto px-1.5">
                    {list.map((t) => (
                      <li
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-[#f7f7f5]"
                        onClick={() => {
                          setOpenDay(null);
                          onOpen(t);
                        }}
                      >
                        <TaskCheckbox checked={isDone(t)} priority={t.priority} onChange={() => onToggle(t)} size={16} />
                        <span className="todo-title min-w-0 flex-1 truncate text-sm" data-done={isDone(t)} style={{ color: isDone(t) ? C.faint : C.text }}>
                          {t.title}
                        </span>
                        {t.due_time && (
                          <span className="text-[11px]" style={{ color: C.faint }}>
                            {timeLabel(t.due_time)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="p-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && draft.trim() && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        onAdd(day.iso, draft.trim());
                        setDraft("");
                      }
                    }}
                    placeholder="Add a task on this day"
                    aria-label="Add a task on this day"
                    className="w-full rounded-md px-2.5 py-1.5 text-sm outline-none"
                    style={{ border: `1px solid ${C.border}`, background: "#fafaf9" }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}

function TaskChip({ todo, done, selected, onOpen }: { todo: Todo; done: boolean; selected: boolean; onOpen: () => void }) {
  const p = todo.priority ?? 0;
  const color = p > 0 ? priorityColor(p) : C.accent;
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/todo-id", todo.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      title={todo.title}
      className="flex w-full min-w-0 cursor-grab items-center gap-1 rounded px-1.5 py-[3px] text-left text-[11.5px] leading-tight transition-colors active:cursor-grabbing"
      style={{
        background: done ? "#f6f6f4" : selected ? "#ffe6df" : `${color}14`,
        color: done ? C.faint : C.text,
        boxShadow: `inset 2px 0 0 ${done ? "#d4d4d0" : color}`,
        textDecoration: done ? "line-through" : "none",
      }}
    >
      {todo.due_time && <span className="shrink-0 tabular-nums" style={{ color: C.muted }}>{timeLabel(todo.due_time)}</span>}
      <span className="truncate">{todo.title}</span>
    </button>
  );
}
