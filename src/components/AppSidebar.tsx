import { Presentation, LayoutDashboard, Settings, Phone, BarChart3, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getUnresolvedCount } from "@/utils/error-logger.functions";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.title === "Logs" && unresolvedCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {unresolvedCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
