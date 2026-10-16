import { afterEach, describe, expect, test } from "bun:test";
import { sendRefundSms, processRefundNotifications, REFUND_STATUS_CALLBACK } from "./refund-notifications.server";
import { PATIENT_SMS_FROM } from "@/lib/booking-confirmation-sms";
import { handleRefundNotifications } from "@/routes/api.public.hooks.refund-notifications";

const original = { sid: process.env.TWILIO_ACCOUNT_SID, token: process.env.TWILIO_AUTH_TOKEN, service: process.env.SUPABASE_SERVICE_ROLE_KEY };
const originalFetch = globalThis.fetch;
const originalSquareToken = process.env.SQUARE_ACCESS_TOKEN;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSquareToken === undefined) delete process.env.SQUARE_ACCESS_TOKEN;
  else process.env.SQUARE_ACCESS_TOKEN = originalSquareToken;
  for (const [key,value] of Object.entries({ TWILIO_ACCOUNT_SID: original.sid, TWILIO_AUTH_TOKEN: original.token, SUPABASE_SERVICE_ROLE_KEY: original.service })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test("refund monitoring settles processing receipts and cancelled texts without any second send", async () => {
  process.env.SQUARE_ACCESS_TOKEN = "fixture-square-token";
  for (const notificationStatus of ["delivered", "cancelled"]) {
    for (const providerStatus of ["COMPLETED", "PENDING", "FAILED"]) {
      const writes: Array<{ table: string; patch: any }> = [];
      const calls: string[] = [];
      const db = {
        rpc: async (name: string) => { calls.push(name); return { error: null }; },
        from(table: string) {
          let monitoring = false, mutation = false;
          const q: any = {
            select: () => q, eq: () => q, neq: () => q, not: () => q, gte: () => q,
            order: () => q, limit: () => q,
            in: (_field: string, states: string[]) => {
              if (states.includes("delivered")) {
                expect(states).toContain("cancelled"); monitoring = true;
              }
              return q;
            },
            lte: () => q,
            update: (patch: any) => { mutation = true; writes.push({ table, patch }); return q; },
            then: (resolve: (r: any) => void) => resolve({ error: null, data: !mutation && monitoring ? [{
              id: "notice", kind: "patient_sms", appointment_id: "appointment", status: notificationStatus,
              created_at: new Date().toISOString(), payload: { processor: "square", refund_id: "refund", payment_id: "payment" },
            }] : [] }),
          };
          return q;
        },
      };
      globalThis.fetch = (async (url, init) => {
        expect(String(url)).toContain("/v2/refunds/refund");
        expect(init?.method || "GET").toBe("GET");
        return Response.json({ refund: { id: "refund", payment_id: "payment", status: providerStatus, amount_money: { amount: 7500, currency: "AUD" } } });
      }) as typeof fetch;
      const result = await processRefundNotifications(db);
      expect(result.errors).toEqual([]);
      expect(calls).toEqual(["recover_refund_notifications"]);
      const appointment = writes.find(w => w.table === "clinic_appointments");
      if (providerStatus === "PENDING") expect(appointment).toBeUndefined();
      else expect(appointment?.patch.refund_status).toBe(providerStatus === "COMPLETED" ? "refunded" : "failed");
      // No status reset can re-queue a delivered or explicitly cancelled text.
      for (const w of writes.filter(w => w.table === "refund_notifications")) {
        expect(Object.keys(w.patch)).toEqual(["verification_next_at"]);
        const delay = Date.parse(w.patch.verification_next_at) - Date.now();
        expect(delay).toBeGreaterThan(providerStatus === "PENDING" ? 290_000 : 21_590_000);
        expect(delay).toBeLessThanOrEqual(providerStatus === "PENDING" ? 300_000 : 21_600_000);
      }
    }
  }
});
const configure = () => { process.env.TWILIO_ACCOUNT_SID = "ACfixture"; process.env.TWILIO_AUTH_TOKEN = "fixture-token"; };
const sid = "SM" + "a".repeat(32);

describe("refund SMS transport", () => {
  test("uses existing sender and event-specific signed delivery callback", async () => {
    configure(); let requests=0;
    const result = await sendRefundSms("notice-id", "+61400000000", "Approved message", (async (url, init) => {
      requests++; expect(String(url)).toContain("Accounts/ACfixture/Messages.json");
      const body = new URLSearchParams(init?.body as URLSearchParams);
      expect(body.get("To")).toBe("+61400000000"); expect(body.get("From")).toBe(PATIENT_SMS_FROM);
      expect(body.get("Body")).toBe("Approved message"); expect(body.get("StatusCallback")).toBe(REFUND_STATUS_CALLBACK + "?refund_notification_id=notice-id");
      return Response.json({ sid, status: "queued" }, { status: 201 });
    }) as typeof fetch);
    expect(result).toEqual({ ok: true, sid, status: "queued" }); expect(requests).toBe(1);
  });
  test("5xx and missing SID are uncertain; 429 is safely retryable", async () => {
    configure();
    for (const response of [new Response("Unavailable", { status: 503 }), Response.json({ status: "queued" }, { status: 201 })]) {
      await expect(sendRefundSms("id", "+61400000000", "message", (async () => response) as typeof fetch)).rejects.toThrow();
    }
    expect(await sendRefundSms("id", "+61400000000", "message", (async () => Response.json({ message: "Rate limited" }, { status: 429 })) as typeof fetch)).toEqual({ ok: false, error: "Rate limited", retryable: true });
  });
  test("missing credentials fail without contacting a provider", async () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const result = await sendRefundSms("id", "+61400000000", "message", (async () => { throw new Error("Should never call"); }) as typeof fetch);
    expect(result.ok).toBe(false);
  });
});

test("notification endpoint denies public and user tokens before database or sends", async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-secret";
  for (const token of ["", "user-jwt", "test-service-secrex", "é".repeat(19)]) {
    const result = await handleRefundNotifications(new Request("https://fixture.test/api/public/hooks/refund-notifications", { method: "POST", headers: { authorization: `Bearer ${token}` } }));
    expect(result.status).toBe(401);
  }
});
