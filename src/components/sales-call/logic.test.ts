import { describe, expect, test } from "bun:test";
import {
  ATTEMPTS_PER_DAY,
  getTimeSlot,
  leadHasBookedSale,
  leadUrgency,
  normalisePhoneDigits,
  normaliseStatus,
  pipelineDay,
  rawPayloadObject,
  sameLocalDate,
  statusMeta,
  type Lead,
} from "./logic";

/**
 * Characterization tests: these pin the behaviour the portal shipped with
 * BEFORE the Phase 3 decomposition. If one fails after a refactor, the
 * refactor changed behaviour — fix the code, not the test (unless the
 * product decision changed).
 */

const baseLead: Lead = {
  id: "l1", first_name: "Jane", last_name: "Doe",
  email: null, phone: null, funding_preference: null,
  ad_name: null, ad_set_name: null, campaign_name: null,
  status: null, call_notes: null, created_at: "2026-06-01T00:00:00Z",
  callback_scheduled_at: null, day_number: null,
  finance_eligible: null, booking_date: null, booking_time: null,
  clinic_id: null, rep_id: null, raw_payload: null,
};

describe("normaliseStatus", () => {
  test("maps legacy human labels onto keys", () => {
    expect(normaliseStatus("Booked — Deposit Paid")).toBe("booked_deposit_paid");
    expect(normaliseStatus("Booked — No Deposit")).toBe("booked_no_deposit");
    expect(normaliseStatus("Callback Scheduled")).toBe("callback_scheduled");
    expect(normaliseStatus("Spoke — No Sale")).toBe("had_convo_no_sale");
    expect(normaliseStatus("Not Interested")).toBe("not_interested");
    expect(normaliseStatus("No Answer")).toBe("no_answer");
    expect(normaliseStatus("contacted")).toBe("no_answer");
    expect(normaliseStatus("ineligible")).toBe("not_interested");
    expect(normaliseStatus("dropped")).toBe("dropped");
  });

  test("deposit_paid wins over booked", () => {
    expect(normaliseStatus("booked_deposit_paid")).toBe("booked_deposit_paid");
  });

  test("null/empty falls back to new", () => {
    expect(normaliseStatus(null)).toBe("new");
    expect(normaliseStatus("")).toBe("new");
    expect(normaliseStatus("something_weird")).toBe("new");
  });

  test("a scheduled callback rescues an unknown status", () => {
    const lead = { ...baseLead, callback_scheduled_at: "2026-06-02T09:00:00Z" };
    expect(normaliseStatus("something_weird", lead)).toBe("callback_scheduled");
  });

  test("chase up variants", () => {
    expect(normaliseStatus("had_convo_chase_up")).toBe("had_convo_chase_up");
    expect(normaliseStatus("Had Convo — Chase Up")).toBe("had_convo_chase_up");
  });
});

describe("statusMeta", () => {
  test("returns the matching option with label + colours", () => {
    const meta = statusMeta("booked_deposit_paid");
    expect(meta.label).toBe("Booked — Deposit Paid");
    expect(meta.color).toBe("#15803d");
  });

  test("falls back to the New option", () => {
    expect(statusMeta("???").key).toBe("new");
  });
});

describe("leadUrgency", () => {
  test("no callback -> upcoming", () => {
    expect(leadUrgency(baseLead)).toBe("upcoming");
  });

  test("callback in the past -> overdue", () => {
    const l = { ...baseLead, callback_scheduled_at: new Date(Date.now() - 60_000).toISOString() };
    expect(leadUrgency(l)).toBe("overdue");
  });

  test("callback within 30 minutes -> due", () => {
    const l = { ...baseLead, callback_scheduled_at: new Date(Date.now() + 10 * 60_000).toISOString() };
    expect(leadUrgency(l)).toBe("due");
  });

  test("callback later today -> upcoming", () => {
    const l = { ...baseLead, callback_scheduled_at: new Date(Date.now() + 2 * 3600_000).toISOString() };
    expect(leadUrgency(l)).toBe("upcoming");
  });

  test("invalid date -> upcoming", () => {
    const l = { ...baseLead, callback_scheduled_at: "not-a-date" };
    expect(leadUrgency(l)).toBe("upcoming");
  });
});

describe("pipelineDay", () => {
  test("no first call yet -> Day 1", () => {
    expect(pipelineDay(baseLead, null)).toBe(1);
    expect(pipelineDay(baseLead, undefined)).toBe(1);
  });

  test("first called today -> Day 1", () => {
    expect(pipelineDay(baseLead, new Date().toISOString())).toBe(1);
  });

  test("first called yesterday -> Day 2", () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(pipelineDay(baseLead, y.toISOString())).toBe(2);
  });
});

