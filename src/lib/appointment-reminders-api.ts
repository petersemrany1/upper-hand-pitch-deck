import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ReminderSettings, ReminderMode, DeliveryKind } from "../../supabase/functions/_shared/appointment-confirmation";

export type ClinicReminderSettings = ReminderSettings & { clinic_name: string };
export type ReminderDelivery = { id: string; reminder_id: string; revision: string; kind: DeliveryKind; status: string; error: string | null; created_at: string; updated_at: string };
// New schema is deliberately isolated here until Supabase types are regenerated on release.
const db = () => supabase as unknown as SupabaseClient;
export async function loadClinicReminderSettings(): Promise<ClinicReminderSettings[]> {
  const rows: ClinicReminderSettings[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db().from("clinic_reminder_settings").select("*,clinic:partner_clinics(clinic_name)").order("clinic_id").range(offset, offset + 499);
    if (error) throw new Error("Reminder settings are unavailable. The reminder server update must be installed before these controls can be used.");
    rows.push(...data.map((r: ReminderSettings & { clinic: { clinic_name: string } }) => ({ ...r, clinic_name: r.clinic?.clinic_name || "Clinic" })));
    if (data.length < 500) return rows.sort((a, b) => a.clinic_name.localeCompare(b.clinic_name));
  }
}
export async function saveClinicReminderSettings(settings: ClinicReminderSettings, mode: ReminderMode = settings.mode): Promise<ClinicReminderSettings> {
  const { data, error } = await db().rpc("save_clinic_reminder_settings", {
    p_clinic: settings.clinic_id, p_mode: mode, p_timezone: settings.timezone, p_email: settings.alert_email,
    p_days: settings.call_days, p_closed: settings.closed_dates, p_time: settings.normal_send_time, p_version: settings.updated_at,
  });
  if (error) throw new Error(error.message);
  return { ...data, clinic_name: settings.clinic_name };
}
export async function recordConfirmationCall(reminderId: string, revision: string, result: "confirmed" | "no_answer" | "voicemail") {
  const { error } = await db().rpc("record_appointment_confirmation_call", { p_reminder: reminderId, p_revision: revision, p_result: result });
  if (error) throw new Error(error.message);
}
export async function loadReminderDeliveries(reminderIds: string[]): Promise<ReminderDelivery[]> {
  const rows: ReminderDelivery[] = [];
  for (let start = 0; start < reminderIds.length; start += 100) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db().from("appointment_reminder_deliveries").select("id,reminder_id,revision,kind,status,error,created_at,updated_at").in("reminder_id", reminderIds.slice(start, start + 100)).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (error) throw new Error("Could not load reminder delivery status");
      rows.push(...data);
      if (data.length < 500) break;
    }
  }
  return rows;
}
