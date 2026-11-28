import { useEffect, useMemo, useState, type RefObject } from "react";
import { Plus } from "lucide-react";
import { BUSINESS_COLOR } from "@/lib/business";
import { parseQuickAdd, type TodoBusiness, type TodoList, type TodoPriority } from "@/lib/todo";
import type { TodoDraft } from "./useTodos";
import { C, DueChip, ListDot, PriorityFlag } from "./bits";

const BUSINESS_OPTIONS: { value: TodoBusiness; label: string }[] = [
  { value: "hair", label: "Hair" },
  { value: "legal", label: "Legal" },
  { value: "both", label: "Both" },
];

export function QuickAdd({
  today,
  defaultDue,
  defaultList,
  defaultBusiness,
  lists,
  extended,
  inputRef,
  placeholder = "Add a task, press Enter",
  onAdd,
}: {
  today: string;
  defaultDue: string | null;
  defaultList: string | null;
  defaultBusiness: TodoBusiness;
  lists: TodoList[];
  extended: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
  onAdd: (draft: TodoDraft) => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const [business, setBusiness] = useState<TodoBusiness>(defaultBusiness);
  const [focused, setFocused] = useState(false);
  useEffect(() => setBusiness(defaultBusiness), [defaultBusiness]);

  const parsed = useMemo(() => parseQuickAdd(text, today), [text, today]);
  const due = parsed.due_date ?? defaultDue;
  const dueTime = extended ? parsed.due_time : null;
  const priority: TodoPriority = extended ? (parsed.priority ?? 0) : 0;
  const list = defaultList ? lists.find((l) => l.id === defaultList) ?? null : null;

  const submit = () => {
    const title = parsed.title.trim();
    if (!title) return;
    const draft: TodoDraft = { title, business, due_date: due };
    if (extended) {
      draft.priority = priority;
      draft.due_time = dueTime;
      draft.list_id = defaultList;
    }
    setText("");
    void onAdd(draft);
  };

  const active = focused || text.length > 0;

  return (
    <div
      className="rounded-xl transition-shadow"
      style={{
        background: C.card,
        border: `1px solid ${active ? "#f7b9a8" : C.border}`,
        boxShadow: active ? "0 0 0 3px rgba(244,82,45,0.08)" : "none",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Plus className="h-4 w-4 shrink-0" style={{ color: active ? C.accent : C.faint }} />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              // Keep an open task panel open when Escape is only clearing the draft.
              if (text) e.preventDefault();
              setText("");
              e.currentTarget.blur();
            }
          }}
          placeholder={placeholder}
          aria-label="Add a task"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a3a3a0]"
          maxLength={500}
          enterKeyHint="done"
        />
      </div>
      {active && (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5 pl-9">
          {due && <DueChip date={due} time={dueTime} today={today} />}
          {priority > 0 && <PriorityFlag priority={priority} />}
          {list && (
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
              <ListDot color={list.color} size={7} /> {list.name}
            </span>
          )}
          <div className="ml-auto inline-flex rounded-full p-0.5" style={{ background: "#f4f4f2" }}>
            {BUSINESS_OPTIONS.map((o) => {
              const on = business === o.value;
              const colors = o.value === "both" ? { bg: "#fff", fg: C.text } : BUSINESS_COLOR[o.value];
              return (
                <button
                  key={o.value}
                  type="button"
                  // Keep focus in the input while picking.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBusiness(o.value)}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors"
                  style={{ background: on ? colors.bg : "transparent", color: on ? colors.fg : C.muted }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          {!text && (
            <span className="w-full text-[11px]" style={{ color: C.faint }}>
              Try “Call Sam tomorrow{extended ? " 3pm !high" : ""}”. Dates like today, friday or next week are picked up.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
