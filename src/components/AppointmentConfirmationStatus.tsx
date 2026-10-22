import { confirmationLabel, type ConfirmationFields, type DeliveryKind } from "../../supabase/functions/_shared/appointment-confirmation";
import type { ClinicReminderSettings, ReminderDelivery } from "@/lib/appointment-reminders-api";
import "./appointment-reminders.css";

const DELIVERY_LABELS: Record<DeliveryKind, string> = { "3day": "Three-day reminder", "24h": "Day-before reminder", request: "Confirmation request", followup: "Second confirmation request", call_email: "Call-alert email", ack: "Confirmation acknowledgement" };
export function AppointmentConfirmationStatus({ row, settings, deliveries, onRecordCall, busy, active }: {
  row: ConfirmationFields; settings: ClinicReminderSettings; deliveries: ReminderDelivery[];
  onRecordCall: (result: "confirmed" | "no_answer" | "voicemail") => void; busy: boolean; active: boolean;
}) {
  const stamp = (date: string) => new Date(date).toLocaleString("en-AU", { timeZone: settings.timezone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const email = deliveries.find(d => d.kind === "call_email");
  const problems = deliveries.filter(d => ["failed", "unknown", "undelivered"].includes(d.status) || (d.status === "sending" && Date.now() - Date.parse(d.updated_at) > 600000));
  const tracksConfirmation = settings.mode === "confirmation" || row.confirmation_state === "needs_call" || row.confirmation_state === "confirmed";
  return <div className="appointment-confirmation-status">
    {tracksConfirmation ? <>
      <span className={`appointment-confirmation-badge ${row.confirmation_state}`}>{confirmationLabel(row)}</span>
      {row.confirmation_confirmed_at && <small>{stamp(row.confirmation_confirmed_at)} · {settings.timezone.replace("Australia/", "")}</small>}
      {row.confirmation_last_reply && <p className="appointment-confirmation-reply">Latest reply: “{row.confirmation_last_reply}”</p>}
      {row.confirmation_email_at && <p>Call-alert email sent {stamp(row.confirmation_email_at)}</p>}
      {email && ["failed", "unknown"].includes(email.status) && <p role="alert" className="appointment-confirmation-error">Call email {email.status === "unknown" ? "could not be verified" : "failed"}. Please call from this page.</p>}
      {row.confirmation_last_call_at && <p>Last call: {row.confirmation_call_result?.replaceAll("_", " ")} · {stamp(row.confirmation_last_call_at)}</p>}
      {active && row.confirmation_state !== "confirmed" && <div className="appointment-confirmation-actions">
        <button type="button" disabled={busy} onClick={() => onRecordCall("confirmed")}>✓ Confirmed by phone</button>
        <select aria-label="Record confirmation call outcome" value="" disabled={busy} onChange={e => onRecordCall(e.target.value as "no_answer" | "voicemail")}><option value="" disabled>Other call outcome…</option><option value="no_answer">No answer</option><option value="voicemail">Left voicemail</option></select>
      </div>}
    </> : <span className="appointment-confirmation-badge">{settings.mode === "off" ? "Reminders off" : "Text reminders · no reply required"}</span>}
    {problems.length > 0 && <p className="appointment-confirmation-error">{problems.length} delivery {problems.length === 1 ? "issue" : "issues"} — check history below.</p>}
    {deliveries.length > 0 && <details className="appointment-confirmation-history"><summary>Reminder history</summary><ul>{deliveries.map(d => <li key={d.id}><strong>{DELIVERY_LABELS[d.kind]}</strong> · {d.status === "accepted" ? "sent" : d.status} · {stamp(d.created_at)}{d.error && <span>{d.error}</span>}</li>)}</ul></details>}
  </div>;
}
