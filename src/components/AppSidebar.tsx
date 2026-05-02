import { Presentation, LayoutDashboard, Phone, Building2, LogOut, Settings as SettingsIcon, Send, Users, Headphones, Trophy, ChevronDown } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> };
type NavFolder = { title: string; items: NavItem[]; repIcon: NavItem["icon"]; repUrl: string };

const topItem: NavItem = { title: "Dashboard", url: "/", icon: LayoutDashboard };

const folders: NavFolder[] = [
  {
    title: "Sales",
    repIcon: Headphones,
    repUrl: "/sales-call",
    items: [
      { title: "Sales Portal", url: "/sales-call", icon: Headphones },
      { title: "Partner Clinics", url: "/partner-clinics", icon: Building2 },
      { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
      { title: "Leads", url: "/leads", icon: Users },
    ],
  },
  {
    title: "Clinic Acquisition",
    repIcon: Presentation,
    repUrl: "/pitch-deck",
    items: [
      { title: "Pitch Deck", url: "/pitch-deck", icon: Presentation },
      { title: "Clinics", url: "/clinics", icon: Building2 },
      { title: "Sent Links", url: "/sent-links", icon: Send },
    ],
  },
];

const bottomItems: NavItem[] = [
  { title: "Phone", url: "/inbox", icon: Phone },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [unreadSms, setUnreadSms] = useState(0);
  const { isMobile, setOpenMobile } = useSidebar();
  const { signOut } = useAuth();

  const isActive = (path: string) => currentPath === path;

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const f of folders) {
      init[f.title] = f.items.some((i) => i.url === currentPath);
    }
    return init;
  });

  useEffect(() => {
    setOpenFolders((prev) => {
      const next = { ...prev };
      for (const f of folders) {
        if (f.items.some((i) => i.url === currentPath)) next[f.title] = true;
      }
      return next;
    });
  }, [currentPath]);

  useEffect(() => {
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
      void supabase.removeChannel(ch);
    };
  }, []);

  const renderItem = (item: NavItem, indent = false) => {
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
            cursor: "pointer",
          }}
        >
          <Link
            to={item.url}
            className="relative"
            onClick={() => { if (isMobile) setOpenMobile(false); }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
            style={{ cursor: "pointer", transition: "background 0.15s ease", paddingLeft: indent ? 24 : undefined }}
          >
            <item.icon className="h-4 w-4" style={{ color: active ? "#f4522d" : "#111111" }} />
            <span className="flex-1">{item.title}</span>
            {item.title === "Phone" && unreadSms > 0 && (
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
  };

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
              {renderItem(topItem)}

              {folders.map((folder) => {
                const open = openFolders[folder.title];
                const folderActive = folder.items.some((i) => isActive(i.url));
                return (
                  <div key={folder.title}>
                    {/* Expanded: folder header (clickable to toggle) */}
                    <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                      <SidebarMenuButton
                        className="!rounded-none"
                        onClick={() => setOpenFolders((p) => ({ ...p, [folder.title]: !p[folder.title] }))}
                        style={{
                          background: "transparent",
                          color: "#6b6b6b",
                          fontSize: 11,
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          height: 32,
                          cursor: "pointer",
                        }}
                      >
                        <span className="flex-1 text-left">{folder.title}</span>
                        <ChevronDown
                          className="h-3.5 w-3.5"
                          style={{
                            transition: "transform 0.15s ease",
                            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                            color: "#6b6b6b",
                          }}
                        />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {/* Expanded: child items (only when folder open) */}
                    <div className="group-data-[collapsible=icon]:hidden">
                      {open && folder.items.map((item) => renderItem(item, true))}
                    </div>
                    {/* Collapsed: single representative icon for the whole folder */}
                    <div className="hidden group-data-[collapsible=icon]:block">
                      {renderItem({ title: folder.title, url: folder.repUrl, icon: folder.repIcon }, false, folderActive)}
                    </div>
                  </div>
                );
              })}

              {bottomItems.map((item) => renderItem(item))}
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
