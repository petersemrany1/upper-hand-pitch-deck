import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bookingActor } from "./booking-access.server";
import { trialBookingWindow, type ClinicTrial } from "@/lib/clinic-booking-window";
import { z } from "zod";

export const getClinicBookingWindow = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator(z.object({ clinicId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await bookingActor(context.supabase);
    const { data: trial, error } = await supabaseAdmin.from("clinic_trials")
      .select("clinic_id, booking_opens, appointment_start, appointment_end, paid_started_at")
      .eq("clinic_id", data.clinicId).maybeSingle();
    if (error) throw error;
    return trialBookingWindow(trial as ClinicTrial | null);
  });
