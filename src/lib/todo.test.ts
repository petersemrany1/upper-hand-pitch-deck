import { describe, expect, it } from "bun:test";
import {
  addDaysISO,
  defaultsForList,
  dueLabel,
  groupTodos,
  isMissingSchemaError,
  monthGrid,
  nextMondayISO,
  openCount,
  parseQuickAdd,
  shiftMonth,
  tasksForList,
  timeLabel,
  type Todo,
} from "./todo";

// Wednesday 25 November 2026.
const WED = "2026-11-25";

const todo = (id: string, o: Partial<Todo> = {}): Todo => ({
  id,
  title: id,
  notes: null,
  business: "hair",
  due_date: null,
  assignee_email: null,
  created_by_email: null,
  done_at: null,
  created_at: `2026-11-01T00:00:0${id.length % 10}Z`,
  ...o,
});

describe("parseQuickAdd", () => {
  it("leaves plain text alone", () => {
    expect(parseQuickAdd("Call the clinic", WED)).toEqual({ title: "Call the clinic", due_date: null, due_time: null, priority: null, matched: [] });
  });

  it("reads today and tomorrow", () => {
    expect(parseQuickAdd("Call Sam today", WED)).toMatchObject({ title: "Call Sam", due_date: WED });
    expect(parseQuickAdd("tomorrow send invoice", WED)).toMatchObject({ title: "send invoice", due_date: "2026-11-26" });
    expect(parseQuickAdd("Email firm tmr", WED)).toMatchObject({ title: "Email firm", due_date: "2026-11-26" });
  });

  it("reads weekday names as the next one, today included", () => {
    expect(parseQuickAdd("Pay rent friday", WED).due_date).toBe("2026-11-27");
    expect(parseQuickAdd("Pay rent on Mon", WED).due_date).toBe("2026-11-30");
    expect(parseQuickAdd("Review wednesday", WED).due_date).toBe(WED);
    expect(parseQuickAdd("Pay rent on Mon", WED).title).toBe("Pay rent");
  });

  it("reads next week and next <weekday>", () => {
    expect(nextMondayISO(WED)).toBe("2026-11-30");
    expect(nextMondayISO("2026-11-29")).toBe("2026-11-30"); // Sunday
    expect(parseQuickAdd("Quarterly review next week", WED)).toMatchObject({ title: "Quarterly review", due_date: "2026-11-30" });
    expect(parseQuickAdd("Dentist next friday", WED)).toMatchObject({ title: "Dentist", due_date: "2026-12-04" });
  });

  it("reads in N days / weeks", () => {
    expect(parseQuickAdd("Follow up in 3 days", WED).due_date).toBe("2026-11-28");
    expect(parseQuickAdd("Follow up in 2 weeks", WED).due_date).toBe("2026-12-09");
  });

  it("reads day and month, rolling into next year when passed", () => {
    expect(parseQuickAdd("Renew insurance 12 Dec", WED).due_date).toBe("2026-12-12");
    expect(parseQuickAdd("Renew insurance Feb 3", WED).due_date).toBe("2027-02-03");
    expect(parseQuickAdd("Call 12 people", WED)).toMatchObject({ title: "Call 12 people", due_date: null });
  });

  it("does not treat everyday words as weekdays", () => {
    expect(parseQuickAdd("Buy sun cream", WED)).toMatchObject({ title: "Buy sun cream", due_date: null });
    expect(parseQuickAdd("Book exam on sat", WED)).toMatchObject({ title: "Book exam", due_date: "2026-11-28" });
    expect(parseQuickAdd("Monday", WED)).toMatchObject({ title: "Monday", due_date: null });
  });

  it("reads times and priority", () => {
    expect(parseQuickAdd("Call Jo tomorrow 3pm !high", WED)).toMatchObject({ title: "Call Jo", due_date: "2026-11-26", due_time: "15:00", priority: 3 });
    expect(parseQuickAdd("Standup at 9:30am", WED)).toMatchObject({ title: "Standup", due_date: WED, due_time: "09:30" });
    expect(parseQuickAdd("Lunch 12pm !1", WED)).toMatchObject({ due_time: "12:00", priority: 1 });
    expect(parseQuickAdd("Report !med", WED)).toMatchObject({ title: "Report", priority: 2 });
  });
});

