import { afterEach, describe, expect, test } from "bun:test";
import { sendRefundSms, REFUND_STATUS_CALLBACK } from "./refund-notifications.server";
import { PATIENT_SMS_FROM } from "@/lib/booking-confirmation-sms";
import { handleRefundNotifications } from "@/routes/api.public.hooks.refund-notifications";

const original = { sid: process.env.TWILIO_ACCOUNT_SID, token: process.env.TWILIO_AUTH_TOKEN, service: process.env.SUPABASE_SERVICE_ROLE_KEY };
afterEach(() => {
  for (const [key,value] of Object.entries({ TWILIO_ACCOUNT_SID: original.sid, TWILIO_AUTH_TOKEN: original.token, SUPABASE_SERVICE_ROLE_KEY: original.service })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
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
