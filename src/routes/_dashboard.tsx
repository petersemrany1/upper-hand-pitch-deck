import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { IncomingCallDialog } from "@/components/IncomingCallDialog";
import { SmsNotifier } from "@/components/SmsNotifier";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const isFullscreen = location.pathname === "/pitch-deck";

  // Initialise the Twilio Device app-wide so inbound calls can ring on any page.
  useTwilioDevice();

  if (isFullscreen) {
    return (
      <>
        <Outlet />
        <IncomingCallDialog />
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
      <SmsNotifier />
    </SidebarProvider>
  );
}
