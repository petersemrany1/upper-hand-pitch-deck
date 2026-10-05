import { test, expect } from "bun:test";
import { invoiceEmailSummary } from "./invoice-email-summary";
import type { InvoiceCheck } from "./invoice-check";
const result: InvoiceCheck = {
  status: "needs_review",
  reasons: [
    "This period predates verified tracking.",
    "Session 57b36b39-fc26-49c4-b419-44619c1ca837: its end time or continuous connection cannot be verified.",
  ],
  systemHours: 22.91,
  systemBookings: 17,
  expectedTotalCents: 142275,
  claimedTotalCents: 126250,
  differenceCents: -16025,
};
test("Nina review is short plain English without internal IDs", () => {
  const lines = invoiceEmailSummary(result);
  expect(lines.join(" ")).toContain("$160.25 lower");
  expect(lines.join(" ")).toContain("only an estimate");
  expect(lines.join(" ")).not.toContain("57b36b39");
  expect(lines.length).toBe(2);
});
test("exactly $100 is within the buffer", () => {
  expect(
    invoiceEmailSummary({
      ...result,
      status: "approved",
      reasons: [],
      differenceCents: 10000,
    }).join(" "),
  ).toContain("within your $100 buffer");
});
test("over $100 clearly asks for review", () => {
  expect(
    invoiceEmailSummary({
      ...result,
      reasons: [],
      differenceCents: 10001,
    }).join(" "),
  ).toContain("above your $100 buffer");
});
test("unreadable invoice never shows a fabricated comparison", () => {
  const lines = invoiceEmailSummary(result, true);
  expect(lines.join(" ")).not.toContain("160.25");
  expect(lines.join(" ")).toContain("couldn’t reliably read");
});

test("approved historical comparisons do not ask for manual review", () => {
  expect(
    invoiceEmailSummary({ ...result, status: "approved" }).join(" "),
  ).not.toContain("before paying");
});
test("duplicate hold states the actionable reason first", () => {
  const lines = invoiceEmailSummary({
    ...result,
    reasons: [
      ...result.reasons,
      "Possible duplicate or overlapping invoice: INV_0004.",
    ],
  });
  expect(lines[0]).toContain("work dates were already submitted");
  expect(lines.join(" ")).not.toContain("unverified");
});
