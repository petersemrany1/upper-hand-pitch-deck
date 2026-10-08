import { expect, test } from "bun:test";
import { CALENDAR_APPROVAL_ONLY, isCalendarApprovalHost } from "./calendar-release";

test("the approved release uses the live schedule on published and preview hosts", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    expect(CALENDAR_APPROVAL_ONLY).toBe(false);
    for (const hostname of ["hairtransplantgroup.lovable.app", "preview--hairtransplantgroup.lovable.app", "1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovableproject.com", "localhost"]) {
      Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { hostname } } });
      expect(isCalendarApprovalHost()).toBe(false);
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
