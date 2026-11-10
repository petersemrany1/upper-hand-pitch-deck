export type CapacityClinic = { id: string; location?: string | null; city?: string | null };
export type CapacityRead = { clinics: CapacityClinic[]; remaining: Record<string, number> };
export type CapacityState = CapacityRead & {
  status: "checking" | "ready" | "error";
  blockedClinicIds: string[];
};
export const initialCapacityState = (): CapacityState => ({ clinics: [], remaining: {}, blockedClinicIds: [], status: "checking" });

export function clinicLocationKeywords(c: { location?: string | null; city?: string | null }): string[] {
  const keys = new Set<string>();
  for (const raw of [c.location, c.city]) {
    const value = (raw ?? "").trim().toLowerCase();
    if (!value) continue;
    keys.add(value);
    const first = value.split(/\s+/)[0];
    if (first && first !== value && first.length >= 5) keys.add(first);
  }
  return [...keys];
}

export function capacityLocations(state: CapacityState) {
  const all: string[] = [], available: string[] = [];
  for (const clinic of state.clinics) {
    const keys = clinicLocationKeywords(clinic);
    all.push(...keys);
    if (!state.blockedClinicIds.includes(clinic.id) && (state.remaining[clinic.id] ?? 0) > 0) available.push(...keys);
  }
  return { all, available };
}

/** Mutations invalidate old reads; routine polls do not. In particular, a slow
 * response must not be discarded forever by the next 15-second poll. */
export function createCapacityMonitor(options: {
  read: () => Promise<CapacityRead>;
  changed: (state: CapacityState) => void;
  report: (error: unknown) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
  timeoutMs?: number;
}) {
  const schedule = options.schedule ?? setTimeout, cancel = options.cancel ?? clearTimeout;
  let state = initialCapacityState();
  let revision = 0, failures = 0;
  let running = false, pending = false, stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const publish = (patch: Partial<CapacityState>) => {
    if (stopped) return;
    state = { ...state, ...patch };
    options.changed(state);
  };
  const run = async () => {
    if (stopped || running) return;
    running = true;
    const started = revision;
    try {
      const result = await Promise.race([
        Promise.resolve().then(options.read),
        new Promise<never>((_, reject) => {
          deadline = schedule(() => reject(new Error("Clinic availability check timed out")), options.timeoutMs ?? 12_000);
        }),
      ]);
      if (!stopped && started === revision) {
        failures = 0;
        publish({ ...result, blockedClinicIds: [], status: "ready" });
      }
    } catch (error) {
      if (!stopped && started === revision) {
        publish({ status: "error" });
        // One diagnostic per outage, without flooding logs on each retry.
        if (failures++ === 0) options.report(error);
        retry = schedule(() => { retry = undefined; void run(); }, Math.min(2_000 * 2 ** (failures - 1), 15_000));
      }
    } finally {
      if (deadline !== undefined) cancel(deadline);
      deadline = undefined;
      running = false;
      if (pending && !stopped) { pending = false; void run(); }
    }
  };
  return {
    refresh(change?: { clinicId?: string }) {
      if (stopped) return;
      if (change) {
        revision += 1;
        const blockedClinicIds = change.clinicId
          ? [...new Set([...state.blockedClinicIds, change.clinicId])]
          : state.clinics.map(c => c.id);
        publish({ blockedClinicIds, status: "checking" });
        if (running) pending = true;
      }
      if (retry !== undefined) { cancel(retry); retry = undefined; }
      void run();
    },
    stop() {
      stopped = true;
      if (retry !== undefined) cancel(retry);
      if (deadline !== undefined) cancel(deadline);
    },
  };
}
