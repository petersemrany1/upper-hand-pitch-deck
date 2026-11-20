export type RingBackCall = {
  id?: string;
  rep_id?: string | null;
  direction?: string | null;
  status?: string | null;
  phone?: string | null;
  lead_id?: string | null;
  clinic_id?: string | null;
  voice_destination_sid?: string | null;
};

const TERMINAL = new Set(["completed", "no-answer", "noanswer", "busy", "failed", "canceled", "cancelled"]);

/** Only the intended rep queues a missed callback. Voicemail duration is not talk time. */
export function ringBackAction(row: RingBackCall, repId: string): "answered" | "queue" | null {
  if (!row.id || !repId || row.rep_id !== repId || row.direction !== "inbound" || row.clinic_id) return null;
  const status = (row.status ?? "").toLowerCase();
  if (status === "in-progress" || (status === "completed" && row.voice_destination_sid)) return "answered";
  return TERMINAL.has(status) ? "queue" : null;
}
