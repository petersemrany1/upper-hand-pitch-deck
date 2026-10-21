import { describe, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { callAttemptsLabel, createCallHistoryLoader } from "./call-history";
import { buildQueue, dueCallbackIds } from "./queue";

const iso = (day: string, time: string) => new Date(`${day}T${time}:00`).toISOString();
const now = new Date("2026-10-13T11:30:00");
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const call = (n: number, lead = id(1), calledAt = iso("2026-10-13", "09:00"), direction = "outbound") => ({
  id: id(n), lead_id: lead, called_at: calledAt, direction, outcome: "no_answer", status: "completed",
  rep_id: id(500),
});
const lead = (leadId: string, callback: string | null = null) => ({
  id: leadId, status: "no_answer", created_at: iso("2026-10-09", "10:00"), callback_scheduled_at: callback,
});

// Exercise the real PostgREST URL/range builder with an API-sized response cap.
function fixture(initial: ReturnType<typeof call>[]) {
  const state = { rows: initial, failOffset: -1, fail: false, urls: [] as URL[] };
  const db = createClient<Database>("https://calls.example.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      state.urls.push(url);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      if (state.fail || offset === state.failOffset) return new Response(JSON.stringify({ message: "Read failed", code: "XX000" }), { status: 500 });
      const leads = url.searchParams.get("lead_id")!.slice(4, -1).split(",");
      const filter = url.searchParams.get("called_at")!;
      const boundary = new Date(filter.slice(filter.indexOf(".") + 1)).getTime();
      const rows = state.rows.filter((r) => leads.includes(r.lead_id) &&
        (filter.startsWith("gte.") ? new Date(r.called_at).getTime() >= boundary : new Date(r.called_at).getTime() < boundary))
        .sort((a, b) => a.called_at.localeCompare(b.called_at) || a.id.localeCompare(b.id));
      const limit = Math.min(1000, Number(url.searchParams.get("limit") ?? 1000));
      return new Response(JSON.stringify(rows.slice(offset, offset + limit)), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch },
  });
  return { state, db };
}

