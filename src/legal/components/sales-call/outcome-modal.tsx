// Ported from the Legal app (family-law-floater/src/components/sales-call/outcome-modal.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { formatDuration, type CallLead } from "@/legal/lib/sales-call";
import { isBookedPaid } from "@/legal/lib/call-queue";

type OutcomeOption = { status: string; label: string; color: string };

const OPTIONS: OutcomeOption[] = [
  { status: "no_answer", label: "No Answer", color: "#eab308" },
  { status: "callback_scheduled", label: "Callback Scheduled", color: "#f97316" },
  { status: "had_convo_chase_up", label: "Had Convo — Chase Up", color: "#92400e" },
  { status: "had_convo_no_sale", label: "Had Convo — No Sale", color: "#f472b6" },
  { status: "did_not_qualify", label: "Didn't Qualify — knocked back", color: "#0891b2" },
  { status: "not_interested", label: "Not Interested", color: "#ef4444" },
  { status: "dropped", label: "Dropped", color: "#71717a" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalParts(d: Date) {
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function plusMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

function tomorrowAt(hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function OutcomeModal({
  open,
  lead,
  durationSeconds,
  saving,
  onClose,
  onOutcome,
}: {
  open: boolean;
  lead: CallLead | null;
  durationSeconds: number | null;
  saving: boolean;
  onClose: () => void;
  onOutcome: (status: string, callbackAtIso?: string) => void;
}) {
  const [view, setView] = useState<"menu" | "callback" | "dropped">("menu");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("menu");
    const parts = toLocalParts(plusMinutes(60));
    setDate(parts.date);
    setTime(parts.time);
  }, [open, lead?.id]);

  if (!open || !lead) return null;

  const booked = isBookedPaid(lead);

  const chip = (label: string, when: Date) => (
    <button
      key={label}
      type="button"
      disabled={saving}
      onClick={() => onOutcome("callback_scheduled", when.toISOString())}
      className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Call outcome"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold tracking-tight">How did that go?</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Set the outcome to keep your pipeline accurate.
          {durationSeconds ? ` (Call: ${formatDuration(durationSeconds)})` : ""}
        </p>

        {booked ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-green-500/50 bg-green-500/10 px-3 py-3 text-[13px] font-medium text-green-700">
              ✓ Already booked — deposit paid. This lead is locked in. Don&apos;t pick another
              outcome — it would overwrite the booking.
            </div>
            <Button className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : view === "callback" ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {chip("+30 min", plusMinutes(30))}
              {chip("+1 hr", plusMinutes(60))}
              {chip("+2 hrs", plusMinutes(120))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chip("Tomorrow 9am", tomorrowAt(9))}
              {chip("Tomorrow 12pm", tomorrowAt(12))}
              {chip("Tomorrow 3pm", tomorrowAt(15))}
            </div>
            <div className="flex gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={saving || !date || !time}
                onClick={() =>
                  onOutcome("callback_scheduled", new Date(`${date}T${time}`).toISOString())
                }
              >
                Confirm callback
              </Button>
              <Button variant="outline" onClick={() => setView("menu")}>
                Back
              </Button>
            </div>
          </div>
        ) : view === "dropped" ? (
          <div className="mt-4 space-y-3">
            <p className="text-[13px]">
              Drop this lead? They stop appearing in your calling queue.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={saving}
                onClick={() => onOutcome("dropped")}
              >
                Yes, drop them
              </Button>
              <Button variant="outline" onClick={() => setView("menu")}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-1.5">
            {OPTIONS.map((o) => (
              <div key={o.status}>
                {o.status === "dropped" ? (
                  <div className="mb-2 rounded-lg border border-dashed px-3 py-2 text-[12px] text-muted-foreground">
                    Booked a consult? Close this and complete Step 10 to lock in the date, take the
                    deposit and create the appointment. Marking it here would skip the booking and
                    the firm wouldn&apos;t see it.{" "}
                    <button
                      type="button"
                      onClick={onClose}
                      className="font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      Close
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (o.status === "callback_scheduled") setView("callback");
                    else if (o.status === "dropped") setView("dropped");
                    else onOutcome(o.status);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color }}
                  />
                  {o.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
