import { expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { needsPaymentBookingAlert, paymentBookingAlertState, PAYMENT_BOOKING_GRACE_MS } from "./payment-booking-alert.server";
import { template } from "../lib/email-templates/payment-received";
import { createElement } from "react";
import { render } from "@react-email/render";

function database(status: string | null, error: { message: string } | null = null, paidAt: string | null = "2026-10-06T00:00:00Z") {
  const query = {
    select: () => query,
    eq: (_column: string, leadId: string) => {
      expect(leadId).toBe("lead-123");
      return query;
    },
    single: async () => ({ data: { status, deposit_paid_at: paidAt }, error }),
  };
  return { from: () => query } as unknown as SupabaseClient;
}

test("completed bookings do not alert for either existing status format", async () => {
  for (const status of ["booked_deposit_paid", "Booked — Deposit Paid"]) {
    expect(await needsPaymentBookingAlert(database(status), "lead-123")).toBe(false);
  }
});

test("payment alert waits through exactly 45 minutes and becomes eligible only afterwards", async () => {
  const paidAt = Date.parse("2026-10-06T00:00:00Z");
  const db = database("new");
  for (const elapsed of [0, 44 * 60 * 1000, PAYMENT_BOOKING_GRACE_MS]) {
    expect(await paymentBookingAlertState(db, "lead-123", paidAt + elapsed)).toEqual({
      action: "wait", notBefore: "2026-10-06T00:45:00.000Z",
    });
  }
  expect((await paymentBookingAlertState(db, "lead-123", paidAt + PAYMENT_BOOKING_GRACE_MS + 1)).action).toBe("send");
});

test("booking completed during grace period cancels the pending alert at dispatch", async () => {
  const now = Date.parse("2026-10-06T00:46:00Z");
  for (const status of ["booked_deposit_paid", " Booked — Deposit Paid "]) {
    expect((await paymentBookingAlertState(database(status), "lead-123", now)).action).toBe("cancel");
  }
  expect((await paymentBookingAlertState(database("booked_no_deposit"), "lead-123", now)).action).toBe("send");
});

test("a newer deposit restarts the grace period and a cleared deposit cancels the alert", async () => {
  const now = Date.parse("2026-10-06T00:46:00Z");
  expect((await paymentBookingAlertState(database("new", null, "2026-10-06T00:30:00Z"), "lead-123", now)).action).toBe("wait");
  expect((await paymentBookingAlertState(database("new", null, null), "lead-123", now)).action).toBe("cancel");
});

test("missing references, lookup failures and invalid payment dates cannot authorize sending", async () => {
  await expect(paymentBookingAlertState(database("new"), "")).rejects.toThrow("requires a lead ID");
  await expect(paymentBookingAlertState(database("new", { message: "unavailable" }), "lead-123")).rejects.toThrow("Could not check");
  await expect(paymentBookingAlertState(database("new", null, "invalid"), "lead-123")).rejects.toThrow("Invalid deposit");
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
  for (const text of ["URGENT", "Jane Doe", "$75.00 AUD", "Nina", "Booked — Deposit Paid", "more than 45 minutes ago"]) {
    expect(html).toContain(text);
  }
});
