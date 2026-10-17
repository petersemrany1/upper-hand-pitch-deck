import { afterEach, expect, test } from "bun:test";
import { Route } from "@/routes/lovable/email/queue/process";

const originalFetch = globalThis.fetch;
const keys = ["LOVABLE_API_KEY", "LOVABLE_SEND_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const originalEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) { if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key]; }
});

function setup(emailResult: "ok" | "reject" | "429" | "not-accepted" | "failed-run" | "other-conflict" = "ok", duplicate = false,
  handover?: "pending" | "complete" | "lookup-failed" | "suppressed", reclassification?: "pending" | "lookup-failed" | "suppressed" | "missing") {
  process.env.LOVABLE_API_KEY = "fixture-api-key";
  process.env.LOVABLE_SEND_URL = "https://email.fixture.test/send";
  process.env.VITE_SUPABASE_URL = "https://db.fixture.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-role";
  const reads: string[] = [], deletes: any[] = [], logs: any[] = [], sends: any[] = [], renewals: any[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url === "https://email.fixture.test/send") {
      sends.push(body);
      if (body.purpose === "transactional" && !body.unsubscribe_token) return Response.json({ type: "missing_unsubscribe", message: "Transactional emails must include an unsubscribe_token" }, { status: 400 });
      if (emailResult === "reject") return Response.json({ error: "Temporary failure" }, { status: 503 });
      if (emailResult === "429") return Response.json({ error: "Rate limited" }, { status: 429, headers: { "retry-after": "60" } });
      if (emailResult === "not-accepted") return Response.json({ success: false });
      if (emailResult === "failed-run") return Response.json({ type: "run_failed", message: "This email send already failed. Send again with a new idempotency key." }, { status: 409 });
      if (emailResult === "other-conflict") return Response.json({ type: "run_pending" }, { status: 409 });
      return Response.json({ success: true, message_id: "test-message" });
    }
    if (!url.startsWith("https://db.fixture.test/")) throw new Error(`Unexpected network request: ${url}`);
    if (url.includes("/rpc/read_email_batch")) {
      reads.push(body.queue_name);
      return Response.json(body.queue_name === (reclassification ? "reclassification_alert_emails" : handover ? "handover_alert_emails" : "refund_alert_emails") ? [{ msg_id: 1, read_ct: 1, message: {
        message_id: "test-message", to: "peter@gobold.com.au", from: "Hair Transplant Group <noreply@notify.hairtransplantgroup.com.au>",
        sender_domain: "notify.hairtransplantgroup.com.au", subject: "[TEST] Refund alert", html: "<p>Test</p>", text: "Test",
        purpose: "transactional", label: reclassification ? "reclassification-request" : handover ? "handover-overdue" : "refund-alert", idempotency_key: "refund-alert-test", unsubscribe_token: "fixture-unsubscribe-token", queued_at: new Date().toISOString(),
        ...(handover ? { handover_appointment_id: "fixture-appointment" } : {}),
        ...(reclassification ? { reclassification_request_id: "fixture-request" } : {}),
      } }] : []);
    }
    if (url.includes("/rpc/delete_email")) { deletes.push(body); return Response.json(true); }
    if (url.includes("/rpc/renew_failed_refund_email")) { renewals.push(body); return Response.json(true); }
    if (url.includes("/rpc/renew_failed_handover_email")) { renewals.push(body); return Response.json(true); }
    if (url.includes("/rpc/renew_failed_reclassification_email")) { renewals.push(body); return Response.json(true); }
    if (url.includes("/rpc/move_to_dlq")) { deletes.push(body); return Response.json(true); }
    if (url.includes("/clinic_reclassification_requests")) {
      if (reclassification === "lookup-failed") return Response.json({message:"database unavailable"},{status:400});
      return Response.json(reclassification === "missing" ? [] : [{id:"fixture-request",email_message_id:"test-message"}]);
    }
    if (url.includes("/pending_clinic_handovers")) {
      if (handover === "lookup-failed") return Response.json({message:"database read failed"},{status:400});
      return Response.json(handover === "complete" ? [] : [{appointment_id:"fixture-appointment"}]);
    }
    if (url.includes("/suppressed_emails")) return Response.json(handover === "suppressed" || reclassification === "suppressed" ? [{email:"peter@gobold.com.au"}] : []);
    if (url.includes("/email_unsubscribe_tokens")) return Response.json([{used_at:null}]);
    if (url.includes("/email_send_state")) return Response.json(init?.method === "PATCH" ? null : { batch_size: 10, send_delay_ms: 0 });
    if (url.includes("/email_send_log")) {
      if (init?.method === "POST") { logs.push(body); return new Response(null, { status: 201 }); }
      if (url.includes("status=eq.sent")) return Response.json(duplicate ? [{ id: "already-sent" }] : []);
      return Response.json([]);
    }
    throw new Error(`Unexpected database request: ${url}`);
  }) as typeof fetch;
  const run = async (refundOnly: boolean) => (Route.options as any).server.handlers.POST({ request: new Request("https://fixture.test/lovable/email/queue/process", {
    method: "POST", headers: { authorization: "Bearer fixture-service-role", "content-type": "application/json" }, body: JSON.stringify(reclassification ? {reclassificationAlertsOnly:true} : handover ? {handoverAlertsOnly:true} : { refundAlertsOnly: refundOnly }),
  }) });
  return { reads, deletes, logs, sends, renewals, run };
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
  expect(f.renewals).toHaveLength(0);
});
test("only an explicitly failed provider run renews the durable send key", async () => {
  const f = setup("failed-run"); await f.run(true);
  expect(f.renewals).toHaveLength(1); expect(f.renewals[0].p_previous_key).toBe("refund-alert-test");
  expect(f.renewals[0].p_next_key).toMatch(/^refund-alert-test-message-[0-9a-f-]{36}$/);
  expect(f.sends).toHaveLength(1); expect(f.deletes).toHaveLength(0);
});
test("an in-progress or unknown provider conflict never gets a second send key", async () => {
  const f = setup("other-conflict"); await f.run(true); expect(f.renewals).toHaveLength(0); expect(f.deletes).toHaveLength(0);
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

test("handover alerts use only their dedicated queue and verified provider acceptance",async()=>{
  const f=setup("ok",false,"pending");await f.run(false);
  expect(f.reads).toEqual(["handover_alert_emails"]);expect(f.sends).toHaveLength(1);
  expect(f.sends[0].label).toBe("handover-overdue");expect(f.logs.some(row=>row.status==="sent")).toBe(true);
});
test("a completed handover cancels the queued owner alert",async()=>{
  const f=setup("ok",false,"complete");await f.run(false);
  expect(f.sends).toHaveLength(0);expect(f.deletes).toHaveLength(1);expect(f.logs.some(row=>row.status==="suppressed")).toBe(true);
});
test("failed eligibility reads retain the handover alert without sending",async()=>{
  const f=setup("ok",false,"lookup-failed");await f.run(false);expect(f.sends).toHaveLength(0);expect(f.deletes).toHaveLength(0);
});
test("recipient suppression after enqueue prevents handover alert delivery",async()=>{
  const f=setup("ok",false,"suppressed");await f.run(false);expect(f.sends).toHaveLength(0);expect(f.deletes).toHaveLength(1);
});
test("unaccepted handover alert stays queued",async()=>{
  const f=setup("not-accepted",false,"pending");await f.run(false);expect(f.deletes).toHaveLength(0);expect(f.logs.some(row=>row.status==="sent")).toBe(false);
});
test("handover retry renews only a definitively failed run",async()=>{
  const f=setup("failed-run",false,"pending");await f.run(false);expect(f.renewals).toHaveLength(1);
  expect(f.renewals[0].p_next_key).toMatch(/^handover-overdue-test-message-/);
  const uncertain=setup("reject",false,"pending");await uncertain.run(false);expect(uncertain.renewals).toHaveLength(0);
});

test("reclassification requests send only their isolated owner queue", async () => {
  const f=setup("ok",false,undefined,"pending"); await f.run(false);
  expect(f.reads).toEqual(["reclassification_alert_emails"]); expect(f.sends).toHaveLength(1);
  expect(f.sends[0].to).toBe("peter@gobold.com.au"); expect(f.sends[0].label).toBe("reclassification-request");
  expect(f.logs.some(row=>row.status==="sent")).toBe(true);
});
test("reclassification lookup failures stay queued; suppressed and removed requests never send", async () => {
  const failed=setup("ok",false,undefined,"lookup-failed"); await failed.run(false);
  expect(failed.sends).toHaveLength(0); expect(failed.deletes).toHaveLength(0);
  for (const state of ["suppressed","missing"] as const) {
    const f=setup("ok",false,undefined,state); await f.run(false);
    expect(f.sends).toHaveLength(0); expect(f.logs.some(row=>row.status==="dlq")).toBe(true);
  }
});
test("reclassification delivery requires provider acceptance and only definitive failure renews a key", async () => {
  const rejected=setup("not-accepted",false,undefined,"pending"); await rejected.run(false);
  expect(rejected.deletes).toHaveLength(0); expect(rejected.logs.some(row=>row.status==="sent")).toBe(false);
  const definitive=setup("failed-run",false,undefined,"pending"); await definitive.run(false);
  expect(definitive.renewals).toHaveLength(1); expect(definitive.renewals[0].p_next_key).toMatch(/^reclassification-request-test-message-/);
  const uncertain=setup("other-conflict",false,undefined,"pending"); await uncertain.run(false); expect(uncertain.renewals).toHaveLength(0);
});
