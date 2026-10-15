import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookingRescheduleDialog } from "./BookingRescheduleDialog";
import { getConfirmationCalls, recordConfirmationOutcome, sendConfirmationText, getConfirmationCallbacks, scheduleConfirmationCallback, completeConfirmationCallback } from "@/utils/appointment-confirmations.functions";
import { ConfirmationCallbackDialog } from "./ConfirmationCallbackDialog";
import type { ConfirmationBooking } from "@/lib/appointment-confirmations";
import { formatAUPhone } from "../../supabase/functions/send-appointment-reminders/reminders";
import { ConfirmationCallsView, type ConfirmationApi } from "./ConfirmationCallsView";

const liveApi: ConfirmationApi = {
  list: date => getConfirmationCalls({ data: { date } }),
  callbacks: () => getConfirmationCallbacks(),
  scheduleCallback: data => scheduleConfirmationCallback({ data }),
  completeCallback: data => completeConfirmationCallback({ data }),
  record: data => recordConfirmationOutcome({ data }),
  send: data => sendConfirmationText({ data }),
};
export function AppointmentConfirmationCalls() {
  const twilio = useTwilioDevice(true);
  const repId = useCurrentRepId();
  const { user } = useAuth();
  const [repIdentity, setRepIdentity] = useState<{ email: string; name: string } | null>(null);
  const email = user?.email;
  const repName = repIdentity?.email === email ? repIdentity?.name : undefined;
  useEffect(() => {
    if (!email) return;
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.from("sales_reps").select("name").ilike("email", email).maybeSingle();
        if (active) setRepIdentity({ email, name: data?.name ?? "" });
      } catch {
        if (active) setRepIdentity({ email, name: "" });
      }
    })();
    return () => { active = false; };
  }, [email]);
  const navigate = useNavigate();
  const [reschedule, setReschedule] = useState<ConfirmationBooking | null>(null);
  const [callback, setCallback] = useState<{ booking: ConfirmationBooking; note: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return <>
    <ConfirmationCallsView api={liveApi} refreshKey={refreshKey} repName={repName}
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
      onScheduleCallback={(booking, note) => setCallback({ booking, note })}
      onReschedule={b => setReschedule(b)} />
    {reschedule && <BookingRescheduleDialog appointmentId={reschedule.id} onCallBack={() => { setCallback({ booking: reschedule, note: "Needs to reschedule. " + (reschedule.callback?.note || "") }); setReschedule(null); }} onClose={() => setReschedule(null)} onSaved={() => { setReschedule(null); setRefreshKey(n => n + 1); }} />}
    {callback && <ConfirmationCallbackDialog booking={callback.booking} initialNote={callback.note} save={liveApi.scheduleCallback} onClose={() => setCallback(null)} onSaved={() => { setCallback(null); setRefreshKey(n => n + 1); }} />}
  </>;
}
