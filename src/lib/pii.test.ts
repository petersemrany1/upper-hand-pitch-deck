import { describe, expect, test } from "bun:test";
import { scrubPii, scrubString } from "./pii";

describe("scrubString", () => {
  test("redacts email addresses", () => {
    expect(scrubString("contact john.doe+leads@example.com now")).toBe(
      "contact [redacted-email] now"
    );
  });

  test("redacts international phone numbers", () => {
    expect(scrubString("call +61 412 345 678 today")).toBe("call [redacted-phone] today");
    expect(scrubString("dial (03) 9123 4567")).toBe("dial [redacted-phone]");
  });

  test("keeps short numeric ids intact", () => {
    expect(scrubString("lead 12345 failed")).toBe("lead 12345 failed");
  });

  test("redacts bearer tokens", () => {
    expect(scrubString("Authorization: Bearer abc123.def456.ghi789")).toBe(
      "Authorization: [redacted-token]"
    );
  });

  test("redacts bare JWTs", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIs.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fw";
    expect(scrubString(`token=${jwt}`)).toBe("token=[redacted-token]");
  });
});

describe("scrubPii", () => {
  test("fully redacts sensitive keys regardless of value", () => {
    const scrubbed = scrubPii({
      email: "someone@example.com",
      phone_number: "0412 345 678",
      access_token: "opaque-value",
      note: "safe text",
    });
    expect(scrubbed).toEqual({
      email: "[redacted]",
      phone_number: "[redacted]",
      access_token: "[redacted]",
      note: "safe text",
    });
  });

  test("walks nested objects and arrays", () => {
    const scrubbed = scrubPii({
      lead: { contact: "reach me at jane@example.com" },
      attempts: ["called +61 412 345 678", "no answer"],
    });
    expect(scrubbed).toEqual({
      lead: { contact: "reach me at [redacted-email]" },
      attempts: ["called [redacted-phone]", "no answer"],
    });
  });

  test("passes through primitives", () => {
    expect(scrubPii(42)).toBe(42);
    expect(scrubPii(null)).toBe(null);
    expect(scrubPii(true)).toBe(true);
  });

  test("bounds recursion depth", () => {
    type Nested = { child?: Nested };
    const root: Nested = {};
    let cursor = root;
    for (let i = 0; i < 12; i++) {
      cursor.child = {};
      cursor = cursor.child;
    }
    expect(() => scrubPii(root)).not.toThrow();
  });
});
