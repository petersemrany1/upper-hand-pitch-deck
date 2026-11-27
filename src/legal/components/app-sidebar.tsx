// Ported from the Legal app (family-law-floater/src/components/app-sidebar.tsx). Re-run the port script to refresh.
import { Link, useRouteContext, useRouterState } from "@/legal/runtime/router";
import {
  BarChart3,
  Building,
  Building2,
  CalendarCheck,
  FileText,
  GraduationCap,
  Headset,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PhoneCall,
  Play,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/legal/components/ui/sidebar";
import { supabase } from "@/legal/integrations/supabase/client";
import { landingPathFor, roleMayOpen } from "@/legal/lib/roles";

const dashboardItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Numbers", url: "/numbers", icon: BarChart3 },
] as const;

const salesItems = [
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Sales Call", url: "/sales-call", icon: PhoneCall },
  { title: "Transcripts", url: "/transcripts", icon: FileText },
  { title: "Training", url: "/training", icon: GraduationCap },
  {
    title: "Booked Appointments",
    url: "/booked-appointments",
    icon: CalendarCheck,
  },
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
] as const;

const firmAcquisitionItems = [
  { title: "Pitch deck", url: "/pitch-deck", icon: Play },

  {
    title: "Firm Cold Call Portal",
    url: "/firm-cold-calling",
    icon: Headset,
  },
  { title: "Firm Pipeline", url: "/firms", icon: Building2 },
] as const;

const firmPortalItems = [{ title: "Firm portal", url: "/firm-portal", icon: Building }] as const;

export function AppSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const { role } = useRouteContext({ from: "/_authenticated" });
  const visible = <T extends { url: string }>(items: readonly T[]) =>
    items.filter((item) => roleMayOpen(role, item.url));

  const isActive = (path: string) =>
    currentPath === path || (path === "/training" && currentPath.startsWith("/training/"));

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      onMouseEnter={() => {
        if (!isMobile && collapsed) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!isMobile) setOpen(false);
      }}
    >
      <SidebarHeader className="px-3 py-4">
        <Link
          to={landingPathFor(role) ?? "/auth"}
          className="flex items-center gap-3 rounded-md outline-none ring-sidebar-ring focus-visible:ring-2"
        >
          <img
            src="/__l5e/assets-v1/4063631c-1101-4290-a587-155f86e1b6ff/bold-mark.png"
            alt="Bold"
            className="h-8 w-8 shrink-0 object-contain"
          />
          {!collapsed && (
            <span
              className="text-lg font-bold tracking-tight text-sidebar-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Bold
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {visible(dashboardItems).length > 0 ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visible(dashboardItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {visible(salesItems).length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Sales</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visible(salesItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {visible(firmAcquisitionItems).length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Firm Acquisition</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visible(firmAcquisitionItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {visible(firmPortalItems).length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Firm Portal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visible(firmPortalItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="px-3 py-4">
        <SidebarMenu>
          {roleMayOpen(role, "/settings") ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/settings")}>
                <Link to="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button type="button" onClick={signOut} className="w-full">
                <LogOut />
                <span>Sign out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
