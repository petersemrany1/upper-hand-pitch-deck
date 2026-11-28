// Ported from the Legal app (family-law-floater/src/routes/pay-per-show.tsx). Re-run the port script to refresh.
import { Play, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/legal/components/ui/dialog";
import landingCss from "@/legal/styles/pay-per-show.css?url";
import { QualifiedDemoCalendar } from "@/legal/components/qualified-demo-calendar";
import {
  adMeasurementDisabled,
  initialiseMarketingPixel,
  setAdMeasurementDisabled,
  stopMarketingPixel,
} from "@/legal/lib/marketing-tracking";

const description =
  "We'll book screened family law consultations into your calendar with a deposit paid before they meet you. You only pay for attended appointments through Bold's prepaid packs.";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { PayPerShowPage as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Pay-per-show consultations for family law firms | Bold" },
      { name: "description", content: description },
      {
        property: "og:title",
        content: "Screened family law consultations. Deposit paid. Pay per show. | Bold",
      },
      { property: "og:description", content: description },
    ],
    links: [{ rel: "stylesheet", href: landingCss }],
  }),
  component: PayPerShowPage,
});

function PitchVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;

    // Autoplay can start before React attaches the video event handlers.
    if (!element.paused && !element.ended) {
      setStarted(true);
      return;
    }

    async function startPlayback() {
      try {
        await element!.play();
      } catch {
        if (cancelled) return;
        // Browsers may require a tap for audible autoplay. Keep the video moving.
        element!.muted = true;
        setMuted(true);
        try {
          await element!.play();
        } catch {
          // Leave the manual play button available if all autoplay is blocked.
        }
      }
    }

    void startPlayback();
    return () => {
      cancelled = true;
    };
  }, []);

  async function play() {
    if (!video.current) return;
    try {
      setPlayBlocked(false);
      video.current.muted = false;
      setMuted(false);
      if (ended) video.current.currentTime = 0;
      await video.current.play();
    } catch {
      setPlayBlocked(true);
    }
  }

  return (
    <div className="pps-video-frame">
      <div className="pps-video-backdrop" aria-hidden="true" />
      <video
        ref={video}
        className="pps-video"
        controls={started || playBlocked}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        poster="/media/pay-per-show-poster.jpg"
        aria-label="Peter explains the pay-per-show model for family law firms"
        onPlay={() => {
          setStarted(true);
          setEnded(false);
        }}
        onEnded={() => {
          setStarted(false);
          setEnded(true);
        }}
        onError={() => setFailed(true)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      >
        <source src="/media/pay-per-show-peter.mp4" type="video/mp4" />
        Your browser does not support embedded video. Schedule a demo below to learn more.
      </video>
      {started && muted && !failed && (
        <button type="button" className="pps-video-sound" onClick={play}>
          <Volume2 size={20} aria-hidden="true" /> Tap for sound
        </button>
      )}
      {!started && !failed && !playBlocked && (
        <button
          className="pps-video-play"
          onClick={play}
          aria-label={ended ? "Watch Peter's video again" : "Play Peter's one-minute explanation"}
        >
          <span className="pps-play-circle">
            {ended ? (
              <RotateCcw aria-hidden="true" />
            ) : (
              <Play fill="currentColor" aria-hidden="true" />
            )}
          </span>
        </button>
      )}
      {failed && (
        <div className="pps-video-fallback" role="status">
          <strong>The video couldn't load.</strong>
          <p>Schedule a demo below and Peter will walk you through the model.</p>
        </div>
      )}
    </div>
  );
}

const vettingQuestions = [
  {
    title: "Do you run a law firm that takes on family law matters?",
    yes: "Yes",
    no: "No",
    exit: "This demo is for law firms that take on family law matters, so we won't take you through to booking.",
  },
  {
    title: "I want vetted clients.",
    yes: "Yes",
    no: "No, I'd rather pay for leads",
    exit: "Our service is for firms looking for vetted clients who attend consultations. If you're looking to buy leads, this demo isn't the right fit.",
  },
  {
    title: "Vetted clients who show up cost $1,850 + GST each.",
    yes: "Yes — book my demo",
    no: "No, I want cheap leads",
    exit: "Our attended consultations cost $1,850 + GST each. If that doesn't suit your firm, this demo isn't the right fit.",
  },
] as const;

