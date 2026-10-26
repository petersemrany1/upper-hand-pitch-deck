import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBookingPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    period: z.enum(["day", "yesterday", "week", "month", "30d", "60d", "year", "all", "custom"]),
    start: z.string().optional(),
    end: z.string().optional(),
  }))
  .handler(async ({ data, context }) => {
    const { loadBookingPerformance } = await import("./booking-performance.server");
    return loadBookingPerformance(context.supabase, data);
  });

export type BookingPerformanceReport = Awaited<ReturnType<typeof getBookingPerformance>>;
