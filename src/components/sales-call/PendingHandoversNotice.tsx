import type { PendingHandover } from "@/lib/handover-session";

export function PendingHandoversNotice({ pending, checking, onOpen, onRetry }: {
  pending: PendingHandover[];
  checking: boolean;
  onOpen: (leadId: string) => void;
  onRetry: () => void;
}) {
  if (!pending.length) return null;
  return <section role="alert" style={{ padding: "16px 20px", background: "#fff4e5", color: "#713f12", borderBottom: "1px solid #f3c780" }}>
    <strong>Send outstanding clinic handovers before ending your session</strong>
    <p style={{ margin: "6px 0" }}>These bookings are saved, but their clinic handovers have not been sent.</p>
    <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
      {pending.map(item => <li key={item.lead_id} style={{ margin: "6px 0" }}>
        {item.patient_name} · {item.clinic_name} · {item.appointment_date} at {item.appointment_time}{" "}
        <button type="button" onClick={() => onOpen(item.lead_id)} style={{ textDecoration: "underline", fontWeight: 700 }}>Open handover</button>
      </li>)}
    </ul>
    <button type="button" disabled={checking} onClick={onRetry} style={{ fontWeight: 700, textDecoration: "underline" }}>
      {checking ? "Checking handovers…" : "Check again and end session"}
    </button>
  </section>;
}
