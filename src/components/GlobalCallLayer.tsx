import { lazy, Suspense, useEffect } from "react";
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
  const { session, ready } = useAuth();
  const enabled = ready && !!session;
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
