import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { IncomingCallDialog } from "@/components/IncomingCallDialog";
import { SmsNotifier } from "@/components/SmsNotifier";
import { FloatingCallWidget } from "@/components/FloatingCallWidget";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const isFullscreen = location.pathname === "/pitch-deck";

  // Redirect unauthenticated users to /login (preserving the target path)
  useEffect(() => {
    if (!loading && !session) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname + location.search },
        replace: true,
      });
    }
  }, [loading, session, navigate, location.pathname, location.search]);

  // Initialise the Twilio Device app-wide so inbound calls can ring on any page.
  // Skip until we know we have a session — voice-token now requires auth.
  useTwilioDevice(Boolean(session));

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#09090b" }}>
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <>
        <Outlet />
        <IncomingCallDialog />
        <FloatingCallWidget />
        <SmsNotifier />
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
    </SidebarProvider>
  );
}
