import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Per signed-in portal. A failed or partial attendance list cannot approve a dial. */
export function createAttendanceCheck(db: Pick<SupabaseClient<Database>, "from">, normalize: (phone: string | null) => string) {
  let expires = 0;
  let phones = new Set<string>();
  let loading: Promise<Set<string>> | undefined;
  async function load() {
    const next = new Set<string>();
    const signal = AbortSignal.timeout(20_000);
    let lastId: string | undefined;
    for (;;) {
      let page = db.from("clinic_appointments").select("id,patient_phone").eq("outcome", "show")
        .order("id").limit(500);
      if (lastId) page = page.gt("id", lastId);
      const { data, error } = await page.abortSignal(signal);
      if (error || !data) throw new Error("Could not check previous attendance. Please retry before calling.");
      for (const row of data) {
        const digits = normalize(row.patient_phone);
        if (digits) next.add(digits);
      }
      if (data.length < 500) break;
      lastId = data[data.length - 1].id;
    }
    expires = Date.now() + 5 * 60_000;
    phones = next;
    return phones;
  }
  return () => {
    if (Date.now() < expires) return Promise.resolve(phones);
    loading ??= load().finally(() => { loading = undefined; });
    return loading;
  };
}
