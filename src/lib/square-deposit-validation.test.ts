import { expect, test } from "bun:test";
import { isCompletedSquareDeposit } from "./square-deposit-validation";
import type { SquarePayment } from "./square.server";

const paid: SquarePayment = {
  id: "square-payment", status: "COMPLETED", reference_id: "lead",
  amount_money: { amount: 7500, currency: "AUD" },
};

test("only a completed matching $75 AUD deposit is credited", () => {
  expect(isCompletedSquareDeposit(paid, "lead")).toBe(true);
  expect(isCompletedSquareDeposit(paid, "another-lead")).toBe(false);
});

test.each(["PENDING", "APPROVED", "FAILED", "CANCELED"])("does not credit %s payments", (status) => {
  expect(isCompletedSquareDeposit({ ...paid, status }, "lead")).toBe(false);
});

test.each([
  { amount: 1, currency: "AUD" },
  { amount: 7500, currency: "USD" },
  {}, null,
])("rejects an incorrect or missing amount/currency", (amount_money) => {
  expect(isCompletedSquareDeposit({ ...paid, amount_money }, "lead")).toBe(false);
});
