// Per-user tab access. Tab keys match the sidebar items.

export type TabKey =
  | "meta_ads"
  | "invoices"
  | "dashboard"
  | "training"
  | "partner_clinics"
  | "sales_portal"
  | "leaderboard"
  | "appointments"
  | "leads"
  | "analytics"
  | "numbers"
  | "numbers_game"
  | "phone"
  | "pitch_deck"
  | "clinics"
  | "sent_links"
  | "chase_queue"
  | "recordings"
  | "sales_test_leads"
  | "todo";

export const ALL_TAB_KEYS: TabKey[] = [
  "meta_ads",
  "dashboard",
  "training",
  "partner_clinics",
  "sales_portal",
  "leaderboard",
  "appointments",
  "leads",
  "analytics",
  "numbers",
  "numbers_game",
  "phone",
  "pitch_deck",
  "clinics",
  "sent_links",
  "chase_queue",
  "recordings",
  "sales_test_leads",
  "invoices",
  "todo",
];

export const TAB_LABELS: Record<TabKey, string> = {
  meta_ads: "Meta Ads",
  invoices: "Invoices",
  dashboard: "Dashboard",
  training: "Training",
  partner_clinics: "Partner Portal",
  sales_portal: "Sales Portal",
  leaderboard: "Leaderboard",
  appointments: "Appointments",
  leads: "Leads",
  analytics: "Analytics",
  numbers: "Numbers",
  numbers_game: "Numbers Game",
  phone: "Messages",
  pitch_deck: "Pitch Deck",
  clinics: "CRM",
  sent_links: "Sent Links",
  chase_queue: "Chase Queue",
  recordings: "Recordings & Transcripts",
  sales_test_leads: "Clinic Meta Leads",
  todo: "To Do",
};

export const TAB_GROUPS: { title: string; tabs: TabKey[] }[] = [
  { title: "General", tabs: ["dashboard", "training", "partner_clinics"] },
  { title: "Sales", tabs: ["sales_portal", "leaderboard", "appointments", "leads", "analytics", "numbers", "numbers_game", "phone", "todo", "chase_queue", "recordings", "invoices"] },
  { title: "Clinic Acquisition", tabs: ["pitch_deck", "clinics", "sent_links", "sales_test_leads"] },
];

export const TAB_TO_URL: Record<TabKey, string> = {
  meta_ads: "/meta-ads",
  invoices: "/invoices",
  dashboard: "/",
  training: "/training",
  partner_clinics: "/partner-clinics",
  sales_portal: "/sales-call",
  leaderboard: "/leaderboard",
  appointments: "/booked-appointments",
  leads: "/leads",
  analytics: "/analytics",
  numbers: "/numbers",
  numbers_game: "/numbers-game",
  phone: "/inbox",
  pitch_deck: "/pitch-deck",
  clinics: "/clinics",
  sent_links: "/sent-links",
  chase_queue: "/chase-queue",
  recordings: "/my-recordings",
  sales_test_leads: "/sales-test-leads",
  todo: "/todo",
};

export type RoleKey = "admin" | "rep" | "caller";

// Defaults applied when a user has no explicit allowed_tabs set.
// Admins always get everything, regardless.
export function defaultTabsForRole(role: RoleKey): TabKey[] {
  if (role === "admin") return [...ALL_TAB_KEYS];
  if (role === "caller") return ["clinics", "phone"];
  // rep
  return ["dashboard", "training", "sales_portal", "appointments", "phone", "todo", "chase_queue", "recordings", "invoices"];
}

// Resolve effective tabs given the role and optional override.
export function resolveAllowedTabs(role: RoleKey, override: string[] | null | undefined): TabKey[] {
  if (role === "admin") return [...ALL_TAB_KEYS];
  if (!override || override.length === 0) return defaultTabsForRole(role);
  const set = new Set(override.filter((t): t is TabKey => (ALL_TAB_KEYS as string[]).includes(t)));
  // To Do replaced the Chase Queue: anyone who had the Chase Queue keeps the same access.
  if (set.has("chase_queue")) set.add("todo");
  return ALL_TAB_KEYS.filter((t) => set.has(t) && !(role === "rep" && t === "partner_clinics"));
}

export function isTabAllowed(tabs: TabKey[], tab: TabKey): boolean {
  return tabs.includes(tab);
}
