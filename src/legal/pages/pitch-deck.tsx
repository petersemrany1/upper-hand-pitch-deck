// Ported from the Legal app (family-law-floater/src/routes/_authenticated/pitch-deck.tsx). Re-run the port script to refresh.
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, SlidersHorizontal } from "lucide-react";

import "@/legal/components/pitch/pitch-deck.css";

import { ROICalculator } from "@/legal/components/pitch/ROICalculator";
import { SetupScreen } from "@/legal/components/pitch/SetupScreen";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type DeckSettings,
} from "@/legal/components/pitch/deck-utils";
import { fetchCloudSettings, saveCloudSettings } from "@/legal/lib/deck-settings";
import {
  CoverSlide,
  DeRiskSlide,
  FaqSlide,
  HowItWorksSlide,
  PackagesSlide,
  WhoWeSendSlide,
} from "@/legal/components/pitch/slides";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { PitchDeckPage as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Legal Group — Pitch Deck for Family Law Firms" },
      {
        name: "description",
        content:
          "Legal Group's presentation deck: vetted, deposit-paid family law clients booked straight into your diary.",
      },
      { property: "og:title", content: "Legal Group — Pitch Deck for Family Law Firms" },
      {
        property: "og:description",
        content:
          "Vetted, deposit-paid family law clients booked into your diary. Packages, numbers and how it works.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PitchDeckPage,
});

function PitchDeckPage() {
  const deckRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<DeckSettings>(DEFAULT_SETTINGS);
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    void fetchCloudSettings().then((cloud) => {
      if (cloud) {
        setSettings(cloud);
        saveSettings(cloud);
      }
    });
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const update = useCallback((next: DeckSettings) => {
    setSettings(next);
    saveSettings(next);
    void saveCloudSettings(next);
  }, []);

  const slides = [
    <CoverSlide key="cover" />,
    <HowItWorksSlide key="how" />,
    <WhoWeSendSlide key="who" />,
    <PackagesSlide
      key="packages"
      matterValue={settings.matterValue}
      pricePerShow={settings.pricePerShow}
      conversionLabel={settings.conversionLabel}
    />,
    ...(settings.includeRiskSlide
      ? [<DeRiskSlide key="derisk" matterValue={settings.matterValue} />]
      : []),
    <ROICalculator
      key="roi"
      matterValue={settings.matterValue}
      pricePerShow={settings.pricePerShow}
      conversionLabel={settings.conversionLabel}
      onChange={(next) => update({ ...settings, ...next })}
    />,
    <FaqSlide key="faq-1" page={0} />,
    <FaqSlide key="faq-2" page={1} />,
  ];

  const total = slides.length;
  const go = useCallback(
    (index: number) => setActive(Math.min(Math.max(index, 0), total - 1)),
    [total],
  );

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      // Arrow keys must keep adjusting the calculator and form controls.
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input, select, textarea, [contenteditable='true']")
      )
        return;
      if (["ArrowRight", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, total - 1));
      } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, total]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void deckRef.current?.requestFullscreen?.();
    }
  };

  if (!started) {
    return (
      <div
        ref={deckRef}
        className="legal-pitch-deck-root group/deck relative h-full w-full flex-1 overflow-hidden"
      >
        <SetupScreen
          settings={settings}
          onStart={(next) => {
            update(next);
            setActive(0);
            setStarted(true);
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={deckRef}
      className="legal-pitch-deck-root group/deck relative h-full w-full flex-1 overflow-hidden"
    >
      {slides.map((slide, i) => {
        if (Math.abs(i - active) > 1) return null;
        return (
          <div
            key={slide.key}
            className={i === active ? "h-full w-full" : "hidden"}
            aria-hidden={i !== active}
          >
            {slide}
          </div>
        );
      })}

      <nav className="deck-navigation" aria-label="Slide navigation">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => go(active - 1)}
          disabled={active === 0}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <select
          aria-label="Go to slide"
          className="deck-slide-select"
          value={active}
          onChange={(e) => go(Number(e.target.value))}
        >
          {slides.map((slide, i) => (
            <option key={slide.key} value={i}>
              {i + 1} / {total}
            </option>
          ))}
        </select>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          Slide {active + 1} of {total}
        </span>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => go(active + 1)}
          disabled={active === total - 1}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>

      <button
        type="button"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        onClick={toggleFullscreen}
        className="deck-fullscreen"
      >
        {isFullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
        <span>{isFullscreen ? "Exit fullscreen" : "Full screen"}</span>
      </button>

      {active === 0 && (
        <button
          type="button"
          onClick={() => setStarted(false)}
          className="deck-settings"
          aria-label="Change numbers"
        >
          <SlidersHorizontal aria-hidden="true" />
          <span>Change numbers</span>
        </button>
      )}
    </div>
  );
}
