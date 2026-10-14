import { describe, expect, test } from "bun:test";
import { checkRefundObject, refundAlert, refundPhone, refundText, type RefundNotice } from "./refund-notifications";
import { processRefundNotice, type RefundWorkerDependencies } from "./refund-notification-worker";

const sid = "SM" + "1".repeat(32);
const notice = (): RefundNotice => ({ id: "notice-1", kind: "patient_sms", appointment_id: "appointment-1", dedupe_key: "refund:square:refund-1", status: "checking", attempts: 1,
  created_at: "2026-10-15T00:00:00Z", payload: { patient_name: "Test Patient", patient_phone: "0400000000", amount: 75, processor: "square", payment_id: "payment-1", refund_id: "refund-1" } });

function fixture() {
  const e = notice();
  const saved: any[] = [], flags: any[] = [], sends: any[] = [], settled: any[] = [], recorded: any[] = [], emails: any[] = [];
  const d: RefundWorkerDependencies = {
    now: () => Date.parse("2026-10-15T00:00:00Z"),
    appointment: async () => ({ id: "appointment-1", refund_status: "refund_pending", square_payment_id: "payment-1", square_refund_id: "refund-1", stripe_payment_intent_id: null, stripe_refund_id: null, deposit_amount: 75 }),
    verify: async () => ({ state: "completed", amount: 75 }),
    save: async patch => { saved.push(patch); return true; },
    flag: async (...args) => { flags.push(args); },
    settle: async (...args) => { settled.push(args); },
    send: async (...args) => { sends.push(args); return { ok: true, sid, status: "queued" }; },
    recordSms: async (...args) => { recorded.push(args); },
    queueEmail: async content => { emails.push(content); return true; },
  };
  return { e, d, saved, flags, sends, settled, recorded, emails };
}

describe("refund copy and provider verification", () => {
  test("exact approved copy and actual amounts", () => {
    expect(refundText(75)).toBe("Hi, your $75 deposit has been refunded. It can take 4–14 business days to show in your account.");
    expect(refundText(50.25)).toContain("$50.25");
    for (const n of [0, -75, NaN, Infinity, 75.001]) expect(() => refundText(n)).toThrow();
  });
  test("normalises Australian numbers without guessing invalid recipients", () => {
    expect(refundPhone("0400 000 000")).toBe("+61400000000");
    expect(refundPhone("61400000000")).toBe("+61400000000");
    expect(refundPhone("+61400000000")).toBe("+61400000000");
    expect(() => refundPhone("missing")).toThrow();
  });
  test("only completed Square and succeeded Stripe refunds qualify", () => {
    const ref = { refundId: "r", paymentId: "p" };
    const square = { id: "r", payment_id: "p", status: "COMPLETED", amount_money: { amount: 7500, currency: "AUD" } };
    expect(checkRefundObject("square", square, ref)).toEqual({ state: "completed", amount: 75 });
    const stripe = { id: "r", payment_intent: "p", status: "succeeded", amount: 5000, currency: "aud" };
    expect(checkRefundObject("stripe", stripe, ref)).toEqual({ state: "completed", amount: 50 });
    for (const status of ["pending", "requires_action"]) expect(checkRefundObject("stripe", { ...stripe, status }, ref).state).toBe("pending");
    for (const status of ["failed", "canceled"]) expect(checkRefundObject("stripe", { ...stripe, status }, ref).state).toBe("failed");
    expect(checkRefundObject("square", { ...square, status: "REJECTED" }, ref).state).toBe("failed");
    for (const patch of [{ id: "wrong" }, { payment_intent: "wrong" }, { currency: "usd" }, { amount: 0 }, { amount: 1.5 }, { status: "unknown" }]) expect(() => checkRefundObject("stripe", { ...stripe, ...patch }, ref)).toThrow();
  });
  test("provider action-needed and insufficient funds carry an alert reason", () => {
    expect(checkRefundObject("stripe", { id: "r", payment_intent: "p", status: "requires_action" }, { refundId: "r", paymentId: "p" }).error).toContain("requires action");
    expect(checkRefundObject("stripe", { id: "r", payment_intent: "p", status: "pending", pending_reason: "insufficient_funds" }, { refundId: "r", paymentId: "p" }).error).toContain("insufficient funds");
  });
  test("failure emails contain actionable details and escape HTML", () => {
    const e = notice(); e.payload.reason = '<img src=x onerror="x"> & error'; e.payload.patient_name = "Test <patient>";
    const email = refundAlert(e);
    expect(email.html).not.toContain("<img"); expect(email.html).toContain("&lt;img"); expect(email.text).toContain("payment-1");
    expect(email.text).toContain("before retrying");
    e.payload.category = "sms";
    expect(refundAlert(e).text).toContain("Do not refund the payment again");
  });
});

