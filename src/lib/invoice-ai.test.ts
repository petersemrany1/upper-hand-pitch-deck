import { test, expect, afterEach } from "bun:test";
import { extractInvoiceText } from "./invoice-ai.server";
import { compareInvoiceDocument } from "./invoice-check";
const oldKey = process.env.LOVABLE_API_KEY;
afterEach(() => {
  if (oldKey === undefined) delete process.env.LOVABLE_API_KEY;
  else process.env.LOVABLE_API_KEY = oldKey;
});
const claim = {
  number: "INV_0004",
  from: "2026-09-29",
  to: "2026-10-02",
  hours: 16.5,
  bookings: 17,
  hourlyRate: 25,
  bookingRate: 50,
  total: 1262.5,
};
const lines = [
  "Invoice #: INV_0004",
  "From: Nina Sinclair",
  "Date: 2 October 2026",
  "Dates Description Rate Hours/Sets Amount",
  "29/09-02/10 Patient Advisor 25 16.5 412.50",
  "Booked Consultations 50 17 850",
  "Total $1,262.50",
];
test("AI extraction is independently verified against the document", async () => {
  process.env.LOVABLE_API_KEY = "test-only";
  const fake = (async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(claim) } }],
      }),
    )) as typeof fetch;
  const parsed = (await extractInvoiceText(
    lines.join("\n"),
    fake,
  )) as typeof claim;
  expect(compareInvoiceDocument(lines, parsed, "Nina Sinclair")).toEqual([]);
  expect(
    compareInvoiceDocument(lines, { ...parsed, hours: 20 }, "Nina Sinclair")
      .length,
  ).toBeGreaterThan(0);
  expect(
    compareInvoiceDocument(lines, parsed, "Bec Example").length,
  ).toBeGreaterThan(0);
});
test("AI outage never produces fabricated invoice figures", async () => {
  process.env.LOVABLE_API_KEY = "test-only";
  await expect(
    extractInvoiceText(
      "invoice",
      (async () =>
        new Response("unavailable", { status: 503 })) as typeof fetch,
    ),
  ).rejects.toThrow("503");
});
test("invalid or absent model output fails extraction", async () => {
  process.env.LOVABLE_API_KEY = "test-only";
  for (const content of [undefined, "Approved, pay it now"]) {
    const fake = (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content } }] }),
      )) as typeof fetch;
    await expect(extractInvoiceText("invoice", fake)).rejects.toThrow();
  }
});
