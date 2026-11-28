import { AlignLeft } from "lucide-react";
import type { Todo, TodoList } from "@/lib/todo";
import { BusinessTag, C, DueChip, ListDot, PriorityFlag, TaskCheckbox } from "./bits";

export function TaskRow({
  todo,
  today,
  list,
  showList,
  selected,
  done,
  onToggle,
  onOpen,
}: {
  todo: Todo;
  today: string;
  list: TodoList | null;
  showList: boolean;
  selected: boolean;
  /** Visually done (true straight away while the tick animation plays). */
  done: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className="todo-row-in group relative flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors sm:px-4"
      style={{ background: selected ? C.accentSoft : undefined, borderTop: `1px solid ${C.soft}` }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onOpen();
      }}
      tabIndex={0}
      aria-selected={selected}
    >
      {selected && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: C.accent }} />}
      <div className="pt-[1px]">
        <TaskCheckbox checked={done} priority={todo.priority} onChange={onToggle} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="todo-title min-w-0 truncate text-[14px] leading-5"
            data-done={done}
            style={{ color: done ? C.faint : C.text }}
          >
            {todo.title}
          </span>
          {todo.notes && <AlignLeft aria-label="Has notes" className="h-3.5 w-3.5 shrink-0" style={{ color: C.faint }} />}
        </div>
        {/* Meta on its own line on phones so titles keep their room. */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
          <Meta todo={todo} today={today} list={list} showList={showList} done={done} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <Meta todo={todo} today={today} list={list} showList={showList} done={done} />
      </div>
    </li>
  );
}

function Meta({ todo, today, list, showList, done }: { todo: Todo; today: string; list: TodoList | null; showList: boolean; done: boolean }) {
  return (
    <>
      {showList && list && (
        <span className="inline-flex max-w-[140px] items-center gap-1.5 truncate text-xs" style={{ color: C.muted }}>
          <ListDot color={list.color} size={7} />
          <span className="truncate">{list.name}</span>
        </span>
      )}
      <BusinessTag business={todo.business} />
      {todo.due_date && <DueChip date={todo.due_date} time={todo.due_time} today={today} done={done} />}
      <PriorityFlag priority={todo.priority} />
    </>
  );
}