describe("ATTEMPTS_PER_DAY", () => {
  test("3 attempts for the first 7 days, then 1", () => {
    expect(ATTEMPTS_PER_DAY(1)).toBe(3);
    expect(ATTEMPTS_PER_DAY(7)).toBe(3);
    expect(ATTEMPTS_PER_DAY(8)).toBe(1);
  });
});

describe("getTimeSlot", () => {
  test("uses the callback hour when scheduled", () => {
    const at = (h: number) => {
      const d = new Date();
      d.setHours(h, 0, 0, 0);
      return { ...baseLead, callback_scheduled_at: d.toISOString() };
    };
    expect(getTimeSlot(at(9))).toBe("9am");
    expect(getTimeSlot(at(11))).toBe("12pm");
    expect(getTimeSlot(at(15))).toBe("3pm");
  });
});

describe("leadHasBookedSale", () => {
  test("status booked_deposit_paid counts", () => {
    expect(leadHasBookedSale({ ...baseLead, status: "booked_deposit_paid" })).toBe(true);
  });

  test("booking + payment intent counts", () => {
    expect(
      leadHasBookedSale({
        ...baseLead,
        booking_date: "2026-06-10",
        booking_time: "10:00",
        stripe_payment_intent_id: "pi_1",
      })
    ).toBe(true);
  });

  test("booking without payment does not count", () => {
    expect(
      leadHasBookedSale({ ...baseLead, booking_date: "2026-06-10", booking_time: "10:00" })
    ).toBe(false);
  });
});

describe("normalisePhoneDigits", () => {
  test("strips formatting", () => {
    expect(normalisePhoneDigits("(04) 1234-5678")).toBe("0412345678");
  });

  test("converts 61-prefixed 11-digit numbers to 0-prefixed", () => {
    expect(normalisePhoneDigits("+61412345678")).toBe("0412345678");
  });

  test("handles null", () => {
    expect(normalisePhoneDigits(null)).toBe("");
  });
});

describe("rawPayloadObject", () => {
  test("passes through plain objects", () => {
    expect(rawPayloadObject({ a: 1 })).toEqual({ a: 1 });
  });

  test("arrays and primitives become empty objects", () => {
    expect(rawPayloadObject([1, 2] as never)).toEqual({});
    expect(rawPayloadObject("x" as never)).toEqual({});
    expect(rawPayloadObject(null)).toEqual({});
  });
});

describe("sameLocalDate", () => {
  test("same calendar day", () => {
    expect(sameLocalDate(new Date(2026, 5, 1, 1), new Date(2026, 5, 1, 23))).toBe(true);
    expect(sameLocalDate(new Date(2026, 5, 1), new Date(2026, 5, 2))).toBe(false);
  });
});

// ---------------------------------------------------------------
// Queue ordering — the two locked product rules
// ---------------------------------------------------------------
import { buildQueueOrder, isQueueEligible } from "./logic";

describe("buildQueueOrder", () => {
  const mk = (id: string, patch: Partial<Lead>): Lead => ({ ...baseLead, id, ...patch });

  test("callbacks due ALWAYS come first, soonest first", () => {
    const now = new Date();
    const in1h = new Date(now.getTime() + 3600_000).toISOString();
    const overdue = new Date(now.getTime() - 3600_000).toISOString();
    const leads = [
      mk("new1", { status: "new", created_at: now.toISOString() }),
      mk("cbLater", { status: "callback_scheduled", callback_scheduled_at: in1h }),
      mk("cbOverdue", { status: "callback_scheduled", callback_scheduled_at: overdue }),
    ];
    const order = buildQueueOrder(leads, { now });
    expect(order.slice(0, 2)).toEqual(["cbOverdue", "cbLater"]);
    expect(order[2]).toBe("new1");
  });

  test("new leads come right after callbacks, newest first", () => {
    const now = new Date();
    const leads = [
      mk("older", { status: "new", created_at: "2026-06-01T00:00:00Z" }),
      mk("newest", { status: "new", created_at: "2026-06-20T00:00:00Z" }),
      mk("chase", { status: "had_convo_chase_up" }),
    ];
    const order = buildQueueOrder(leads, { now });
    expect(order).toEqual(["newest", "older", "chase"]);
  });

  test("closed-out leads never enter the queue", () => {
    const leads = [
      mk("ni", { status: "not_interested" }),
      mk("paid", { status: "booked_deposit_paid" }),
      mk("dropped", { status: "dropped" }),
      mk("ok", { status: "new" }),
    ];
    expect(buildQueueOrder(leads)).toEqual(["ok"]);
  });
});

describe("isQueueEligible", () => {
  test("excludes cancelled/no_show raw statuses", () => {
    expect(isQueueEligible({ ...baseLead, status: "cancelled" })).toBe(false);
    expect(isQueueEligible({ ...baseLead, status: "no_show" })).toBe(false);
    expect(isQueueEligible({ ...baseLead, status: "new" })).toBe(true);
  });
});
