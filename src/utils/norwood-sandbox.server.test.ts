import { expect, test } from "bun:test";
import { decodeNorwoodPhoto, patientPreviewUrl, hashNorwoodToken, patientSession, requestNorwoodEstimate, retryAvailable, type AssessmentRow } from "./norwood-sandbox.server";
import { NORWOOD_MODEL, NORWOOD_SYSTEM_PROMPT, NORWOOD_VIEWS } from "../lib/norwood-assessment";
const row = {
  id: "secret-session", lead_id: "private-lead", token_hash: "private-hash", clinic_id: "private-clinic",
  clinic_name: "Test Clinic", status: "ready", expires_at: "2099-01-01T00:00:00Z", revoked_at: null,
  opened_at: null, consented_at: "2026-01-01", photos: { front: { path: "private/path", sha256: "digest" } },
  analysis_run: null, analysis_started_at: null, analysis_attempts: 1,
  ai_norwood: 4, ai_confidence: "low", ai_reason: "Private model reason", photo_problems: ["Private detail"],
  final_norwood: 5, reviewed_at: null,
} satisfies AssessmentRow;
test("patient responses expose only branding, progress and their estimate", () => {
  const safe = patientSession(row);
  expect(Object.keys(safe).sort()).toEqual(["clinicName","expiresAt","status","views","consented","estimate","needsReview","canRetry"].sort());
  expect(JSON.stringify(safe)).not.toContain("private");
  expect(safe.estimate).toBe(4);
  expect(safe.needsReview).toBe(true);
  expect(patientSession({ ...row, ai_confidence: "high", photo_problems: [] }).needsReview).toBe(false);
  expect(patientSession({ ...row, status: "failed" }).estimate).toBeNull();
});
test("link hash is deterministic, one-way representation with no embedded lead ID", () => {
  const hash = hashNorwoodToken("random-bearer-token");
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(hash).not.toContain("random-bearer-token");
  expect(hash).not.toBe(hashNorwoodToken("different-token"));
});
test("retry requires a stale lease or failure, with at most three attempts", () => {
  const now = Date.now();
  expect(retryAvailable({ ...row, status: "analysing", analysis_started_at: new Date(now-91_000).toISOString() },now)).toBe(true);
  expect(retryAvailable({ ...row, status: "analysing", analysis_started_at: new Date(now-10_000).toISOString() },now)).toBe(false);
  expect(retryAvailable({ ...row, status: "failed", analysis_attempts: 3 })).toBe(false);
});
test("uploads reject non-JPEG and oversized data", () => {
  expect(() => decodeNorwoodPhoto(Buffer.from("<svg>not a camera photo</svg>").toString("base64"))).toThrow();
  expect(() => decodeNorwoodPhoto("A".repeat(3_000_000))).toThrow();
  expect(() => decodeNorwoodPhoto("data:image/jpeg;base64,AAAA")).toThrow();
});
test("the provider receives all five labelled photos together in one server-side request", async () => {
  const calls: { url: string; body: any; key: string | null }[] = [];
  const request = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)), key: new Headers(init?.headers).get("x-api-key") });
    return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ assessment: { norwood: 5, confidence: "medium", reason: "The separating bridge appears narrow.", photo_problems: [], observations: {
      views: { front: "clear", top: "clear", crown: "clear", left: "clear", right: "clear" },
      pattern: "standard", hairline: "extensive", crown: "distinct_loss", bridge: "narrow_sparse", fringe: "broad", anterior_extent: "not_applicable", boundary_uncertain: false,
    } } }) }] });
  }) as typeof fetch;
  const result = await requestNorwoodEstimate(NORWOOD_VIEWS.map(view => ({ view, base64: `test-${view}` })), "fixture-secret", request);
  expect(result.norwood).toBe(5); expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
  expect(calls[0].key).toBe("fixture-secret"); expect(calls[0].body.model).toBe(NORWOOD_MODEL);
  expect(calls[0].body.system).toContain(NORWOOD_SYSTEM_PROMPT);
  expect(calls[0].body.output_config.format.schema.properties.assessment.anyOf).toHaveLength(2);
  const blocks = calls[0].body.messages[0].content;
  expect(blocks.filter((b: any) => b.type === "image").map((b: any) => b.source.data)).toEqual(NORWOOD_VIEWS.map(v => `test-${v}`));
  expect(blocks.filter((b: any) => b.type === "text").slice(0,5).map((b: any) => b.text)).toEqual(NORWOOD_VIEWS.map(v => `Photo: ${v}`));
  await expect(requestNorwoodEstimate([{ view: "front", base64: "test" }], "fixture-secret", request)).rejects.toThrow("five");
  expect(calls).toHaveLength(1);
});
test("a refusal, truncated response or provider failure never becomes a displayed stage", async () => {
  const images = NORWOOD_VIEWS.map(view => ({ view, base64: "fixture" }));
  for (const response of [
    Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "null" }] }),
    Response.json({ stop_reason: "max_tokens", content: [{ type: "text", text: "{}" }] }),
    Response.json({ error: "unavailable" }, { status: 503 }),
  ]) await expect(requestNorwoodEstimate(images,"fixture-secret", (async () => response.clone()) as unknown as typeof fetch)).rejects.toThrow();
});

