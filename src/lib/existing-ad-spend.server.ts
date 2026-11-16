// PostgREST caps each response. Read every page before deciding which ad-days
// to insert; a large requested limit alone still returns only the first page.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { dailySpendKey } from "./numbers-ad-identity";

export async function existingAdDays(db: SupabaseClient<Database>, since: string, until: string) {
  const byKey = new Map<string, string>();
  for (let lo = 0; ; lo += 500) {
    const { data, error } = await db.from("ad_spend_daily").select("id, date, ad_id, ad_name")
      .gte("date", since).lte("date", until).order("date").order("id").range(lo, lo + 499);
    if (error) throw new Error(`Read failed: ${error.message}`);
    for (const row of data ?? []) byKey.set(dailySpendKey(row), row.id);
    if (!data || data.length < 500) return byKey;
  }
}
