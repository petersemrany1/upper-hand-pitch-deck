import { describe, expect, test } from "bun:test";
import { abandonedLeadIds } from "./abandoned";

const NOW = new Date("2026-09-07T15:00:00");
const ago = (hours: number) => new Date(NOW.getTime() - hours * 3600000).toISOString();

describe("abandonedLeadIds", () => {
  test("new lead with only short, settled calls → abandoned", () => {
    const ids = abandonedLeadIds(
      [{ id: "a", status: "new" }, { id: "blank", status: "" }, { id: "nul", status: null }],
      [
        { lead_id: "a", called_at: ago(5), duration: 0 },
        { lead_id: "a", called_at: ago(3), duration: 12 },
        { lead_id: "blank", called_at: ago(26), duration: null, duration_seconds: 8 },
        { lead_id: "nul", called_at: ago(4), duration: 20 },
      ],
      NOW,
    );
    expect(ids.sort()).toEqual(["a", "blank", "nul"]);
  });
  test("a real conversation, a recent call, or no calls at all → left alone", () => {
    const ids = abandonedLeadIds(
      [{ id: "talked", status: "new" }, { id: "fresh", status: "new" }, { id: "untouched", status: "new" }],
      [
        { lead_id: "talked", called_at: ago(5), duration: 4 },
        { lead_id: "talked", called_at: ago(4), duration: 95 },
        { lead_id: "fresh", called_at: ago(1), duration: 0 },
      ],
      NOW,
    );
    expect(ids).toEqual([]);
  });
  test("statuses other than new, callbacks and bookings are never swept", () => {
    const ids = abandonedLeadIds(
      [
        { id: "cb", status: "new", callback_scheduled_at: ago(-2) },
        { id: "booked", status: "new", booking_date: "2026-09-10" },
        { id: "na", status: "no_answer" },
        { id: "chase", status: "had_convo_chase_up" },
      ],
      [
        { lead_id: "cb", called_at: ago(5), duration: 0 },
        { lead_id: "booked", called_at: ago(5), duration: 0 },
        { lead_id: "na", called_at: ago(5), duration: 0 },
        { lead_id: "chase", called_at: ago(5), duration: 0 },
      ],
      NOW,
    );
    expect(ids).toEqual([]);
  });
});
