import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reclassificationInput, type ReclassificationRequest } from "@/lib/reclassification";

export const getReclassificationRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ appointmentId: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<ReclassificationRequest | null> => {
    const { data: row, error } = await (context.supabase as any).from("clinic_reclassification_requests")
      .select("id,appointment_id,created_at,reason,status").eq("appointment_id", data.appointmentId).maybeSingle();
    if (error) throw new Error("Could not check previous requests. Please try again.");
    return row;
  });

export const submitReclassificationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(reclassificationInput)
  .handler(async ({ data, context }): Promise<ReclassificationRequest> => {
    // The database authenticates the caller, derives the clinic and requester,
    // and serializes duplicate submissions. No payment or outcome writes.
    const { data: row, error } = await (context.supabase as any).rpc("submit_clinic_reclassification", {
      p_appointment_id: data.appointmentId, p_reason: data.reason, p_acknowledged: data.acknowledged,
    });
    if (error) throw new Error(error.message || "Could not submit your request. Please try again.");
    return row;
  });
