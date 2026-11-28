import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronsUpDown, List as ListIcon, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BUSINESS_COLOR } from "@/lib/business";
import { sydneyTodayISO } from "@/lib/timezone";
import {
  defaultsForList,
  dueLabel,
  groupTodos,
  matchesBusiness,
  openCount,
  parseQuickAdd,
  sortCompleted,
  tasksForList,
  type ListKey,
  type Todo,
  type TodoBusiness,
} from "@/lib/todo";
import { C, ListDot, TodoStyles } from "@/components/todo/bits";
import { CalendarView } from "@/components/todo/CalendarView";
import { ChaseRequests } from "@/components/todo/ChaseRequests";
import { ListsNav, SMART_LISTS } from "@/components/todo/ListsNav";
import { QuickAdd } from "@/components/todo/QuickAdd";
import { TaskDetail } from "@/components/todo/TaskDetail";
import { TaskRow } from "@/components/todo/TaskRow";
import { useTodos, type TodoDraft } from "@/components/todo/useTodos";

export const Route = createFileRoute("/_dashboard/todo")({
  head: () => ({ meta: [{ title: "To Do" }] }),
  component: TodoPage,
});

type Filter = "all" | "hair" | "legal";
type View = "list" | "calendar";

const COMPLETE_DELAY_MS = 600;

