// Per-user tab access. Tab keys match the sidebar items.

export type TabKey =
  | "dashboard"
  | "training"
  | "partner_clinics"
  | "sales_portal"
  | "leaderboard"
  | "appointments"
  | "leads"
  | "analytics"
  | "phone"
  | "pitch_deck"
  | "clinics"
  | "sent_links"
  | "chase_queue"
  | "clinic_leads"
  | "sales_test_leads";

export const ALL_TAB_KEYS: TabKey[] = [
  "dashboard",
  "training",
  "partner_clinics",
  "sales_portal",
  "leaderboard",
  "appointments",
  "leads",
  "analytics",
  "phone",
  "pitch_deck",
  "clinics",
  "sent_links",
  "chase_queue",
  "clinic_leads",
  "sales_test_leads",
];

export const TAB_LABELS: Record<TabKey, string> = {
  dashboard: "Dashboard",
  training: "Training",
  partner_clinics: "Partner Clinics",
  sales_portal: "Sales Portal",
  leaderboard: "Leaderboard",
  appointments: "Appointments",
  leads: "Leads",
  analytics: "Analytics",
  phone: "Phone",
  pitch_deck: "Pitch Deck",
  clinics: "Clinics",
  sent_links: "Sent Links",
  chase_queue: "Chase Queue",
  clinic_leads: "Clinic Leads",
  sales_test_leads: "Sales Test Leads",
};

export const TAB_GROUPS: { title: string; tabs: TabKey[] }[] = [
  { title: "General", tabs: ["dashboard", "training", "partner_clinics"] },
  { title: "Sales", tabs: ["sales_portal", "leaderboard", "appointments", "leads", "analytics", "phone", "chase_queue"] },
  { title: "Clinic Acquisition", tabs: ["pitch_deck", "clinics", "sent_links", "clinic_leads"] },
  { title: "Sales Test", tabs: ["sales_test_leads"] },
];

export const TAB_TO_URL: Record<TabKey, string> = {
  dashboard: "/",
  training: "/training",
  partner_clinics: "/partner-clinics",
  sales_portal: "/sales-call",
  leaderboard: "/leaderboard",
  appointments: "/booked-appointments",
  leads: "/leads",
  analytics: "/analytics",
  phone: "/inbox",
  pitch_deck: "/pitch-deck",
  clinics: "/clinics",
  sent_links: "/sent-links",
  chase_queue: "/chase-queue",
  clinic_leads: "/clinic-leads",
  sales_test_leads: "/sales-test-leads",
};

export type RoleKey = "admin" | "rep" | "caller";

// Defaults applied when a user has no explicit allowed_tabs set.
// Admins always get everything, regardless.
export function defaultTabsForRole(role: RoleKey): TabKey[] {
  if (role === "admin") return [...ALL_TAB_KEYS];
  if (role === "caller") return ["clinics", "phone"];
  // rep
  return ["dashboard", "training", "sales_portal", "phone", "chase_queue"];
}

// Resolve effective tabs given the role and optional override.
export function resolveAllowedTabs(role: RoleKey, override: string[] | null | undefined): TabKey[] {
  if (role === "admin") return [...ALL_TAB_KEYS];
  if (!override || override.length === 0) return defaultTabsForRole(role);
  const set = new Set(override.filter((t): t is TabKey => (ALL_TAB_KEYS as string[]).includes(t)));
  return ALL_TAB_KEYS.filter((t) => set.has(t));
}

export function isTabAllowed(tabs: TabKey[], tab: TabKey): boolean {
  return tabs.includes(tab);
}
