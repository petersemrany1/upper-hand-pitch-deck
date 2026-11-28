// Pure logic for the To Do page: quick-add parsing, grouping, smart lists and
// the calendar month grid. Dates are plain YYYY-MM-DD strings in Sydney time
// (pass sydneyTodayISO() as `today`), so nothing here depends on the browser's
// timezone.

export type TodoBusiness = "hair" | "legal" | "both";
/** 0 none, 1 low, 2 medium, 3 high (TickTick order). */
export type TodoPriority = 0 | 1 | 2 | 3;

export type Todo = {
  id: string;
  title: string;
  notes: string | null;
  business: TodoBusiness;
  due_date: string | null;
  assignee_email: string | null;
  created_by_email: string | null;
  done_at: string | null;
  created_at: string;
  // Added by 20261128150000_portal_todo_lists.sql; absent before it runs.
  list_id?: string | null;
  priority?: number | null;
  due_time?: string | null;
  position?: number | null;
  completed_by_email?: string | null;
};

export type TodoList = {
  id: string;
  name: string;
  color: string | null;
  position: number | null;
  created_at?: string;
};

export type SmartListKey = "today" | "next7" | "inbox" | "all" | "completed" | "chase";
export type ListKey = SmartListKey | `list:${string}`;

export const PRIORITIES: { value: TodoPriority; label: string; color: string }[] = [
  { value: 3, label: "High", color: "#d52b24" },
  { value: 2, label: "Medium", color: "#e09c00" },
  { value: 1, label: "Low", color: "#4772fa" },
  { value: 0, label: "None", color: "#a3a3a0" },
];

export function priorityColor(p: number | null | undefined): string {
  return PRIORITIES.find((x) => x.value === (p ?? 0))?.color ?? "#a3a3a0";
}

export const LIST_COLORS = ["#f4522d", "#e09c00", "#1a7a4a", "#0e9f9a", "#4772fa", "#7c3aed", "#db2777", "#6b6b68"];

// ---------- date helpers (UTC arithmetic on ISO day strings) ----------

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_ALIASES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};
const AMBIGUOUS_DAYS = new Set(["sun", "sat", "wed"]);
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function toUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso: string): number {
  return toUTC(iso).getUTCDay();
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((toUTC(toISO).getTime() - toUTC(fromISO).getTime()) / 86400000);
}

/** Next date (today counts) that falls on `weekday`. */
function nextWeekday(today: string, weekday: number): string {
  return addDaysISO(today, (weekday - weekdayOf(today) + 7) % 7);
}

/** Monday of the week after today's (weeks run Monday to Sunday). */
export function nextMondayISO(today: string): string {
  const dow = weekdayOf(today);
  return addDaysISO(today, dow === 0 ? 1 : 8 - dow);
}

// ---------- quick add ----------

export type QuickAddResult = {
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: TodoPriority | null;
  /** The words that were read as a date / time / priority, for the preview chip. */
  matched: string[];
};

const TIME_RE = /(?:^|\s)(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?=\s|$)|(?:^|\s)at\s+(\d{1,2}):(\d{2})(?=\s|$)/i;
const PRIORITY_RE = /(?:^|\s)!(high|hi|h|medium|med|m|low|lo|l|1|2|3)(?=\s|$)/i;

function cleanup(s: string): string {
  return s.replace(/\s{2,}/g, " ").trim();
}

/**
 * Pull a due date, time and priority out of a quick-add line.
 * Dates: today, tod, tonight, tomorrow, tmr, tmrw,
 * weekday names (mon … sunday, "next friday", "this fri", "on tue"),
 * "next week", "in 3 days", "in 2 weeks", "12 Dec" / "Dec 12".
 * Times: "3pm", "9:30am", "at 14:00". Priority: !high !med !low or !3 !2 !1.
 */
