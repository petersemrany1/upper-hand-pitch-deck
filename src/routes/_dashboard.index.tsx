import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Phone, FileText, Clock, PhoneCall, Loader2, ChevronDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type ActivityItem = { color: string; text: string; time: string; sortDate: string };

function DashboardHome() {
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [callsThisWeek, setCallsThisWeek] = useState<number | null>(null);
  const [contractsSent, setContractsSent] = useState<number | null>(null);
  const [pendingSignatures, setPendingSignatures] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<Array<{ name: string; time: string; duration: string }>>([]);

  // Quick Dial state
  const [dialNumber, setDialNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [savedPhones, setSavedPhones] = useState<SavedPhone[]>(getStoredPhones);
  const [selectedPhoneIdx, setSelectedPhoneIdx] = useState(0);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const selectedPhone = savedPhones[selectedPhoneIdx] || savedPhones[0];

  const loadData = useCallback(async () => {
    const { count: contactCount } = await supabase.from("clients").select("*", { count: "exact", head: true });
    setTotalContacts(contactCount ?? 0);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: callCount } = await supabase.from("call_records").select("*", { count: "exact", head: true }).gte("called_at", weekAgo);
    setCallsThisWeek(callCount ?? 0);

    const { count: sentCount } = await supabase.from("contract_logs").select("*", { count: "exact", head: true });
    setContractsSent(sentCount ?? 0);

    const { count: pendCount } = await supabase.from("contract_logs").select("*", { count: "exact", head: true }).eq("status", "sent");
    setPendingSignatures(pendCount ?? 0);

    // Recent activity
    const activityItems: ActivityItem[] = [];

    const { data: callData } = await supabase.from("call_records").select("*, clients(name)").order("called_at", { ascending: false }).limit(8);
    if (callData) {
      for (const c of callData) {
        const clientName = (c as any).clients?.name || "Unknown";
        const dur = c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "No answer";
        activityItems.push({ color: "#22c55e", text: `Call to ${clientName} — ${dur}`, time: relativeTime(c.called_at), sortDate: c.called_at });
      }
    }

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
        activityItems.push({ color: "#ef4444", text: `${label} failed`, time: relativeTime(e.created_at), sortDate: e.created_at });
      }
    }

    const { data: recentContracts } = await supabase.from("contract_logs").select("*").order("created_at", { ascending: false }).limit(8);
    if (recentContracts) {
      for (const c of recentContracts as any[]) {
        activityItems.push({ color: "#2D6BE4", text: `Contract sent to ${c.clinic_name}`, time: relativeTime(c.created_at), sortDate: c.created_at });
      }
    }

    activityItems.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
    setActivity(activityItems.slice(0, 12));

    // Recent calls for quick dial history
    if (callData) {
      setRecentCalls(
        callData.slice(0, 3).map((c) => ({
          name: (c as any).clients?.name || "Unknown",
          time: relativeTime(c.called_at),
          duration: c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}` : "—",
        }))
      );
    }
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
        setCallMessage("Calling your phone...");
        await supabase.from("call_records").insert({
          twilio_call_sid: result.callSid,
          status: "initiated",
        });
      } else {
        setCallMessage(result?.error || "Call failed");
      }
    } catch {
      setCallMessage("Call failed. Try again.");
    } finally {
      setCalling(false);
    }
  };

  const stats = [
    {
      label: "TOTAL CONTACTS",
      value: totalContacts,
      icon: Users,
      gradient: "linear-gradient(135deg, #0f1629 0%, #0d0d0d 100%)",
      borderColor: "#2D6BE4",
      iconColor: "#2D6BE4",
    },
    {
      label: "CALLS THIS WEEK",
      value: callsThisWeek,
      icon: Phone,
      gradient: "linear-gradient(135deg, #0a1f0f 0%, #0d0d0d 100%)",
      borderColor: "#22c55e",
      iconColor: "#22c55e",
    },
    {
      label: "CONTRACTS SENT",
      value: contractsSent,
      icon: FileText,
      gradient: "linear-gradient(135deg, #1a0f29 0%, #0d0d0d 100%)",
      borderColor: "#a855f7",
      iconColor: "#a855f7",
    },
    {
      label: "PENDING SIGNATURES",
      value: pendingSignatures,
      icon: Clock,
      gradient: "linear-gradient(135deg, #1f1500 0%, #0d0d0d 100%)",
      borderColor: "#f59e0b",
      iconColor: "#f59e0b",
    },
  ];

  return (
    <div
      className="h-full overflow-hidden p-4 gap-3"
      style={{
        display: "grid",
        gridTemplateRows: "48px 1fr 1fr",
        gridTemplateColumns: "1fr 1fr 1fr 280px",
        background: "#09090b",
      }}
    >
      {/* Header strip */}
      <div
        className="col-span-4 flex items-center justify-between px-4"
        style={{ borderBottom: "1px solid #1a1a1a" }}
      >
        <div className="flex items-center gap-1">
          <span style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "0.02em" }}>UPPER</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#2D6BE4", letterSpacing: "0.02em" }}>HAND</span>
        </div>
        <span style={{ fontSize: 16, color: "#fff" }}>
          {getGreeting()}, <span style={{ fontWeight: 600 }}>Peter</span>
        </span>
        <div className="flex items-center gap-4">
          <span style={{ fontSize: 12, color: "#555" }}>{formatDate()}</span>
          <Bell className="w-4 h-4" style={{ color: "#555" }} />
        </div>
      </div>

      {/* Stat cards — 2x2 grid in left 3 cols, middle row */}
      <div
        className="col-span-3 grid grid-cols-2 grid-rows-2 gap-3"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg relative overflow-hidden flex flex-col justify-center px-5"
            style={{
              background: s.gradient,
              borderLeft: `3px solid ${s.borderColor}`,
              border: `1px solid #1f1f23`,
              borderLeft: `3px solid ${s.borderColor}`,
            }}
          >
            <s.icon
              className="absolute top-3 right-3 w-4 h-4"
              style={{ color: s.iconColor, opacity: 0.7 }}
            />
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
                lineHeight: 1,
              }}
            >
              {s.value === null ? "—" : s.value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#666",
                letterSpacing: "0.15em",
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Dial — right column, spans both middle + bottom rows */}
      <div
        className="row-span-2 rounded-lg flex flex-col overflow-hidden"
        style={{
          background: "#0f0f12",
          borderLeft: "3px solid #2D6BE4",
          border: "1px solid #1f1f23",
          borderLeft: "3px solid #2D6BE4",
        }}
      >
        <div className="px-4 pt-4 pb-3">
          <div
            style={{
              fontSize: 10,
              color: "#2D6BE4",
              letterSpacing: "0.2em",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            QUICK DIAL
          </div>
          <p style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>Call a clinic directly</p>

          <Input
            placeholder="Phone number"
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            className="mb-2 border-0 text-sm"
            style={{ background: "#1a1a1a", color: "#fff", height: 38 }}
          />

          <Button
            onClick={handleQuickDial}
            disabled={!dialNumber || calling}
            className="w-full border-0 text-white font-semibold text-sm"
            style={{ background: "#22c55e", height: 48 }}
          >
            {calling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <PhoneCall className="h-4 w-4 mr-2" />
                Call Now
              </>
            )}
          </Button>

          {callMessage && (
            <div className="mt-2 rounded px-3 py-2" style={{ fontSize: 11, color: "#999", background: "#1a1a1a" }}>
              {callMessage}
            </div>
          )}

          {/* Caller selector */}
          <div className="relative mt-3">
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 4 }}>CALL FROM</div>
            <button
              onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
              className="w-full flex items-center justify-between rounded px-3 py-2 text-xs"
              style={{ background: "#1a1a1a", color: "#999", border: "1px solid #1f1f23" }}
            >
              <span>{selectedPhone?.name}</span>
              <ChevronDown className="h-3 w-3" style={{ color: "#555" }} />
            </button>
            {showPhoneDropdown && (
              <div
                className="absolute z-10 mt-1 w-full rounded shadow-lg"
                style={{ background: "#151518", border: "1px solid #1f1f23" }}
              >
                {savedPhones.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedPhoneIdx(idx); setShowPhoneDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/5"
                    style={{ color: idx === selectedPhoneIdx ? "#2D6BE4" : "#999" }}
                  >
                    {p.name} ({p.phone})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent calls mini history */}
        <div className="mt-auto px-4 pb-4">
          <div
            style={{
              fontSize: 10,
              color: "#555",
              letterSpacing: "0.15em",
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            RECENT CALLS
          </div>
          {recentCalls.length === 0 ? (
            <div style={{ fontSize: 11, color: "#333" }}>No recent calls</div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((c, i) => (
                <div key={i} className="flex items-center justify-between" style={{ fontSize: 11 }}>
                  <span style={{ color: "#999" }}>{c.name}</span>
                  <span style={{ color: "#333" }}>{c.duration} · {c.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity feed — bottom left 3 cols */}
      <div
        className="col-span-3 rounded-lg flex flex-col overflow-hidden"
        style={{ background: "transparent" }}
      >
        <div className="px-4 pt-3 pb-2">
          <span
            style={{
              fontSize: 10,
              color: "#2D6BE4",
              letterSpacing: "0.2em",
              fontWeight: 600,
            }}
          >
            ACTIVITY
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ minHeight: 0 }}>
          {activity.length === 0 ? (
            <div style={{ fontSize: 12, color: "#333", padding: "16px 0" }}>No recent activity</div>
          ) : (
            activity.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{ height: 36 }}
              >
                <span
                  className="rounded-full shrink-0"
                  style={{ width: 6, height: 6, background: item.color }}
                />
                <span className="flex-1 truncate" style={{ fontSize: 13, color: "#fff" }}>
                  {item.text}
                </span>
                <span className="shrink-0" style={{ fontSize: 11, color: "#555" }}>
                  {item.time}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
