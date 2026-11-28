import { Scale, Briefcase, PhoneOutgoing, Landmark, Radio, SlidersHorizontal, Gauge, DollarSign, Presentation, LayoutDashboard, Phone, Building2, LogOut, Settings as SettingsIcon, Users, Headphones, Trophy, ChevronDown, Calendar, GraduationCap, FileAudio, Megaphone, ListTodo, KanbanSquare, RefreshCcw } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "@/hooks/useAuth";
import htgLogo from "@/assets/htg-logo.png";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

import type { TabKey } from "@/lib/tab-access";
import { useLegalMenu } from "@/legal/runtime/legal-menu";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; tab: TabKey };
type NavFolder = { title: string; items: NavItem[]; repIcon: NavItem["icon"]; repUrl: string };

const ALL_FOLDERS: NavFolder[] = [
  {
    title: "Workspace",
    repIcon: LayoutDashboard,
    repUrl: "/",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, tab: "dashboard" },
      { title: "Sales Call", url: "/sales-call", icon: Headphones, tab: "sales_portal" },
      { title: "Messages", url: "/inbox", icon: Phone, tab: "phone" },
      { title: "Appointments", url: "/booked-appointments", icon: Calendar, tab: "appointments" },
      { title: "To Do", url: "/todo", icon: ListTodo, tab: "todo" },
      { title: "Numbers", url: "/numbers", icon: DollarSign, tab: "numbers" },
    ],
  },
  {
    title: "Growth",
    repIcon: Megaphone,
    repUrl: "/crm",
    items: [
      { title: "CRM", url: "/crm", icon: KanbanSquare, tab: "clinics" },
      { title: "Meta Ads", url: "/meta-ads", icon: Megaphone, tab: "meta_ads" },
      { title: "Pitch Decks", url: "/pitch-deck", icon: Presentation, tab: "pitch_deck" },
    ],
  },
  {
    title: "Partners",
    repIcon: Building2,
    repUrl: "/partner-clinics",
    items: [
      { title: "Partner Portal", url: "/partner-clinics", icon: Building2, tab: "partner_clinics" },
      { title: "Reclassification", url: "/reclassifications", icon: RefreshCcw, tab: "partner_clinics" },
    ],
  },
  {
    title: "Sales Team",
    repIcon: Users,
    repUrl: "/leads",
    items: [
      { title: "Leads", url: "/leads", icon: Users, tab: "leads" },
      { title: "Leaderboard", url: "/leaderboard", icon: Trophy, tab: "leaderboard" },
      { title: "Recordings & Transcripts", url: "/my-recordings", icon: FileAudio, tab: "recordings" },
      { title: "Training", url: "/training", icon: GraduationCap, tab: "training" },
      { title: "Invoices", url: "/invoices", icon: DollarSign, tab: "invoices" },
    ],
  },
];

const LEGAL_ICONS: Record<string, NavItem["icon"]> = {
  "/legal/dashboard": Gauge,
  "/legal/firms": Briefcase,
  "/legal/firm-cold-calling": PhoneOutgoing,
  "/legal/firm-portal": Landmark,
  "/legal/ad-briefing": Radio,
  "/legal/settings": SlidersHorizontal,
};

const settingsItem = { title: "Settings", url: "/settings", icon: SettingsIcon };

function pathMatchesItem(pathname: string, url: string): boolean {
  return pathname === url || (url !== "/" && pathname.startsWith(`${url}/`));
}

