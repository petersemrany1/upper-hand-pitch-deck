// Ported from the Legal app (family-law-floater/src/components/sales-call/rebook-client.tsx). Re-run the port script to refresh.
import { firmAllocatesLawyer, ANY_AVAILABLE_LAWYER_LABEL } from "@/legal/lib/firm-lawyer-allocation";
import { FirmOffices, useFirmOffices } from "@/legal/components/firm-portal/FirmOffices";
import { chosenOfficeId } from "@/legal/lib/firm-offices";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { availableSlotsFn } from "@/legal/lib/firm-portal.functions";
import { bookingDateLabel } from "@/legal/lib/booking-state";
import { sydneyTodayISO } from "@/legal/lib/timezone";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import type { StepContext } from "./steps";

export function RebookClient({ ctx }: { ctx: StepContext }) {
  const firmAllocates = firmAllocatesLawyer(ctx.selectedFirmId);
  const offices = useFirmOffices(ctx.selectedFirmId);
  const locationId = chosenOfficeId(offices.data ?? [], ctx.selectedLocationId);
  const officeReady = ctx.consultMode === "zoom" || (!offices.isPending && !offices.isError && Boolean(locationId));
  const [custom, setCustom] = useState(false);
  const slotsFn = useServerFn(availableSlotsFn);
  const today = sydneyTodayISO();
  const date = ctx.bookingDate >= today ? ctx.bookingDate : "";
  const time = date ? ctx.bookingTime : null;
  const slots = useQuery({
    queryKey: ["rebooking-slots", ctx.selectedFirmId, date],
    enabled: Boolean(ctx.selectedFirmId && date),
    queryFn: () => slotsFn({ data: { firmId: ctx.selectedFirmId!, date } }),
    refetchInterval: 15000,
  });
  const available = (slots.data ?? []).filter((s) => s.available);
  const appointment = ctx.bookingState?.appointment;
  const firm = ctx.firms.find((f) => f.id === ctx.selectedFirmId);
  const ready = Boolean(
    officeReady && date &&
    time &&
    ctx.selectedFirmId &&
    ctx.lead.deposit_paid_at &&
    (custom || available.some((s) => s.label === time)) &&
    !slots.isPending &&
    !slots.isError,
  );

  return (
    <section aria-label="Rebook client" className="mx-auto w-full max-w-xl space-y-3 text-left">
      <div>
        <h2 className="text-xl font-semibold">Rebook client</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the next appointment for this client.
        </p>
      </div>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
        <p className="text-sm font-semibold">Previous appointment: No show</p>
        <p className="mt-1 text-sm">
          {bookingDateLabel(
            appointment?.appointment_date ?? null,
            appointment?.appointment_time ?? null,
          )}
        </p>
        <p className="mt-2 text-xs">
          Choose a new time below. The missed appointment stays in the history.
        </p>
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <label htmlFor="rebook-firm" className="text-sm font-medium">
            Firm
          </label>
          <select
            id="rebook-firm"
            className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
            value={ctx.selectedFirmId ?? ""}
            disabled={ctx.booking}
            onChange={(e) => {
              ctx.onSelectFirm(e.target.value);
              ctx.onBookingTime("");
              setCustom(false);
            }}
          >
            <option value="" disabled>
              Choose a firm
            </option>
            {ctx.firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.firm_name}
                {f.city ? ` — ${f.city}` : ""}
              </option>
            ))}
          </select>
        </div>
        {ctx.selectedFirmId && <FirmOffices key={ctx.selectedFirmId} firmId={ctx.selectedFirmId} selectedId={locationId} onSelect={ctx.onSelectLocation} disabled={ctx.booking} />}
        {(ctx.lawyers.length > 0 || firmAllocates) && (
          <div>
            <label htmlFor="rebook-lawyer" className="text-sm font-medium">
              Lawyer
            </label>
            <select
              id="rebook-lawyer"
              className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
              value={ctx.selectedLawyerId ?? ""}
              disabled={ctx.booking}
              onChange={(e) => ctx.onSelectLawyer(e.target.value || null)}
            >
              <option value="">{firmAllocates ? ANY_AVAILABLE_LAWYER_LABEL : "Firm to allocate"}</option>
              {ctx.lawyers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {firmAllocates && <p className="mt-1 text-xs text-muted-foreground">Trilogy will allocate the lawyer.</p>}
          </div>
        )}
        <div>
          <label htmlFor="rebook-date" className="text-sm font-medium">
            New appointment date
          </label>
          <Input
            id="rebook-date"
            type="date"
            value={date}
            min={today}
            disabled={ctx.booking || !ctx.selectedFirmId}
            onChange={(e) => {
              ctx.onBookingDate(e.target.value);
              ctx.onBookingTime("");
              setCustom(false);
            }}
            className="mt-1"
          />
        </div>
        {date && (
          <div>
            <p className="text-sm font-medium">New appointment time</p>
            {slots.isPending ? (
              <p role="status" className="mt-2 text-sm text-muted-foreground">
                Checking available times…
              </p>
            ) : slots.isError ? (
              <div role="alert" className="mt-2 text-sm">
                <p>Could not load the calendar.</p>
                <Button variant="outline" onClick={() => void slots.refetch()}>
                  Retry availability
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-2">
                  {available.map((s) => (
                    <Button
                      key={s.label}
                      type="button"
                      variant={time === s.label && !custom ? "default" : "outline"}
                      aria-pressed={time === s.label && !custom}
                      disabled={ctx.booking}
                      onClick={() => {
                        setCustom(false);
                        ctx.onBookingTime(s.label);
                      }}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
                {!available.length && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No free times that day. Choose another date.
                  </p>
                )}
                <button
                  type="button"
                  disabled={ctx.booking}
                  className="mt-3 text-sm text-primary underline underline-offset-4"
                  onClick={() => {
                    setCustom(!custom);
                    ctx.onBookingTime("");
                  }}
                >
                  {" "}
                  {custom ? "Use a listed time" : "Choose another time agreed with the firm"}
                </button>
                {custom && (
                  <Input
                    type="time"
                    className="mt-2"
                    aria-label="Agreed appointment time"
                    disabled={ctx.booking}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      ctx.onBookingTime(
                        Number.isFinite(h) && Number.isFinite(m)
                          ? `${h! % 12 || 12}:${String(m).padStart(2, "0")}${h! >= 12 ? "pm" : "am"}`
                          : "",
                        true,
                      );
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}
        <fieldset disabled={ctx.booking}>
          <legend className="text-sm font-medium">Consultation</legend>
          <div className="mt-2 flex gap-2">
            {(
              [
                ["in_person", "In person"],
                ["zoom", "Zoom"],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                variant={ctx.consultMode === mode ? "default" : "outline"}
                aria-pressed={ctx.consultMode === mode}
                onClick={() => ctx.onConsultMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
        </fieldset>
        {date && time && (
          <div className="rounded-lg bg-primary/5 p-3 text-sm" role="status">
            <p className="font-semibold">{bookingDateLabel(date, time)}</p>
            <p className="mt-1">
              {firm?.firm_name} · {ctx.consultMode === "zoom" ? "Zoom" : "In person"}
            </p>
          </div>
        )}
        {!ctx.lead.deposit_paid_at && (
          <p className="text-sm text-destructive">
            The client payment needs to be checked by an administrator before rebooking.
          </p>
        )}
      </div>
      <div className="sticky bottom-0 space-y-2 rounded-xl border bg-background p-3 shadow-sm">
        <Button
          className="min-h-11 w-full whitespace-normal"
          onClick={ctx.onConfirmBooking}
          disabled={!ready || ctx.booking}
        >
          {ctx.booking ? "Saving new appointment…" : "Rebook client & review text"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Next: review the confirmation text, then send the updated handover to the firm.
        </p>
      </div>
    </section>
  );
}
