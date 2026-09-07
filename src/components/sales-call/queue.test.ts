import { describe, expect, test } from "bun:test";
import {
  buildHistory,
  buildQueue,
  callbackWindow,
  dueCallbackIds,
  isDueToday,
  isExcluded,
  isYoungLead,
  type CallHistory,
  type QueueLead,
} from "./queue";
import { normaliseStatus } from "./status";

// All times local. Tests pin "now" so the AM/PM logic is deterministic.
const at = (day: string, hm: string) => new Date(`${day}T${hm}:00`);
const iso = (day: string, hm: string) => at(day, hm).toISOString();
const TODAY = "2026-09-07";
const MORNING = at(TODAY, "09:30");
const AFTERNOON = at(TODAY, "14:00");

const lead = (o: Partial<QueueLead> & { id: string }): QueueLead => ({
  status: null,
  created_at: iso("2026-09-06", "10:00"),
  callback_scheduled_at: null,
  ...o,
});
const hist = (o: Partial<CallHistory> = {}): CallHistory => ({
  attempts: 0, firstCallAt: null, lastAttemptAt: null, todayAttempts: 0, todayFirstAttemptAt: null, todayLastAttemptAt: null, ...o,
});

describe("normaliseStatus", () => {
  test("maps raw values", () => {
    expect(normaliseStatus("Callback Scheduled")).toBe("callback_scheduled");
    expect(normaliseStatus("booked_deposit_paid")).toBe("booked_deposit_paid");
    expect(normaliseStatus("Booked — No Deposit")).toBe("booked_no_deposit");
    expect(normaliseStatus("contacted")).toBe("no_answer");
    expect(normaliseStatus("")).toBe("new");
    expect(normaliseStatus(null)).toBe("new");
  });
});

describe("exclusions", () => {
  test("booked (either kind), not interested, no sale, dropped, cancelled, no-show never queue", () => {
    for (const s of ["booked_no_deposit", "booked_deposit_paid", "not_interested", "had_convo_no_sale", "dropped", "cancelled", "no_show"]) {
      expect(isExcluded(lead({ id: s, status: s }))).toBe(true);
    }
    expect(isExcluded(lead({ id: "n", status: "new" }))).toBe(false);
    expect(isExcluded(lead({ id: "c", status: "had_convo_chase_up" }))).toBe(false);
  });
  test("an upcoming diary booking locks the lead out whatever the status says", () => {
    expect(isExcluded(lead({ id: "b", status: "new", booking_date: "2026-09-10" }), MORNING)).toBe(true);
    expect(isExcluded(lead({ id: "b2", status: "no_answer", booking_date: TODAY }), MORNING)).toBe(true);
    expect(isExcluded(lead({ id: "past", status: "new", booking_date: "2026-08-01" }), MORNING)).toBe(false);
  });
  test("post-consult leads never queue; a re-enquiry that never booked does", () => {
    expect(isExcluded(lead({ id: "p", status: "no_answer", lead_class: "post_consult" }))).toBe(true);
    expect(isExcluded(lead({ id: "r", status: "new", lead_class: "returning" }))).toBe(false);
    expect(isExcluded(lead({ id: "b", status: "new", lead_class: "booked_active" }))).toBe(false);
    expect(isExcluded(lead({ id: "f", status: "new", lead_class: "new" }))).toBe(false);
  });
});

