import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { IncomingCallDialog, useIncomingBannerActive, INCOMING_BANNER_HEIGHT } from "@/components/IncomingCallDialog";
import { SmsNotifier } from "@/components/SmsNotifier";
import { MissedCallNotifier } from "@/components/MissedCallNotifier";
import { FloatingCallWidget } from "@/components/FloatingCallWidget";
import { NotificationBell } from "@/components/NotificationBell";
import { MiniMessenger } from "@/components/MiniMessenger";

import { NotificationsProvider } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { TAB_TO_URL, type TabKey } from "@/lib/tab-access";

// Map current pathname → TabKey it belongs to. Returns null for pages that
// aren't tab-gated (settings, clients, logs, clinic-portal, etc.).
function tabForPath(pathname: string): TabKey | null {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/training")) return "training";
  if (pathname.startsWith("/partner-clinics")) return "partner_clinics";
  if (pathname.startsWith("/sales-call")) return "sales_portal";
  if (pathname.startsWith("/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/booked-appointments")) return "appointments";
  if (pathname.startsWith("/leads")) return "leads";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/inbox")) return "phone";
  if (pathname.startsWith("/pitch-deck")) return "pitch_deck";
  if (pathname.startsWith("/clinics")) return "clinics";
  if (pathname.startsWith("/sent-links")) return "sent_links";
  return null;
}

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, ready, role, userType, allowedTabs } = useAuth();
  const isFullscreen = location.pathname === "/pitch-deck";
  const pageOwnsNotificationBell = ["/sales-call", "/leaderboard", "/training/practice-call"].includes(location.pathname) || location.pathname.startsWith("/partner-clinics");
  const isTrainingRoute = location.pathname.startsWith("/training");
  const isClinicSetter = role === "caller";

  // Redirect unauthenticated users once the session check has resolved.
  useEffect(() => {
    if (ready && !session) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname } as never,
        replace: true,
      });
    }
  }, [ready, session, navigate, location.pathname]);

  // Clinic-portal users have no business in the admin dashboard.
  useEffect(() => {
    if (!ready || !session) return;
    if (userType === "clinic") {
      navigate({ to: "/clinic-portal", replace: true });
    }
  }, [ready, session, userType, navigate]);

  // Per-user tab access enforcement. Admins bypass (allowedTabs covers all).
  useEffect(() => {
    if (!ready || !session) return;
    if (role === "admin") return;
    if (userType === "clinic") return;
    const tab = tabForPath(location.pathname);
    if (!tab) return; // page isn't tab-gated
    if (allowedTabs.includes(tab)) return;
    // Redirect to first allowed tab, or dashboard fallback.
    const fallback = allowedTabs[0] ? TAB_TO_URL[allowedTabs[0]] : "/";
    navigate({ to: fallback, replace: true });
  }, [ready, session, role, userType, allowedTabs, location.pathname, navigate]);

  // While the session restores from localStorage, render the dashboard chrome
  // immediately with skeleton placeholders instead of a blank spinner.
  if (!ready) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="h-screen flex w-full overflow-hidden" style={{ background: "#f7f7f5" }}>
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-4 space-y-3">
              <Skeleton className="h-12 w-full" style={{ background: "#ececec" }} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Skeleton className="h-24 w-full" style={{ background: "#ececec" }} />
                <Skeleton className="h-24 w-full" style={{ background: "#ececec" }} />
                <Skeleton className="h-24 w-full" style={{ background: "#ececec" }} />
              </div>
              <Skeleton className="h-64 w-full" style={{ background: "#ececec" }} />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Auth resolved but no session — redirect effect will fire; render empty
  // shell to avoid a flash of protected content.
  if (!session) {
    return <div className="min-h-screen" style={{ background: "#f7f7f5" }} />;
  }

  if (isClinicSetter && location.pathname !== "/clinics") {
    return <div className="min-h-screen" style={{ background: "#f7f7f5" }} />;
  }

  if (isFullscreen) {
    return (
      <NotificationsProvider>
        {/* PROTECTED — pitch-deck-root scope restores original dark theme tokens */}
        <div className="pitch-deck-root">
          <Outlet />
        </div>
        <SmsNotifier />
        <MissedCallNotifier />
      </NotificationsProvider>
    );
  }

  return (
    <NotificationsProvider>
      <SidebarProvider defaultOpen={false}>
        <DashboardShell suppressBanner={isTrainingRoute}>
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <SidebarTrigger
              className="md:hidden fixed top-3 left-3 z-50 h-9 w-9 rounded-md"
              style={{ background: "#ffffff", border: "0.5px solid #ebebeb", color: "#111" }}
              aria-label="Open navigation"
            />
            {!isClinicSetter && !pageOwnsNotificationBell && !isTrainingRoute && (
              <div className="fixed top-3 right-3 z-50">
                <NotificationBell />
              </div>
            )}
            <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
              <Outlet />
            </main>
          </div>
        </DashboardShell>
        {!isTrainingRoute && <SmsNotifier />}
        {!isTrainingRoute && <MissedCallNotifier />}
        
        <MiniMessenger />
      </SidebarProvider>
    </NotificationsProvider>
  );
}

// Wraps the dashboard chrome and reserves space at the top whenever the
// incoming-call banner is visible, so the banner pushes content down
// instead of overlaying it.
function DashboardShell({ children }: { children: React.ReactNode }) {
  const bannerActive = useIncomingBannerActive();
  return (
    <div
      className="h-screen flex w-full overflow-hidden"
      style={{
        background: "#f7f7f5",
        paddingTop: bannerActive ? INCOMING_BANNER_HEIGHT : 0,
        transition: "padding-top 200ms ease-out",
      }}
    >
      {children}
    </div>
  );
}
