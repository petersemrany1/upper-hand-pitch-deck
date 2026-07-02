import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  FileWarning,
  Inbox,
  LayoutDashboard,
  PhoneCall,
  Settings,
  Trophy,
  User,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

/**
 * ⌘K command palette: jump between screens and find a lead by name or
 * phone from anywhere in the dashboard. Selecting a lead deep-links into
 * the sales-call portal (?leadId=…).
 */

type LeadHit = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string | null;
};

const NAV: { label: string; to: string; icon: typeof Inbox }[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Sales Call Portal", to: "/sales-call", icon: PhoneCall },
  { label: "Leads", to: "/leads", icon: Users },
  { label: "Inbox", to: "/inbox", icon: Inbox },
  { label: "Booked Appointments", to: "/booked-appointments", icon: CalendarCheck },
  { label: "Partner Clinics", to: "/partner-clinics", icon: Building2 },
  { label: "Leaderboard", to: "/leaderboard", icon: Trophy },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Error Logs", to: "/logs", icon: FileWarning },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LeadHit[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced lead search by name or phone.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(async () => {
      const digits = q.replace(/\D/g, "");
      let builder = supabase
        .from("meta_leads")
        .select("id, first_name, last_name, phone, status")
        .limit(8);
      builder = digits.length >= 4
        ? builder.ilike("phone", `%${digits}%`)
        : builder.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
      const { data } = await builder;
      setHits((data as LeadHit[]) ?? []);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, open]);

  const go = (to: string, search?: Record<string, string>) => {
    setOpen(false);
    setQuery("");
    void navigate({ to, search: search as never });
  };

  const navItems = useMemo(() => NAV, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search leads by name or phone, or jump to a screen…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {hits.length > 0 && (
          <>
            <CommandGroup heading="Leads">
              {hits.map((l) => {
                const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unnamed lead";
                return (
                  <CommandItem
                    key={l.id}
                    value={`lead-${l.id} ${name} ${l.phone ?? ""}`}
                    onSelect={() => go("/sales-call", { leadId: l.id })}
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{name}</span>
                    {l.phone ? <span className="ml-2 text-xs text-muted-foreground">{l.phone}</span> : null}
                    {l.status ? <span className="ml-auto text-[10px] uppercase text-muted-foreground">{l.status}</span> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Go to">
          {navItems.map((n) => (
            <CommandItem key={n.to} value={`nav ${n.label}`} onSelect={() => go(n.to)}>
              <n.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
