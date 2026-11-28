import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  BUSINESS_COLOR,
  BUSINESS_LABEL,
  parseBusinessView,
  rememberView,
  rememberedView,
  type BusinessView,
  type SwitchableSection,
} from "@/lib/business";
import { BusinessSwitch } from "./BusinessSwitch";
import { LegalFrame } from "./LegalFrame";
import { hasNativeLegalPage, LegalView } from "@/legal/LegalView";
import { useLegalLive } from "@/legal/runtime/trial";
import { useLegalMayOpen } from "@/legal/runtime/legal-menu";

export function useBusinessView(section: SwitchableSection | null): [BusinessView, (next: BusinessView) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const fromUrl = parseBusinessView(new URLSearchParams(location.searchStr).get("biz"), !!section?.both);
  const remembered = section ? rememberedView(section.path) : null;
  // On Legal Group's own address (boldfamilylaw.com.au) sections open on their Legal side.
  const legalHost = typeof window !== "undefined" && /(^|\.)boldfamilylaw\.com\.au$/.test(window.location.hostname);
  const view: BusinessView =
    fromUrl ??
    (legalHost
      ? "legal"
      : remembered && (remembered !== "both" || section?.both)
        ? remembered
        : section?.stacked
          ? "both"
          : "hair");

  useEffect(() => {
    if (section && fromUrl) rememberView(section.path, fromUrl);
  }, [section, fromUrl]);

  const setView = (next: BusinessView) => {
    if (section) rememberView(section.path, next);
    const params = new URLSearchParams(location.searchStr);
    params.set("biz", next);
    navigate({ href: `${location.pathname}?${params.toString()}`, replace: true });
  };
  return [view, setView];
}

function sectionTitle(section: SwitchableSection): string {
  const titles: Record<string, string> = {
    "/sales-call": "Sales Call",
    "/inbox": "Messages",
    "/booked-appointments": "Appointments",
    "/numbers": "Numbers",
    "/pitch-deck": "Pitch Deck",
    "/leads": "Leads",
    "/leaderboard": "Leaderboard",
    "/my-recordings": "Recordings & Transcripts",
    "/training": "Training",
  };
  return titles[section.path] ?? "";
}

// Wraps a section that exists for both businesses: a slim bar with the switch,
// then the Hair page (the existing Upper Hand page), the Legal page, or the
// combined view.
export function BusinessSection({
  section,
  children,
  floating,
}: {
  section: SwitchableSection;
  children: ReactNode;
  floating?: boolean;
}) {
  const [chosen, setView] = useBusinessView(section);
  const { pathname } = useLocation();
  // Whole-page screens (dashboard, partner portal) only offer Legal to people
  // whose Legal role includes that screen; everyone else just sees Hair.
  const legalOk = useLegalMayOpen(section.legalPath);
  const hairOnly = !!section.stacked && legalOk === false;
  const view: BusinessView = hairOnly ? "hair" : chosen;
  useLegalLive(); // after switch-over every Legal page opens here, not in a frame
  const title = sectionTitle(section);
  // Sub-pages (training modules) open their own Legal page when there is one.
  const legalPath = hasNativeLegalPage(pathname)
    ? pathname
    : section.legalNative && hasNativeLegalPage(section.legalNative)
      ? section.legalNative
      : section.path;
  const legalBody = hasNativeLegalPage(legalPath) ? (
    <LegalView key={legalPath} path={legalPath} fullscreen={floating} />
  ) : (
    <LegalFrame path={section.legalPath} title={title} />
  );

  const body =
    view === "hair" ? (
      children
    ) : view === "legal" ? (
      legalBody
    ) : section.stacked ? (
      // Both, for whole-page screens: Hair on top, Legal underneath, each the
      // exact page that business shows on its own.
      <div className="flex min-h-0 flex-1 flex-col">
        <StackedPane business="hair">{children}</StackedPane>
        <StackedPane business="legal">{legalBody}</StackedPane>
      </div>
    ) : (
      // Both: each business's own page, side by side, so every figure is the
      // exact one that business's page shows.
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-2">
        <BothPane business="hair">{children}</BothPane>
        <BothPane business="legal">{legalBody}</BothPane>
      </div>
    );

  if (floating) {
    // Full-screen pages (pitch deck) keep their layout; the switch floats.
    return (
      <div className="relative h-screen w-full">
        <div className="fixed left-1/2 top-3 z-[60] -translate-x-1/2">
          <BusinessSwitch value={view} onChange={setView} size="sm" />
        </div>
        {view === "legal" && !hasNativeLegalPage(section.path) ? <div className="h-screen w-full bg-white pt-12">{body}</div> : body}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="sticky top-0 z-30 flex shrink-0 items-center gap-3 px-4 py-2 md:pr-16"
        style={{
          background: view === "both" ? "#f7f7f5" : BUSINESS_COLOR[view].bg,
          borderBottom: `2px solid ${view === "both" ? "#ebebeb" : BUSINESS_COLOR[view].fg}`,
        }}
      >
        {!hairOnly && <BusinessSwitch value={view} onChange={setView} allowBoth={section.both} />}
        <span
          className="hidden items-center gap-2 text-xs sm:inline-flex"
          style={{ color: view === "both" ? "#6b6b68" : BUSINESS_COLOR[view].fg }}
        >
          {view !== "both" && (
            <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>
              {view === "hair" ? "Hair Transplant Group" : "Legal Group"}
            </span>
          )}
          <span style={{ opacity: 0.75 }}>{title}</span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{body}</div>
    </div>
  );
}

function BothPane({ business, children }: { business: "hair" | "legal"; children: ReactNode }) {
  const c = BUSINESS_COLOR[business];
  return (
    <section
      className="flex min-h-[70vh] min-w-0 flex-col xl:h-full xl:min-h-0"
      style={{ borderRight: business === "hair" ? "1px solid #ebebeb" : undefined }}
    >
      <div className="flex shrink-0 items-center gap-2 px-4 py-1.5 text-xs font-semibold" style={{ background: c.bg, color: c.fg }}>
        <span className="h-2 w-2 rounded-full" style={{ background: c.fg }} />
        {BUSINESS_LABEL[business]}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
    </section>
  );
}

function StackedPane({ business, children }: { business: "hair" | "legal"; children: ReactNode }) {
  const c = BUSINESS_COLOR[business];
  return (
    <section className="flex min-w-0 flex-col" style={{ borderTop: business === "legal" ? "1px solid #ebebeb" : undefined }}>
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase"
        style={{ background: c.bg, color: c.fg, letterSpacing: "0.08em", borderBottom: `1px solid ${c.border}` }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: c.fg }} />
        {business === "hair" ? "Hair Transplant Group" : "Legal Group"}
      </div>
      <div className="flex min-w-0 flex-col">{children}</div>
    </section>
  );
}
