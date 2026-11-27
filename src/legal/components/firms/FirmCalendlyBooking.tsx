// Ported from the Legal app (family-law-floater/src/components/firms/FirmCalendlyBooking.tsx). Re-run the port script to refresh.
import { CalendarCheck } from "lucide-react";
import type { FirmApplication } from "@/legal/lib/firm-applications";

export function FirmCalendlyBooking({ app }: { app: FirmApplication }) {
  if (app.stage !== "calendly_booked" || !app.calendly_start_at || !app.calendly_event_uri)
    return null;
  const start = new Date(app.calendly_start_at);
  const upcoming = start.getTime() > Date.now();
  const time = start.toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return (
    <div className="my-2 rounded-md border border-emerald-600/25 bg-emerald-500/10 p-2 text-xs">
      <p className="flex items-center gap-1.5 font-semibold">
        <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Calendly booked · {time}
      </p>
      <p className="mt-1 text-muted-foreground">
        {upcoming
          ? "Already scheduled with Peter — no booking call needed."
          : "Scheduled call time has passed. Check the outcome."}
      </p>
    </div>
  );
}