function VettingQuestions() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [rejected, setRejected] = useState(false);
  const [qualified, setQualified] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const question = vettingQuestions[step];

  useEffect(() => {
    title.current?.focus();
  }, [step, rejected, qualified]);

  function accept() {
    if (step === 2) {
      setQualified(true);
    } else {
      setStep(step === 0 ? 1 : 2);
    }
  }

  return (
    <DialogContent
      className={`pps-vetting${qualified ? " pps-vetting-calendar" : ""}`}
      aria-describedby={rejected ? "pps-vetting-exit-description" : undefined}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        title.current?.focus();
      }}
    >
      <DialogTitle className="pps-vetting-title" ref={title} tabIndex={-1}>
        {qualified
          ? "Schedule your demo"
          : rejected
            ? "This demo isn't the right fit."
            : question.title}
      </DialogTitle>
      {rejected && (
        <DialogDescription id="pps-vetting-exit-description" className="pps-vetting-description">
          {question.exit}
        </DialogDescription>
      )}
      {qualified ? (
        <QualifiedDemoCalendar />
      ) : rejected ? (
        <DialogClose className="pps-vetting-exit">Back to page</DialogClose>
      ) : (
        <div className="pps-vetting-answers" key={step}>
          <button type="button" className="pps-vetting-yes" onClick={accept}>
            {question.yes}
          </button>
          <button type="button" className="pps-vetting-no" onClick={() => setRejected(true)}>
            {question.no}
          </button>
        </div>
      )}
    </DialogContent>
  );
}

function BookingVetting() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) document.querySelector<HTMLVideoElement>(".pps-video")?.pause();
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className="pps-button">
          Schedule Demo
        </button>
      </DialogTrigger>
      {open && <VettingQuestions />}
    </Dialog>
  );
}

function PayPerShowPage() {
  const [measurementDisabled, setMeasurementDisabled] = useState(false);
  useEffect(() => {
    setMeasurementDisabled(adMeasurementDisabled());
    initialiseMarketingPixel();
    return stopMarketingPixel;
  }, []);

  return (
    <div className="pps-page">
      <svg className="pps-brand-lines" viewBox="0 0 1440 1100" fill="none" aria-hidden="true">
        <defs>
          <linearGradient
            id="pps-lines-gradient"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="1100"
            x2="1440"
            y2="0"
          >
            <stop stopColor="#8bdfff" />
            <stop offset="0.55" stopColor="#6c78ff" />
            <stop offset="1" stopColor="#e3a4ff" />
          </linearGradient>
        </defs>
        {Array.from({ length: 34 }, (_, index) => (
          <path
            key={index}
            d={`M ${-250 + index * 38} 1100 C ${-70 + index * 30} 700, ${1400 + index * 20} 370, ${770 + index * 32} -80`}
            stroke="url(#pps-lines-gradient)"
          />
        ))}
      </svg>
      <main className="pps-landing">
        <img className="pps-logo" src="/media/bold-logo.jpeg" alt="Bold" width="52" height="52" />
        <h1>
          We'll Book Screened Family Law Consultations Into Your Calendar —{" "}
          <span>With A Deposit Paid Before They Meet You.</span>
        </h1>
        <p className="pps-offer">
          <span>If They Don't Show Up — You Don't Pay For That Appointment.</span>
        </p>
        <PitchVideo />
        <div className="pps-cta">
          <BookingVetting />
        </div>
        <footer className="pps-measurement-notice">
          We use Meta Pixel to measure ad visits and completed demo bookings.{" "}
          <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">
            Meta privacy
          </a>
          {" · "}
          <button
            type="button"
            onClick={() => {
              setAdMeasurementDisabled(!measurementDisabled);
              setMeasurementDisabled(adMeasurementDisabled());
            }}
          >
            {measurementDisabled ? "Ad measurement is off" : "Turn off ad measurement"}
          </button>
        </footer>
      </main>
    </div>
  );
}
