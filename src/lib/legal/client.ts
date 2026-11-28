// Connection to the Legal Group database (Supabase project kofsmcrtngyzxoysmdhf).
//
// The Legal Group runs on its own database and its own app
// (family-law-floater.lovable.app). The Upper Hand portal reads and writes it
// live through this client: nothing is copied, so nothing goes stale. The
// publishable key below is the same public key the Legal app ships to every
// browser; row-level security in the Legal database decides what a signed-in
// Legal staff member can see.
//
// The session is stored under its own key so it never collides with the
// Upper Hand (hair) session in the same browser.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as portalSupabase } from "@/integrations/supabase/client";
import { legalScopedClient } from "@/legal/runtime/prefix";
import { legalLiveNow } from "@/legal/runtime/trial";

export const LEGAL_SUPABASE_URL = "https://kofsmcrtngyzxoysmdhf.supabase.co";
export const LEGAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7jueXKwRTpdwdHW4OE-uUg_thIRfZUr";

// The Legal app itself. Tools that still run on the Legal app's own server
// (dialler, SMS, contracts, AI) open from here inside the portal.
export const LEGAL_APP_ORIGIN = "https://family-law-floater.lovable.app";

const LEGAL_AUTH_STORAGE_KEY = "upperhand-legal-auth";

// New-style publishable keys are opaque strings, not JWTs, so they must not be
// sent as a bearer token (same handling as the Legal app's own client).
function legalFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
  );
  if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  if (headers.get("Authorization") === `Bearer ${LEGAL_SUPABASE_PUBLISHABLE_KEY}`) {
    headers.delete("Authorization");
  }
  headers.set("apikey", LEGAL_SUPABASE_PUBLISHABLE_KEY);
  return fetch(input, { ...init, headers });
}

let client: SupabaseClient | undefined;
let portalLegal: SupabaseClient | undefined;

/**
 * Where a Legal page link goes: inside the portal once the Legal move is
 * switched over, otherwise the Legal app.
 */
export function legalAppLink(path: string): { href: string; external: boolean } {
  if (!legalLiveNow()) return { href: `${LEGAL_APP_ORIGIN}${path}`, external: true };
  const inside: Record<string, string> = {
    "/booked-appointments": "/booked-appointments?biz=legal",
    "/firms": "/legal/firms",
    "/dashboard": "/legal/dashboard",
  };
  return { href: inside[path] ?? `/legal${path}`, external: false };
}

// Untyped on purpose: the Legal schema's generated types live in the Legal
// repo. Each Legal view in this portal declares the row shapes it reads.
/** The Legal app's own (old) database, whatever the switch says. Move tooling only. */
export function oldLegalDb(): SupabaseClient {
  if (!client) {
    client = createClient(LEGAL_SUPABASE_URL, LEGAL_SUPABASE_PUBLISHABLE_KEY, {
      global: { fetch: legalFetch },
      auth: {
        storageKey: LEGAL_AUTH_STORAGE_KEY,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function legalDb(): SupabaseClient {
  // After switch-over the Legal records live in this portal's database
  // (legal_ tables), read with the portal sign-in.
  if (legalLiveNow()) return (portalLegal ??= legalScopedClient(portalSupabase) as unknown as SupabaseClient);
  if (!client) {
    client = createClient(LEGAL_SUPABASE_URL, LEGAL_SUPABASE_PUBLISHABLE_KEY, {
      global: { fetch: legalFetch },
      auth: {
        storageKey: LEGAL_AUTH_STORAGE_KEY,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