describe("once a day, twice for young leads", () => {
  test("never called today → due", () => {
    expect(isDueToday(hist(), MORNING)).toBe(true);
  });
  test("called this morning, young lead, now afternoon → due again", () => {
    const h = hist({ attempts: 1, firstCallAt: iso(TODAY, "09:00"), todayAttempts: 1, todayFirstAttemptAt: iso(TODAY, "09:00") });
    expect(isDueToday(h, AFTERNOON)).toBe(true);
    expect(isDueToday(h, at(TODAY, "11:00"))).toBe(false);
  });
  test("called this afternoon already → not due again", () => {
    const h = hist({ attempts: 1, firstCallAt: iso(TODAY, "13:00"), todayAttempts: 1, todayFirstAttemptAt: iso(TODAY, "13:00") });
    expect(isDueToday(h, at(TODAY, "16:00"))).toBe(false);
  });
  test("a morning call-and-call-back (2 dials) still gets the afternoon turn", () => {
    const h = hist({ attempts: 2, firstCallAt: iso(TODAY, "09:00"), todayAttempts: 2, todayFirstAttemptAt: iso(TODAY, "09:00"), todayLastAttemptAt: iso(TODAY, "09:01") });
    expect(isDueToday(h, AFTERNOON)).toBe(true);
  });
  test("morning and afternoon sittings done → finished for the day", () => {
    const h = hist({ attempts: 3, firstCallAt: iso(TODAY, "09:00"), todayAttempts: 3, todayFirstAttemptAt: iso(TODAY, "09:00"), todayLastAttemptAt: iso(TODAY, "14:05") });
    expect(isDueToday(h, at(TODAY, "16:00"))).toBe(false);
    const h2 = hist({ attempts: 2, firstCallAt: iso(TODAY, "09:00"), todayAttempts: 2, todayFirstAttemptAt: iso(TODAY, "09:00"), todayLastAttemptAt: iso(TODAY, "14:05") });
    expect(isDueToday(h2, at(TODAY, "16:00"))).toBe(false);
  });
  test("old lead (first called 3 weeks ago) only once a day", () => {
    const h = hist({ attempts: 9, firstCallAt: iso("2026-08-15", "09:00"), todayAttempts: 1, todayFirstAttemptAt: iso(TODAY, "09:00") });
    expect(isYoungLead(h, AFTERNOON)).toBe(false);
    expect(isDueToday(h, AFTERNOON)).toBe(false);
  });
  test("day 14 is still young, day 15 is not", () => {
    expect(isYoungLead(hist({ firstCallAt: iso("2026-08-25", "09:00") }), MORNING)).toBe(true);
    expect(isYoungLead(hist({ firstCallAt: iso("2026-08-24", "09:00") }), MORNING)).toBe(false);
  });
});

describe("callbacks", () => {
  test("live from its time until an hour after, then expired", () => {
    const l = lead({ id: "cb", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "14:00") });
    expect(callbackWindow(l, at(TODAY, "13:59"))).toBe("future");
    expect(callbackWindow(l, at(TODAY, "14:00"))).toBe("live");
    expect(callbackWindow(l, at(TODAY, "14:30"))).toBe("live");
    expect(callbackWindow(l, at(TODAY, "15:00"))).toBe("live");
    expect(callbackWindow(l, at(TODAY, "15:01"))).toBe("expired");
  });
  test("dueCallbackIds: live ones, earliest first, skipping ones already dialled since their time", () => {
    const leads = [
      lead({ id: "b", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "14:15") }),
      lead({ id: "a", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "14:00") }),
      lead({ id: "done", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "14:00") }),
      lead({ id: "later", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "16:00") }),
      lead({ id: "booked", status: "booked_no_deposit", callback_scheduled_at: iso(TODAY, "14:00") }),
    ];
    const history = { done: hist({ attempts: 1, lastAttemptAt: iso(TODAY, "14:05") }) };
    expect(dueCallbackIds(leads, history, at(TODAY, "14:30"))).toEqual(["a", "b"]);
  });
  test("future and live callbacks stay out of the general queue; expired ones fall to the rest", () => {
    const leads = [
      lead({ id: "future", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "16:00") }),
      lead({ id: "live", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "13:45") }),
      lead({ id: "expired", status: "callback_scheduled", callback_scheduled_at: iso(TODAY, "09:00") }),
    ];
    const q = buildQueue({ leads, history: {}, now: AFTERNOON });
    expect(q.order).toEqual(["expired"]);
    expect(q.group.expired).toBe("rest");
  });
});

