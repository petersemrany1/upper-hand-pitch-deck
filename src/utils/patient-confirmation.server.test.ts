import { expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loadPatientConfirmation } from "./patient-confirmation.server";

test("confirmation reads the saved appointment on every preview and send", async () => {
  const appointment = {
    appointment_date: "2026-11-16", appointment_time: "09:00:00",
    patient_name: "Test Patient", patient_phone: "0400000000", doctor_name: "Fixture consultant",
    outcome: null, disqualified_at: null, reminder: [{ status: "confirmed" }],
    clinic: { clinic_name: "Fixture clinic", address: "123 Test Street", city: "Melbourne", state: "VIC", phone: "0300000000" },
  };
  const db = createClient<Database>("https://fixture.invalid", "fixture", {
    global: { fetch: async (input) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/rest/v1/clinic_appointments");
      expect(url.searchParams.get("lead_id")).toBe("eq.fixture");
      return Response.json([appointment]);
    } },
  });
  const before = await loadPatientConfirmation(db, "fixture");
  expect(before.body).toContain("Monday 16 November at 9:00 AM");
  appointment.appointment_time = "11:00";
  const moved = await loadPatientConfirmation(db, "fixture");
  expect(moved.body).toContain("Monday 16 November at 11:00 AM");
  appointment.appointment_date = "2026-12-07";
  const later = await loadPatientConfirmation(db, "fixture");
  expect(later.body).toContain("Monday 7 December at 11:00 AM");
  expect(later.phone).toBe("+61400000000");
  appointment.reminder[0].status = "cancelled";
  await expect(loadPatientConfirmation(db, "fixture")).rejects.toThrow("active booking");
});
