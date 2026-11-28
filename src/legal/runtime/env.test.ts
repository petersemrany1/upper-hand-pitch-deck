import { afterEach, describe, expect, it } from "vitest";
import { legalEnv, legalEnvName } from "./env";

describe("legal env", () => {
  afterEach(() => {
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.LEGAL_TWILIO_AUTH_TOKEN;
    delete process.env.LEGAL_LIVE;
  });
  it("never reads the Hair app's own keys", () => {
    process.env.LEGAL_LIVE = "true";
    process.env.TWILIO_AUTH_TOKEN = "hair-token";
    expect(legalEnv.TWILIO_AUTH_TOKEN).toBeUndefined();
    process.env.LEGAL_TWILIO_AUTH_TOKEN = "legal-token";
    expect(legalEnv.TWILIO_AUTH_TOKEN).toBe("legal-token");
    expect(legalEnv["TWILIO_AUTH_TOKEN"]).toBe("legal-token");
  });
  it("hides every Legal key until switch-over (LEGAL_LIVE=true)", () => {
    process.env.LEGAL_TWILIO_AUTH_TOKEN = "legal-token";
    expect(legalEnv.TWILIO_AUTH_TOKEN).toBeUndefined();
    expect("TWILIO_AUTH_TOKEN" in legalEnv).toBe(false);
    process.env.LEGAL_LIVE = "true";
    expect(legalEnv.TWILIO_AUTH_TOKEN).toBe("legal-token");
  });
  it("uses the portal's Twilio API key when both apps share the Twilio account", () => {
    process.env.LEGAL_LIVE = "true";
    process.env.TWILIO_ACCOUNT_SID = "AC1";
    process.env.LEGAL_TWILIO_ACCOUNT_SID = "AC1";
    process.env.TWILIO_API_KEY_SID = "SKhair";
    process.env.TWILIO_API_KEY_SECRET = "hair-secret";
    process.env.LEGAL_TWILIO_API_KEY_SID = "SKlegal";
    expect(legalEnv.TWILIO_API_KEY_SID).toBe("SKhair");
    expect(legalEnv.TWILIO_API_KEY_SECRET).toBe("hair-secret");
    process.env.LEGAL_TWILIO_ACCOUNT_SID = "AC2";
    expect(legalEnv.TWILIO_API_KEY_SID).toBe("SKlegal");
    for (const k of ["TWILIO_ACCOUNT_SID", "LEGAL_TWILIO_ACCOUNT_SID", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET", "LEGAL_TWILIO_API_KEY_SID"]) delete process.env[k];
  });
  it("keeps LEGAL_ names and the database connection as they are", () => {
    expect(legalEnvName("LEGAL_META_ACCESS_TOKEN")).toBe("LEGAL_META_ACCESS_TOKEN");
    expect(legalEnvName("SUPABASE_URL")).toBe("SUPABASE_URL");
    expect(legalEnvName("SUPABASE_SERVICE_ROLE_KEY")).toBe("LEGAL_SUPABASE_SERVICE_ROLE_KEY");
  });
});
