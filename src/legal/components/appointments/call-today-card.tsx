// Ported from the Legal app (family-law-floater/src/components/appointments/call-today-card.tsx). Re-run the port script to refresh.
import { CalendarDays, Phone, Clock3 } from "lucide-react";
import { Link } from "@/legal/runtime/router";
import { Button } from "@/legal/components/ui/button";
import { AttendanceDetail } from "./attendance-detail";
import { consultationDay } from "@/legal/lib/appointment-call-list";
import type { AppointmentCallTask } from "@/legal/lib/appointment-call-list";
import type { Attendance, ReminderJob } from "@/legal/lib/appointment-reminders";

export function CallTodayCard({
  id,
  name,
  phone,
  firm,
  lawyer,
  date,
  time,
  zoom,
  timezone,
  now,
  task,
  attendance,
  jobs,
  onCall,
  onOutcome,
  busy,
  calling,
}: {
  id: string;
  name: string;
  phone: string | null;
  firm: string;
  lawyer?: string | null | undefined;
  date: string;
  time: string;
  zoom: boolean;
  timezone: string;
  now: Date;
  task: AppointmentCallTask;
  attendance?: Attendance | undefined;
  jobs: ReminderJob[];
  onCall?: (() => void) | undefined;
  onOutcome: (outcome: "confirmed" | "no_answer" | "voicemail") => void;
  busy: boolean;
  calling: boolean;
}) {
  const later = task.timing === "later";
  const dueTime = new Date(task.dueAt).toLocaleTimeString("en-AU", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <article aria-label={`Call ${name}`} className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="break-words text-lg font-bold">{name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{phone || "No phone number saved"}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${later ? "bg-blue-50 text-blue-800" : "bg-amber-100 text-amber-900"}`}
        >
          {later ? <Clock3 className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
          {later ? `Call from ${dueTime} · ${timezone.replace("Australia/", "")}` : "Call now"}
        </span>
      </div>
      <div className="mt-4 flex gap-3 rounded-lg bg-primary/5 p-3 sm:p-4">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Their consultation
          </p>
          <p className="mt-1 text-base font-bold">{consultationDay(date, now, timezone)}</p>
          <p className="text-base font-semibold">
            {time}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {timezone.replace("Australia/", "")} time
            </span>
          </p>
          <p className="mt-1 text-sm">
            {firm}
            {lawyer ? ` · ${lawyer}` : ""} · {zoom ? "Zoom" : "In person"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">{task.reason}</p>
      {attendance?.latest_reply ? (
        <p className="mt-2 line-clamp-3 break-words rounded-md border-l-2 border-amber-400 pl-3 text-sm">
          Client replied: “{attendance.latest_reply}”
        </p>
      ) : null}
      {attendance?.called_at ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Last call:{" "}
          {attendance.call_outcome === "voicemail"
            ? "Left voicemail"
            : attendance.call_outcome === "no_answer"
              ? "No answer"
              : "Confirmed"}{" "}
          ·{" "}
          {new Date(attendance.called_at).toLocaleString("en-AU", {
            timeZone: timezone,
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {onCall ? (
          <Button onClick={onCall} disabled={calling}>
            <Phone className="mr-2 h-4 w-4" />
            Call client
          </Button>
        ) : phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Phone className="h-4 w-4" />
            Call client
          </a>
        ) : (
          <span className="text-sm font-medium text-amber-800">
            Add a phone number to call this client.
          </span>
        )}
        <Link
          to="/booked-appointments"
          search={{ appointment: id }}
          className="text-xs font-medium text-primary underline"
        >
          Booking details
        </Link>
      </div>
      {attendance ? (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">After the call</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["confirmed", "Confirmed by phone"],
                ["no_answer", "No answer"],
                ["voicemail", "Left voicemail"],
              ] as const
            ).map(([outcome, label]) => (
              <Button
                key={outcome}
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onOutcome(outcome)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground">Reply & reminder history</summary>
        <AttendanceDetail attendance={attendance} jobs={jobs} timezone={timezone} />
      </details>
    </article>
  );
}
