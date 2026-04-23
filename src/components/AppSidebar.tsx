import { Presentation, LayoutDashboard, Phone, BarChart3, AlertTriangle, Building2, Inbox, LogOut, Settings as SettingsIcon } from "lucide-react";
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
  { title: "Clinics", url: "/clinics", icon: Building2 },
  { title: "Pitch Deck", url: "/pitch-deck", icon: Presentation },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Phone & Contacts", url: "/clients", icon: Phone },
  { title: "Inbox", url: "/inbox", icon: Inbox },
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
                      <Link
                        to={item.url}
                        className="hover:!text-white relative"
                        onClick={() => { if (isMobile) setOpenMobile(false); }}
                      >
                        <item.icon className="h-4 w-4" style={{ color: active ? "#2D6BE4" : "#888" }} />
                        <span className="flex-1">{item.title}</span>
                        {item.title === "Logs" && unresolvedCount > 0 && (
                          <>
                            <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold group-data-[collapsible=icon]:hidden">
                              {unresolvedCount}
                            </span>
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 md:group-data-[collapsible=icon]:block hidden" style={{ boxShadow: "0 0 0 2px #0f0f12" }} />
                          </>
                        )}
                        {item.title === "Inbox" && unreadSms > 0 && (
                          <>
                            <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold group-data-[collapsible=icon]:hidden">
                              {unreadSms}
                            </span>
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 md:group-data-[collapsible=icon]:block hidden" style={{ boxShadow: "0 0 0 2px #0f0f12" }} />
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
        <div className="mt-auto px-3 pb-4 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 w-full justify-center group-data-[collapsible=icon]:justify-center"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
          </button>
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
