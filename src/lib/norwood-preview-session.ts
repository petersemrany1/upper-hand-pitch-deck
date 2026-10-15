import { NORWOOD_VIEWS, hasAllNorwoodViews, type NorwoodView, type NorwoodResult, type PatientNorwoodSession, type RepNorwoodSession } from "./norwood-assessment";

type Reply<T> = { ok: true; data: T } | { ok: false; error: string };
type Token = { data: { token: string } };
export type NorwoodPatientApi = {
  selectPatientNorwoodFrames?: (input: { data: { token: string; scan: import("./norwood-video-scan").NorwoodScan; frames: string[] } }) => Promise<Reply<import("./norwood-video-scan").NorwoodScanSelection>>;
  checkPatientNorwoodFrame?: (input: { data: { token: string; view: NorwoodView; photo: string } }) => Promise<Reply<import("./norwood-photo-check").NorwoodPhotoCheck>>;
  openPatientNorwood: (input: Token) => Promise<Reply<PatientNorwoodSession>>;
  consentPatientNorwood: (input: Token) => Promise<Reply<PatientNorwoodSession>>;
  uploadPatientNorwood: (input: { data: { token: string; view: NorwoodView; photo: string } }) => Promise<Reply<PatientNorwoodSession>>;
  analysePatientNorwood: (input: Token) => Promise<Reply<PatientNorwoodSession>>;
};
export type NorwoodRepApi = {
  getRepNorwoodAssessment: (input: { data: { leadId: string } }) => Promise<Reply<RepNorwoodSession | null>>;
  getNorwoodPhotoLinks: (input: { data: { leadId: string; assessmentId: string } }) => Promise<Reply<{ view: NorwoodView; url: string }[]>>;
  retryRepNorwoodAssessment: (input: { data: { leadId: string } }) => Promise<Reply<boolean>>;
  sendAiNorwoodLink: (input: { data: { leadId: string; clinicId: string } }) => Promise<Reply<RepNorwoodSession>>;
};
export type PreviewPhoto = { view: NorwoodView; base64: string };
type Snapshot = { generation: number; started: boolean; session: PatientNorwoodSession; result: NorwoodResult | null; finalNorwood: number | null; photos: PreviewPhoto[] };

// This adapter has no database, storage, SMS, localStorage or production API dependency.
// Closing/resetting the preview discards the tab's photographs. Only estimate() sends images.
export function createNorwoodPreviewSession(clinicName: string, token: string, estimate: (photos: PreviewPhoto[]) => Promise<NorwoodResult>) {
  const blank = (): PatientNorwoodSession => ({ clinicName, expiresAt: new Date(Date.now() + 7_200_000).toISOString(), status: "sent", views: [], consented: false, estimate: null, needsReview: false, canRetry: false });
  let state: Snapshot = { generation: 0, started: false, session: blank(), result: null, finalNorwood: null, photos: [] };
  let disposed = false, attempts = 0;
  let pending: Promise<Reply<PatientNorwoodSession>> | null = null;
  const listeners = new Set<() => void>();
  const ok = <T>(data: T): Reply<T> => ({ ok: true, data });
  const fail = (error: string): Reply<never> => ({ ok: false, error });
  const publish = () => { state = { ...state, session: { ...state.session } }; listeners.forEach(fn => fn()); };
  const valid = (value: string) => !disposed && state.started && value === token && Date.parse(state.session.expiresAt) > Date.now();
  const rep = (): RepNorwoodSession => ({ id: `preview-${state.generation}`, clinicId: "preview-clinic", clinicName, status: state.session.status, expiresAt: state.session.expiresAt, expired: Date.parse(state.session.expiresAt) <= Date.now(), revoked: disposed, openedAt: state.session.status === "sent" ? null : "preview-opened", photoCount: state.photos.length, result: state.result, finalNorwood: state.finalNorwood, reviewedAt: state.finalNorwood == null ? null : "preview-confirmed", canRetry: state.session.canRetry });
  const analyse = async ({ data }: Token): Promise<Reply<PatientNorwoodSession>> => {
    if (!valid(data.token)) return fail("This preview session expired. Start a new test.");
    if (state.result) return ok(state.session);
    if (pending) return pending;
    if (!state.session.consented || !hasAllNorwoodViews(state.photos.map(p => p.view))) return fail("Take all five photos first.");
    if (attempts >= 3) return fail("Start a new test to try another estimate.");
    const generation = state.generation;
    attempts++;
    state.session = { ...state.session, status: "analysing", canRetry: false }; publish();
    pending = (async () => {
      try {
        const result = await estimate(state.photos.map(photo => ({ ...photo })));
        if (disposed || state.generation !== generation) return fail("This test was reset.");
        state.result = result;
        state.session = { ...state.session, status: "ready", estimate: result.norwood, needsReview: result.confidence === "low" || result.photo_problems.length > 0, canRetry: false };
        publish(); return ok(state.session);
      } catch (error) {
        if (disposed || state.generation !== generation) return fail("This test was reset.");
        state.session = { ...state.session, status: "failed", canRetry: attempts < 3 }; publish();
        return fail(error instanceof Error ? error.message : "The test estimate could not finish.");
      } finally { if (state.generation === generation) pending = null; }
    })();
    return pending;
  };
  const patientApi: NorwoodPatientApi = {
    openPatientNorwood: async ({ data }) => {
      if (!valid(data.token)) return fail("This preview session expired. Start a new test.");
      if (state.session.status === "sent") { state.session.status = "opened"; publish(); }
      return ok(state.session);
    },
    consentPatientNorwood: async ({ data }) => {
      if (!valid(data.token)) return fail("This preview session expired. Start a new test.");
      state.session.consented = true; publish(); return ok(state.session);
    },
    uploadPatientNorwood: async ({ data }) => {
      if (!valid(data.token) || !state.session.consented) return fail("Start the preview and agree before adding photos.");
      if (pending || state.result) return fail("Start a new test to change the photos.");
      if (state.photos.some(p => p.view !== data.view && p.base64 === data.photo)) return fail("Please take a different photo for each angle.");
      state.photos = [...state.photos.filter(p => p.view !== data.view), { view: data.view, base64: data.photo }];
      state.session = { ...state.session, views: NORWOOD_VIEWS.filter(v => state.photos.some(p => p.view === v)), status: state.photos.length === 5 ? "photos_in" : "opened" };
      publish(); return ok(state.session);
    },
    analysePatientNorwood: analyse,
  };
  const repApi: NorwoodRepApi = {
    getRepNorwoodAssessment: async () => ok(state.started ? rep() : null),
    getNorwoodPhotoLinks: async () => ok(state.photos.map(p => ({ view: p.view, url: `data:image/jpeg;base64,${p.base64}` }))),
    retryRepNorwoodAssessment: async () => { const result = await analyse({ data: { token } }); return result.ok ? ok(true) : result; },
    sendAiNorwoodLink: async () => {
      state = { generation: state.generation + 1, started: true, session: blank(), result: null, finalNorwood: null, photos: [] };
      attempts = 0; pending = null; publish(); return ok(rep());
    },
  };
  return {
    patientApi, repApi,
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    activate: () => { disposed = false; },
    confirm: (value: number) => { if (!state.result || !Number.isInteger(value) || value < 1 || value > 7) return; state.finalNorwood = value; publish(); },
    dispose: () => { disposed = true; state = { ...state, photos: [], result: null, finalNorwood: null }; listeners.clear(); },
  };
}
