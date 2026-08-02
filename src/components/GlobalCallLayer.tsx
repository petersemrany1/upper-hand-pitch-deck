import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useAuth } from "@/hooks/useAuth";
import { primeRingtoneAudio } from "@/utils/ringtone";
import { primeAudioContext } from "@/utils/ringback";

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
  const { session, ready, role } = useAuth();
  const location = useLocation();
  // Voice is a sales-dashboard feature. Keeping it off every non-dashboard
  // route is important because auth role resolution is asynchronous: during
  // an account switch, the previous admin role can briefly coexist with the
  // new clinic session. That transient state used to invoke the sales-only
  // voice-token function from /clinic-portal, producing a legitimate 403 that
  // the runtime surfaced as a blank-screen error.
  const isDashboardRoute = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const enabled = isDashboardRoute && ready && !!session && role === "admin";
  useTwilioDevice(enabled);

  // Browsers block AudioContext playback until a user gesture. Prime both
  // the inbound ringtone and the outbound ringback on the FIRST user
  // interaction with the page so a later Twilio incoming-call event (which
  // is not a gesture) can actually produce sound.
  useEffect(() => {
    if (!enabled) return;
    const prime = () => {
      primeRingtoneAudio();
      primeAudioContext();
    };
    const opts = { once: true, capture: true } as AddEventListenerOptions;
    window.addEventListener("pointerdown", prime, opts);
    window.addEventListener("keydown", prime, opts);
    window.addEventListener("touchstart", prime, opts);
    return () => {
      window.removeEventListener("pointerdown", prime, opts);
      window.removeEventListener("keydown", prime, opts);
      window.removeEventListener("touchstart", prime, opts);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <IncomingCallDialog />
      <FloatingCallWidget />
    </Suspense>
  );
}
