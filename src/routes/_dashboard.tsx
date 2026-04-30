import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { IncomingCallDialog } from "@/components/IncomingCallDialog";
import { SmsNotifier } from "@/components/SmsNotifier";
import { MissedCallNotifier } from "@/components/MissedCallNotifier";
import { FloatingCallWidget } from "@/components/FloatingCallWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

// Boot the Twilio Device once at the dashboard shell — as soon as the user is
// signed in and any dashboard route mounts. The Device is a module-level
// singleton, so this is cheap on subsequent route changes and guarantees the
// dialler is "Ready" no matter which page Peter lands on (Clinics, Dashboard,
// Clients, etc.). Previously it was opt-in per route, which meant landing
// directly on /clinics never booted the SDK and calls would silently fail.
function DeviceBootstrap() {
  useTwilioDevice(true);
  return null;
}


function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, ready } = useAuth();
  const isFullscreen = location.pathname === "/pitch-deck";
  // Sales Call page has its own in-call UI on the right panel, so the
  // floating widget is redundant and overlaps the objections column.
  const hideFloatingCall = location.pathname === "/sales-call";

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
      <>
        <DeviceBootstrap />
        {/* PROTECTED — pitch-deck-root scope restores original dark theme tokens */}
        <div className="pitch-deck-root">
          <Outlet />
        </div>
        <IncomingCallDialog />
        <FloatingCallWidget />
        <SmsNotifier />
        <MissedCallNotifier />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <DeviceBootstrap />
      <div className="h-screen flex w-full overflow-hidden" style={{ background: "#f7f7f5" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <SidebarTrigger
            className="md:hidden fixed top-3 left-3 z-50 h-9 w-9 rounded-md"
            style={{ background: "#ffffff", border: "0.5px solid #ebebeb", color: "#111" }}
            aria-label="Open navigation"
          />
          <main className="flex-1 overflow-y-auto md:overflow-hidden pt-14 md:pt-0">
            <Outlet />
          </main>
        </div>
      </div>
      <IncomingCallDialog />
      {!hideFloatingCall && <FloatingCallWidget />}
      <SmsNotifier />
    </SidebarProvider>
  );
}
