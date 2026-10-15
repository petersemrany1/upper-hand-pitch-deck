import { APP_TIMEZONE, sydneyTodayISO } from "./timezone";
import { confirmationDay, confirmationTime } from "./appointment-confirmations";

export type ConfirmationCallback = {
  id: string; appointment_id: string; callback_date: string; callback_time: string | null;
  note: string | null; actor_name: string; created_at: string;
};
export type ScheduleCallbackInput = {
  appointmentId: string; version: string; requestId: string; expectedCallbackId: string | null;
  date: string; time: string | null; note: string;
};
function localTime(now: Date) {
  return now.toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
export function callbackDue(callback: ConfirmationCallback, now = new Date()) {
  const today = sydneyTodayISO(now);
  return callback.callback_date < today || callback.callback_date === today && (!callback.callback_time || callback.callback_time.slice(0, 5) <= localTime(now));
}
export function callbackLabel(callback: ConfirmationCallback) {
  return `${confirmationDay(callback.callback_date)}${callback.callback_time ? ` at ${confirmationTime(callback.callback_time)}` : " · any time"} (Sydney)`;
}
export function validateCallback(date: string, time: string | null, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + "T12:00:00Z")) || new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date) throw new Error("Choose a valid callback date");
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid callback time");
  if (date < sydneyTodayISO(now) || date === sydneyTodayISO(now) && time && time <= localTime(now)) throw new Error("Choose a callback date and time in the future (Sydney time)");
}
