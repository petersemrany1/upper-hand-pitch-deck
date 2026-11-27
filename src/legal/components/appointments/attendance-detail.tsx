// Ported from the Legal app (family-law-floater/src/components/appointments/attendance-detail.tsx). Re-run the port script to refresh.
import { ATTENDANCE_LABELS } from "@/legal/lib/appointment-reminders";
import type { Attendance, ReminderJob } from "@/legal/lib/appointment-reminders";

const LABELS: Record<string, string> = {
  "3d": "3-day reminder",
  "1d": "Day-before reminder",
  request: "YES request",
  followup: "YES follow-up",
  call: "Call-alert email",
  ack: "Confirmation acknowledgement",
};
export function AttendanceDetail({
  attendance,
  jobs,
  timezone,
}: {
  attendance: Attendance | undefined;
  jobs: ReminderJob[];
  timezone: string;
}) {
  if (!attendance) return null;
  const status = attendance.status;
  const tone =
    status === "confirmed"
      ? "bg-emerald-500/10 text-emerald-700"
      : status === "needs_call" || status === "review"
        ? "bg-amber-500/10 text-amber-800"
        : "bg-muted text-muted-foreground";
  const format = (date: string) =>
    new Date(date).toLocaleString("en-AU", {
      timeZone: timezone,
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  const current = jobs.filter((j) => j.booking_version === attendance.booking_version);
  return (
    <div className="mt-2 space-y-1.5 text-xs">
      <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${tone}`}>
        {ATTENDANCE_LABELS[status]}
      </span>
      {attendance.reason ? <p className="text-amber-800">{attendance.reason}</p> : null}
      {attendance.latest_reply ? (
        <p className="break-words">
          Latest reply: “{attendance.latest_reply}”{" "}
          {attendance.latest_reply_at ? (
            <span className="text-muted-foreground">· {format(attendance.latest_reply_at)}</span>
          ) : null}
        </p>
      ) : null}
      {attendance.call_outcome ? (
        <p className="text-muted-foreground">
          Last call:{" "}
          {
            (
              {
                confirmed: "Confirmed by phone",
                no_answer: "No answer",
                voicemail: "Left voicemail",
              } as Record<string, string>
            )[attendance.call_outcome]
          }
          {attendance.called_at ? ` · ${format(attendance.called_at)}` : ""}
        </p>
      ) : null}
      <details>
        <summary className="cursor-pointer text-muted-foreground">
          Reminder history · {current.filter((j) => j.state === "pending").length} scheduled ·{" "}
          {timezone.replace("Australia/", "")}
        </summary>
        <ul className="mt-2 space-y-1 border-l pl-3">
          {jobs.length === 0 ? (
            <li className="text-muted-foreground">
              The next background check will schedule reminders.
            </li>
          ) : (
            jobs.map((j) => (
              <li
                key={j.id}
                className={
                  ["failed", "uncertain"].includes(j.state)
                    ? "text-red-700"
                    : "text-muted-foreground"
                }
              >
                {LABELS[j.kind]} — {j.state === "sent" ? j.delivery_status || "sent" : j.state} ·{" "}
                {format(j.sent_at || j.due_at)}
                {j.booking_version !== attendance.booking_version ? " · previous booking time" : ""}
                {j.last_error ? ` · ${j.last_error}` : ""}
              </li>
            ))
          )}
        </ul>
      </details>
    </div>
  );
}
