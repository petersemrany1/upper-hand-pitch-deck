// Tests for the edge-function authorization core.
//
// Run with:  bun test supabase/functions/_shared/authorize-core.test.ts
//
// These prove the security property requested in the audit fix: a clinic-portal
// user (authenticated, but with NO public.sales_reps row) can no longer reach
// the lead/patient functions (comprehensive-lead-update, generate-lead-summary,
// condense-notes, backfill-clinic-notes), which all guard via authorizeRequest.

import { describe, it, expect } from "bun:test";
import {
  authorizeRequest,
  isInternalCall,
  isRoleAllowed,
  timingSafeEqualStr,
  type AuthorizeConfig,
  type AuthorizeDeps,
  type RequestAuthInput,
} from "./authorize-core.ts";

const SALES = ["admin", "rep"];

// A rep and a clinic-portal user share the same "is this a valid session" state
// (both are authenticated), and differ ONLY in whether an email maps to a
// sales_reps row. That is exactly the boundary these functions must enforce.
function fakeDeps(reps: Record<string, string>): AuthorizeDeps {
  return {
    verifyUser: async (token: string) => {
      // token format in tests: "session:<email>" for a valid session, else invalid.
      if (!token.startsWith("session:")) return null;
      return { email: token.slice("session:".length) || null };
    },
    lookupSalesRole: async (email: string) => reps[email.toLowerCase()] ?? null,
  };
}

const REPS = {
  "rep@bold.com": "rep",
  "boss@bold.com": "admin",
  "setter@bold.com": "caller", // sales_reps row exists but not an allowed role
};

function userInput(email: string): RequestAuthInput {
  return { internalSecretHeader: null, bearerToken: `session:${email}` };
}

const salesOnly: AuthorizeConfig = { allowedRoles: SALES, allowInternal: false };

describe("clinic-portal user cannot access arbitrary leads", () => {
  it("denies a clinic-portal user (valid session, no sales_reps row) with 403", async () => {
    // A clinic-portal user IS authenticated but is not in sales_reps.
    const decision = await authorizeRequest(
      userInput("clinic-owner@partnerclinic.com"),
      salesOnly,
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(false);
    expect(decision.status).toBe(403);
  });

  it("denies the internal-secret path too when allowInternal is false", async () => {
    const decision = await authorizeRequest(
      { internalSecretHeader: "the-secret", bearerToken: "session:clinic@partner.com" },
      { allowedRoles: SALES, allowInternal: false, internalSecret: "the-secret" },
      fakeDeps(REPS),
    );
    // A clinic user cannot smuggle themselves in via the internal header on a
    // user-facing function — internal is disabled, and their role is not allowed.
    expect(decision.authorized).toBe(false);
    expect(decision.status).toBe(403);
  });

  it("denies a sales_reps row whose role is not in the allowed set (caller)", async () => {
    const decision = await authorizeRequest(userInput("setter@bold.com"), salesOnly, fakeDeps(REPS));
    expect(decision.authorized).toBe(false);
    expect(decision.status).toBe(403);
  });
});

describe("legitimate sales users are still allowed", () => {
  it("allows a rep", async () => {
    const decision = await authorizeRequest(userInput("rep@bold.com"), salesOnly, fakeDeps(REPS));
    expect(decision.authorized).toBe(true);
    expect(decision.status).toBe(200);
  });

  it("allows an admin", async () => {
    const decision = await authorizeRequest(userInput("boss@bold.com"), salesOnly, fakeDeps(REPS));
    expect(decision.authorized).toBe(true);
  });

  it("matches the rep email case-insensitively", async () => {
    const decision = await authorizeRequest(userInput("REP@Bold.com"), salesOnly, fakeDeps(REPS));
    expect(decision.authorized).toBe(true);
  });
});

describe("unauthenticated and invalid callers", () => {
  it("rejects a request with no bearer token (401)", async () => {
    const decision = await authorizeRequest(
      { internalSecretHeader: null, bearerToken: null },
      salesOnly,
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(false);
    expect(decision.status).toBe(401);
  });

  it("rejects the anon/publishable key used as a bearer (not a user session)", async () => {
    // The old client callers sent the anon key here; it is not a valid session.
    const decision = await authorizeRequest(
      { internalSecretHeader: null, bearerToken: "anon-publishable-key" },
      salesOnly,
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(false);
    expect(decision.status).toBe(401);
  });

  it("rejects an expired/invalid session (401) before any role lookup", async () => {
    let roleLookups = 0;
    const deps: AuthorizeDeps = {
      verifyUser: async () => null,
      lookupSalesRole: async () => {
        roleLookups++;
        return "admin";
      },
    };
    const decision = await authorizeRequest(userInput("whoever@x.com"), salesOnly, deps);
    expect(decision.authorized).toBe(false);
    expect(decision.status).toBe(401);
    expect(roleLookups).toBe(0);
  });
});

describe("internal server-to-server / cron access", () => {
  const internalConfig: AuthorizeConfig = {
    allowedRoles: SALES,
    allowInternal: true,
    internalSecret: "cron-secret",
    serviceRoleKey: "service-role-key",
  };

  it("allows a caller presenting the internal shared secret", async () => {
    const decision = await authorizeRequest(
      { internalSecretHeader: "cron-secret", bearerToken: null },
      internalConfig,
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(true);
  });

  it("allows the service-role key as a bearer (e.g. twilio-status, pg_cron)", async () => {
    const decision = await authorizeRequest(
      { internalSecretHeader: null, bearerToken: "service-role-key" },
      internalConfig,
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(true);
  });

  it("still allows a genuine rep on an internal-capable function", async () => {
    const decision = await authorizeRequest(
      { internalSecretHeader: null, bearerToken: "session:rep@bold.com" },
      internalConfig,
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(true);
  });

  it("rejects a wrong internal secret and falls back to (failing) user auth", async () => {
    const decision = await authorizeRequest(
      { internalSecretHeader: "wrong", bearerToken: null },
      internalConfig,
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(false);
    expect(decision.status).toBe(401);
  });

  it("does not treat an empty configured secret as a match", async () => {
    // If INTERNAL_FUNCTION_SECRET is unset, an empty x-internal-secret must not pass.
    const decision = await authorizeRequest(
      { internalSecretHeader: "", bearerToken: null },
      { allowedRoles: SALES, allowInternal: true, internalSecret: undefined, serviceRoleKey: undefined },
      fakeDeps(REPS),
    );
    expect(decision.authorized).toBe(false);
  });
});

describe("primitives", () => {
  it("timingSafeEqualStr compares correctly", () => {
    expect(timingSafeEqualStr("abc", "abc")).toBe(true);
    expect(timingSafeEqualStr("abc", "abd")).toBe(false);
    expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
    expect(timingSafeEqualStr("", "")).toBe(true);
  });

  it("isInternalCall requires a configured secret", () => {
    expect(isInternalCall({ internalSecretHeader: "x", bearerToken: null }, {})).toBe(false);
    expect(
      isInternalCall({ internalSecretHeader: "x", bearerToken: null }, { internalSecret: "x" }),
    ).toBe(true);
  });

  it("isRoleAllowed treats null role as not allowed", () => {
    expect(isRoleAllowed(null, SALES)).toBe(false);
    expect(isRoleAllowed("rep", SALES)).toBe(true);
    expect(isRoleAllowed("caller", SALES)).toBe(false);
  });
});
