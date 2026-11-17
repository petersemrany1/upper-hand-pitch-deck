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
  read: (signal: AbortSignal) => Promise<CapacityRead>;
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
  let active: AbortController | undefined;
  const publish = (patch: Partial<CapacityState>) => {
    if (stopped) return;
    state = { ...state, ...patch };
    options.changed(state);
  };
  const run = async () => {
    if (stopped || running) return;
    running = true;
    const started = revision;
    const controller = new AbortController();
    active = controller;
    // Close the dial gate on the original 12s schedule. A slow, still-valid
    // response gets a chance to finish instead of restarting the same work.
    const pause = schedule(() => {
      if (!stopped && started === revision && state.status === "ready") publish({ status: "checking" });
    }, 12_000);
    const deadline = schedule(() => controller.abort(new Error("Clinic availability check timed out")), options.timeoutMs ?? 30_000);
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => options.read(controller.signal)),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
        }),
      ]);
      if (!stopped && started === revision) {
        failures = 0;
        publish({ ...result, blockedClinicIds: [], status: "ready" });
      }
    } catch (error) {
      controller.abort(); // Cancel the other leg if one of the two reads failed.
      if (!stopped && started === revision) {
        publish({ status: "error" });
        // One diagnostic per outage, without flooding logs on each retry.
        if (failures++ === 0) options.report(error);
        retry = schedule(() => { retry = undefined; void run(); }, Math.min(2_000 * 2 ** (failures - 1), 15_000));
      }
    } finally {
      cancel(pause);
      cancel(deadline);
      active = undefined;
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
      active?.abort();
    },
  };
}
