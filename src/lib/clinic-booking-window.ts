// Only scheduling information crosses into the rep-facing portal.
export type ClinicBookingWindow = { opens: string; start: string; end: string } | null;

export function dateInBookingWindow(window: ClinicBookingWindow, date: string, today: string): boolean {
  return !window || (today >= window.opens && today <= window.end && date >= window.start && date <= window.end);
}

export type ClinicTrial = {
  clinic_id: string;
  booking_opens: string;
  appointment_start: string;
  appointment_end: string;
  paid_started_at: string | null;
};

export function trialBookingWindow(trial: ClinicTrial | null): ClinicBookingWindow {
  return !trial || trial.paid_started_at ? null : {
    opens: trial.booking_opens, start: trial.appointment_start, end: trial.appointment_end,
  };
}
