import { Presentation, LayoutDashboard, Phone, BarChart3, AlertTriangle, Building2, Inbox, LogOut, Settings as SettingsIcon, Send, Users, Headphones, Trophy } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getUnresolvedCount } from "@/utils/error-logger.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Sales Call", url: "/sales-call", icon: Headphones },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Clinics", url: "/clinics", icon: Building2 },
  { title: "Pitch Deck", url: "/pitch-deck", icon: Presentation },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Phone & Contacts", url: "/clients", icon: Phone },
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Sent Links", url: "/sent-links", icon: Send },
  { title: "Logs", url: "/logs", icon: AlertTriangle },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [unreadSms, setUnreadSms] = useState(0);
  const { isMobile, setOpenMobile } = useSidebar();
  const { signOut } = useAuth();

  useEffect(() => {
    getUnresolvedCount().then((r) => setUnresolvedCount(r.count)).catch(() => {});
    const interval = setInterval(() => {
      getUnresolvedCount().then((r) => setUnresolvedCount(r.count)).catch(() => {});
    }, 30000);

    const loadUnread = async () => {
      const { data } = await supabase.from("sms_threads").select("unread_count");
      const total = (data ?? []).reduce((s, r) => s + (r.unread_count ?? 0), 0);
      setUnreadSms(total);
    };
    void loadUnread();
    const ch = supabase
      .channel("sidebar-sms-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_threads" }, loadUnread)
      .subscribe();
    return () => {
      clearInterval(interval);
      void supabase.removeChannel(ch);
    };
  }, []);

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      collapsible="icon"
      className="!border-r-0"
      style={{ background: "#ffffff" }}
    >
      <SidebarContent style={{ background: "#ffffff", borderRight: "0.5px solid #ebebeb" }}>
        {/* Brand */}
        <div
          className="px-5 pt-5 pb-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:pt-4"
          style={{ borderBottom: "0.5px solid #f5f5f5" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center rounded-md flex-shrink-0"
              style={{ width: 26, height: 26, background: "#fff1ee", color: "#f4522d", fontSize: 12, fontWeight: 600 }}
            >
              U
            </span>
            <span
              className="group-data-[collapsible=icon]:hidden"
              style={{ fontSize: 13, fontWeight: 500, color: "#111", letterSpacing: "-0.01em" }}
            >
              Upper Hand
            </span>
          </div>
        </div>

        <SidebarGroup className="pt-2">
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
                        borderLeft: active ? "2px solid #f4522d" : "2px solid transparent",
                        background: active ? "#fff1ee" : "transparent",
                        color: active ? "#f4522d" : "#111111",
                        fontSize: 13,
                        fontWeight: active ? 500 : 400,
                        transition: "all 0.15s ease",
                        height: 36,
                      }}
                    >
                      <Link
                        to={item.url}
                        className="relative"
                        onClick={() => { if (isMobile) setOpenMobile(false); }}
                      >
                        <item.icon className="h-4 w-4" style={{ color: active ? "#f4522d" : "#111111" }} />
                        <span className="flex-1">{item.title}</span>
                        {item.title === "Logs" && unresolvedCount > 0 && (
                          <>
                            <span
                              className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10px] font-medium group-data-[collapsible=icon]:hidden"
                              style={{ background: "#fef2f2", color: "#dc2626" }}
                            >
                              {unresolvedCount}
                            </span>
                            <span
                              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full md:group-data-[collapsible=icon]:block hidden"
                              style={{ background: "#dc2626", boxShadow: "0 0 0 2px #ffffff" }}
                            />
                          </>
                        )}
                        {item.title === "Inbox" && unreadSms > 0 && (
                          <>
                            <span
                              className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10px] font-medium group-data-[collapsible=icon]:hidden"
                              style={{ background: "#ecfdf5", color: "#10b981" }}
                            >
                              {unreadSms}
                            </span>
                            <span
                              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full md:group-data-[collapsible=icon]:block hidden"
                              style={{ background: "#10b981", boxShadow: "0 0 0 2px #ffffff" }}
                            />
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sign out + avatar at bottom */}
        <div className="mt-auto px-3 pb-4 flex flex-col items-center gap-3" style={{ borderTop: "0.5px solid #f5f5f5", paddingTop: 12 }}>
          <button
            type="button"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs w-full justify-center group-data-[collapsible=icon]:justify-center"
            style={{ color: "#111111" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#111"; e.currentTarget.style.background = "#f9f9f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#111111"; e.currentTarget.style.background = "transparent"; }}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
          </button>
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 30,
              height: 30,
              background: "#fff1ee",
              color: "#f4522d",
              fontSize: 11,
              fontWeight: 600,
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
