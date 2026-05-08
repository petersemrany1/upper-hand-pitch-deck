import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { IncomingCallDialog, useIncomingBannerActive, INCOMING_BANNER_HEIGHT } from "@/components/IncomingCallDialog";
import { SmsNotifier } from "@/components/SmsNotifier";
import { MissedCallNotifier } from "@/components/MissedCallNotifier";
import { FloatingCallWidget } from "@/components/FloatingCallWidget";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, ready, role } = useAuth();
  const isFullscreen = location.pathname === "/pitch-deck";
  const pageOwnsNotificationBell = ["/sales-call", "/leaderboard"].includes(location.pathname);
  // Floating call widget is rendered globally so the dialler/hangup button
  // follows the user across pages. It only renders when a call is actually
  // active, so it doesn't clutter the UI otherwise.

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

  // Reps cannot access admin-only routes — bounce to dashboard.
  useEffect(() => {
    if (!ready || !session) return;
    const blocked = ["/leads", "/clinics", "/pitch-deck", "/sent-links", "/logs"];
    if (role === "rep" && blocked.includes(location.pathname)) {
      navigate({ to: "/", replace: true });
    }
  }, [ready, session, role, location.pathname, navigate]);

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
        <DashboardShell>
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <SidebarTrigger
              className="md:hidden fixed top-3 left-3 z-50 h-9 w-9 rounded-md"
              style={{ background: "#ffffff", border: "0.5px solid #ebebeb", color: "#111" }}
              aria-label="Open navigation"
            />
            {!pageOwnsNotificationBell && (
              <div className="fixed top-3 right-3 z-50">
                <NotificationBell />
              </div>
            )}
            <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
              <Outlet />
            </main>
          </div>
        </DashboardShell>
        <SmsNotifier />
        <MissedCallNotifier />
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
