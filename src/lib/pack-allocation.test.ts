import { describe, expect, test } from "bun:test";
import { allocatePacks, creditBalance, packStatus } from "./pack-allocation";

const pack = (id: string, size: number, paid: string, type = "paid") => ({ id, pack_size: size, purchased_at: `${paid}T00:00:00Z`, date_paid: paid, created_at: `${paid}T00:00:00Z`, pack_type: type });

describe("allocatePacks", () => {
  test("Boss Clinic: one 10-pack, 4 delivered, 6 booked → fully booked, nothing open", () => {
    const a = allocatePacks([pack("a", 10, "2026-08-12")], 4, 6);
    expect(a.current?.delivered).toBe(4);
    expect(a.current?.booked).toBe(6);
    expect(a.current?.open).toBe(0);
    expect(a.current?.state).toBe("current");
    expect(a.overflowBooked).toBe(0);
    expect(packStatus(a).key).toBe("fullyBooked");
  });

  test("Nitai: several packs, 58 delivered, 11 booked → the box shows the pack being worked through, totals stay whole", () => {
    const packs = [pack("p1", 10, "2026-05-01"), pack("p2", 10, "2026-06-01"), pack("p3", 10, "2026-07-01"), pack("p4", 40, "2026-08-01"), pack("g", 3, "2026-08-15", "goodwill")];
    const a = allocatePacks(packs, 58, 11);
    expect(a.fills.map((f) => f.state)).toEqual(["complete", "complete", "complete", "current", "queued"]);
    expect(a.current?.pack.id).toBe("p4");
    expect(a.current?.delivered).toBe(28);
    expect(a.current?.booked).toBe(11);
    expect(a.current?.open).toBe(1);
    expect(a.next?.pack.id).toBe("g");
    expect(a.totals).toEqual({ bought: 73, free: 3, trial: 0, delivered: 58, booked: 11, open: 4 });
    expect(packStatus(a).key).toBe("open");
    expect(packStatus(a).next).toBe("Next 3-show pack is ready: 0 booked into it, 3 open.");
  });

  test("a full current pack is not a warning while a queued pack still has room", () => {
    const a = allocatePacks([pack("p7", 10, "2026-09-01"), pack("p8", 10, "2026-09-22")], 5, 11);
    expect(a.current?.pack.id).toBe("p7");
    expect(a.current?.open).toBe(0);
    expect(a.next?.booked).toBe(6);
    expect(a.next?.open).toBe(4);
    const s = packStatus(a);
    expect(s.key).toBe("nextReady");
    expect(s.next).toBe("Next 10-show pack is ready: 6 booked into it, 4 open.");
    // no room anywhere: now it is a warning
    expect(packStatus(allocatePacks([pack("p7", 10, "2026-09-01"), pack("p8", 10, "2026-09-22")], 5, 15)).key).toBe("fullyBooked");
  });

  test("bookings spill into the next pack, and beyond the last one they are overflow", () => {
    const a = allocatePacks([pack("a", 10, "2026-08-01"), pack("b", 10, "2026-09-01")], 8, 5);
    expect(a.current?.pack.id).toBe("a");
    expect(a.current?.booked).toBe(2);
    expect(a.fills[1].booked).toBe(3);
    expect(a.overflowBooked).toBe(0);
    const b = allocatePacks([pack("a", 10, "2026-08-01")], 8, 5);
    expect(b.overflowBooked).toBe(3);
  });

  test("when every pack is delivered the last one shows as complete", () => {
    const a = allocatePacks([pack("a", 10, "2026-08-01")], 10, 0);
    expect(a.current?.state).toBe("complete");
    expect(packStatus(a).key).toBe("complete");
    expect(a.next).toBeNull();
  });

  test("free-trial packs are listed but never filled; packs fill in date-paid order", () => {
    const a = allocatePacks([pack("t", 5, "2026-04-01", "free_trial"), pack("late", 10, "2026-09-01"), pack("early", 10, "2026-06-01")], 12, 0);
    expect(a.fills.map((f) => f.pack.id)).toEqual(["early", "late"]);
    expect(a.fills[0].state).toBe("complete");
    expect(a.current?.pack.id).toBe("late");
    expect(a.current?.delivered).toBe(2);
    expect(a.totals.bought).toBe(20);
    expect(a.totals.free).toBe(0);
    expect(a.totals.trial).toBe(5);
  });

  test("credit balance: available, reserved, used, and when to worry", () => {
    const nitai = creditBalance(allocatePacks([pack("a", 63, "2026-07-01"), pack("b", 10, "2026-09-22")], 58, 11));
    expect(nitai).toMatchObject({ available: 4, reserved: 11, used: 58, bought: 73, over: 0, key: "ok" });
    const low = creditBalance(allocatePacks([pack("a", 10, "2026-09-01")], 4, 3));
    expect(low).toMatchObject({ available: 3, key: "low" });
    expect(low.line).toBe("3 credits left — add a pack soon.");
    const boss = creditBalance(allocatePacks([pack("a", 10, "2026-09-10")], 4, 6));
    expect(boss).toMatchObject({ available: 0, reserved: 6, key: "empty" });
    const over = creditBalance(allocatePacks([pack("a", 10, "2026-09-10")], 4, 8));
    expect(over).toMatchObject({ available: 0, reserved: 6, over: 2, key: "over" });
    // a no-show hands the credit straight back: one fewer reserved, one more available
    const afterNoShow = creditBalance(allocatePacks([pack("a", 10, "2026-09-10")], 4, 5));
    expect(afterNoShow.available).toBe(1);
    expect(creditBalance(allocatePacks([], 0, 0)).key).toBe("none");
  });

  test("no packs at all", () => {
    const a = allocatePacks([], 3, 2);
    expect(a.current).toBeNull();
    expect(a.overflowBooked).toBe(2);
    expect(packStatus(a).key).toBe("none");
  });
});
