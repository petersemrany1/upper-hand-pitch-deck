// Ported from the Legal app (family-law-floater/src/components/firms/FirmCallbackSetting.tsx). Re-run the port script to refresh.
import { BellRing } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { Switch } from "@/legal/components/ui/switch";
import type { FirmCallbacks } from "@/legal/hooks/use-firm-callbacks";
export function FirmCallbackSetting({
  enabled,
  saving,
  receiver,
  onChange,
}: {
  enabled: boolean;
  saving: boolean;
  receiver: FirmCallbacks;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2.5 sm:mx-6">
      <BellRing size={18} className="text-primary" />
      <div className="mr-auto">
        <label htmlFor="firm-callbacks-enabled" className="text-sm font-medium">
          Ring me for firm callbacks
        </label>
        <p className="text-xs text-muted-foreground">
          Rings available team members · keep this Firms tab open
        </p>
      </div>
      <span role="status" className="text-xs text-muted-foreground">
        {!enabled
          ? "Off"
          : receiver.caller
            ? receiver.phase === "connected"
              ? "On a call"
              : "Incoming call"
            : receiver.busy
              ? "Unavailable during your outgoing call"
              : !receiver.soundReady
                ? "Not receiving calls"
                : receiver.available
                  ? "Ready for calls"
                  : receiver.connection === "connecting" || receiver.connection === "ready"
                    ? "Connecting…"
                    : receiver.connection === "waiting"
                      ? "Waiting for your other Firms tab…"
                      : receiver.connection === "error"
                        ? "Reconnecting…"
                        : "Not connected"}
      </span>
      <Switch
        id="firm-callbacks-enabled"
        checked={enabled}
        disabled={saving || !!receiver.caller}
        onCheckedChange={onChange}
      />
      {enabled && !receiver.soundReady && !receiver.caller && (
        <Button size="sm" variant="outline" disabled={saving} onClick={receiver.startReceiving}>
          Start receiving calls
        </Button>
      )}
      {receiver.error && !receiver.caller && (
        <p role="alert" className="w-full text-xs text-destructive">
          {receiver.error}
        </p>
      )}
    </div>
  );
}
