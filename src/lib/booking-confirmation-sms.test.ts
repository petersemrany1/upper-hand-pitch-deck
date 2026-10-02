import { expect, test } from "bun:test";
import { bookingConfirmationSms, clinicSmsAddress } from "./booking-confirmation-sms";

const appointment = { firstName: "Peter", date: "Monday, 5 October", time: "10:00 AM", clinicName: "Boss Clinic", clinicAddress: "3/28 Hood St Subiaco WA 6008", clinicPhone: "(08) 1234 5678" };
test("Boss confirmation prefers Debra over the surgeon and uses Boss contact details", () => {
  const message = bookingConfirmationSms({ ...appointment, consultantName: "Debra Best — Hair Regrowth Specialist", doctorName: "Dr Jai" });
  expect(message).toBe("Hi Peter, your hair transplant consultation is confirmed for Monday, 5 October at 10:00 AM with Debra Best at Boss Clinic. Address: 3/28 Hood St Subiaco WA 6008. If you need to reschedule, call Boss Clinic on (08) 1234 5678.");
});
test("uses the doctor's recorded name when no consultant is supplied", () => {
  expect(bookingConfirmationSms({ ...appointment, consultantName: " ", doctorName: "Dr. Shobhna Singh — Hair Transplant Specialist", clinicName: "Nitai Medical & Cosmetic Centre", clinicPhone: "(03) 9300 1244" })).toContain("with Dr. Shobhna Singh at Nitai Medical & Cosmetic Centre.");
});
test("does not add another clinic's phone number when the selected clinic has none", () => {
  const message = bookingConfirmationSms({ ...appointment, consultantName: "Debra Best", clinicPhone: null });
  expect(message).not.toContain("reschedule");
  expect(message).not.toContain("Hair Transplant Group");
  expect(message).not.toContain("Hair Regrowth Specialist");
});

test("includes separately stored suburb/state without duplicating a complete address", () => {
  expect(clinicSmsAddress({ address: "64 Lincoln Rd", city: "Essendon", state: "VIC" })).toBe("64 Lincoln Rd, Essendon, VIC");
  expect(clinicSmsAddress({ address: "3/28 Hood St Subiaco WA 6008", city: "Perth", state: "WA" })).toBe("3/28 Hood St Subiaco WA 6008");
});
