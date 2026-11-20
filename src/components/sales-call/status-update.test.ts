import { expect, test } from "bun:test";
import { statusUpdateError } from "./status-update";

test("explains appointment ownership instead of a generic status failure", () => {
  expect(statusUpdateError({ message: "Cannot mark lead as booked_deposit_paid: no clinic appointment exists yet." })).toContain("original booked enquiry");
  expect(statusUpdateError({ code: "PGRST116", message: "0 rows" })).toContain("no longer available");
  expect(statusUpdateError({ message: "Permission denied" })).toContain("Permission denied");
  expect(statusUpdateError(null)).toContain("Please try again");
});
