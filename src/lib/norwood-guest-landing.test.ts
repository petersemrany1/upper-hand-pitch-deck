import { expect, test } from "bun:test";
import { norwoodGuestLanding } from "./norwood-guest-landing";

test("the guest entry opens only the public patient page on exact preview hosts", () => {
  const token = "A".repeat(43), hash = `#norwood-test=${token}`;
  expect(norwoodGuestLanding({ hostname: "id-preview--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app", hash })).toBe(`/norwood-photo-test#${token}`);
  for (const hostname of ["hairtransplantgroup.lovable.app", "preview--hairtransplantgroup.lovable.app.evil.test"]) expect(norwoodGuestLanding({ hostname, hash })).toBeNull();
  for (const invalid of ["#", `#${token}`, "#norwood-test=bad", `#norwood-test=${token}&next=/sales-call`, "#norwood-test=https://evil.test"]) expect(norwoodGuestLanding({ hostname: "localhost", hash: invalid })).toBeNull();
});
