import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const isFullscreen = location.pathname === "/pitch-deck";

  if (isFullscreen) {
    return <Outlet />;
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden" style={{ background: "#09090b" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden" style={{ borderLeft: "1px solid #1f1f23" }}>
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
