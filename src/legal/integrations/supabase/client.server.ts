// Server-side Legal code imports `supabaseAdmin` from here: the portal's
// service-role connection, translated to the legal_ tables. It never reaches
// the Legal app's own database.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as portalAdmin } from "@/integrations/supabase/client.server";
import { legalScopedClient } from "@/legal/runtime/prefix";
import type { Database } from "./types";

let scoped: SupabaseClient<Database> | null = null;
const admin = () => (scoped ??= legalScopedClient(portalAdmin) as unknown as SupabaseClient<Database>);

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const db = admin();
    const value = Reflect.get(db, prop, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
});