describe("durable refund notification worker", () => {
  test("completed refund saves the send boundary before calling Twilio", async () => {
    const f = fixture(); f.d.send = async (phone, body) => {
      expect(f.saved.at(-1)?.status).toBe("sending"); expect(phone).toBe("+61400000000"); expect(body).toBe(refundText(75));
      return { ok: true, sid, status: "queued" };
    };
    await processRefundNotice(f.e, f.d);
    expect(f.settled).toEqual([["refunded"]]); expect(f.recorded).toEqual([[sid, "queued"]]); expect(f.flags).toHaveLength(0);
  });
  test("pending refund waits without texting or claiming completion", async () => {
    const f = fixture(); f.d.verify = async () => ({ state: "pending" });
    await processRefundNotice(f.e, f.d);
    expect(f.sends).toHaveLength(0); expect(f.settled).toHaveLength(0); expect(f.saved[0].status).toBe("pending");
  });
  test("action-needed refunds wait and alert", async () => {
    const f = fixture(); f.d.verify = async () => ({ state: "pending", error: "Requires action" });
    await processRefundNotice(f.e, f.d); expect(f.flags).toEqual([["verification", "Requires action"]]); expect(f.sends).toHaveLength(0);
  });
  test("failed refund records failure for the transactional email trigger", async () => {
    const f = fixture(); f.d.verify = async () => ({ state: "failed", error: "Bank rejected" });
    await processRefundNotice(f.e, f.d);
    expect(f.settled).toEqual([["failed", "Bank rejected"]]); expect(f.saved[0].status).toBe("cancelled"); expect(f.sends).toHaveLength(0);
  });
  test("verification outage retries safely and alerts after repeated failures", async () => {
    const f = fixture(); f.e.attempts = 3; f.d.verify = async () => { throw new Error("Provider unavailable"); };
    await processRefundNotice(f.e, f.d);
    expect(f.sends).toHaveLength(0); expect(f.saved[0].status).toBe("pending"); expect(f.flags).toHaveLength(1);
  });
  test("changed payment references and missing appointment never send", async () => {
    for (const missing of [false, true]) {
      const f = fixture(); const original = await f.d.appointment("a");
      f.d.appointment = async () => missing ? null : { ...original!, square_payment_id: "another-payment" };
      await processRefundNotice(f.e, f.d); expect(f.sends).toHaveLength(0); expect(f.flags).toHaveLength(1);
    }
  });
  test("manual completion uses recorded amount and requires current completed state", async () => {
    const f = fixture(); f.e.payload.manual = true;
    const original = await f.d.appointment("a");
    f.d.appointment = async () => ({ ...original!, refund_status: "refunded_manual", deposit_amount: 50 });
    f.d.verify = async () => { throw new Error("Must not query provider for manual refunds"); };
    await processRefundNotice(f.e, f.d); expect(f.sends[0][1]).toBe(refundText(50));
    const other = fixture(); other.e.payload.manual = true;
    await processRefundNotice(other.e, other.d); expect(other.sends).toHaveLength(0); expect(other.saved[0].status).toBe("cancelled");
  });
  test("missing phone alerts and never guesses a number", async () => {
    const f = fixture(); f.e.payload.patient_phone = "";
    await processRefundNotice(f.e, f.d); expect(f.sends).toHaveLength(0); expect(f.flags).toHaveLength(1);
  });
  test("lost claim prevents send even after a successful provider check", async () => {
    const f = fixture(); f.d.save = async () => false;
    await processRefundNotice(f.e, f.d); expect(f.sends).toHaveLength(0);
  });
  test("timeout or lost send response becomes uncertain and alerts, never retries", async () => {
    const f = fixture(); f.d.send = async () => { throw new Error("timeout"); };
    await processRefundNotice(f.e, f.d); expect(f.saved.at(-1).status).toBe("uncertain"); expect(f.flags[0][0]).toBe("sms");
  });
  test("explicit Twilio rejection alerts without re-refunding", async () => {
    const f = fixture(); f.d.send = async () => ({ ok: false, error: "Invalid destination" });
    await processRefundNotice(f.e, f.d); expect(f.saved.at(-1).status).toBe("failed"); expect(f.flags).toHaveLength(1); expect(f.settled).toEqual([["refunded"]]);
  });
  test("a 429 rejection can retry; no accepted message is retried", async () => {
    const f = fixture(); f.d.send = async () => ({ ok: false, error: "Rate limited", retryable: true });
    await processRefundNotice(f.e, f.d); expect(f.saved.at(-1).status).toBe("pending"); expect(f.recorded).toHaveLength(0);
  });
  test("DB failure after provider acceptance leaves the sending state for recovery", async () => {
    const f = fixture(); f.d.recordSms = async () => { throw new Error("database unavailable"); };
    await expect(processRefundNotice(f.e, f.d)).rejects.toThrow(); expect(f.sends).toHaveLength(1); expect(f.saved.at(-1).status).toBe("sending");
  });
  test("emails only use the email queue; failed enqueue is retried", async () => {
    const f = fixture(); f.e.kind = "ops_email";
    await processRefundNotice(f.e, f.d); expect(f.emails).toHaveLength(1); expect(f.sends).toHaveLength(0);
    f.d.queueEmail = async () => { throw new Error("Queue unavailable"); };
    await processRefundNotice(f.e, f.d); expect(f.saved.at(-1).status).toBe("pending");
  });
});
