export type PendingHandover = {
  lead_id: string;
  patient_name: string;
  clinic_name: string;
  appointment_date: string;
  appointment_time: string;
};

export type EndSessionResult = { ok: true } | { ok: false; pending: PendingHandover[] };

/** Keep local session/queue state until the server confirms that ending is safe. */
export async function finishSessionAfterHandoverCheck(options: {
  check: () => Promise<EndSessionResult>;
  blocked: (pending: PendingHandover[]) => void;
  complete: () => void;
  failed: () => void;
}) {
  try {
    const result = await options.check();
    if (result.ok !== true) {
      options.blocked(result.pending);
      return false;
    }
    options.complete();
    return true;
  } catch {
    options.failed();
    return false;
  }
}
