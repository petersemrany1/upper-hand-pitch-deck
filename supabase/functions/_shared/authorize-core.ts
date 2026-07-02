// Pure, dependency-free authorization decision logic for edge functions.
//
// This module intentionally imports NOTHING (no Deno APIs, no esm.sh) so it can
// be unit-tested with `bun test` / `deno test` offline. The Deno wrapper in
// `authorize.ts` supplies the real Supabase-backed resolvers; production and the
// tests both flow through `authorizeRequest`, so the tests exercise the exact
// decision path used at runtime.

export interface AccessDecision {
  authorized: boolean;
  status: number;
  error?: string;
}

export interface AuthorizeConfig {
  // Roles (from public.sales_reps.role) permitted to call the function.
  allowedRoles: string[];
  // When true, a valid internal shared secret OR the service-role key presented
  // as a bearer token grants access without a user session. Used by
  // server-to-server / cron callers that cannot present a real user JWT.
  allowInternal: boolean;
  // Value of the INTERNAL_FUNCTION_SECRET env var (optional).
  internalSecret?: string;
  // Value of SUPABASE_SERVICE_ROLE_KEY — accepted as an internal bearer so
  // existing callers (e.g. twilio-status, pg_cron) keep working.
  serviceRoleKey?: string;
}

export interface RequestAuthInput {
  // Contents of the `x-internal-secret` header, if any.
  internalSecretHeader: string | null;
  // Bearer token parsed from the Authorization header (or ?token=), if any.
  bearerToken: string | null;
}

export interface AuthorizeDeps {
  // Verify a user session token. Returns the user's email when valid, else null.
  verifyUser: (token: string) => Promise<{ email: string | null } | null>;
  // Resolve the sales_reps role for an email (matched case-insensitively).
  // Returns null when the email is not a sales rep (e.g. a clinic-portal user).
  lookupSalesRole: (email: string) => Promise<string | null>;
}

// Length-safe constant-time string comparison for secrets. Avoids leaking
// length via early return and avoids short-circuiting on the first mismatch.
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// True when the request presents a valid internal credential.
export function isInternalCall(
  input: RequestAuthInput,
  config: Pick<AuthorizeConfig, "internalSecret" | "serviceRoleKey">,
): boolean {
  const { internalSecret, serviceRoleKey } = config;
  if (
    internalSecret &&
    input.internalSecretHeader &&
    timingSafeEqualStr(input.internalSecretHeader, internalSecret)
  ) {
    return true;
  }
  if (
    serviceRoleKey &&
    input.bearerToken &&
    timingSafeEqualStr(input.bearerToken, serviceRoleKey)
  ) {
    return true;
  }
  return false;
}

export function isRoleAllowed(
  role: string | null,
  allowedRoles: string[],
): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}

// Core authorization decision. Returns an AccessDecision describing whether the
// caller may proceed. Never throws — network/DB failures surface as 401.
export async function authorizeRequest(
  input: RequestAuthInput,
  config: AuthorizeConfig,
  deps: AuthorizeDeps,
): Promise<AccessDecision> {
  // 1. Internal server-to-server / cron callers.
  if (config.allowInternal && isInternalCall(input, config)) {
    return { authorized: true, status: 200 };
  }

  // 2. Must present a user session token.
  if (!input.bearerToken) {
    return { authorized: false, status: 401, error: "Unauthorized: missing credentials" };
  }

  // 3. Token must resolve to a real, non-anonymous user with an email.
  let user: { email: string | null } | null;
  try {
    user = await deps.verifyUser(input.bearerToken);
  } catch {
    return { authorized: false, status: 401, error: "Unauthorized: token verification failed" };
  }
  if (!user || !user.email) {
    return { authorized: false, status: 401, error: "Unauthorized: invalid or expired session" };
  }

  // 4. User must be a sales rep with a permitted role. Clinic-portal users have
  //    no sales_reps row, so lookupSalesRole returns null and they are denied.
  let role: string | null;
  try {
    role = await deps.lookupSalesRole(user.email);
  } catch {
    return { authorized: false, status: 401, error: "Unauthorized: role lookup failed" };
  }
  if (!isRoleAllowed(role, config.allowedRoles)) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden: requires one of [${config.allowedRoles.join(", ")}]`,
    };
  }

  return { authorized: true, status: 200 };
}
