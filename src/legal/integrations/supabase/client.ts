// Ported Legal pages import `supabase` from here. It is the Upper Hand
// portal's live connection to the Legal database (see src/lib/legal/client.ts),
// typed with the Legal schema.
import type { SupabaseClient } from "@supabase/supabase-js";
import { legalDb } from "@/lib/legal/client";
import type { Database } from "./types";

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const db = legalDb() as unknown as SupabaseClient<Database>;
    const value = Reflect.get(db, prop, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
});