export function parseQuickAdd(input: string, today: string): QuickAddResult {
  let text = ` ${input} `;
  let due_date: string | null = null;
  let due_time: string | null = null;
  let priority: TodoPriority | null = null;
  const matched: string[] = [];

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean) => {
    const m = text.match(re);
    if (m && fn(m)) {
      matched.push(m[0].trim());
      text = text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length);
      return true;
    }
    return false;
  };

  // Priority
  take(PRIORITY_RE, (m) => {
    const k = m[1].toLowerCase();
    priority = (["high", "hi", "h", "3"].includes(k) ? 3 : ["medium", "med", "m", "2"].includes(k) ? 2 : 1) as TodoPriority;
    return true;
  });

  // Dates, most specific first. Every pattern starts on a space and ends before one,
  // so it only ever matches whole words.
  const datePatterns: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [/\s(?:due\s+)?in\s+(\d{1,3})\s+(day|days|week|weeks)(?=\s)/gi, (m) => addDaysISO(today, Number(m[1]) * (m[2].toLowerCase().startsWith("week") ? 7 : 1))],
    [/\s(?:due\s+)?next\s+week(?=\s)/gi, () => nextMondayISO(today)],
    [/\s(?:due\s+)?(?:on\s+)?next\s+([a-z]+)(?=\s)/gi, (m) => {
      const wd = WEEKDAY_ALIASES[m[1].toLowerCase()];
      if (wd === undefined) return null;
      // "next friday" = the Friday in next week's Monday-to-Sunday block.
      return addDaysISO(nextMondayISO(today), (wd + 6) % 7);
    }],
    [/\s(?:due\s+)?(today|tod|tonight)(?=\s)/gi, () => today],
    [/\s(?:due\s+)?(tomorrow|tmr|tmrw|tomoz)(?=\s)/gi, () => addDaysISO(today, 1)],
    [/\s(?:due\s+|on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?=\s)/gi, (m) => monthDay(today, m[2], Number(m[1]))],
    [/\s(?:due\s+|on\s+)?([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?=\s)/gi, (m) => monthDay(today, m[1], Number(m[2]))],
    [/\s((?:due\s+)?(?:on\s+|this\s+)?)([a-z]+)(?=\s)/gi, (m) => {
      const word = m[2].toLowerCase();
      const wd = WEEKDAY_ALIASES[word];
      if (wd === undefined) return null;
      // "sun", "sat" and "wed" are everyday words; only read them as days after on/this/due.
      if (AMBIGUOUS_DAYS.has(word) && !m[1].trim()) return null;
      return nextWeekday(today, wd);
    }],
  ];
  outer: for (const [re, fn] of datePatterns) {
    for (const m of text.matchAll(re)) {
      const value = fn(m);
      if (value === null) continue;
      due_date = value;
      matched.push(m[0].trim());
      if (/tonight/i.test(m[0])) due_time = "19:00";
      text = text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length);
      break outer;
    }
  }

  // Time
  take(TIME_RE, (m) => {
    let h: number;
    let min: number;
    if (m[1] !== undefined) {
      h = Number(m[1]);
      min = Number(m[2] ?? 0);
      const ap = m[3].toLowerCase();
      if (h < 1 || h > 12) return false;
      if (ap === "pm" && h !== 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
    } else {
      h = Number(m[4]);
      min = Number(m[5]);
    }
    if (h > 23 || min > 59) return false;
    due_time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    return true;
  });
  if (due_time && !due_date) due_date = today;

  const title = cleanup(text);
  // Never swallow the whole line: "Friday" on its own stays a task called Friday.
  if (!title) return { title: cleanup(input), due_date: null, due_time: null, priority: null, matched: [] };
  return { title, due_date, due_time, priority, matched };
}

function monthDay(today: string, monthWord: string, day: number): string | null {
  const mi = MONTHS.indexOf(monthWord.slice(0, 3).toLowerCase());
  if (mi < 0 || day < 1 || day > 31) return null;
  // Reject month words that are only a prefix match of something else ("mayor").
  const full = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"][mi];
  const w = monthWord.toLowerCase();
  if (!(w === full || w === MONTHS[mi] || (w.length >= 3 && full.startsWith(w)) || (mi === 8 && w === "sept"))) return null;
  let year = Number(today.slice(0, 4));
  const make = (y: number) => {
    const d = new Date(Date.UTC(y, mi, day));
    return d.getUTCMonth() === mi ? fromUTC(d) : null;
  };
  let iso = make(year);
  if (!iso) return null;
  if (iso < today) {
    year += 1;
    iso = make(year);
  }
  return iso;
}

// ---------- labels ----------

export function dueLabel(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = toUTC(iso);
  if (diff > 1 && diff < 7) return d.toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" });
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}

