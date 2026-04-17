import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Phone, FileText, Clock, PhoneCall, Loader2, ChevronDown, Bell } from "lucide-react";
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
  const {
    status: deviceStatus,
    dialerStatus,
    error: dialerError,
    call: placeCall,
    hangup,
    retry,
  } = useTwilioDevice();
  const dialerStateLabel = dialerStatus === "ready" ? "Ready" : dialerStatus === "failed" ? "Failed" : "Connecting";
  const dialerStateColor = dialerStatus === "ready" ? "#22c55e" : dialerStatus === "failed" ? "#ef4444" : "#f59e0b";
  const isCallActive = deviceStatus === "in-call" || deviceStatus === "connecting";
...
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
        <div className="px-4 pt-3 pb-2 flex items-center gap-4">
          <span style={{ fontSize: 10, color: "#2D6BE4", letterSpacing: "0.2em", fontWeight: 600 }}>ACTIVITY</span>
          <span style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "0.2em", fontWeight: 600, marginLeft: "auto", cursor: "pointer" }}>FOLLOW UPS DUE</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ minHeight: 0 }}>
          {/* Follow ups due */}
          <FollowUpsDue />
          {/* Activity */}
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
        if (data) setFollowUps(data as any);
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
            <button className="p-1 rounded hover:bg-white/5">
              <PhoneCall className="w-3 h-3" style={{ color: "#22c55e" }} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
