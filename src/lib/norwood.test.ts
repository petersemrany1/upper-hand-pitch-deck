import { describe, expect, test } from "bun:test";
import { NORWOOD_EXPECTATIONS_MIN, norwoodNeedsExpectations } from "./norwood";

describe("norwood expectations gate", () => {
  test("only 6 and 7 require the expectations confirmation", () => {
    expect(NORWOOD_EXPECTATIONS_MIN).toBe(6);
    for (const n of [1, 2, 3, 4, 5]) expect(norwoodNeedsExpectations(n)).toBe(false);
    for (const n of [6, 7]) expect(norwoodNeedsExpectations(n)).toBe(true);
  });

  test("missing level never demands expectations", () => {
    expect(norwoodNeedsExpectations(null)).toBe(false);
    expect(norwoodNeedsExpectations(undefined)).toBe(false);
    expect(norwoodNeedsExpectations(Number.NaN)).toBe(false);
  });
});
