// Supabase-backed authorization guards for edge functions.
//
// Wraps the pure decision logic in `authorize-core.ts` with real resolvers:
//  - verifyUser: validates the caller's Supabase session (anon-key client)
//  - lookupSalesRole: reads public.sales_reps.role by email (service-role client)
//
// Use `requireSalesRole` for user-facing functions that expose lead/patient data
// (a clinic-portal user has no sales_reps row and is denied). Use
// `requireInternalOrSalesRole` for functions also invoked server-to-server or by
// pg_cron, which authenticate with the service-role key or INTERNAL_FUNCTION_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authorizeRequest,
  type AuthorizeDeps,
  type RequestAuthInput,
} from "./authorize-core.ts";

export const SALES_ROLES = ["admin", "rep"] as const;

function parseBearer(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  // Some browser contexts (e.g. <audio src>) can't set headers, so allow ?token=.
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (token && token.trim()) return token.trim();
  } catch {
    // ignore malformed URL
  }
  return null;
}

function buildDeps(): AuthorizeDeps {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon =
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  return {
    verifyUser: async (token: string) => {
      if (!url || !anon) throw new Error("Supabase env not configured");
      const sb = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data?.user) return null;
      return { email: data.user.email ?? null };
    },
    lookupSalesRole: async (email: string) => {
      if (!url || !serviceRole) throw new Error("Supabase service env not configured");
      const admin = createClient(url, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await admin
        .from("sales_reps")
        .select("role")
        .ilike("email", email)
        .maybeSingle();
      return (data as { role?: string | null } | null)?.role ?? null;
    },
  };
}

function toResponse(
  decision: { authorized: boolean; status: number; error?: string },
  corsHeaders: Record<string, string>,
): Response | null {
  if (decision.authorized) return null;
  return new Response(JSON.stringify({ error: decision.error ?? "Unauthorized" }), {
    status: decision.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requestInput(req: Request): RequestAuthInput {
  return {
    internalSecretHeader: req.headers.get("x-internal-secret"),
    bearerToken: parseBearer(req),
  };
}

// Requires an authenticated sales rep whose role is in `allowedRoles`.
// Returns null when authorized, or a Response (401/403) to return immediately.
export async function requireSalesRole(
  req: Request,
  corsHeaders: Record<string, string>,
  allowedRoles: readonly string[] = SALES_ROLES,
): Promise<Response | null> {
  const decision = await authorizeRequest(
    requestInput(req),
    { allowedRoles: [...allowedRoles], allowInternal: false },
    buildDeps(),
  );
  return toResponse(decision, corsHeaders);
}

// Like requireSalesRole, but also accepts trusted internal callers presenting
// either the INTERNAL_FUNCTION_SECRET (x-internal-secret header) or the
// service-role key as a bearer token.
export async function requireInternalOrSalesRole(
  req: Request,
  corsHeaders: Record<string, string>,
  allowedRoles: readonly string[] = SALES_ROLES,
): Promise<Response | null> {
  const decision = await authorizeRequest(
    requestInput(req),
    {
      allowedRoles: [...allowedRoles],
      allowInternal: true,
      internalSecret: Deno.env.get("INTERNAL_FUNCTION_SECRET") || undefined,
      serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || undefined,
    },
    buildDeps(),
  );
  return toResponse(decision, corsHeaders);
}
