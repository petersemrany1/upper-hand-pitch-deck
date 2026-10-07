import { expect, test } from "bun:test";
import { checkoutClinicAddress } from "./checkout-clinic";

test("keeps a full clinic postal address without duplicating city/state", () => {
  expect(checkoutClinicAddress({ address: "3/28 Hood St Subiaco WA 6008", city: "Perth", state: "WA" }))
    .toBe("3/28 Hood St Subiaco WA 6008");
});
test("assembles separately stored clinic address fields", () => {
  expect(checkoutClinicAddress({ address: "64 Lincoln Rd", city: "Essendon", state: "VIC" }))
    .toBe("64 Lincoln Rd, Essendon, VIC");
});
test("does not present a city alone as a clinic address", () => {
  expect(checkoutClinicAddress({ city: "Sydney", state: "NSW" })).toBe("");
  expect(checkoutClinicAddress(null)).toBe("");
});
