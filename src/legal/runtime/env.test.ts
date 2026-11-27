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
  it("keeps LEGAL_ names and the database connection as they are", () => {
    expect(legalEnvName("LEGAL_META_ACCESS_TOKEN")).toBe("LEGAL_META_ACCESS_TOKEN");
    expect(legalEnvName("SUPABASE_URL")).toBe("SUPABASE_URL");
    expect(legalEnvName("SUPABASE_SERVICE_ROLE_KEY")).toBe("LEGAL_SUPABASE_SERVICE_ROLE_KEY");
  });
});
