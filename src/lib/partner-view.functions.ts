import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { partnerViewInput } from "./partner-view";

export const listPartnerViewClinics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listPartnerViewClinicsForAdmin } = await import("./partner-view.server");
    return listPartnerViewClinicsForAdmin(context.supabase);
  });

export const getPartnerViewClinic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => partnerViewInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getPartnerViewClinicForAdmin } = await import("./partner-view.server");
    return getPartnerViewClinicForAdmin(context.supabase, data.clinicId);
  });