describe("sales call history", () => {
  test("an older lead shows both Bec's and Nina's calls instead of capping the label at one", async () => {
    const { db, state } = fixture([
      call(10, id(1), iso("2026-10-01", "09:00")),
      { ...call(11), rep_id: id(501), outcome: "had_convo_chase_up" },
      { ...call(12, id(1), iso("2026-10-13", "10:00")), rep_id: id(502) },
    ]);
    const result = await createCallHistoryLoader(db, [id(1)], new AbortController().signal)(now);
    expect(result.counts[id(1)]).toBe(2);
    expect(callAttemptsLabel(13, result.counts[id(1)])).toBe("Day 13 · 2 call attempts today · All reps");
    expect(state.urls.every((u) => !u.searchParams.has("rep_id"))).toBe(true);
    expect(callAttemptsLabel(1, 4)).toBe("Day 1 · 4 call attempts today · All reps");
    expect(callAttemptsLabel(1, 0)).toContain("0 call attempts");
    expect(callAttemptsLabel(1, undefined)).toBe("Call attempts unavailable");
  });

  test("loads calls beyond the first API page and prevents repeat morning queue entries", async () => {
    const { db } = fixture([
      ...Array.from({ length: 1000 }, (_, n) => call(n + 10, id(1), iso("2026-10-12", "10:00"))),
      call(2010, id(2), iso("2026-10-13", "09:00")),
      call(2011, id(2), iso("2026-10-13", "09:20")),
      call(2012, id(2), iso("2026-10-13", "10:00")),
    ]);
    const result = await createCallHistoryLoader(db, [id(1), id(2), id(3)], new AbortController().signal)(now);
    expect(result.counts[id(2)]).toBe(3);
    expect(result.counts[id(3)]).toBe(0);
    expect(result.history[id(2)]?.todayLastAttemptAt).toBe(iso("2026-10-13", "10:00"));
    expect(buildQueue({ leads: [lead(id(2)), lead(id(3))], history: result.history, now, requireHistory: true }).order).toEqual([id(3)]);
  });

  test("large shared lead pools use bounded URLs, including later lead batches", async () => {
    const ids = Array.from({ length: 1001 }, (_, n) => id(n + 1));
    const { db, state } = fixture([call(9000, ids[1000])]);
    const result = await createCallHistoryLoader(db, ids, new AbortController().signal)(now);
    expect(result.counts[ids[1000]]).toBe(1);
    expect(state.urls.every((u) => u.toString().length < 8000)).toBe(true);
    expect(state.urls.every((u) => u.searchParams.get("order") === "called_at.asc,id.asc")).toBe(true);
  });

  test("paginates older history so an old lead cannot become eligible for a young lead's afternoon turn", async () => {
    const { db } = fixture([
      ...Array.from({ length: 1000 }, (_, n) => call(n + 10, id(1), iso("2026-09-01", "10:00"))),
      call(2010, id(2), iso("2026-09-02", "10:00")),
      call(2011, id(2)),
    ]);
    const afternoon = new Date("2026-10-13T14:00:00");
    const result = await createCallHistoryLoader(db, [id(1), id(2)], new AbortController().signal)(afternoon);
    expect(result.firsts[id(2)]).toBe(iso("2026-09-02", "10:00"));
    expect(buildQueue({ leads: [lead(id(2))], history: result.history, now: afternoon, requireHistory: true }).order).toEqual([]);
  });

  test("cached older history never freezes latest attempts or resurfaces an actioned callback", async () => {
    const { db, state } = fixture([call(10, id(1), iso("2026-10-01", "10:00"))]);
    const load = createCallHistoryLoader(db, [id(1)], new AbortController().signal);
    await load(now);
    state.rows.push(call(11, id(1), iso("2026-10-13", "11:30")));
    const refreshed = await load(new Date("2026-10-13T11:31:00"));
    expect(refreshed.history[id(1)]?.attempts).toBe(2);
    expect(refreshed.history[id(1)]?.lastAttemptAt).toBe(iso("2026-10-13", "11:30"));
    expect(refreshed.history[id(1)]?.todayLastAttemptAt).toBe(iso("2026-10-13", "11:30"));
    expect(dueCallbackIds([lead(id(1), iso("2026-10-13", "11:00"))], refreshed.history, now)).toEqual([]);
    expect(state.urls.filter((u) => u.searchParams.get("called_at")?.startsWith("lt.")).length).toBe(1);
  });

  test("inbound calls don't count as dials, but answered and unanswered outbound calls do", async () => {
    const { db } = fixture([
      { ...call(10), outcome: "had_convo_chase_up" },
      call(11), call(12), call(13, id(1), iso("2026-10-13", "10:00"), "inbound"),
    ]);
    const result = await createCallHistoryLoader(db, [id(1)], new AbortController().signal)(now);
    expect(result.counts[id(1)]).toBe(3);
    expect(result.byDay[id(1)]["2026-10-13"].count).toBe(3);
  });

  test("failed pages reject the whole snapshot instead of returning incomplete zero counts", async () => {
    const { db, state } = fixture(Array.from({ length: 1001 }, (_, n) => call(n + 10)));
    state.failOffset = 1000;
    const load = createCallHistoryLoader(db, [id(1), id(2)], new AbortController().signal);
    await expect(load(now)).rejects.toMatchObject({ message: "Read failed" });
    state.failOffset = -1;
    expect((await load(now)).counts[id(1)]).toBe(1001);
    state.fail = true;
    await expect(load(now)).rejects.toMatchObject({ message: "Read failed" });
  });

  test("unknown history stays out of the automatic queue", () => {
    expect(buildQueue({ leads: [lead(id(1))], history: {}, now, requireHistory: true }).order).toEqual([]);
  });

  test("midnight rolls counts over without duplicating calls crossing the cache boundary", async () => {
    const { db, state } = fixture([call(10, id(1), iso("2026-10-11", "10:00")), call(11)]);
    const load = createCallHistoryLoader(db, [id(1)], new AbortController().signal);
    expect((await load(now)).counts[id(1)]).toBe(1);
    state.rows.push(call(12, id(1), iso("2026-10-14", "00:01")));
    const next = await load(new Date("2026-10-14T00:02:00"));
    expect(next.counts[id(1)]).toBe(1);
    expect(next.history[id(1)]?.attempts).toBe(3);
  });
});
