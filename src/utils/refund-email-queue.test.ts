import { afterEach, expect, test } from "bun:test";
import { Route } from "@/routes/lovable/email/queue/process";

const originalFetch = globalThis.fetch;
const keys = ["LOVABLE_API_KEY", "LOVABLE_SEND_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const originalEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) { if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key]; }
});

function setup(emailResult: "ok" | "reject" | "429" | "not-accepted" = "ok", duplicate = false) {
  process.env.LOVABLE_API_KEY = "fixture-api-key";
  process.env.LOVABLE_SEND_URL = "https://email.fixture.test/send";
  process.env.VITE_SUPABASE_URL = "https://db.fixture.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-role";
  const reads: string[] = [], deletes: any[] = [], logs: any[] = [], sends: any[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url === "https://email.fixture.test/send") {
      sends.push(body);
      if (body.purpose === "transactional" && !body.unsubscribe_token) return Response.json({ type: "missing_unsubscribe", message: "Transactional emails must include an unsubscribe_token" }, { status: 400 });
      if (emailResult === "reject") return Response.json({ error: "Temporary failure" }, { status: 503 });
      if (emailResult === "429") return Response.json({ error: "Rate limited" }, { status: 429, headers: { "retry-after": "60" } });
      if (emailResult === "not-accepted") return Response.json({ success: false });
      return Response.json({ success: true, message_id: "test-message" });
    }
    if (!url.startsWith("https://db.fixture.test/")) throw new Error(`Unexpected network request: ${url}`);
    if (url.includes("/rpc/read_email_batch")) {
      reads.push(body.queue_name);
      return Response.json(body.queue_name === "refund_alert_emails" ? [{ msg_id: 1, read_ct: 1, message: {
        message_id: "test-message", to: "peter@gobold.com.au", from: "Hair Transplant Group <noreply@notify.hairtransplantgroup.com.au>",
        sender_domain: "notify.hairtransplantgroup.com.au", subject: "[TEST] Refund alert", html: "<p>Test</p>", text: "Test",
        purpose: "transactional", label: "refund-alert", idempotency_key: "refund-alert-test", unsubscribe_token: "fixture-unsubscribe-token", queued_at: new Date().toISOString(),
      } }] : []);
    }
    if (url.includes("/rpc/delete_email")) { deletes.push(body); return Response.json(true); }
    if (url.includes("/email_send_state")) return Response.json(init?.method === "PATCH" ? null : { batch_size: 10, send_delay_ms: 0 });
    if (url.includes("/email_send_log")) {
      if (init?.method === "POST") { logs.push(body); return new Response(null, { status: 201 }); }
      if (url.includes("status=eq.sent")) return Response.json(duplicate ? [{ id: "already-sent" }] : []);
      return Response.json([]);
    }
    throw new Error(`Unexpected database request: ${url}`);
  }) as typeof fetch;
  const run = async (refundOnly: boolean) => (Route.options as any).server.handlers.POST({ request: new Request("https://fixture.test/lovable/email/queue/process", {
    method: "POST", headers: { authorization: "Bearer fixture-service-role", "content-type": "application/json" }, body: JSON.stringify({ refundAlertsOnly: refundOnly }),
  }) });
  return { reads, deletes, logs, sends, run };
}

test("refund scheduler sends only its dedicated queue and logs provider acceptance", async () => {
  const f = setup(); const response = await f.run(true);
  expect(response.status).toBe(200); expect(f.reads).toEqual(["refund_alert_emails"]);
  expect(f.sends).toHaveLength(1); expect(f.sends[0].to).toBe("peter@gobold.com.au"); expect(f.sends[0].idempotency_key).toBe("refund-alert-test");
  expect(f.sends[0].unsubscribe_token).toBe("fixture-unsubscribe-token");
  expect(f.logs.some(row => row.status === "sent")).toBe(true); expect(f.deletes).toHaveLength(1);
});
test("existing email callers keep their original queues", async () => {
  const f = setup(); await f.run(false); expect(f.reads).toEqual(["auth_emails", "transactional_emails"]); expect(f.sends).toHaveLength(0);
});
test("failed owner-email sends stay queued for retry", async () => {
  const f = setup("reject"); await f.run(true); expect(f.deletes).toHaveLength(0); expect(f.logs.some(row => row.status === "failed")).toBe(true);
});
test("rate limits keep owner emails queued and stop the batch", async () => {
  const f = setup("429"); const response = await f.run(true); expect((await response.json()).stopped).toBe("rate_limited"); expect(f.deletes).toHaveLength(0);
});
test("HTTP 200 without provider acceptance does not mark the email sent", async () => {
  const f = setup("not-accepted"); await f.run(true); expect(f.deletes).toHaveLength(0); expect(f.logs.some(row => row.status === "sent")).toBe(false);
});
test("already-sent owner emails are removed without sending again", async () => {
  const f = setup("ok", true); await f.run(true); expect(f.sends).toHaveLength(0); expect(f.deletes).toHaveLength(1);
});
