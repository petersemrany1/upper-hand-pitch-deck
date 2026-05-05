import { useEffect, useRef, useState } from "react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { findLeadByPhone } from "@/utils/sales-call.functions";
import { sendSms } from "@/utils/sms.functions";
import { supabase } from "@/integrations/supabase/client";
import { Check, Phone, X } from "lucide-react";

// Slim incoming-call banner that slides in from the top of the screen.
// Sits ABOVE app content (the dashboard layout reserves 64px when this
// is visible, so it pushes content down rather than overlaying it).
//
// Replaces the old full-screen modal — the old name is kept so existing
// imports keep working.

const BANNER_HEIGHT = 64;

type MatchedLead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string | null;
  call_notes: string | null;
};

function statusLabel(s: string | null): string {
  if (!s) return "New";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(s: string | null): { bg: string; fg: string } {
  switch (s) {
    case "callback_scheduled":
      return { bg: "#fef3c7", fg: "#92400e" };
    case "booked_deposit_paid":
    case "booked_no_deposit":
      return { bg: "#d1fae5", fg: "#065f46" };
    case "not_interested":
    case "dropped":
      return { bg: "#fee2e2", fg: "#991b1b" };
    case "no_answer":
      return { bg: "#e0e7ff", fg: "#3730a3" };
    default:
      return { bg: "#f3f4f6", fg: "#374151" };
  }
}

export function IncomingCallDialog() {
  const { status: deviceStatus, incomingFrom, waitingFrom, answer, reject } = useTwilioDevice();
  // Banner is shown when the device is ringing OR when a call-waiting second
  // call comes in while the user is already on a call.
  const isRinging = deviceStatus === "ringing-incoming";
  const isWaiting = !!waitingFrom && deviceStatus === "in-call";
  const isActive = isRinging || isWaiting;
  // Caller number we show in the banner — the waiting call takes priority
  // when the user is already on another call.
  const callerNumber = isWaiting ? waitingFrom : incomingFrom;

  const [matched, setMatched] = useState<MatchedLead | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);

  // Reset transient UI whenever a new call starts/ends
  useEffect(() => {
    if (!isActive) {
      setMatched(null);
      setSummary(null);
      setSmsSent(false);
      setSmsBusy(false);
    }
  }, [isActive]);

  // Match incoming caller to a lead via phone tail
  useEffect(() => {
    if (!isActive || !callerNumber) return;
    void findLeadByPhone({ data: { phone: callerNumber } })
      .then((r) => {
        if (r.success && r.lead) {
          setMatched({
            id: r.lead.id,
            first_name: r.lead.first_name,
            last_name: r.lead.last_name,
            phone: r.lead.phone,
            status: r.lead.status,
            call_notes: r.lead.call_notes,
          });
        }
      })
      .catch(() => { /* noop */ });
  }, [isActive, callerNumber]);

  // Fetch / generate the AI one-liner once we have a matched lead
  useEffect(() => {
    if (!matched) return;
    let cancelled = false;
    void (async () => {
      try {
        // Try cached summary on most recent call_records first
        const { data: latest } = await supabase
          .from("call_records")
          .select("call_analysis")
          .eq("lead_id", matched.id)
          .order("called_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const cached = (latest?.call_analysis as { summary?: string } | null)?.summary;
        if (cached && !cancelled) setSummary(cached);

        // Fire generation in background to refresh
        const { data, error } = await supabase.functions.invoke("generate-lead-summary", {
          body: { leadId: matched.id },
        });
        if (!cancelled && !error && (data as { summary?: string })?.summary) {
          setSummary((data as { summary: string }).summary);
        }
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [matched]);

  // Banner stays visible for the entire ringing/waiting lifecycle. It is
  // cleared automatically when the device transitions out of the ringing
  // state (answered, rejected, or remote hangup) — never by a stray click
  // or a local timer.

  if (!isActive) return null;

  const fullName = matched
    ? [matched.first_name, matched.last_name].filter(Boolean).join(" ") || "Unnamed lead"
    : null;
  const leadStatus = matched?.status ?? null;
  const statusCol = statusColor(leadStatus);

  const handleSendSms = async () => {
    if (!callerNumber || smsBusy || smsSent) return;
    setSmsBusy(true);
    try {
      const r = await sendSms({
        data: {
          to: callerNumber,
          body:
            "Hi, I'm just on the phone at the moment — I'll call you back shortly.",
        },
      });
      if (r.success) setSmsSent(true);
    } catch { /* noop */ }
    setSmsBusy(false);
  };

  const handleAnswer = () => {
    try { answer(); } catch { /* noop */ }
  };

  const handleIgnore = () => {
    // Just hide the banner — call keeps ringing until voicemail timeout.
    setDismissed(true);
  };

  const handleVoicemail = () => {
    // Reject in the SDK — voice-inbound TwiML routes to voicemail on no-answer.
    try { reject(); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <>
      <style>{`
        @keyframes incoming-banner-slide {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes incoming-banner-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.25); }
        }
      `}</style>
      <div
        role="alert"
        aria-label="Incoming call"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: BANNER_HEIGHT,
          background: "#ffffff",
          borderBottom: "1px solid #e8e8e6",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          gap: 16,
          animation: "incoming-banner-slide 200ms ease-out",
        }}
      >
        {/* Left side — caller info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ff6b5c",
              flexShrink: 0,
              animation: "incoming-banner-pulse 1.4s ease-in-out infinite",
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#999",
                  fontWeight: 600,
                }}
              >
                {isWaiting ? "Call waiting" : "Incoming call"}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 240,
                }}
              >
                {fullName || callerNumber || "Unknown caller"}
              </span>
              {matched && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: statusCol.bg,
                    color: statusCol.fg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel(leadStatus)}
                </span>
              )}
              {fullName && callerNumber && (
                <span style={{ fontSize: 11, color: "#aaa" }}>{callerNumber}</span>
              )}
            </div>
            {summary && (
              <div
                style={{
                  fontSize: 12,
                  fontStyle: "italic",
                  color: "#888",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={summary}
              >
                {summary}
              </div>
            )}
          </div>
        </div>

        {/* Right side — actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleAnswer}
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 12px",
              borderRadius: 8,
              background: "#16a34a",
              color: "#fff",
              border: "1px solid #15803d",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Phone size={13} /> Answer
          </button>

          <button
            type="button"
            onClick={() => void handleSendSms()}
            disabled={smsBusy || smsSent}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 12px",
              borderRadius: 8,
              background: "#fff",
              color: smsSent ? "#15803d" : "#111",
              border: "1px solid #e0e0de",
              cursor: smsBusy || smsSent ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            {smsSent ? (
              <>
                <Check size={14} strokeWidth={2.5} /> Sent
              </>
            ) : (
              <>📱 {smsBusy ? "Sending…" : "Send Busy Text"}</>
            )}
          </button>

          <button
            type="button"
            onClick={handleIgnore}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 12px",
              borderRadius: 8,
              background: "transparent",
              color: "#888",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <X size={14} /> Ignore
          </button>

          <button
            type="button"
            onClick={handleVoicemail}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 12px",
              borderRadius: 8,
              background: "#fff",
              color: "#111",
              border: "1px solid #e0e0de",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Phone size={13} /> Send to Voicemail
          </button>
        </div>
      </div>
    </>
  );
}

// Helper hook for the dashboard layout: returns true when the banner is
// occupying space at the top of the viewport, so the layout can reserve
// padding-top to avoid overlap.
export function useIncomingBannerActive(): boolean {
  const { status, waitingFrom } = useTwilioDevice();
  return status === "ringing-incoming" || (status === "in-call" && !!waitingFrom);
}

export const INCOMING_BANNER_HEIGHT = BANNER_HEIGHT;