describe("buildQueue order", () => {
  test("new (newest first) → no answer (fewest attempts) → rest; booked-no-deposit dropped", () => {
    const leads = [
      lead({ id: "new-old", status: "new", created_at: iso("2026-09-01", "09:00") }),
      lead({ id: "new-fresh", status: "new", created_at: iso(TODAY, "08:00") }),
      lead({ id: "na-3", status: "no_answer" }),
      lead({ id: "na-1", status: "no_answer" }),
      lead({ id: "chase", status: "had_convo_chase_up" }),
      lead({ id: "bnd", status: "booked_no_deposit" }),
      lead({ id: "uncategorised-called", status: "new" }), // called but never given an outcome
    ];
    const history = {
      "na-3": hist({ attempts: 3, firstCallAt: iso("2026-09-01", "09:00"), lastAttemptAt: iso("2026-09-05", "09:00") }),
      "na-1": hist({ attempts: 1, firstCallAt: iso("2026-09-05", "09:00"), lastAttemptAt: iso("2026-09-05", "09:00") }),
      "uncategorised-called": hist({ attempts: 2, firstCallAt: iso("2026-09-03", "09:00"), lastAttemptAt: iso("2026-09-04", "09:00") }),
    };
    const q = buildQueue({ leads, history, now: MORNING });
    expect(q.order).toEqual(["new-fresh", "new-old", "na-1", "uncategorised-called", "na-3", "chase"]);
    expect(q.group["uncategorised-called"]).toBe("no_answer");
  });

  test("no-answer rotation: in the afternoon, leads last tried in the morning come first at equal attempts", () => {
    const leads = [
      lead({ id: "tried-pm", status: "no_answer" }),
      lead({ id: "tried-am", status: "no_answer" }),
    ];
    const history = {
      "tried-pm": hist({ attempts: 2, firstCallAt: iso("2026-09-03", "15:00"), lastAttemptAt: iso("2026-09-05", "15:00") }),
      "tried-am": hist({ attempts: 2, firstCallAt: iso("2026-09-03", "09:00"), lastAttemptAt: iso("2026-09-05", "09:00") }),
    };
    expect(buildQueue({ leads, history, now: AFTERNOON }).order).toEqual(["tried-am", "tried-pm"]);
    expect(buildQueue({ leads, history, now: MORNING }).order).toEqual(["tried-pm", "tried-am"]);
  });

  test("leads already served today are left out, young morning-called leads return after noon", () => {
    const leads = [lead({ id: "young", status: "no_answer" }), lead({ id: "old", status: "no_answer" })];
    const history = {
      young: hist({ attempts: 1, firstCallAt: iso(TODAY, "09:00"), lastAttemptAt: iso(TODAY, "09:00"), todayAttempts: 1, todayFirstAttemptAt: iso(TODAY, "09:00"), todayLastAttemptAt: iso(TODAY, "09:00") }),
      old: hist({ attempts: 6, firstCallAt: iso("2026-08-01", "09:00"), lastAttemptAt: iso(TODAY, "09:10"), todayAttempts: 1, todayFirstAttemptAt: iso(TODAY, "09:10"), todayLastAttemptAt: iso(TODAY, "09:10") }),
    };
    expect(buildQueue({ leads, history, now: at(TODAY, "10:00") }).order).toEqual([]);
    expect(buildQueue({ leads, history, now: AFTERNOON }).order).toEqual(["young"]);
  });

  test("paused cities are skipped and the priority city floats to the front within group order", () => {
    const leads = [
      lead({ id: "new-syd", status: "new" }),
      lead({ id: "na-byron", status: "no_answer" }),
      lead({ id: "new-byron", status: "new" }),
      lead({ id: "new-perth", status: "new" }),
    ];
    const history = { "na-byron": hist({ attempts: 1, firstCallAt: iso("2026-09-05", "09:00"), lastAttemptAt: iso("2026-09-05", "09:00") }) };
    const q = buildQueue({
      leads, history, now: MORNING,
      isPaused: (l) => l.id.endsWith("perth"),
      isPriority: (l) => l.id.endsWith("byron"),
    });
    expect(q.order).toEqual(["new-byron", "na-byron", "new-syd"]);
  });
});

describe("buildHistory", () => {
  test("counts attempts, first/last, and today's attempts", () => {
    const rows = [
      { lead_id: "a", called_at: iso("2026-09-01", "09:00") },
      { lead_id: "a", called_at: iso(TODAY, "09:05") },
      { lead_id: "a", called_at: iso(TODAY, "08:50") },
      { lead_id: null, called_at: iso(TODAY, "08:50") },
      { lead_id: "b", called_at: null },
    ];
    const h = buildHistory(rows, AFTERNOON);
    expect(h.a).toEqual({
      attempts: 3,
      firstCallAt: iso("2026-09-01", "09:00"),
      lastAttemptAt: iso(TODAY, "09:05"),
      todayAttempts: 2,
      todayFirstAttemptAt: iso(TODAY, "08:50"),
      todayLastAttemptAt: iso(TODAY, "09:05"),
    });
    expect(h.b).toBeUndefined();
  });
});
