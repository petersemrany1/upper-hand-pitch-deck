import { expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyTwilioSignature } from "./twilio-status-signature.server";

const base = "https://hairtransplantgroup.lovable.app/api/public/hooks/twilio-message-status";
const params = new URLSearchParams({ MessageSid: "SMfixture", MessageStatus: "undelivered" });
function request(signedUrl: string, actualUrl = signedUrl) {
  const payload = signedUrl + [...params].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("");
  return new Request(actualUrl, { method: "POST", headers: { "x-twilio-signature": createHmac("sha1", "fixture-token").update(payload).digest("base64") } });
}
test("legacy callback signatures still work", () => {
  expect(verifyTwilioSignature(request(base), params, "fixture-token")).toBe(true);
});
test("delivery ID is bound to the signed callback URL", () => {
  const url = `${base}?reminder_delivery=fixture-id`;
  expect(verifyTwilioSignature(request(url), params, "fixture-token")).toBe(true);
  expect(verifyTwilioSignature(request(base, url), params, "fixture-token")).toBe(false);
  expect(verifyTwilioSignature(request(url, `${base}?reminder_delivery=other-id`), params, "fixture-token")).toBe(false);
});
test("forwarded callbacks keep the exact query string", () => {
  const signed = `${base}?reminder_delivery=fixture-id`;
  const forwarded = request(signed, "http://internal-worker/api/public/hooks/twilio-message-status?reminder_delivery=fixture-id");
  expect(verifyTwilioSignature(forwarded, params, "fixture-token")).toBe(true);
});
