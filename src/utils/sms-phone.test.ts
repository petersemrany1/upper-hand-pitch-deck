import { expect, test } from "bun:test";
import { normalizeSmsPhone } from "./sms-phone";

test("all supported Australian mobile formats produce the same recipient", () => {
  for (const phone of ["0412 345 678", "412345678", "61412345678", "+61412345678", " +61 (412) 345-678 "]) {
    expect(normalizeSmsPhone(phone)).toBe("+61412345678");
    expect(normalizeSmsPhone(normalizeSmsPhone(phone))).toBe("+61412345678");
  }
});

test("preserves landlines and explicit international recipients", () => {
  expect(normalizeSmsPhone("(08) 1234 5678")).toBe("+61812345678");
  expect(normalizeSmsPhone("+44 7700 900123")).toBe("+447700900123");
});

test("refuses duplicate country codes, masked, incomplete and ambiguous recipients", () => {
  for (const phone of [null, undefined, "", "123", "+6161412345678", "6161412345678", "+6141234567", "+614123456789", "+6141234XXXX", "0412345678 ext 12", "++61412345678", "04+12345678", "+61412345678/0412345679"]) {
    expect(normalizeSmsPhone(phone)).toBeNull();
  }
});
