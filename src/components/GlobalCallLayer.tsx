import { IncomingCallDialog } from "@/components/IncomingCallDialog";
import { FloatingCallWidget } from "@/components/FloatingCallWidget";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useAuth } from "@/hooks/useAuth";

// Mounted at the app root so an incoming call banner appears on EVERY route
// (login screen excluded — no session means no Twilio identity to register).
// Boots the Twilio Device singleton once the user is signed in so inbound
// calls land regardless of which page Peter is currently looking at.
export function GlobalCallLayer() {
  const { session, ready } = useAuth();
  const enabled = ready && !!session;
  useTwilioDevice(enabled);
  if (!enabled) return null;
  return (
    <>
      <IncomingCallDialog />
      <FloatingCallWidget />
    </>
  );
}
