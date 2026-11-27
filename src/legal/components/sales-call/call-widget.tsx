// Ported from the Legal app (family-law-floater/src/components/sales-call/call-widget.tsx). Re-run the port script to refresh.
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { formatDuration } from "@/legal/lib/sales-call";
import type { DiallerState } from "@/legal/hooks/use-dialler";

/** Inline live-call controls, kept in the page header so actions stay unobstructed. */
export function CallWidget({
  dialler,
  leadName,
}: {
  dialler: DiallerState;
  leadName: string;
}) {
  if (dialler.status === "idle") return null;

  const connecting = dialler.status === "connecting";
  const ringing = dialler.status === "ringing";
  const label = connecting
    ? "Connecting…"
    : ringing
      ? "Ringing…"
      : dialler.status === "ending"
        ? "Hanging up…"
        : `On call · ${formatDuration(dialler.seconds)}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-w-0 max-w-full items-center gap-3 rounded-full border bg-card py-1.5 pl-3.5 pr-1.5 shadow-sm"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${connecting || ringing ? "bg-amber-500" : "bg-green-500"}`}
        aria-hidden="true"
      />
      <div className="min-w-0 max-w-48 leading-tight">
        <p className="truncate text-xs font-semibold">{leadName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
      <Button
        size="icon"
        variant="outline"
        onClick={dialler.toggleMute}
        disabled={connecting || ringing}
        aria-label={dialler.muted ? "Unmute the call" : "Mute the call"}
        className="h-8 w-8 shrink-0 rounded-full"
      >
        {dialler.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={dialler.hangUp}
        aria-label="Hang up the call"
        className="h-8 shrink-0 rounded-full px-3 text-xs"
      >
        <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> Hang up
      </Button>
    </div>
  );
}
