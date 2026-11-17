import { useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { toast } from "sonner";

export function ForcedOutcomeModal({
  leadId, booked, saveStatus, callDuration, view, setView,
  callbackDate, setCallbackDate, callbackTime, setCallbackTime,
  busy, setBusy, onLocalLeadUpdate, onClosed, onCallBack, onTakePayment,
}: {
  leadId: string;
  booked: boolean;
  saveStatus: (input: {data: {leadId: string; status: string; callbackAt?: string}}) => Promise<{success: boolean; error?: string}>;
  callDuration: number;
  onCallBack?: () => void;
  onTakePayment?: () => void;
  view: "menu" | "callback" | "drop";
  setView: (v: "menu" | "callback" | "drop") => void;
  callbackDate: string;
  setCallbackDate: (v: string) => void;
  callbackTime: string;
  setCallbackTime: (v: string) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onLocalLeadUpdate?: (id: string, patch: { status: string; callback_scheduled_at?: string }) => void;
  onClosed: (status?: string) => void;
}) {
  const saving = useRef(false);
  const apply = async (status: string, callbackAt?: string) => {
    if (busy || saving.current) return;
    if (booked && status !== "booked_deposit_paid") {
      onClosed("booked_deposit_paid");
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const result = await saveStatus({ data: { leadId, status, callbackAt } });
      if (!result?.success) {
        toast.error(result?.error || "Could not save the outcome. Please retry.");
        return;
      }
      onLocalLeadUpdate?.(leadId, callbackAt ? { status, callback_scheduled_at: callbackAt } : { status });
      onClosed(status);
    } catch {
      toast.error("Could not confirm the outcome was saved. Check the connection and retry.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const confirmCallback = () => {
    if (!callbackDate || !callbackTime) return;
    const time = new Date(`${callbackDate}T${callbackTime}:00`);
    if (Number.isNaN(time.getTime())) { toast.error("Invalid date/time"); return; }
    return apply("callback_scheduled", time.toISOString());
  };

  const optionStyle: CSSProperties = {
    width: "100%",
    padding: "14px 20px",
    borderRadius: 10,
    border: "1.5px solid #e8e8e6",
    background: "#fff",
    textAlign: "left",
    fontSize: 15,
    cursor: "pointer",
    marginBottom: 8,
    transition: "border-color 120ms ease",
    display: "flex",
    alignItems: "center",
    gap: 12,
  };
  const dotStyle = (color: string): CSSProperties => ({
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: 999,
    background: color,
    flexShrink: 0,
  });
  const onHover = (e: ReactMouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#f4522d"; };
  const onLeave = (e: ReactMouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#e8e8e6"; };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>How did that go?</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 20, marginTop: 4 }}>
          Set the outcome to keep your pipeline accurate.
          {callDuration > 0 ? ` (Call: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")})` : ""}
        </div>

        {view === "menu" && booked && (
          <>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 13, color: "#065f46", lineHeight: 1.5, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ Already booked — deposit paid</div>
              This lead is locked in. Don't pick another outcome — it would overwrite the booking.
            </div>
            <button
              style={{ ...optionStyle, justifyContent: "center", borderColor: "#10b981", color: "#065f46", fontWeight: 600 }}
              onClick={() => onClosed("booked_deposit_paid")}
            >
              Close
            </button>
          </>
        )}

        {view === "menu" && !booked && (
          <>
            {onTakePayment && (
              <button
                style={{ ...optionStyle, background: "#0f6b3e", color: "#fff", borderColor: "#0f6b3e", fontWeight: 700, marginBottom: 8 }}
                disabled={busy}
                onClick={onTakePayment}
              >
                Booked — take the deposit now
              </button>
            )}
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("no_answer")}>
              <span style={dotStyle("#eab308")} /> No Answer
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => setView("callback")}>
              <span style={dotStyle("#f97316")} /> Callback Scheduled
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("had_convo_chase_up")}>
              <span style={dotStyle("#5b3a13")} /> Had Convo — Chase Up
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("had_convo_no_sale")}>
              <span style={dotStyle("#be185d")} /> Had Convo — No Sale
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => apply("not_interested")}>
              <span style={dotStyle("#ef4444")} /> Not Interested
            </button>
            <button style={optionStyle} onMouseEnter={onHover} onMouseLeave={onLeave} disabled={busy} onClick={() => setView("drop")}>
              <span style={dotStyle("#000000")} /> Dropped
            </button>
            {onCallBack && (
              <button
                style={{ ...optionStyle, marginTop: 10, borderColor: "#111", fontWeight: 700 }}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
                disabled={busy}
                onClick={onCallBack}
              >
                📞 Call dropped out — call back now
              </button>
            )}
          </>
        )}

        {view === "callback" && (
          <div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>Pick a date and time for the callback:</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {([
                { label: "+30 min", mins: 30 },
                { label: "+1 hr", mins: 60 },
                { label: "+2 hrs", mins: 120 },
              ] as const).map((opt) => (
                <button
                  key={opt.label}
                  disabled={busy}
                  onClick={() => {
                    const d = new Date(Date.now() + opt.mins * 60_000);
                    const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
                    const hh = String(d.getHours()).padStart(2, "0"); const mi = String(d.getMinutes()).padStart(2, "0");
                    setCallbackDate(`${yyyy}-${mm}-${dd}`);
                    setCallbackTime(`${hh}:${mi}`);
                  }}
                  style={{ flex: 1, fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e8e8e6", background: "#fff", color: "#111", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {([
                { label: "Tomorrow 9am", time: "09:00" },
                { label: "Tomorrow 12pm", time: "12:00" },
                { label: "Tomorrow 3pm", time: "15:00" },
              ] as const).map((opt) => (
                <button
                  key={opt.label}
                  disabled={busy}
                  onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() + 1);
                    const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
                    setCallbackDate(`${yyyy}-${mm}-${dd}`);
                    setCallbackTime(opt.time);
                  }}
                  style={{ flex: 1, fontSize: 11, padding: "8px 6px", borderRadius: 8, border: "1.5px solid #e8e8e6", background: "#fff", color: "#111", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 6, fontStyle: "italic" }}>Or pick custom:</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #e8e8e6", borderRadius: 10, fontSize: 14 }}
              />
              <input
                type="time"
                value={callbackTime}
                onChange={(e) => setCallbackTime(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #e8e8e6", borderRadius: 10, fontSize: 14 }}
              />
            </div>
            {callbackDate && callbackTime && (
              <div style={{ fontSize: 12, color: "#15803d", background: "#dcfce7", padding: "8px 12px", borderRadius: 8, marginBottom: 10, fontWeight: 600 }}>
                Will call back: {new Date(`${callbackDate}T${callbackTime}:00`).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setView("menu")}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #e8e8e6", background: "#fff", fontSize: 14, cursor: "pointer" }}
              >
                ← Back
              </button>
              <button
                onClick={confirmCallback}
                disabled={!callbackDate || !callbackTime || busy}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: (!callbackDate || !callbackTime || busy) ? "#f4a892" : "#f4522d",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (!callbackDate || !callbackTime || busy) ? "not-allowed" : "pointer",
                }}
              >
                Confirm Callback →
              </button>
            </div>
          </div>
        )}

        {view === "drop" && (
          <div>
            <div style={{ fontSize: 14, color: "#111", marginBottom: 16, lineHeight: 1.4 }}>
              Are you sure? This will permanently drop this lead.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setView("menu")}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #e8e8e6", background: "#fff", fontSize: 14, cursor: "pointer" }}
              >
                ← Back
              </button>
              <button
                onClick={() => apply("dropped")}
                disabled={busy}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: busy ? "#f1a3a3" : "#dc2626",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Yes, Drop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
