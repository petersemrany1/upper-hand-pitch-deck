import { lazy, Suspense } from "react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useAuth } from "@/hooks/useAuth";

const IncomingCallDialog = lazy(() =>
  import("@/components/IncomingCallDialog").then((module) => ({ default: module.IncomingCallDialog })),
);

const FloatingCallWidget = lazy(() =>
  import("@/components/FloatingCallWidget").then((module) => ({ default: module.FloatingCallWidget })),
);

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
    <Suspense fallback={null}>
      <IncomingCallDialog />
      <FloatingCallWidget />
    </Suspense>
  );
}
