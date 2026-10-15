import { expect, test } from "bun:test";
import { createNorwoodPreviewSession } from "./norwood-preview-session";
import { assertNorwoodPreviewRequest } from "./norwood-preview-access";
import { NORWOOD_VIEWS, type NorwoodResult } from "./norwood-assessment";

const token = "preview-token";
const input = { data: { token } };
const estimate: NorwoodResult = { norwood: 5, confidence: "low", reason: "The separating band appears narrow.", photo_problems: [] };
async function fill(store: ReturnType<typeof createNorwoodPreviewSession>) {
  await store.repApi.sendAiNorwoodLink({});
  await store.patientApi.consentPatientNorwood(input);
  for (const view of NORWOOD_VIEWS) await store.patientApi.uploadPatientNorwood({ data: { token, view, photo: `jpeg-${view}` } });
}
test("preview host enforcement rejects live, lookalike and cross-origin requests", () => {
  const origin = "https://preview--hairtransplantgroup.lovable.app";
  expect(() => assertNorwoodPreviewRequest(`${origin}/_serverFn/test`, origin)).not.toThrow();
  for (const url of ["https://hairtransplantgroup.lovable.app", `${origin}.evil.test`, "https://preview--another.lovable.app"]) expect(() => assertNorwoodPreviewRequest(url, url)).toThrow();
  expect(() => assertNorwoodPreviewRequest(origin, "https://evil.test")).toThrow();
  expect(() => assertNorwoodPreviewRequest(origin, null)).toThrow();
});
test("requires a session, consent and five distinct views before calling AI", async () => {
  let calls = 0;
  const store = createNorwoodPreviewSession("Example Clinic", token, async () => { calls++; return estimate; });
  expect((await store.patientApi.analysePatientNorwood(input)).ok).toBe(false);
  await store.repApi.sendAiNorwoodLink({});
  expect((await store.patientApi.uploadPatientNorwood({ data: { token, view: "front", photo: "jpeg" } })).ok).toBe(false);
  await store.patientApi.consentPatientNorwood(input);
  await store.patientApi.uploadPatientNorwood({ data: { token, view: "front", photo: "jpeg" } });
  expect((await store.patientApi.uploadPatientNorwood({ data: { token, view: "crown", photo: "jpeg" } })).ok).toBe(false);
  expect((await store.patientApi.analysePatientNorwood(input)).ok).toBe(false);
  expect(calls).toBe(0);
});
test("only the real returned estimate reaches the patient; rep confirmation remains separate", async () => {
  const store = createNorwoodPreviewSession("Example Clinic", token, async photos => { expect(photos.map(p => p.view)).toEqual([...NORWOOD_VIEWS]); return estimate; });
  await fill(store);
  expect(store.getSnapshot().session.status).toBe("photos_in");
  await store.patientApi.analysePatientNorwood(input);
  expect(store.getSnapshot().session.estimate).toBe(5);
  expect(store.getSnapshot().session.needsReview).toBe(true);
  expect(store.getSnapshot().finalNorwood).toBeNull();
  store.confirm(4);
  expect(store.getSnapshot().finalNorwood).toBe(4);
  expect(store.getSnapshot().result?.norwood).toBe(5);
  store.dispose();
  expect(store.getSnapshot().photos).toHaveLength(0);
});
test("reset fences a late AI result and clears previous photographs", async () => {
  let finish!: (value: NorwoodResult) => void;
  const store = createNorwoodPreviewSession("Example Clinic", token, () => new Promise(resolve => { finish = resolve; }));
  await fill(store);
  const pending = store.patientApi.analysePatientNorwood(input);
  await store.repApi.sendAiNorwoodLink({});
  finish(estimate); await pending;
  expect(store.getSnapshot().session.status).toBe("sent");
  expect(store.getSnapshot().photos).toHaveLength(0);
  expect(store.getSnapshot().result).toBeNull();
});
test("AI errors stay errors and retries are bounded", async () => {
  let calls = 0;
  const store = createNorwoodPreviewSession("Example Clinic", token, async () => { calls++; throw new Error("AI unavailable"); });
  await fill(store);
  for (let i = 0; i < 4; i++) expect((await store.patientApi.analysePatientNorwood(input)).ok).toBe(false);
  expect(calls).toBe(3);
  expect(store.getSnapshot().session.estimate).toBeNull();
  expect(store.getSnapshot().session.canRetry).toBe(false);
});
test("React development effect replay does not leave a new session revoked", async () => {
  const store = createNorwoodPreviewSession("Example Clinic", token, async () => estimate);
  store.activate(); store.dispose(); store.activate();
  await store.repApi.sendAiNorwoodLink({});
  expect((await store.patientApi.openPatientNorwood(input)).ok).toBe(true);
});
