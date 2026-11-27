// Ported Legal code imports `supabase` from here (typed with the Legal schema).
// In "legal" mode it is the live connection to the Legal app's own database
// (src/lib/legal/client.ts); in "portal" mode it is this portal's own
// connection, translated to the legal_ tables (src/legal/runtime/prefix.ts).
import type { SupabaseClient } from "@supabase/supabase-js";
import { legalDb } from "@/lib/legal/client";
import { supabase as portal } from "@/integrations/supabase/client";
import { legalScopedClient } from "@/legal/runtime/prefix";
import { legalDataMode } from "@/legal/runtime/mode";
import type { Database } from "./types";

let scoped: SupabaseClient<Database> | null = null;
const portalLegal = () => (scoped ??= legalScopedClient(portal) as unknown as SupabaseClient<Database>);

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const db = legalDataMode() === "portal" ? portalLegal() : (legalDb() as unknown as SupabaseClient<Database>);
    const value = Reflect.get(db, prop, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
});
