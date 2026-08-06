import { createServerFn } from "@tanstack/react-start";

// Verifies the staff kiosk exit PIN entirely server-side. The real PIN value is
// never sent to the browser — the kiosk only learns whether the typed PIN matched.
export const verifyKioskPin = createServerFn({ method: "POST" })
  .inputValidator((data: { appointmentId: string; pin: string }) => {
    const appointmentId = String(data?.appointmentId ?? "").trim();
    const pin = String(data?.pin ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(appointmentId)) throw new Error("Invalid appointment");
    if (pin.length < 3 || pin.length > 12) return { appointmentId, pin: "" };
    return { appointmentId, pin };
  })
  .handler(async ({ data }) => {
    if (!data.pin) return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appt } = await supabaseAdmin
      .from("clinic_appointments")
      .select("clinic_id")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appt?.clinic_id) return { ok: false };

    const { data: settings } = await supabaseAdmin
      .from("clinicflow_clinic_settings")
      .select("kiosk_pin")
      .eq("clinic_id", appt.clinic_id)
      .maybeSingle();

    const expected = String(settings?.kiosk_pin ?? "0000").trim();
    return { ok: expected.length > 0 && data.pin === expected };
  });
