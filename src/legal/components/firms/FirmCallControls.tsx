// Ported from the Legal app (family-law-floater/src/components/firms/FirmCallControls.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Grid2X2 } from "lucide-react";
import "./firm-crm.css";
import type { DiallerState } from "@/legal/hooks/use-dialler";

export function FirmCallControls({
  dialler,
  busy,
  activeName,
  canCall,
  onCall,
}: {
  dialler: DiallerState;
  busy: boolean;
  activeName: string | null;
  canCall: boolean;
  onCall: () => void;
}) {
  const [keypad, setKeypad] = useState(false);
  const active = busy || dialler.status !== "idle";
  return (
    <div className="crm-call-bar">
      {keypad && active && (
        <div className="mb-3 grid max-w-48 grid-cols-3 gap-1">
          {"123456789*0#".split("").map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={dialler.status !== "on-call"}
              onClick={() => dialler.sendDigits(digit)}
              className="rounded border p-2 text-sm hover:bg-muted disabled:opacity-40"
            >
              {digit}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0 text-xs" aria-live="polite">
          {active ? (
            <>
              <p className="truncate font-medium">{activeName ?? "Preparing call…"}</p>
              <p className="text-muted-foreground">
                {busy
                  ? "Preparing…"
                  : dialler.status === "on-call"
                    ? `Connected · ${Math.floor(dialler.seconds / 60)}:${String(dialler.seconds % 60).padStart(2, "0")}`
                    : dialler.status}
              </p>
            </>
          ) : (
            <div className="crm-call-ready">
              <span className="crm-ready-dot" />
              <div>
                <strong>{canCall ? "Ready when you are" : "Calling unavailable"}</strong>
                <p>
                  {canCall
                    ? "Recorded call · automatic notes after you hang up"
                    : "A phone number and loaded call sheet are required"}
                </p>
              </div>
            </div>
          )}
        </div>
        {active ? (
          <>
            <button
              type="button"
              aria-label={dialler.muted ? "Unmute" : "Mute"}
              disabled={dialler.status !== "on-call"}
              onClick={dialler.toggleMute}
              className="rounded-md border p-2 disabled:opacity-40"
            >
              {dialler.muted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              type="button"
              aria-label="Toggle keypad"
              aria-expanded={keypad}
              onClick={() => setKeypad(!keypad)}
              className="rounded-md border p-2"
            >
              <Grid2X2 size={16} />
            </button>
            <button
              type="button"
              disabled={busy || dialler.status === "connecting" || dialler.status === "ending"}
              onClick={dialler.hangUp}
              className="flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              <PhoneOff size={15} /> Hang up
            </button>
          </>
        ) : (
          <button type="button" disabled={!canCall} onClick={onCall} className="crm-call-button">
            <Phone size={15} /> Call firm
          </button>
        )}
      </div>
    </div>
  );
}
