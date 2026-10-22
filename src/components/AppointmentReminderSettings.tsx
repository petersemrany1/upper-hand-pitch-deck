import { useState } from "react";
import { toast } from "sonner";
import { CLINIC_TIMEZONES, REMINDER_MODE_LABELS, type ReminderMode } from "../../supabase/functions/_shared/appointment-confirmation";
import { saveClinicReminderSettings, type ClinicReminderSettings } from "@/lib/appointment-reminders-api";
import "./appointment-reminders.css";

export function AppointmentReminderSettings({ settings, onSaved }: { settings: ClinicReminderSettings[]; onSaved: (settings: ClinicReminderSettings) => void }) {
  return <details className="appointment-reminder-settings">
    <summary>Clinic reminder settings <span>Choose Off, Text reminders or YES confirmation for each clinic</span></summary>
    <div className="appointment-reminder-settings-list">
      {settings.map(s => <ClinicSettings key={`${s.clinic_id}:${s.updated_at}`} settings={s} onSaved={onSaved} />)}
    </div>
  </details>;
}
function ClinicSettings({ settings, onSaved }: { settings: ClinicReminderSettings; onSaved: (settings: ClinicReminderSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(settings.closed_dates.join(", "));
  async function save(mode?: ReminderMode) {
    setBusy(true);
    try {
      const dates = closed.split(/[,\s]+/).filter(Boolean);
      if (dates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d)) throw new Error("Enter closed dates as YYYY-MM-DD, separated by commas");
      if (!draft.call_days.length) throw new Error("Choose at least one day your team makes calls");
      const saved = await saveClinicReminderSettings({ ...draft, closed_dates: dates }, mode);
      onSaved(saved);
      toast.success(`${settings.clinic_name}: ${REMINDER_MODE_LABELS[saved.mode]}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save reminder settings"); }
    finally { setBusy(false); }
  }
  return <div className="appointment-reminder-clinic">
    <div className="appointment-reminder-clinic-main">
      <div><strong>{settings.clinic_name}</strong><p>{settings.timezone.replace("Australia/", "")} local time · saves for everyone</p></div>
      <label><span className="sr-only">Reminder mode for {settings.clinic_name}</span><select aria-label={`Reminder mode for ${settings.clinic_name}`} value={settings.mode} disabled={busy} onChange={e => void save(e.target.value as ReminderMode)}>
        {Object.entries(REMINDER_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    <p className="appointment-reminder-description">{settings.mode === "off" ? "Reminders and confirmation follow-up emails are off. Booking and reschedule receipts are separate." : settings.mode === "reminders" ? `Three days before and the day before at ${settings.normal_send_time.slice(0, 5)}. No reply required.` : "9am: ask for YES · 1pm: ask again if needed · 3pm: email you to call. All times are local to this clinic."}</p>
    <details className="appointment-reminder-advanced"><summary>Timezone, email & call days</summary>
      <form onSubmit={e => { e.preventDefault(); void save(); }}>
        <div className="appointment-reminder-form-grid">
          <label>Clinic timezone<select value={draft.timezone} onChange={e => setDraft({ ...draft, timezone: e.target.value })}>{CLINIC_TIMEZONES.map(zone => <option key={zone} value={zone}>{zone.replace("Australia/", "")}</option>)}</select></label>
          <label>Call-alert email<input required type="email" value={draft.alert_email} onChange={e => setDraft({ ...draft, alert_email: e.target.value })} /></label>
          <label>Ordinary reminder time<input required type="time" min="09:00" max="18:00" value={draft.normal_send_time.slice(0, 5)} onChange={e => setDraft({ ...draft, normal_send_time: e.target.value })} /></label>
        </div>
        <fieldset><legend>Days your team makes confirmation calls</legend><div className="appointment-reminder-days">{[1, 2, 3, 4, 5, 6, 0].map(day => <label key={day}><input type="checkbox" checked={draft.call_days.includes(day)} onChange={e => setDraft({ ...draft, call_days: e.target.checked ? [...draft.call_days, day].sort() : draft.call_days.filter(d => d !== day) })} />{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}</label>)}</div></fieldset>
        <label>Public holidays or other days your call team is closed<input value={closed} onChange={e => setClosed(e.target.value)} placeholder="YYYY-MM-DD, YYYY-MM-DD" /></label>
        <p>If the day before is unstaffed, confirmation moves to the last staffed day. A normal day-before reminder still goes out.</p>
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
      </form>
    </details>
  </div>;
}