import { assertNorwoodSandboxLead, NORWOOD_PATIENT_PREVIEW_ORIGIN } from "../lib/norwood-sandbox-access";
test("cross-device preview cannot be used with real leads or a live patient origin", () => {
  expect(() => assertNorwoodSandboxLead("5e70f557-73ce-4bb7-a11a-6b718dbd092f")).not.toThrow();
  expect(() => assertNorwoodSandboxLead("b2828129-1c28-4502-927a-11f43a0a8473")).not.toThrow();
  expect(() => assertNorwoodSandboxLead("00000000-0000-4000-8000-000000000099")).toThrow("sandbox");
  expect(new URL(NORWOOD_PATIENT_PREVIEW_ORIGIN).hostname).toBe("preview--hairtransplantgroup.lovable.app");
});

test("phone link uses the approved short preview URL and preserves two-hour patient access", () => {
  const previous = process.env.NORWOOD_PREVIEW_GUEST_URL;
  const previousExpiry = process.env.NORWOOD_PREVIEW_GUEST_EXPIRES_AT;
  try {
    delete process.env.NORWOOD_PREVIEW_GUEST_URL;
    expect(() => patientPreviewUrl("patient-token")).toThrow("guest preview");
    process.env.NORWOOD_PREVIEW_GUEST_URL = "https://hairtransplantgroup.lovable.app/?preview=fixture";
    expect(() => patientPreviewUrl("patient-token")).toThrow("test project");
    process.env.NORWOOD_PREVIEW_GUEST_URL = "https://lovable.dev/preview/fixture";
    delete process.env.NORWOOD_PREVIEW_GUEST_EXPIRES_AT;
    expect(() => patientPreviewUrl("patient-token")).toThrow("ending soon");
    process.env.NORWOOD_PREVIEW_GUEST_EXPIRES_AT = new Date(Date.now() + 86400000).toISOString();
    const url = new URL(patientPreviewUrl("patient-token"));
    expect(url.origin).toBe("https://lovable.dev");
    expect(url.pathname).toBe("/preview/fixture");
    expect(url.search).toBe("");
    expect(url.hash).toBe("#norwood-test=patient-token");
    process.env.NORWOOD_PREVIEW_GUEST_EXPIRES_AT = new Date(Date.now() + 3600000).toISOString();
    expect(() => patientPreviewUrl("patient-token")).toThrow("ending soon");
    process.env.NORWOOD_PREVIEW_GUEST_URL = "https://lovable.dev/preview/fixture?__lovable_token=personal";
    expect(() => patientPreviewUrl("patient-token")).toThrow("approved shared preview");
  } finally {
    if (previous === undefined) delete process.env.NORWOOD_PREVIEW_GUEST_URL; else process.env.NORWOOD_PREVIEW_GUEST_URL = previous;
    if (previousExpiry === undefined) delete process.env.NORWOOD_PREVIEW_GUEST_EXPIRES_AT; else process.env.NORWOOD_PREVIEW_GUEST_EXPIRES_AT = previousExpiry;
  }
});

test("review outcomes keep saved photos and do not invite repeated analysis", () => {
  const reviewed = { ...row, status: "failed" as const, photo_problems: ["HP-EVIDENCE"] };
  expect(retryAvailable(reviewed)).toBe(false);
  expect(patientSession(reviewed).needsReview).toBe(true);
  expect(patientSession(reviewed).estimate).toBeNull();
  expect(patientSession({...reviewed, photo_problems:["HP-529"]}).canRetry).toBe(true);
  expect(patientSession({...reviewed, photo_problems:["HP-529"]}).needsReview).toBe(false);
});
