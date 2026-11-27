// Ported from the Legal app (family-law-floater/src/components/appointments/reminder-settings.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { saveReminderSettingsFn } from "@/legal/lib/appointment-reminders.functions";
import type { ReminderSettings } from "@/legal/lib/appointment-reminders";

const ZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Hobart",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function FirmReminderSettings({
  settings,
  firms,
}: {
  settings: ReminderSettings[];
  firms: { id: string; firm_name: string }[];
}) {
  const [selected, setSelected] = useState("");
  const firm = firms.find((f) => f.id === selected) ?? firms[0];
  const current = settings.find((s) => s.firm_id === firm?.id);
  return (
    <details className="mt-5 rounded-xl border bg-card p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        <Bell className="h-4 w-4 text-primary" /> Firm reminder settings{" "}
        <ChevronDown className="ml-auto h-4 w-4" />
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Choose how each firm confirms client consultations. Changes apply to future sends for the
        whole team.
      </p>
      <label className="mt-4 block max-w-md text-xs font-medium">
        Law firm
        <select
          aria-label="Law firm reminder settings"
          className={`${selectClass} mt-1`}
          value={firm?.id ?? ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {firms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.firm_name}
            </option>
          ))}
        </select>
      </label>
      {current ? (
        <SettingsForm key={`${current.firm_id}:${JSON.stringify(current)}`} current={current} />
      ) : (
        <p className="mt-3 text-sm">No reminder settings are available for this firm.</p>
      )}
    </details>
  );
}

function SettingsForm({ current }: { current: ReminderSettings }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(current);
  const [closures, setClosures] = useState(current.closure_dates.join("\n"));
  const save = useMutation({
    mutationFn: (value: ReminderSettings) => saveReminderSettingsFn({ data: value }),
    onSuccess: () => {
      toast.success("Firm reminder settings saved");
      void qc.invalidateQueries({ queryKey: ["appointment-attendance"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="mt-4 space-y-4">
      <label className="block max-w-md text-xs font-medium">
        Reminder mode
        <select
          aria-label="Reminder mode"
          className={`${selectClass} mt-1`}
          disabled={save.isPending}
          value={current.mode}
          onChange={(e) =>
            save.mutate({ ...current, mode: e.target.value as ReminderSettings["mode"] })
          }
        >
          <option value="off">Off</option>
          <option value="texts">Text reminders</option>
          <option value="confirmation">YES confirmation reminders</option>
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        {current.mode === "confirmation"
          ? "3-day reminder, then 9am YES request, 1pm follow-up and 3pm call alert on the previous staffed day. A request replaces an ordinary reminder on the same date."
          : current.mode === "texts"
            ? "Reminder texts three days before and the day before. No reply required."
            : "Reminder texts, YES requests and call-alert emails are off. Booking messages are controlled separately."}
      </p>
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Timezone, email & call days
        </summary>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              ...draft,
              mode: current.mode,
              closure_dates: closures.split(/[\s,]+/).filter(Boolean),
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-medium">
              Firm timezone
              <select
                className={`${selectClass} mt-1`}
                value={draft.timezone}
                onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
              >
                {[...new Set([...ZONES, draft.timezone])].map((z) => (
                  <option key={z} value={z}>
                    {z.replace("Australia/", "")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Ordinary reminder time
              <Input
                type="time"
                className="mt-1"
                value={draft.reminder_time.slice(0, 5)}
                required
                onChange={(e) => setDraft({ ...draft, reminder_time: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium">
              Call-alert email
              <Input
                type="email"
                className="mt-1"
                value={draft.alert_email}
                required
                onChange={(e) => setDraft({ ...draft, alert_email: e.target.value })}
              />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-medium">
              Staffed days for confirmation calls
            </legend>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((label, day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.staffed_days.includes(day)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        staffed_days: e.target.checked
                          ? [...draft.staffed_days, day]
                          : draft.staffed_days.filter((d) => d !== day),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-medium">
            Closure dates (YYYY-MM-DD, one per line)
            <textarea
              className="mt-1 block min-h-20 w-full max-w-md rounded-md border bg-background p-2 text-sm"
              value={closures}
              onChange={(e) => setClosures(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Add public holidays and closures here. Confirmation times are 9am, 1pm and 3pm in this
            timezone. Late bookings may go straight to the call list. The scheduler checks every 15
            minutes; delivery may be later than the scheduled time.
          </p>
          <Button type="submit" size="sm" disabled={save.isPending || !draft.staffed_days.length}>
            {save.isPending ? "Saving…" : "Save timing & contact details"}
          </Button>
        </form>
      </details>
    </div>
  );
}
