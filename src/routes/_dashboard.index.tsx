import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Phone, FileText, PhoneCall, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useAuth } from "@/hooks/useAuth";
import { MissedCallsList } from "@/components/MissedCallsList";

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
type ActivityItem = {
  color: string;
  text: string;
  time: string;
  sortDate: string;
  clinicId?: string | null;
  icon?: "call" | "contract" | "zoom" | "followup";
};

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
  const { ready: authReady, session } = useAuth();
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [callsThisWeek, setCallsThisWeek] = useState<number | null>(null);
  const [contractsSent, setContractsSent] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<Array<{ name: string; time: string; duration: string }>>([]);
  const [followUps, setFollowUps] = useState<Array<{ id: string; clinic_name: string; phone: string | null; next_follow_up: string }>>([]);

  const [dialNumber, setDialNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [savedPhones] = useState<SavedPhone[]>(getStoredPhones);
  void savedPhones;

  // Opt-in: dashboard hosts the Quick Dial widget so it boots the Device.
  // (The dashboard layout no longer initialises Twilio app-wide.)
  const {
    status: deviceStatus,
    dialerStatus,
    error: dialerError,
    call: placeCall,
    hangup,
    retry,
  } = useTwilioDevice(true);

  const dialerStateLabel =
    dialerStatus === "ready" ? "Ready" : dialerStatus === "failed" ? "Failed" : "Connecting";
  const dialerStateColor =
    dialerStatus === "ready" ? "#22c55e" : dialerStatus === "failed" ? "#ef4444" : "#f59e0b";
  const isCallActive = deviceStatus === "in-call" || deviceStatus === "connecting";

  // Single round-trip: get_dashboard_stats RPC returns counts + recent calls
  // + recent contracts + due follow-ups in one query (replaces 5 separate
  // unindexed queries that previously fired on dashboard mount).
  const loadData = useCallback(async () => {
    type Stats = {
      total_contacts: number;
      calls_this_week: number;
      contracts_sent: number;
      recent_calls: Array<{
        id: string;
        status: string | null;
        called_at: string;
        duration: number | null;
        client_name: string | null;
      }>;
      recent_contracts: Array<{ id: string; clinic_name: string; created_at: string }>;
      follow_ups: Array<{ id: string; clinic_name: string; phone: string | null; next_follow_up: string }>;
    };

    const [statsRes, zoomsRes, callRecordsRes] = await Promise.all([
      supabase.rpc("get_dashboard_stats" as never),
      // Zooms: clinic_contacts rows whose outcome mentions "Zoom"
      supabase
        .from("clinic_contacts")
        .select("id, clinic_id, outcome, next_action_date, created_at, clinics(clinic_name)")
        .ilike("outcome", "%Zoom%")
        .order("created_at", { ascending: false })
        .limit(10),
      // Recent calls with their clinic so the activity item can deep-link
      supabase
        .from("call_records")
        .select("id, status, called_at, clinic_id, clinics(clinic_name)")
        .order("called_at", { ascending: false })
        .limit(8),
    ]);

    const statsRpc = statsRes as { data: unknown; error: unknown };
    if (statsRpc.error || !statsRpc.data) {
      console.error("get_dashboard_stats failed", statsRpc.error);
      return;
    }
    const stats = statsRpc.data as Stats;

    setTotalContacts(stats.total_contacts ?? 0);
    setCallsThisWeek(stats.calls_this_week ?? 0);
    setContractsSent(stats.contracts_sent ?? 0);
    setFollowUps(stats.follow_ups ?? []);

    const activityItems: ActivityItem[] = [];

    // Calls (link to clinic when we have it)
    type CallRow = { id: string; status: string | null; called_at: string; clinic_id: string | null; clinics: { clinic_name: string } | null };
    for (const c of (callRecordsRes.data as CallRow[] | null) ?? []) {
      const name = c.clinics?.clinic_name;
      activityItems.push({
        color: "#22c55e",
        text: `Call ${c.status || "updated"}${name ? ` with ${name}` : ""}`,
        time: relativeTime(c.called_at),
        sortDate: c.called_at,
        clinicId: c.clinic_id,
        icon: "call",
      });
    }

    setRecentCalls(
      (stats.recent_calls ?? []).slice(0, 3).map((c) => ({
        name: c.client_name || "Unknown",
        time: relativeTime(c.called_at),
        duration: c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}` : "—",
      })),
    );

    // Contracts (no clinic_id stored on contract_logs, so non-clickable)
    for (const c of stats.recent_contracts ?? []) {
      activityItems.push({
        color: "#f4522d",
        text: `Contract sent to ${c.clinic_name}`,
        time: relativeTime(c.created_at),
        sortDate: c.created_at,
        icon: "contract",
      });
    }

    // Zooms — list out scheduled / completed Zoom calls
    type ZoomRow = { id: string; clinic_id: string; outcome: string | null; next_action_date: string | null; created_at: string; clinics: { clinic_name: string } | null };
    for (const z of (zoomsRes.data as ZoomRow[] | null) ?? []) {
      const name = z.clinics?.clinic_name || "Unknown clinic";
      const when = z.next_action_date ? ` for ${z.next_action_date}` : "";
      activityItems.push({
        color: "#a855f7",
        text: `${z.outcome || "Zoom"}${when} — ${name}`,
        time: relativeTime(z.created_at),
        sortDate: z.created_at,
        clinicId: z.clinic_id,
        icon: "zoom",
      });
    }

    activityItems.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
    setActivity(activityItems.slice(0, 15));
  }, []);

  // Auth-ready gate: don't fire data queries until the JWT is attached. This
  // prevents the wave of unauth round-trips that used to fire on cold start.
  useEffect(() => {
    if (!authReady || !session) return;
    void loadData();
  }, [authReady, session, loadData]);

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
      setCallMessage("Dialling the clinic from your browser…");
    } catch (err) {
      setCallMessage(err instanceof Error ? err.message : "Call failed. Try again.");
    } finally {
      setCalling(false);
    }
  };

  useEffect(() => {
    if (deviceStatus === "in-call") {
      setCallMessage("Connected — you're on the call.");
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
      gradient: "#ffffff",
      borderColor: "#f4522d",
      iconColor: "#f4522d",
      iconBg: "#fff1ee",
    },
    {
      label: "CALLS THIS WEEK",
      value: callsThisWeek,
      icon: Phone,
      gradient: "#ffffff",
      borderColor: "#3b82f6",
      iconColor: "#3b82f6",
      iconBg: "#eff6ff",
    },
    {
      label: "CONTRACTS SENT",
      value: contractsSent,
      icon: FileText,
      gradient: "#ffffff",
      borderColor: "#8b5cf6",
      iconColor: "#8b5cf6",
      iconBg: "#f5f3ff",
    },
  ];

  return (
    <div
      className="dashboard-grid flex flex-col md:grid h-auto md:h-full overflow-visible md:overflow-hidden p-4 gap-3"
    >
      <div
        className="md:col-span-4 rounded-lg flex items-center justify-between px-5 py-4 md:py-3"
        style={{ background: "#ffffff", border: "0.5px solid #ebebeb" }}
      >
        <div>
          <div style={{ fontSize: 22, color: "#111111", fontWeight: 500, letterSpacing: "-0.01em" }}>{getGreeting()}, Peter</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{formatDate()}</div>
        </div>
      </div>

      <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-lg p-5"
              style={{
                background: "#ffffff",
                border: "0.5px solid #ebebeb",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div style={{ fontSize: 28, color: "#111111", fontWeight: 500, lineHeight: 1.1 }}>
                    {s.value === null ? "—" : s.value}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#999",
                      letterSpacing: "0.05em",
                      marginTop: 8,
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
                <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, background: s.iconBg }}>
                  <Icon className="h-4 w-4" style={{ color: s.iconColor }} />
                </div>
              </div>
            </div>
          );
        })}

        <div className="sm:col-span-3 rounded-lg flex flex-col overflow-hidden min-h-[240px] md:min-h-0" style={{ background: "transparent" }}>
          <div className="px-4 pt-3 pb-2 flex items-center gap-4">
            <span style={{ fontSize: 10, color: "#f4522d", letterSpacing: "0.2em", fontWeight: 600 }}>ACTIVITY</span>
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
            <FollowUpsDue followUps={followUps} />
            {activity.length === 0 ? (
              <div style={{ fontSize: 12, color: "#666", padding: "16px 0" }}>No recent activity</div>
            ) : (
              activity.map((item, i) => {
                const row = (
                  <>
                    <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: item.color }} />
                    <span className="flex-1 truncate" style={{ fontSize: 13, color: "#111111" }}>{item.text}</span>
                    <span className="shrink-0" style={{ fontSize: 11, color: "#666" }}>{item.time}</span>
                  </>
                );
                return item.clinicId ? (
                  <Link
                    key={i}
                    to="/clinics"
                    search={{ clinic: item.clinicId }}
                    className="flex items-center gap-3 hover:bg-[#f9f9f9] rounded -mx-1 px-1"
                    style={{ height: 36 }}
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={i} className="flex items-center gap-3" style={{ height: 36 }}>
                    {row}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div
        className="md:row-span-2 rounded-lg flex flex-col overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #ebebeb",
          borderLeft: "3px solid #f4522d",
        }}
      >
        <div className="px-4 pt-4 pb-3">
          <div
            style={{
              fontSize: 10,
              color: "#f4522d",
              letterSpacing: "0.2em",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            QUICK DIAL
          </div>
          <p style={{ fontSize: 11, color: "#666", marginBottom: 12 }}>Call a clinic directly</p>

          <div
            className="mb-3 rounded-md px-3 py-2 flex items-center justify-between gap-3"
            style={{
              background: dialerStatus === "ready" ? "#ecfdf5" : dialerStatus === "failed" ? "#fef2f2" : "#fffbeb",
              border: `0.5px solid ${dialerStatus === "ready" ? "#6ee7b7" : dialerStatus === "failed" ? "#fca5a5" : "#fde68a"}`,
            }}
          >
            <div>
              <div className="flex items-center gap-2" style={{ fontSize: 11, color: dialerStatus === "ready" ? "#10b981" : dialerStatus === "failed" ? "#dc2626" : "#92400e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span className="rounded-full" style={{ width: 8, height: 8, background: dialerStateColor }} />
                {dialerStateLabel}
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
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
                style={{ background: "#dc2626", height: 32, borderRadius: 6 }}
              >
                Retry
              </Button>
            )}
          </div>

          <Input
            placeholder="Phone number"
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            className="mb-2 text-sm"
            style={{ background: "#ffffff", color: "#111111", height: 38, border: "0.5px solid #ebebeb", borderRadius: 6 }}
          />

          <Button
            onClick={handleQuickDial}
            disabled={!dialNumber || calling || (dialerStatus === "connecting" && !isCallActive)}
            className="w-full border-0 text-white font-medium text-sm"
            style={{ background: isCallActive ? "#dc2626" : "#f4522d", height: 44, borderRadius: 6 }}
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
                background: "#f9f9f9",
              }}
            >
              {callMessage}
            </div>
          )}

          <div className="mt-4">
            <MissedCallsList />
          </div>
        </div>

        <div className="mt-auto px-4 pb-4">
          <div
            style={{
              fontSize: 10,
              color: "#666",
              letterSpacing: "0.15em",
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            RECENT CALLS
          </div>
          {recentCalls.length === 0 ? (
            <div style={{ fontSize: 11, color: "#666" }}>No recent calls</div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((c, i) => (
                <div key={i} className="flex items-center justify-between" style={{ fontSize: 11 }}>
                  <span style={{ color: "#999" }}>{c.name}</span>
                  <span style={{ color: "#666" }}>{c.duration} · {c.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type FollowUp = { id: string; clinic_name: string; phone: string | null; next_follow_up: string };

function FollowUpsDue({ followUps }: { followUps: FollowUp[] }) {
  if (followUps.length === 0) return null;

  return (
    <div className="mb-3 pb-3" style={{ borderBottom: "1px solid #f9f9f9" }}>
      {followUps.map((f) => (
        <Link
          key={f.id}
          to="/clinics"
          search={{ clinic: f.id }}
          className="flex items-center gap-3 hover:bg-[#f9f9f9] rounded -mx-1 px-1"
          style={{ height: 32 }}
        >
          <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: "#f59e0b" }} />
          <span className="flex-1 truncate" style={{ fontSize: 12, color: "#111111" }}>{f.clinic_name}</span>
          <span style={{ fontSize: 10, color: "#ef4444" }}>{f.next_follow_up}</span>
          <Calendar className="w-3 h-3 shrink-0" style={{ color: "#f59e0b" }} />
        </Link>
      ))}
    </div>
  );
}
