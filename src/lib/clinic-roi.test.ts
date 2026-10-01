import assert from "node:assert/strict";
import test from "node:test";
import { calculateClinicReturn, CONVERSION_OPTIONS } from "./clinic-roi.ts";

test("a 20-consult pack at 1 in 2 produces the expected clinic return", () => {
  assert.deepEqual(calculateClinicReturn(16000, 1 / 2, 800, 20), {
    cost: 16000, procedures: 10, revenue: 160000, costPerProcedure: 1600, multiple: 10,
  });
});

test("1 in 3 uses the exact fraction instead of rounding to 3 out of 10", () => {
  const rate = CONVERSION_OPTIONS.find(option => option.label === "1 in 3")!;
  const result = calculateClinicReturn(18000, rate.value, 800, 10);
  assert.ok(Math.abs(result.revenue - 60000) < 0.000001);
  assert.equal(result.costPerProcedure, 2400);
  assert.ok(Math.abs(result.multiple - 7.5) < 0.000001);
});

test("every conversion option remains exact and zero inputs stay finite while editing", () => {
  for (const option of CONVERSION_OPTIONS) {
    const [numerator, denominator] = option.label.split(" in ").map(Number);
    assert.equal(option.value, numerator / denominator);
  }
  const result = calculateClinicReturn(0, 0, 0, 10);
  assert.ok(Object.values(result).every(Number.isFinite));
  assert.equal(result.multiple, 0);
});
