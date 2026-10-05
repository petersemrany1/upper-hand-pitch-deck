import { expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { needsPaymentBookingAlert } from "./payment-booking-alert.server";
import { template } from "../lib/email-templates/payment-received";
import { createElement } from "react";
import { render } from "@react-email/render";

function database(status: string | null, error: { message: string } | null = null) {
  const query = {
    select: () => query,
    eq: (_column: string, leadId: string) => {
      expect(leadId).toBe("lead-123");
      return query;
    },
    single: async () => ({ data: { status }, error }),
  };
  return { from: () => query } as unknown as SupabaseClient;
}

test("completed bookings do not alert for either existing status format", async () => {
  for (const status of ["booked_deposit_paid", "Booked — Deposit Paid"]) {
    expect(await needsPaymentBookingAlert(database(status), "lead-123")).toBe(false);
  }
});

test("a received payment alerts for every other existing status, including booked without deposit", async () => {
  for (const status of [
    "new", "no_answer", "callback_scheduled", "had_convo_chase_up",
    "had_convo_no_sale", "not_interested", "booked_no_deposit", "dropped",
    "Booked — No Deposit", "Had Convo — Chase Up", null, "",
  ]) {
    expect(await needsPaymentBookingAlert(database(status), "lead-123")).toBe(true);
  }
});

test("a failed status lookup is not treated as a confirmed booking", async () => {
  await expect(needsPaymentBookingAlert(database(null, { message: "unavailable" }), "lead-123"))
    .rejects.toThrow("Could not check paid lead status");
});

test("urgent email identifies the patient, missing status, amount and responsible rep", async () => {
  const data = { patientName: "Jane Doe", amount: "$75.00 AUD", repName: "Nina" };
  expect(template.subject(data)).toBe("URGENT: Jane Doe paid — not marked Booked — Deposit Paid");
  expect(template.subject({})).toContain("URGENT: Patient paid");
  const html = await render(createElement(template.component, data));
  for (const text of ["URGENT", "Jane Doe", "$75.00 AUD", "Nina", "Booked — Deposit Paid"]) {
    expect(html).toContain(text);
  }
});