describe("labels", () => {
  it("formats due dates relative to today", () => {
    expect(dueLabel(WED, WED)).toBe("Today");
    expect(dueLabel("2026-11-26", WED)).toBe("Tomorrow");
    expect(dueLabel("2026-11-24", WED)).toBe("Yesterday");
    expect(dueLabel("2026-11-28", WED)).toBe("Saturday");
    expect(dueLabel("2026-12-12", WED)).toBe("12 Dec");
    expect(dueLabel("2027-01-05", WED)).toBe("5 Jan 2027");
  });
  it("formats times", () => {
    expect(timeLabel("15:00:00")).toBe("3pm");
    expect(timeLabel("09:05")).toBe("9:05am");
    expect(timeLabel("00:00")).toBe("12am");
    expect(timeLabel(null)).toBeNull();
  });
});

describe("grouping and lists", () => {
  const tasks = [
    todo("late", { due_date: "2026-11-20" }),
    todo("now", { due_date: WED }),
    todo("now-high", { due_date: WED, priority: 3 }),
    todo("tmr", { due_date: "2026-11-26" }),
    todo("later", { due_date: "2026-12-20", list_id: "L1" }),
    todo("whenever"),
    todo("done-today", { due_date: WED, done_at: "2026-11-25T01:00:00Z" }),
  ];

  it("groups open tasks into Overdue / Today / Tomorrow / Upcoming / No date", () => {
    const open = tasks.filter((t) => !t.done_at);
    const groups = groupTodos(open, WED);
    expect(groups.map((g) => g.key)).toEqual(["overdue", "today", "tomorrow", "upcoming", "nodate"]);
    expect(groups[1].rows.map((t) => t.id)).toEqual(["now-high", "now"]);
  });

  it("drops empty groups", () => {
    expect(groupTodos([todo("x")], WED).map((g) => g.key)).toEqual(["nodate"]);
  });

  it("filters smart lists", () => {
    const ids = (k: Parameters<typeof tasksForList>[1]) => tasksForList(tasks, k, WED).map((t) => t.id);
    expect(ids("today")).toEqual(["late", "now", "now-high", "done-today"]);
    expect(ids("next7")).toEqual(["late", "now", "now-high", "tmr", "done-today"]);
    expect(ids("inbox")).not.toContain("later");
    expect(ids("list:L1")).toEqual(["later"]);
    expect(ids("completed")).toEqual(["done-today"]);
    expect(openCount(tasks, "today", WED)).toBe(3);
    expect(openCount(tasks, "all", WED)).toBe(6);
  });

  it("gives new tasks sensible defaults per list", () => {
    expect(defaultsForList("today", WED)).toEqual({ due_date: WED, list_id: null });
    expect(defaultsForList("list:L1", WED)).toEqual({ due_date: null, list_id: "L1" });
    expect(defaultsForList("inbox", WED)).toEqual({ due_date: null, list_id: null });
  });
});

describe("calendar", () => {
  it("builds a Monday-first 6 week grid", () => {
    const weeks = monthGrid(2026, 11, WED);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // 1 Nov 2026 is a Sunday, so the grid starts Monday 26 Oct.
    expect(weeks[0][0].iso).toBe("2026-10-26");
    expect(weeks[0][6]).toMatchObject({ iso: "2026-11-01", inMonth: true, weekend: true });
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks.flat().filter((d) => d.isToday).map((d) => d.iso)).toEqual([WED]);
  });

  it("shifts months across years", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("adds days across month ends", () => {
    expect(addDaysISO("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("isMissingSchemaError", () => {
  it("spots missing tables and columns", () => {
    expect(isMissingSchemaError({ code: "42703", message: "column portal_todos.priority does not exist" })).toBe(true);
    expect(isMissingSchemaError({ code: "PGRST205", message: "Could not find the table 'public.portal_todo_lists' in the schema cache" })).toBe(true);
    expect(isMissingSchemaError({ message: "Could not find the 'list_id' column of 'portal_todos' in the schema cache" })).toBe(true);
    expect(isMissingSchemaError({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
  });
});
