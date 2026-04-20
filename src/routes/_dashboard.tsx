import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { IncomingCallDialog } from "@/components/IncomingCallDialog";
import { SmsNotifier } from "@/components/SmsNotifier";
import { FloatingCallWidget } from "@/components/FloatingCallWidget";
import { CallReviewInbox } from "@/components/CallReviewInbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

// NOTE: We deliberately do NOT initialise the Twilio Device here. Twilio init
// is heavy (token fetch + WebSocket register) and was blocking first paint on
// every dashboard page. It now lazily boots only when the user visits a route
// that actively dials (Phone / Quick Dial widget) — see useTwilioDevice.

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, ready } = useAuth();
  const isFullscreen = location.pathname === "/pitch-deck";

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
        <div className="h-screen flex w-full overflow-hidden" style={{ background: "#09090b" }}>
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden" style={{ borderLeft: "1px solid #1f1f23" }}>
            <main className="flex-1 overflow-y-auto p-4 space-y-3">
              <Skeleton className="h-12 w-full" style={{ background: "#1a1a1e" }} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Skeleton className="h-24 w-full" style={{ background: "#1a1a1e" }} />
                <Skeleton className="h-24 w-full" style={{ background: "#1a1a1e" }} />
                <Skeleton className="h-24 w-full" style={{ background: "#1a1a1e" }} />
              </div>
              <Skeleton className="h-64 w-full" style={{ background: "#1a1a1e" }} />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Auth resolved but no session — redirect effect will fire; render empty
  // shell to avoid a flash of protected content.
  if (!session) {
    return <div className="min-h-screen" style={{ background: "#09090b" }} />;
  }

  if (isFullscreen) {
    return (
      <>
        <Outlet />
        <IncomingCallDialog />
        <FloatingCallWidget />
        <SmsNotifier />
        <CallReviewInbox />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full overflow-hidden" style={{ background: "#09090b" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden" style={{ borderLeft: "1px solid #1f1f23" }}>
          <SidebarTrigger
            className="md:hidden fixed top-3 left-3 z-50 h-9 w-9 rounded-md border text-white"
            style={{ background: "#0f0f12", borderColor: "#1f1f23" }}
            aria-label="Open navigation"
          />
          <main className="flex-1 overflow-y-auto md:overflow-hidden pt-14 md:pt-0">
            <Outlet />
          </main>
        </div>
      </div>
      <IncomingCallDialog />
      <FloatingCallWidget />
      <SmsNotifier />
      <CallReviewInbox />
    </SidebarProvider>
  );
}
