import { Presentation, LayoutDashboard, Settings, Phone, BarChart3, AlertTriangle, Building2, Activity } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getUnresolvedCount } from "@/utils/error-logger.functions";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pipeline", url: "/pipeline", icon: Activity },
  { title: "Clinics", url: "/clinics", icon: Building2 },
  { title: "Pitch Deck", url: "/pitch-deck", icon: Presentation },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Phone & Contacts", url: "/clients", icon: Phone },
  { title: "Logs", url: "/logs", icon: AlertTriangle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  useEffect(() => {
    getUnresolvedCount().then((r) => setUnresolvedCount(r.count)).catch(() => {});
    const interval = setInterval(() => {
      getUnresolvedCount().then((r) => setUnresolvedCount(r.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      collapsible="icon"
      className="!border-r-0"
      style={{ background: "#0f0f12" }}
    >
      <SidebarContent style={{ background: "#0f0f12" }}>
        <SidebarGroup className="pt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="!rounded-none"
                      style={{
                        borderLeft: active ? "3px solid #2D6BE4" : "3px solid transparent",
                        background: active ? "#1a1a1e" : "transparent",
                        color: active ? "#fff" : "#888",
                        fontSize: 13,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Link to={item.url} className="hover:!text-white">
                        <item.icon className="h-4 w-4" style={{ color: active ? "#2D6BE4" : "#888" }} />
                        <span className="flex-1">{item.title}</span>
                        {item.title === "Logs" && unresolvedCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {unresolvedCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Avatar at bottom */}
        <div className="mt-auto px-4 pb-4">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 32,
              height: 32,
              background: "#1f1f23",
              color: "#2D6BE4",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            PS
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