function readPref<T extends string>(key: string, fallback: T, allowed: (v: string) => boolean): T {
  try {
    const v = window.localStorage.getItem(key);
    return v && allowed(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

/** Sydney "today", rolling over at midnight while the page stays open. */
function useSydneyToday(): string {
  const [today, setToday] = useState(() => sydneyTodayISO());
  useEffect(() => {
    const id = window.setInterval(() => setToday(sydneyTodayISO()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return today;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

function TodoPage() {
  const { user } = useAuth();
  const store = useTodos(user?.email ?? null);
  const { items, lists, loading, missingTable, extended, listsOn } = store;
  const today = useSydneyToday();

  const [active, setActiveState] = useState<ListKey>("today");
  const [view, setViewState] = useState<View>("list");
  const [filter, setFilterState] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [clinicChase, setClinicChase] = useState<number | null>(null);
  const [firmChase, setFirmChase] = useState<number | null>(null);
  // Tasks ticked a moment ago: shown done while the tick plays, then moved.
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());
  const quickAddRef = useRef<HTMLInputElement>(null);

  // Remembered per browser: last list, view and business filter.
  useEffect(() => {
    setActiveState(readPref<ListKey>("todo.list", "today", (v) => SMART_LISTS.some((s) => s.key === v) || v.startsWith("list:")));
    setViewState(readPref<View>("todo.view", "list", (v) => v === "list" || v === "calendar"));
    setFilterState(readPref<Filter>("todo.filter", "all", (v) => ["all", "hair", "legal"].includes(v)));
  }, []);
  const setActive = (k: ListKey) => {
    setActiveState(k);
    writePref("todo.list", k);
    setNavOpen(false);
    setShowDone(false);
  };
  const setView = (v: View) => {
    setViewState(v);
    writePref("todo.view", v);
  };
  const setFilter = (f: Filter) => {
    setFilterState(f);
    writePref("todo.filter", f);
  };

  // A remembered list that was deleted (or lists aren't available yet) falls back.
  useEffect(() => {
    if (loading || !active.startsWith("list:")) return;
    if (!listsOn || !lists.some((l) => `list:${l.id}` === active)) setActiveState(listsOn ? "inbox" : "today");
  }, [loading, active, lists, listsOn]);

  // Cheap count for the Chase requests badge before that list is opened.
  useEffect(() => {
    supabase
      .from("clinic_appointments")
      .select("id", { count: "exact", head: true })
      .eq("chase_status", "requested")
      .then(({ count, error }) => {
        if (!error && typeof count === "number") setClinicChase(count);
      });
  }, []);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const scoped = useMemo(() => items.filter((t) => matchesBusiness(t, filter)), [items, filter]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const selected = selectedId ? items.find((t) => t.id === selectedId) ?? null : null;

  useEffect(() => {
    if (selectedId && !loading && !items.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [items, selectedId, loading]);

  const isDone = useCallback((t: Todo) => (completing.has(t.id) ? true : !!t.done_at), [completing]);

  const counts = useMemo(() => {
    const c: Partial<Record<ListKey, number | null>> = {};
    for (const s of SMART_LISTS) if (s.key !== "completed" && s.key !== "chase") c[s.key] = openCount(scoped, s.key, today);
    for (const l of lists) c[`list:${l.id}`] = openCount(scoped, `list:${l.id}`, today);
    const chase = (filter !== "legal" ? clinicChase ?? 0 : 0) + (filter !== "hair" ? firmChase ?? 0 : 0);
    c.chase = chase || null;
    return c;
  }, [scoped, lists, today, filter, clinicChase, firmChase]);

  const inList = useMemo(() => tasksForList(scoped, active, today), [scoped, active, today]);
  const openTasks = inList.filter((t) => !t.done_at);
  const doneTasks = sortCompleted(inList.filter((t) => !!t.done_at));
  const groups = useMemo(() => groupTodos(openTasks, today), [openTasks, today]);

  const toggle = (t: Todo, animate = true) => {
    const pending = timers.current.get(t.id);
    if (pending !== undefined) {
      // Second click during the tick: cancel it.
      window.clearTimeout(pending);
      timers.current.delete(t.id);
      setCompleting((s) => {
        const n = new Set(s);
        n.delete(t.id);
        return n;
      });
      return;
    }
    if (t.done_at || !animate) {
      void store.toggleTask(t);
      return;
    }
    setCompleting((s) => new Set(s).add(t.id));
    const id = window.setTimeout(() => {
      timers.current.delete(t.id);
      setCompleting((s) => {
        const n = new Set(s);
        n.delete(t.id);
        return n;
      });
      void store.toggleTask(t);
    }, COMPLETE_DELAY_MS);
    timers.current.set(t.id, id);
  };

  const defaultBusiness: TodoBusiness = filter === "legal" ? "legal" : "hair";
  const listDefaults = defaultsForList(active, today);
  const defaultList = listsOn ? listDefaults.list_id : null;

  // Add a task, and say where it went if it lands outside the open list.
  const addTask = async (draft: TodoDraft) => {
    const saved = await store.addTask(draft);
    if (saved && (!matchesBusiness(saved, filter) || tasksForList([saved], active, today).length === 0)) {
      const where = saved.due_date ? `for ${dueLabel(saved.due_date, today)}` : saved.list_id ? `to ${listById.get(saved.list_id)?.name ?? "its list"}` : "to the Inbox";
      toast.success(`Added ${where}`, { description: saved.title });
    }
    return saved;
  };

  const addOnDay = (iso: string, text: string) => {
    const p = parseQuickAdd(text, today);
    void store.addTask({
      title: p.title,
      business: defaultBusiness,
      due_date: iso,
      ...(extended ? { due_time: p.due_time, priority: p.priority ?? 0, list_id: defaultList } : {}),
    });
  };

  // Keyboard: Escape closes the task panel, N jumps to quick add.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const overlayOpen = !!document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [data-radix-popper-content-wrapper]');
      if (e.key === "Escape" && selectedId && !overlayOpen) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setSelectedId(null);
        return;
      }
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target) && !overlayOpen) {
        e.preventDefault();
        quickAddRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const activeSmart = SMART_LISTS.find((s) => s.key === active);
  const activeList = active.startsWith("list:") ? listById.get(active.slice(5)) ?? null : null;
  const title = activeSmart?.label ?? activeList?.name ?? "To Do";
  const showViewToggle = active !== "chase" && active !== "completed";
  const effectiveView: View = showViewToggle ? view : "list";
  // The calendar shows the open list's tasks; smart date lists show everything dated.
  const calendarTasks = active === "inbox" || active.startsWith("list:") ? inList : scoped;

  const subtitle =
    active === "today"
      ? new Date(`${today}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      : active === "chase"
        ? "Patients and clients partners have asked us to follow up"
        : active === "completed"
          ? `${doneTasks.length} completed`
          : `${openTasks.length} open`;

  const nav = (
    <ListsNav
      active={active}
      onSelect={setActive}
      counts={counts}
      lists={lists}
      listsOn={listsOn && !missingTable}
      onCreate={store.createList}
      onRename={(id, name) => void store.updateList(id, { name })}
      onRecolor={(id, color) => void store.updateList(id, { color })}
      onDelete={(id) => void store.deleteList(id)}
    />
  );

  return (
    <div className="flex h-full min-h-0" style={{ background: C.bg }}>
      <TodoStyles />

      {/* Lists column (wide screens) */}
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto lg:flex" style={{ borderRight: `1px solid ${C.border}`, background: "#fbfbfa" }}>
        <div className="px-4 pb-1 pt-5 text-[15px] font-bold" style={{ color: C.text }}>
          To Do
        </div>
        {nav}
      </aside>

      {/* Lists sheet (narrow screens) */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0" style={{ background: "#fbfbfa" }}>
          <SheetHeader className="px-4 pb-1 pt-5 text-left">
            <SheetTitle className="text-[15px]">To Do</SheetTitle>
          </SheetHeader>
          {nav}
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3 pt-1 md:pt-5 sm:px-6 ${selected ? "" : "md:pr-16"}`}>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="-ml-1 flex items-center gap-2 rounded-lg px-1 py-0.5 text-left lg:pointer-events-none"
              aria-label="Choose a list"
            >
              {activeList ? <ListDot color={activeList.color} size={10} /> : active === "today" ? <Sun className="h-5 w-5" style={{ color: C.accent }} /> : null}
              <h1 className="truncate text-[22px] font-bold tracking-tight" style={{ color: C.text }}>
                {title}
              </h1>
              <ChevronsUpDown className="h-4 w-4 shrink-0 lg:hidden" style={{ color: C.faint }} />
            </button>
            <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
              {subtitle}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {showViewToggle && (
              <Segmented
                value={view}
                onChange={(v) => setView(v as View)}
                options={[
                  { value: "list", label: "List", icon: <ListIcon className="h-3.5 w-3.5" /> },
                  { value: "calendar", label: "Calendar", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                ]}
              />
            )}
            <Segmented
              value={filter}
              onChange={(v) => setFilter(v as Filter)}
              options={[
                { value: "all", label: "All" },
                { value: "hair", label: "Hair", tint: BUSINESS_COLOR.hair },
                { value: "legal", label: "Legal", tint: BUSINESS_COLOR.legal },
              ]}
            />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-10 sm:px-6">
          {active === "chase" ? (
            <ChaseRequests filter={filter} onClinicCount={setClinicChase} onFirmCount={setFirmChase} />
          ) : missingTable ? (
            <div className="rounded-xl p-4 text-sm" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
              The to-do list needs one database update before it can save tasks (migration 20261127120000_portal_todos.sql). Chase requests
              already work.
            </div>
          ) : (
            <>
              {active !== "completed" && (
                <div className="mb-4">
                  <QuickAdd
                    today={today}
                    defaultDue={listDefaults.due_date}
                    defaultList={defaultList}
                    defaultBusiness={defaultBusiness}
                    lists={lists}
                    extended={extended}
                    inputRef={quickAddRef}
                    placeholder={activeList ? `Add a task to ${activeList.name}, press Enter` : undefined}
                    onAdd={addTask}
                  />
                </div>
              )}

              {loading ? (
                <LoadingRows />
              ) : effectiveView === "calendar" ? (
                <div className="min-h-0 flex-1">
                  <CalendarView
                    tasks={calendarTasks}
                    today={today}
                    selectedId={selectedId}
                    isDone={isDone}
                    onOpen={(t) => setSelectedId(t.id)}
                    onToggle={(t) => toggle(t, false)}
                    onMove={(t, iso) => void store.updateTask(t.id, { due_date: iso })}
                    onAdd={addOnDay}
                  />
                  <p className="mt-2 hidden text-[11px] sm:block" style={{ color: C.faint }}>
                    Click a day to add a task. Drag a task to another day to move it.
                  </p>
                </div>
              ) : active === "completed" ? (
                doneTasks.length === 0 ? (
                  <Empty icon={<CheckCircle2 className="h-6 w-6" />} title="Nothing completed yet" body="Ticked-off tasks will collect here." />
                ) : (
                  <TaskCard>
                    {doneTasks.slice(0, 300).map((t) => (
                      <TaskRow
                        key={t.id}
                        todo={t}
                        today={today}
                        list={t.list_id ? listById.get(t.list_id) ?? null : null}
                        showList={listsOn}
                        selected={selectedId === t.id}
                        done={isDone(t)}
                        onToggle={() => toggle(t)}
                        onOpen={() => setSelectedId(t.id)}
                      />
                    ))}
                  </TaskCard>
                )
              ) : (
                <div className="space-y-6">
                  {groups.length === 0 && (
                    <Empty
                      icon={active === "today" ? <Sun className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                      title={active === "today" ? "All clear for today" : active === "next7" ? "Nothing in the next 7 days" : "No open tasks"}
                      body={doneTasks.length ? "Everything here is done. Nice work." : "Type above and press Enter to add one."}
                    />
                  )}
                  {groups.map((g) => (
                    <div key={g.key}>
                      <h2 className="mb-2 flex items-center gap-2 px-1 text-[12px] font-semibold" style={{ color: g.key === "overdue" ? C.red : C.text }}>
                        {g.label}
                        <span className="font-normal" style={{ color: C.faint }}>
                          {g.rows.length}
                        </span>
                      </h2>
                      <TaskCard>
                        {g.rows.map((t) => (
                          <TaskRow
                            key={t.id}
                            todo={t}
                            today={today}
                            list={t.list_id ? listById.get(t.list_id) ?? null : null}
                            showList={listsOn && !active.startsWith("list:")}
                            selected={selectedId === t.id}
                            done={isDone(t)}
                            onToggle={() => toggle(t)}
                            onOpen={() => setSelectedId(t.id)}
                          />
                        ))}
                      </TaskCard>
                    </div>
                  ))}

                  {doneTasks.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowDone((v) => !v)}
                        className="mb-2 inline-flex items-center gap-1.5 px-1 text-[12px] font-semibold"
                        style={{ color: C.muted }}
                        aria-expanded={showDone}
                      >
                        <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: showDone ? "none" : "rotate(-90deg)" }} />
                        Completed
                        <span className="font-normal" style={{ color: C.faint }}>
                          {doneTasks.length}
                        </span>
                      </button>
                      {showDone && (
                        <TaskCard>
                          {doneTasks.slice(0, 100).map((t) => (
                            <TaskRow
                              key={t.id}
                              todo={t}
                              today={today}
                              list={t.list_id ? listById.get(t.list_id) ?? null : null}
                              showList={listsOn && !active.startsWith("list:")}
                              selected={selectedId === t.id}
                              done={isDone(t)}
                              onToggle={() => toggle(t)}
                              onOpen={() => setSelectedId(t.id)}
                            />
                          ))}
                        </TaskCard>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Task detail: full screen on phones, slide-over on tablets, a column on desktop. */}
      {selected && (
        <>
          <div className="fixed inset-0 z-[55] hidden bg-black/10 md:block lg:hidden" onClick={() => setSelectedId(null)} aria-hidden />
          <aside
            className="todo-panel-in fixed inset-0 z-[60] flex flex-col md:inset-y-0 md:left-auto md:right-0 md:w-[400px] md:shadow-2xl lg:static lg:z-auto lg:w-[380px] lg:shrink-0 lg:shadow-none xl:w-[420px]"
            style={{ background: C.card, borderLeft: `1px solid ${C.border}` }}
            aria-label="Task details"
          >
            <TaskDetail
              key={selected.id}
              todo={selected}
              today={today}
              lists={lists}
              extended={extended}
              listsOn={listsOn}
              onChange={(patch) => void store.updateTask(selected.id, patch)}
              onToggle={() => toggle(selected, false)}
              onDelete={() => {
                setSelectedId(null);
                void store.removeTask(selected);
              }}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        </>
      )}
    </div>
  );
}

function TaskCard({ children }: { children: React.ReactNode }) {
  return (
    <ul className="overflow-hidden rounded-xl [&>li:first-child]:border-t-0" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      {children}
    </ul>
  );
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl px-6 py-14 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: C.accentSoft, color: C.accent }}>
        {icon}
      </div>
      <div className="text-sm font-semibold" style={{ color: C.text }}>
        {title}
      </div>
      <div className="mt-1 text-xs" style={{ color: C.muted }}>
        {body}
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <TaskCard>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${C.soft}` }}>
          <span className="h-[18px] w-[18px] animate-pulse rounded-[5px]" style={{ background: "#f0f0ee" }} />
          <span className="h-3 animate-pulse rounded" style={{ background: "#f0f0ee", width: `${40 + i * 12}%` }} />
        </li>
      ))}
    </TaskCard>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode; tint?: { fg: string; bg: string } }[];
}) {
  return (
    <div className="inline-flex rounded-lg p-0.5" style={{ background: "#efefed" }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all"
            style={{
              background: on ? (o.tint ? o.tint.bg : "#fff") : "transparent",
              color: on ? (o.tint ? o.tint.fg : C.text) : C.muted,
              boxShadow: on ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {o.icon}
            <span className={o.icon ? "hidden sm:inline" : undefined}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
