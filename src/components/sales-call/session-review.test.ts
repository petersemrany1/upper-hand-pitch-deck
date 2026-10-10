import { expect, test } from "bun:test";
import { availableUntouchedIds, mayFinishReview } from "./session-review";
const lead = (id: string, patch = {}) => ({ id, status: "new", created_at: "2026-10-08T08:00:00Z", callback_scheduled_at: null, campaign_name: "Sydney", ...patch });
const options = { paused: ["brisbane"], capacity: { all: ["sydney", "melbourne"], available: ["sydney"] }, priority: "", hiddenIds: new Set(["test"]), now: new Date("2026-10-10T01:00:00Z") };
test("brings older untouched leads and new arrivals back, newest first", () => {
  expect(availableUntouchedIds([lead("older"), lead("new", { created_at: "2026-10-10T00:30:00Z" })], options)).toEqual(["new", "older"]);
});
test("respects pauses, full clinics, bookings, callbacks, hidden test leads and lead status", () => {
  const leads = [lead("ok"), lead("paused", { campaign_name: "Brisbane" }), lead("full", { campaign_name: "Melbourne" }),
    lead("booked", { booking_date: "2026-10-12" }), lead("class", { lead_class: "booked_active" }), lead("attended", { lead_class: "post_consult" }),
    lead("callback", { callback_scheduled_at: "2026-10-11T00:00:00Z" }), lead("test"), lead("hold", { status: "on_hold" }), lead("called", { status: "no_answer" })];
  expect(availableUntouchedIds(leads, options)).toEqual(["ok"]);
});
test("website location and priority use the same rules as the main queue", () => {
  expect(availableUntouchedIds([lead("other", { campaign_name: "Unknown" }), lead("web", { campaign_name: null, raw_payload: { raw_payload: { location: "Sydney" } } })], {...options, priority: "sydney"})).toEqual(["web", "other"]);
});
test("an explicit exit, a new lead on screen or a queue top-up invalidates completion", () => {
  const base = { cancelled: false, active: true, leadId: null, queuedAhead: false };
  expect(mayFinishReview(base)).toBe(true);
  for (const patch of [{cancelled:true}, {active:false}, {leadId:"new"}, {queuedAhead:true}]) expect(mayFinishReview({...base,...patch})).toBe(false);
});
