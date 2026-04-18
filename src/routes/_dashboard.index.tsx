import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Phone, FileText, PhoneCall, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

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
type ActivityItem = { color: string; text: string; time: string; sortDate: string };

const DEFAULT_PHONES: SavedPhone[] = [{ name: "Peter Semrany", phone: "0418214953" }];

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

function DashboardHome() {
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [callsThisWeek, setCallsThisWeek] = useState<number | null>(null);
  const [contractsSent, setContractsSent] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<Array<{ name: string; time: string; duration: string }>>([]);

  const [dialNumber, setDialNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [savedPhones] = useState<SavedPhone[]>(getStoredPhones);
  const [selectedPhoneIdx, setSelectedPhoneIdx] = useState(0);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const selectedPhone = savedPhones[selectedPhoneIdx] || savedPhones[0];

  const {
    status: deviceStatus,
    dialerStatus,
    error: dialerError,
    call: placeCall,
    hangup,
    retry,
  } = useTwilioDevice();

  const dialerStateLabel =
    dialerStatus === "ready" ? "Ready" : dialerStatus === "failed" ? "Failed" : "Connecting";
  const dialerStateColor =
    dialerStatus === "ready" ? "#22c55e" : dialerStatus === "failed" ? "#ef4444" : "#f59e0b";
  const isCallActive = deviceStatus === "in-call" || deviceStatus === "connecting";

  const loadData = useCallback(async () => {
    const [
      { count: contactCount },
      { count: callCount },
      { count: sentCount },
      { data: callData },
      { data: recentContracts },
    ] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase
        .from("call_records")
        .select("*", { count: "exact", head: true })
        .gte("called_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("contract_logs").select("*", { count: "exact", head: true }),
      supabase.from("call_records").select("*, clients(name)").order("called_at", { ascending: false }).limit(8),
      supabase.from("contract_logs").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

    setTotalContacts(contactCount ?? 0);
    setCallsThisWeek(callCount ?? 0);
    setContractsSent(sentCount ?? 0);

    const activityItems: ActivityItem[] = [];

    if (callData) {
      for (const c of callData) {
        activityItems.push({
          color: "#22c55e",
          text: `Call ${c.status || "updated"}${(c as { clients?: { name?: string } | null }).clients?.name ? ` with ${(c as { clients?: { name?: string } | null }).clients?.name}` : ""}`,
          time: relativeTime(c.called_at),
          sortDate: c.called_at,
        });
      }

      setRecentCalls(
        callData.slice(0, 3).map((c) => ({
          name: (c as { clients?: { name?: string } | null }).clients?.name || "Unknown",
          time: relativeTime(c.called_at),
          duration: c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}` : "—",
        }))
      );
    }

    if (recentContracts) {
      for (const c of recentContracts as Array<{ clinic_name: string; created_at: string }>) {
        activityItems.push({
          color: "#2D6BE4",
          text: `Contract sent to ${c.clinic_name}`,
          time: relativeTime(c.created_at),
          sortDate: c.created_at,
        });
      }
    }

    activityItems.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
    setActivity(activityItems.slice(0, 12));
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleQuickDial = async () => {
    if (!dialNumber || calling) return;

    if (isCallActive) {
      hangup();
      setCallMessage("Call ended.");
      return;
    }

    if (dialerStatus === "failed") {
      setCallMessage("Connection failed — click to retry");
      return;
    }

    if (dialerStatus !== "ready") {
      setCallMessage("Dialer is connecting...");
      return;
    }

    setCalling(true);
    setCallMessage(null);
    try {
      await placeCall(dialNumber);
      setCallMessage("Calling your phone… answer it to be connected to the clinic.");
    } catch (err) {
      setCallMessage(err instanceof Error ? err.message : "Call failed. Try again.");
    } finally {
      setCalling(false);
    }
  };

  useEffect(() => {
    if (deviceStatus === "in-call") {
      setCallMessage("Connected — you're on the call with the clinic.");
    }
  }, [deviceStatus]);

  useEffect(() => {
    if (dialerStatus === "failed") {
      setCallMessage(dialerError || "Connection failed — click to retry");
    }
  }, [dialerError, dialerStatus]);

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
  ];

  return (
    <div
      className="h-full overflow-hidden p-4 gap-3"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridTemplateRows: "48px 1fr 1fr",
      }}
    >
      <div
        className="col-span-4 rounded-lg flex items-center justify-between px-4"
        style={{ background: "#0f0f12", border: "1px solid #1f1f23" }}
      >
        <div>
          <div style={{ fontSize: 18, color: "#fff", fontWeight: 600 }}>{getGreeting()}, Peter</div>
          <div style={{ fontSize: 11, color: "#666" }}>{formatDate()}</div>
        </div>
      </div>

      <div className="col-span-3 grid grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-lg p-4"
              style={{
                background: s.gradient,
                border: `1px solid ${s.borderColor}33`,
                borderLeft: `3px solid ${s.borderColor}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div style={{ fontSize: 28, color: "#fff", fontWeight: 700, lineHeight: 1.1 }}>
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
                <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
              </div>
            </div>
          );
        })}

        <div className="col-span-3 rounded-lg flex flex-col overflow-hidden" style={{ background: "transparent" }}>
          <div className="px-4 pt-3 pb-2 flex items-center gap-4">
            <span style={{ fontSize: 10, color: "#2D6BE4", letterSpacing: "0.2em", fontWeight: 600 }}>ACTIVITY</span>
            <span
              style={{
                fontSize: 10,
                color: "#f59e0b",
                letterSpacing: "0.2em",
                fontWeight: 600,
                marginLeft: "auto",
              }}
            >
              FOLLOW UPS DUE
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ minHeight: 0 }}>
            <FollowUpsDue />
            {activity.length === 0 ? (
              <div style={{ fontSize: 12, color: "#333", padding: "16px 0" }}>No recent activity</div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="flex items-center gap-3" style={{ height: 36 }}>
                  <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: item.color }} />
                  <span className="flex-1 truncate" style={{ fontSize: 13, color: "#fff" }}>{item.text}</span>
                  <span className="shrink-0" style={{ fontSize: 11, color: "#555" }}>{item.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div
        className="row-span-2 rounded-lg flex flex-col overflow-hidden"
        style={{
          background: "#0f0f12",
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

          <div
            className="mb-3 rounded px-3 py-2 flex items-center justify-between gap-3"
            style={{
              background: "#151518",
              border: `1px solid ${dialerStateColor}33`,
            }}
          >
            <div>
              <div className="flex items-center gap-2" style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
                <span className="rounded-full" style={{ width: 8, height: 8, background: dialerStateColor }} />
                {dialerStateLabel}
              </div>
              <div style={{ fontSize: 10, color: dialerStatus === "failed" ? "#fca5a5" : "#777", marginTop: 4 }}>
                {dialerStatus === "failed"
                  ? "Connection failed — click to retry"
                  : dialerStatus === "ready"
                    ? "Dialler ready"
                    : "Connecting to Twilio..."}
              </div>
            </div>
            {dialerStatus === "failed" && (
              <Button
                type="button"
                onClick={() => {
                  setCallMessage(null);
                  retry();
                }}
                className="border-0 text-white text-xs px-3"
                style={{ background: "#ef4444", height: 32 }}
              >
                Retry
              </Button>
            )}
          </div>

          <Input
            placeholder="Phone number"
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            className="mb-2 border-0 text-sm"
            style={{ background: "#1a1a1a", color: "#fff", height: 38 }}
          />

          <Button
            onClick={handleQuickDial}
            disabled={!dialNumber || calling || (dialerStatus === "connecting" && !isCallActive)}
            className="w-full border-0 text-white font-semibold text-sm"
            style={{ background: isCallActive ? "#ef4444" : "#22c55e", height: 48 }}
          >
            {calling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCallActive ? (
              <>
                <PhoneCall className="h-4 w-4 mr-2" />
                Hang Up
              </>
            ) : (
              <>
                <PhoneCall className="h-4 w-4 mr-2" />
                Call Now
              </>
            )}
          </Button>

          {callMessage && (
            <div
              className="mt-2 rounded px-3 py-2"
              style={{
                fontSize: 11,
                color: dialerStatus === "failed" ? "#fca5a5" : "#999",
                background: "#1a1a1a",
              }}
            >
              {callMessage}
            </div>
          )}

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
                    onClick={() => {
                      setSelectedPhoneIdx(idx);
                      setShowPhoneDropdown(false);
                    }}
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
    </div>
  );
}

function FollowUpsDue() {
  const [followUps, setFollowUps] = useState<Array<{ id: string; clinic_name: string; phone: string | null; next_follow_up: string }>>([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("clinics")
      .select("id, clinic_name, phone, next_follow_up")
      .lte("next_follow_up", today)
      .order("next_follow_up", { ascending: true })
      .limit(5)
      .then(({ data }) => {
        if (data) setFollowUps(data as Array<{ id: string; clinic_name: string; phone: string | null; next_follow_up: string }>);
      });
  }, []);

  if (followUps.length === 0) return null;

  return (
    <div className="mb-3 pb-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
      {followUps.map((f) => (
        <div key={f.id} className="flex items-center gap-3" style={{ height: 32 }}>
          <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: "#f59e0b" }} />
          <span className="flex-1 truncate" style={{ fontSize: 12, color: "#fff" }}>{f.clinic_name}</span>
          <span style={{ fontSize: 10, color: "#ef4444" }}>{f.next_follow_up}</span>
          {f.phone && (
            <button className="p-1 rounded hover:bg-white/5" type="button">
              <PhoneCall className="w-3 h-3" style={{ color: "#22c55e" }} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
