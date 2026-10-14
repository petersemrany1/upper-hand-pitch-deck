import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";
import { BookingRescheduleDialog } from "./BookingRescheduleDialog";
import { getConfirmationCalls, recordConfirmationOutcome, sendConfirmationText } from "@/utils/appointment-confirmations.functions";
import { formatAUPhone } from "../../supabase/functions/send-appointment-reminders/reminders";
import { ConfirmationCallsView, type ConfirmationApi } from "./ConfirmationCallsView";

const liveApi: ConfirmationApi = {
  list: date => getConfirmationCalls({ data: { date } }),
  record: data => recordConfirmationOutcome({ data }),
  send: data => sendConfirmationText({ data }),
};
export function AppointmentConfirmationCalls() {
  const twilio = useTwilioDevice(true);
  const repId = useCurrentRepId();
  const navigate = useNavigate();
  const [reschedule, setReschedule] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return <>
    <ConfirmationCallsView api={liveApi} refreshKey={refreshKey}
      onCall={async b => {
        if (!b.patient_phone) throw new Error("No phone number saved");
        const params: Record<string, string> = {};
        if (b.lead_id) params.leadId = b.lead_id;
        if (repId) params.repId = repId;
        await twilio.call(b.patient_phone, params);
      }}
      activePhone={twilio.activePhone} callBusy={["connecting", "in-call", "ringing-incoming"].includes(twilio.status)}
      callStatus={twilio.status} callError={twilio.error} onHangup={twilio.hangup}
      onInbox={b => void navigate({ to: "/inbox", search: { phone: formatAUPhone(b.patient_phone) || b.patient_phone || "" } })}
      onReschedule={b => setReschedule(b.id)} />
    {reschedule && <BookingRescheduleDialog appointmentId={reschedule} onClose={() => setReschedule(null)} onSaved={() => { setReschedule(null); setRefreshKey(n => n + 1); }} />}
  </>;
}
