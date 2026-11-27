// Ported from the Legal app (family-law-floater/src/components/qualified-demo-calendar.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import {
  calendlyBookingId,
  discoveryBookingUrl,
  isCalendlyFrameMessage,
  recordQualifiedBooking,
} from "@/legal/lib/marketing-tracking";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        resize: boolean;
      }) => void;
    };
  }
}

let calendlyScript: Promise<void> | undefined;
function loadCalendly() {
  if (window.Calendly) return Promise.resolve();
  if (!calendlyScript) {
    calendlyScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        calendlyScript = undefined;
        reject(new Error("Calendly unavailable"));
      };
      document.head.appendChild(script);
    });
  }
  return calendlyScript;
}

// Mounted only after all three answers are Yes. The calendar stays on the ad's domain.
export function QualifiedDemoCalendar() {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    let cancelled = false;
    function receive(event: MessageEvent) {
      const frame = parent!.querySelector("iframe");
      if (!isCalendlyFrameMessage(event, frame?.contentWindow ?? null)) return;
      if (event.data?.event === "calendly.event_type_viewed") setReady(true);
      const bookingId = calendlyBookingId(event.data);
      if (bookingId) {
        setBooked(true);
        recordQualifiedBooking(bookingId);
      }
    }
    window.addEventListener("message", receive);
    void loadCalendly()
      .then(() => {
        if (cancelled) return;
        if (!window.Calendly) throw new Error("Calendly unavailable");
        parent.replaceChildren();
        window.Calendly.initInlineWidget({
          url: discoveryBookingUrl(window.location.search),
          parentElement: parent,
          resize: true,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      window.removeEventListener("message", receive);
      parent.replaceChildren();
    };
  }, [attempt]);

  return (
    <div className="pps-calendar-wrap">
      {booked && (
        <p className="pps-booked" role="status">
          You're booked in. Check your email for your confirmation.
        </p>
      )}
      {!ready && !failed && (
        <p className="pps-calendar-loading" role="status">
          Loading available times…
        </p>
      )}
      <div
        ref={container}
        className="pps-calendar"
        aria-label="Book your discovery call with Peter"
      />
      {failed && (
        <div className="pps-calendar-error" role="alert">
          <p>The calendar couldn't load. Please try again.</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Retry calendar
          </button>
        </div>
      )}
    </div>
  );
}
