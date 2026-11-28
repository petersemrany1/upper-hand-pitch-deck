import { CalendarDays, Flag } from "lucide-react";
import { BusinessChip } from "@/components/business/BusinessSwitch";
import { dueLabel, priorityColor, timeLabel, type TodoBusiness } from "@/lib/todo";

export const C = {
  bg: "#f7f7f5",
  card: "#ffffff",
  border: "#ebebeb",
  soft: "#f3f3f1",
  text: "#111111",
  muted: "#6b6b68",
  faint: "#a3a3a0",
  accent: "#f4522d",
  accentSoft: "#fff1ee",
  red: "#d52b24",
};

/** One-off CSS for the tick animation; rendered once by the page. */
export function TodoStyles() {
  return (
    <style>{`
      .todo-check svg path { stroke-dasharray: 16; stroke-dashoffset: 16; transition: stroke-dashoffset 220ms ease-out 40ms; }
      .todo-check[data-on="true"] svg path { stroke-dashoffset: 0; }
      .todo-check { transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease; }
      .todo-check:active { transform: scale(0.88); }
      .todo-title { background-image: linear-gradient(currentColor, currentColor); background-repeat: no-repeat; background-position: 0 55%; background-size: 0% 1px; transition: background-size 260ms ease, color 200ms ease; }
      .todo-title[data-done="true"] { background-size: 100% 1px; }
      @keyframes todo-pop { 0% { transform: scale(1); } 45% { transform: scale(1.18); } 100% { transform: scale(1); } }
      .todo-check[data-on="true"] { animation: todo-pop 260ms ease-out; }
      @keyframes todo-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
      .todo-row-in { animation: todo-in 180ms ease-out; }
      @keyframes todo-panel-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
      .todo-panel-in { animation: todo-panel-in 180ms ease-out; }
    `}</style>
  );
}

export function TaskCheckbox({
  checked,
  priority,
  onChange,
  size = 18,
}: {
  checked: boolean;
  priority: number | null | undefined;
  onChange: () => void;
  size?: number;
}) {
  const color = (priority ?? 0) > 0 ? priorityColor(priority) : "#b8b8b4";
  const fill = (priority ?? 0) > 0 ? priorityColor(priority) : "#9a9a96";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "Mark not done" : "Mark done"}
      data-on={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="todo-check flex shrink-0 items-center justify-center rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${checked ? fill : color}`,
        background: checked ? fill : (priority ?? 0) > 0 ? `${color}14` : "transparent",
      }}
    >
      <svg viewBox="0 0 16 16" width={size - 6} height={size - 6} fill="none" aria-hidden>
        <path d="M3.5 8.5l3 3 6-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function PriorityFlag({ priority, className = "h-3.5 w-3.5" }: { priority: number | null | undefined; className?: string }) {
  if (!priority) return null;
  const c = priorityColor(priority);
  return <Flag aria-label={["", "Low", "Medium", "High"][priority] + " priority"} className={className} style={{ color: c, fill: c }} />;
}

export function DueChip({ date, time, today, done }: { date: string; time?: string | null; today: string; done?: boolean }) {
  const overdue = !done && date < today;
  const isToday = date === today;
  const t = timeLabel(time);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs"
      style={{ color: done ? C.faint : overdue ? C.red : isToday ? "#2563eb" : C.muted, fontWeight: overdue ? 600 : 400 }}
    >
      <CalendarDays className="h-3 w-3" />
      {dueLabel(date, today)}
      {t ? `, ${t}` : ""}
    </span>
  );
}

export function BusinessTag({ business }: { business: TodoBusiness }) {
  if (business === "both") {
    return (
      <span className="inline-flex gap-1">
        <BusinessChip business="hair" />
        <BusinessChip business="legal" />
      </span>
    );
  }
  return <BusinessChip business={business} />;
}

export function ListDot({ color, size = 8 }: { color: string | null | undefined; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color ?? C.faint }} />;
}