/** "14:30" or "14:30:00" -> "2:30pm". */
export function timeLabel(t: string | null | undefined): string | null {
  if (!t) return null;
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  const m = Number(ms ?? 0);
  if (Number.isNaN(h)) return null;
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${ap}` : `${h12}${ap}`;
}

export function isOverdue(t: Pick<Todo, "due_date" | "done_at">, today: string): boolean {
  return !t.done_at && !!t.due_date && t.due_date < today;
}

// ---------- sorting, filtering, grouping ----------

export function compareTodos(a: Todo, b: Todo): number {
  const pa = a.priority ?? 0;
  const pb = b.priority ?? 0;
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  if ((a.due_time ?? "") !== (b.due_time ?? "")) {
    if (!a.due_time) return 1;
    if (!b.due_time) return -1;
    return a.due_time < b.due_time ? -1 : 1;
  }
  if (pa !== pb) return pb - pa;
  const posA = a.position ?? 0;
  const posB = b.position ?? 0;
  if (posA !== posB) return posA - posB;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

export function matchesBusiness(t: Pick<Todo, "business">, filter: "all" | "hair" | "legal"): boolean {
  return filter === "all" || t.business === filter || t.business === "both";
}

/** Tasks that belong in a list (open and done; the page splits them). */
export function tasksForList(tasks: Todo[], key: ListKey, today: string): Todo[] {
  const week = addDaysISO(today, 6);
  switch (key) {
    case "today":
      // Today also carries anything overdue, like TickTick.
      return tasks.filter((t) => (t.done_at ? t.due_date === today : !!t.due_date && t.due_date <= today));
    case "next7":
      return tasks.filter((t) => !!t.due_date && t.due_date <= week && (t.done_at ? t.due_date >= today : true));
    case "inbox":
      return tasks.filter((t) => !t.list_id);
    case "all":
      return tasks;
    case "completed":
      return tasks.filter((t) => !!t.done_at);
    case "chase":
      return [];
    default: {
      const id = key.slice(5);
      return tasks.filter((t) => t.list_id === id);
    }
  }
}

export function openCount(tasks: Todo[], key: ListKey, today: string): number {
  return tasksForList(tasks, key, today).filter((t) => !t.done_at).length;
}

export type TodoGroupKey = "overdue" | "today" | "tomorrow" | "upcoming" | "nodate";
export type TodoGroup = { key: TodoGroupKey; label: string; rows: Todo[] };

const GROUP_LABELS: Record<TodoGroupKey, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
  nodate: "No date",
};

/** Group open tasks by due date. Empty groups are dropped. */
export function groupTodos(open: Todo[], today: string): TodoGroup[] {
  const tomorrow = addDaysISO(today, 1);
  const buckets: Record<TodoGroupKey, Todo[]> = { overdue: [], today: [], tomorrow: [], upcoming: [], nodate: [] };
  for (const t of open) {
    if (!t.due_date) buckets.nodate.push(t);
    else if (t.due_date < today) buckets.overdue.push(t);
    else if (t.due_date === today) buckets.today.push(t);
    else if (t.due_date === tomorrow) buckets.tomorrow.push(t);
    else buckets.upcoming.push(t);
  }
  return (Object.keys(buckets) as TodoGroupKey[])
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ key: k, label: GROUP_LABELS[k], rows: [...buckets[k]].sort(compareTodos) }));
}

/** Completed tasks, most recently finished first. */
export function sortCompleted(done: Todo[]): Todo[] {
  return [...done].sort((a, b) => ((a.done_at ?? "") < (b.done_at ?? "") ? 1 : -1));
}

/** Default due date / list for a task added while a list is open. */
export function defaultsForList(key: ListKey, today: string): { due_date: string | null; list_id: string | null } {
  if (key === "today" || key === "next7") return { due_date: today, list_id: null };
  if (key.startsWith("list:")) return { due_date: null, list_id: key.slice(5) };
  return { due_date: null, list_id: null };
}

// ---------- calendar ----------

export type CalendarDay = { iso: string; day: number; inMonth: boolean; isToday: boolean; weekend: boolean };

/** 6 x 7 weeks (Monday first) covering `month` (1-12) of `year`. */
export function monthGrid(year: number, month: number, today: string): CalendarDay[][] {
  const first = fromUTC(new Date(Date.UTC(year, month - 1, 1)));
  const lead = (weekdayOf(first) + 6) % 7; // days since Monday
  const start = addDaysISO(first, -lead);
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = addDaysISO(start, w * 7 + d);
      const wd = weekdayOf(iso);
      row.push({
        iso,
        day: Number(iso.slice(8, 10)),
        inMonth: Number(iso.slice(5, 7)) === month,
        isToday: iso === today,
        weekend: wd === 0 || wd === 6,
      });
    }
    weeks.push(row);
  }
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthTitle(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
}

export const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- schema fallbacks ----------

/** True when a Supabase error means a table or column from a newer migration isn't there yet. */
export function isMissingSchemaError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code && ["42703", "42P01", "PGRST204", "PGRST205", "PGRST200"].includes(err.code)) return true;
  return /does not exist|schema cache|could not find the/i.test(err.message ?? "");
}

export { WEEKDAYS };