function initialsFromName(name: string | null | undefined, fallbackEmail?: string | null): string {
  const cleaned = (name ?? "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const emailName = (fallbackEmail ?? "").split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (emailName) return initialsFromName(emailName);
  return "U";
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { isMobile, setOpenMobile } = useSidebar();
  const { signOut, role, user, allowedTabs } = useAuth();
  const { unreadSmsCount } = useNotifications();
  const unreadSms = unreadSmsCount;
  const [repName, setRepName] = useState<string | null>(null);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = [
    meta.first_name as string | undefined,
    meta.last_name as string | undefined,
  ].filter(Boolean).join(" ") || (meta.full_name as string | undefined) || null;
  const avatarInitials = initialsFromName(repName || metadataName, user?.email);

  useEffect(() => {
    const email = user?.email ?? null;
    if (!email) {
      setRepName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("first_name, last_name, name")
        .ilike("email", email)
        .maybeSingle();
      if (cancelled) return;
      const name = [data?.first_name, data?.last_name].filter(Boolean).join(" ") || data?.name || null;
      setRepName(name);
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  // Filter folders/items by the user's allowed tabs. Admins see everything;
  // clinic portal users / unknown roles get the empty default and see nothing here
  // (they're routed through their own portal anyway).
  const allowed = new Set<TabKey>(allowedTabs);
  const canSee = (tab: TabKey) => tab === "meta_ads" ? role === "admin" : role === "admin" || allowed.has(tab);
  const folders: NavFolder[] = ALL_FOLDERS
    .map((f) => ({
      ...f,
      items: f.items
        .filter((i) => canSee(i.tab) && !(role === "caller" && i.tab === "dashboard"))
        // Clinic setters only work the clinic list, so their CRM link opens it directly.
        .map((i) => (role === "caller" && i.url === "/crm" ? { ...i, url: "/clinics" } : i)),
    }))
    .filter((f) => f.items.length > 0);
  // Legal-only screens (shown after the Legal move is switched over), filtered
  // by the person's Legal role.
  const legalMenu = useLegalMenu();
  if (legalMenu.length)
    folders.push({
      title: "Legal",
      repIcon: Scale,
      repUrl: legalMenu[0]!.url,
      items: legalMenu.map((i) => ({ title: i.title, url: i.url, icon: LEGAL_ICONS[i.url] ?? Scale, tab: "dashboard" as TabKey })),
    });

  const isActive = (path: string) =>
    pathMatchesItem(currentPath, path) || (path === "/crm" && pathMatchesItem(currentPath, "/clinics"));

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([...ALL_FOLDERS.map((folder) => [folder.title, true]), ["Legal", true]]),
  );

  useEffect(() => {
    setOpenFolders((prev) => {
      const activeFolder = ALL_FOLDERS.find((folder) => folder.items.some((item) => pathMatchesItem(currentPath, item.url)));
      if (!activeFolder || prev[activeFolder.title]) return prev;
      return { ...prev, [activeFolder.title]: true };
    });
  }, [currentPath]);

  // unread SMS count now comes from the global NotificationsProvider.

  const renderItem = (item: NavItem) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
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
            aria-current={active ? "page" : undefined}
            onClick={() => { if (isMobile) setOpenMobile(false); }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
            style={{ cursor: "pointer", transition: "background 0.15s ease" }}
          >
            <item.icon className="h-4 w-4" style={{ color: active ? "#f4522d" : "#111111" }} />
            <span className="flex-1">{item.title}</span>
            {item.tab === "phone" && unreadSms > 0 && (
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
            <img
              src={htgLogo}
              alt="Hair Transplant Group"
              className="flex-shrink-0 rounded-md object-cover"
              style={{ width: 26, height: 26 }}
            />
            <span
              className="group-data-[collapsible=icon]:hidden"
              style={{ fontSize: 13, fontWeight: 500, color: "#111", letterSpacing: "-0.01em" }}
            >
              Upper Hand Portal
              <span className="block" style={{ fontSize: 11, fontWeight: 400, color: "#8a8a86" }}>Hair Transplants · Legal</span>
            </span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="space-y-3 pb-2 group-data-[collapsible=icon]:space-y-0">
          {folders.map((folder) => {
            const open = openFolders[folder.title];
            const activeItem = folder.items.find((item) => isActive(item.url));
            const representative = activeItem ?? folder.items.find((item) => item.url === folder.repUrl) ?? folder.items[0];
            const folderId = `sidebar-folder-${folder.title.toLowerCase().replaceAll(" ", "-")}`;

            return (
              <SidebarGroup key={folder.title} className="py-0">
                <SidebarGroupLabel asChild className="mb-1 group-data-[collapsible=icon]:hidden">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={folderId}
                    onClick={() => setOpenFolders((previous) => ({ ...previous, [folder.title]: !previous[folder.title] }))}
                    className="cursor-pointer hover:bg-neutral-50"
                    style={{ color: "#777777", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
                  >
                    <span className="flex-1 text-left">{folder.title}</span>
                    <ChevronDown
                      aria-hidden="true"
                      style={{ width: 13, height: 13, transition: "transform 0.15s ease", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
                    />
                  </button>
                </SidebarGroupLabel>
                <SidebarGroupContent id={folderId} hidden={!open} className="group-data-[collapsible=icon]:hidden">
                  <SidebarMenu>
                    {folder.items.map((item) => renderItem(item))}
                  </SidebarMenu>
                </SidebarGroupContent>
                <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
                  {renderItem({ ...representative, title: folder.title, icon: folder.repIcon })}
                </SidebarMenu>
              </SidebarGroup>
            );
          })}
        </nav>

        {/* Settings (icon only) + Sign out + avatar at bottom */}
        <div className="mt-auto px-3 pb-4 flex flex-col items-center gap-2" style={{ borderTop: "0.5px solid #f5f5f5", paddingTop: 10 }}>
          {role !== "caller" && (() => {
            const active = isActive(settingsItem.url);
            return (
              <Link
                to={settingsItem.url}
                onClick={() => { if (isMobile) setOpenMobile(false); }}
                aria-label="Settings"
                title="Settings"
                className="flex items-center justify-center rounded-md"
                style={{
                  width: 32,
                  height: 32,
                  background: active ? "#fff1ee" : "transparent",
                  color: active ? "#f4522d" : "#111111",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <SettingsIcon className="h-4 w-4" style={{ color: active ? "#f4522d" : "#111111" }} />
              </Link>
            );
          })()}
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
            {avatarInitials}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
