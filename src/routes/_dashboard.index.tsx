import { createFileRoute, Link } from "@tanstack/react-router";
import { Presentation, BarChart3, Users, Settings } from "lucide-react";

export const Route = createFileRoute("/_dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [
      { title: "Dashboard" },
      { name: "description", content: "Your dashboard overview." },
    ],
  }),
});

const quickLinks = [
  { title: "Pitch Deck", description: "Present to prospective clients", icon: Presentation, url: "/pitch-deck" as const },
  { title: "Analytics", description: "View campaign performance", icon: BarChart3, url: "/analytics" as const },
  { title: "Clients", description: "Manage your client roster", icon: Users, url: "/clients" as const },
  { title: "Settings", description: "Configure your account", icon: Settings, url: "/settings" as const },
];

function DashboardHome() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "var(--font-display)" }}>
        DASHBOARD
      </h1>
      <p className="text-muted-foreground mb-10">Welcome back. What would you like to do?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((item) => (
          <Link
            key={item.title}
            to={item.url}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors group"
          >
            <item.icon className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-foreground font-bold mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
