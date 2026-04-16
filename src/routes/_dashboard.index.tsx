import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Phone, FileText, Clock, Presentation, BarChart3, Settings, PhoneCall, Loader2, ChevronDown, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/_dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [
      { title: "Dashboard" },
      { name: "description", content: "Your dashboard overview." },
    ],
  }),
});

type SavedPhone = { name: string; phone: string };

const DEFAULT_PHONES: SavedPhone[] = [
  { name: "Peter Semrany", phone: "0418214953" },
];

function getStoredPhones(): SavedPhone[] {
  try {
    const stored = localStorage.getItem("saved_caller_phones");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_PHONES;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function DashboardHome() {
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [callsThisWeek, setCallsThisWeek] = useState<number | null>(null);
  const [contractsSent, setContractsSent] = useState<number | null>(null);
  const [pendingSignatures, setPendingSignatures] = useState<number | null>(null);
  const [stalePending, setStalePending] = useState<Array<{ clinic_name: string; email: string; created_at: string }>>([]);
  const [activity, setActivity] = useState<Array<{ icon: string; text: string; time: string; sortDate: string }>>([]);

  // Quick Dial state
  const [dialNumber, setDialNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [savedPhones, setSavedPhones] = useState<SavedPhone[]>(getStoredPhones);
  const [selectedPhoneIdx, setSelectedPhoneIdx] = useState(0);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const selectedPhone = savedPhones[selectedPhoneIdx] || savedPhones[0];

  const loadData = useCallback(async () => {
    // Total contacts
    const { count: contactCount } = await supabase.from("clients").select("*", { count: "exact", head: true });
    setTotalContacts(contactCount ?? 0);

    // Calls this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: callCount } = await supabase.from("call_records").select("*", { count: "exact", head: true }).gte("called_at", weekAgo);
    setCallsThisWeek(callCount ?? 0);

    // Contracts sent
    const { count: sentCount } = await supabase.from("contract_logs").select("*", { count: "exact", head: true });
    setContractsSent(sentCount ?? 0);

    // Pending signatures
    const { data: pendingData, count: pendCount } = await supabase.from("contract_logs").select("*", { count: "exact" }).eq("status", "sent");
    setPendingSignatures(pendCount ?? 0);

    // Stale pending (older than 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (pendingData) {
      setStalePending(pendingData.filter((r: any) => r.created_at < dayAgo).map((r: any) => ({
        clinic_name: r.clinic_name,
        email: r.email,
        created_at: r.created_at,
      })));
    }

    // Recent activity
    const activityItems: Array<{ icon: string; text: string; time: string; sortDate: string }> = [];

    // Call records with client names
    const { data: recentCalls } = await supabase.from("call_records").select("*, clients(name)").order("called_at", { ascending: false }).limit(8);
    if (recentCalls) {
      for (const c of recentCalls) {
        const clientName = (c as any).clients?.name || "Unknown";
        const dur = c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "No answer";
        activityItems.push({ icon: "📞", text: `Call to ${clientName} — ${dur}`, time: relativeTime(c.called_at), sortDate: c.called_at });
      }
    }

    // Error logs
    const { data: recentErrors } = await supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(8);
    if (recentErrors) {
      const fnLabels: Record<string, string> = {
        sendContractEmail: "Contract email",
        sendInvoiceEmail: "Invoice email",
        sendPaymentLinkSMS: "Payment SMS",
        initiateCall: "Phone call",
      };
      for (const e of recentErrors) {
        const label = fnLabels[e.function_name] || e.function_name;
        activityItems.push({ icon: "❌", text: `${label} failed`, time: relativeTime(e.created_at), sortDate: e.created_at });
      }
    }

    // Contract logs
    const { data: recentContracts } = await supabase.from("contract_logs").select("*").order("created_at", { ascending: false }).limit(8);
    if (recentContracts) {
      for (const c of recentContracts as any[]) {
        activityItems.push({ icon: "📄", text: `Contract sent to ${c.clinic_name}`, time: relativeTime(c.created_at), sortDate: c.created_at });
      }
    }

    // Sort by date desc, take 8
    activityItems.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
    setActivity(activityItems.slice(0, 8));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleQuickDial = async () => {
    if (!dialNumber || !selectedPhone || calling) return;
    setCalling(true);
    setCallMessage(null);
    try {
      const { data: result, error } = await supabase.functions.invoke("twilio-voice", {
        body: { clientPhone: dialNumber, userPhone: selectedPhone.phone },
      });
      if (error) throw error;
      if (result?.success) {
        setCallMessage("Calling your phone... answer within 20 seconds.");
        // Insert call record
        await supabase.from("call_records").insert({
          twilio_call_sid: result.callSid,
          status: "initiated",
        });
      } else {
        setCallMessage(result?.error || "Call failed");
      }
    } catch {
      setCallMessage("Call failed. Please try again.");
    } finally {
      setCalling(false);
    }
  };

  const stats = [
    { label: "Total Contacts", value: totalContacts, icon: Users, color: "text-primary" },
    { label: "Calls This Week", value: callsThisWeek, icon: Phone, color: "text-green-400" },
    { label: "Contracts Sent", value: contractsSent, icon: FileText, color: "text-blue-400" },
    { label: "Pending Signatures", value: pendingSignatures, icon: Clock, color: pendingSignatures && pendingSignatures > 0 ? "text-amber-400" : "text-muted-foreground" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          DASHBOARD
        </h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-5">
              <s.icon className={`h-5 w-5 ${s.color} mb-3`} />
              <div className="text-3xl font-black text-foreground">
                {s.value === null ? "—" : s.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Signatures Alert */}
      {stalePending.length > 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-200">
          <AlertDescription>
            <div className="mb-3 font-semibold">
              ⚠️ {stalePending.length} contract{stalePending.length > 1 ? "s are" : " is"} still awaiting signature — sent more than 24 hours ago.
            </div>
            <div className="space-y-2">
              {stalePending.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-amber-100">{p.clinic_name}</span>
                  <span className="text-amber-300/60 text-xs">{relativeTime(p.created_at)}</span>
                  <a
                    href={`mailto:${p.email}?subject=Following up on your Upper Hand agreement&body=Hi,%0D%0A%0D%0AJust following up on the agreement we sent through. Let me know if you have any questions.%0D%0A%0D%0ACheers,%0DPeter`}
                    className="ml-auto"
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 text-amber-200 hover:bg-amber-500/20">
                      Follow Up
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-foreground mb-4">Recent Activity</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {activity.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No recent activity</div>
              ) : (
                <div className="divide-y divide-border">
                  {activity.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="text-sm text-foreground flex-1 truncate">{item.text}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Dial */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Dial</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Call a clinic directly.</p>

              <div className="flex gap-2">
                <Input
                  placeholder="Phone number"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  className="flex-1 bg-input border-border"
                />
                <Button
                  onClick={handleQuickDial}
                  disabled={!dialNumber || calling}
                  className="bg-green-600 hover:bg-green-700 text-white px-4"
                >
                  {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                </Button>
              </div>

              {callMessage && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">{callMessage}</div>
              )}

              {/* Caller phone selector */}
              <div className="relative">
                <label className="text-xs text-muted-foreground mb-1 block">Call from</label>
                <button
                  onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                  className="w-full flex items-center justify-between bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground hover:border-muted-foreground/40 transition-colors"
                >
                  <span>{selectedPhone?.name} ({selectedPhone?.phone})</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {showPhoneDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg">
                    {savedPhones.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedPhoneIdx(idx); setShowPhoneDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${idx === selectedPhoneIdx ? "text-primary" : "text-foreground"}`}
                      >
                        {p.name} ({p.phone})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Pitch Deck", description: "Present to prospective clients", icon: Presentation, url: "/pitch-deck" as const },
            { title: "Analytics", description: "View campaign performance", icon: BarChart3, url: "/analytics" as const },
            { title: "Phone & Contacts", description: "Manage your client roster", icon: Phone, url: "/clients" as const },
            { title: "Settings", description: "Configure your account", icon: Settings, url: "/settings" as const },
          ].map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors group"
            >
              <item.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="text-foreground font-bold text-sm mb-0.5">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
