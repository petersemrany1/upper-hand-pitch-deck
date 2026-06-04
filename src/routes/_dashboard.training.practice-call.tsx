import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { PhoneCall, PhoneOff } from "lucide-react";
import { SalesCallPortal } from "./_dashboard.sales-call";

export const Route = createFileRoute("/_dashboard/training/practice-call")({
  component: PracticeCallPageWrapper,
  head: () => ({ meta: [{ title: "Practice Call" }] }),
});

const AGENT_ID = "agent_1301kt5fgx3ye9krpyc25900fy60";

function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

function AIPracticeWidget() {
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const startRef = useRef<number | null>(null);

  const conversation = useConversation({
    onConnect: () => console.log("[practice] connected"),
    onDisconnect: () => console.log("[practice] disconnected"),
    onError: (e) => console.error("[practice] error", e),
  });

  const status = conversation.status;
  const isConnected = status === "connected";
  const isSpeaking = conversation.isSpeaking;

  useEffect(() => {
    if (!isConnected) { startRef.current = null; setElapsed(0); return; }
    startRef.current = Date.now();
    const t = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [isConnected]);

  const startCall = async () => {
    setMicError(null);
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
    } catch (e) {
      setMicError(e instanceof Error ? e.message : "Mic access denied.");
    } finally {
      setStarting(false);
    }
  };

  const endCall = async () => {
    try { await conversation.endSession(); } catch (e) { console.error(e); }
  };

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9999,
      background: "#111", color: "#fff", borderRadius: 12,
      boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
      padding: 14, minWidth: 240, fontFamily: "system-ui, sans-serif",
      border: "1px solid #333",
    }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#f4522d", fontWeight: 700, marginBottom: 8 }}>
        Practice with Dave (AI)
      </div>
      {!isConnected ? (
        <>
          <button
            onClick={startCall}
            disabled={starting || status === "connecting"}
            style={{
              width: "100%", background: "#f4522d", color: "#fff",
              border: "none", borderRadius: 8, padding: "10px 14px",
              fontWeight: 700, fontSize: 13, cursor: starting ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <PhoneCall className="h-4 w-4" />
            {starting || status === "connecting" ? "Connecting…" : "Start Practice Call"}
          </button>
          {micError && <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 8 }}>{micError}</div>}
        </>
      ) : (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: isSpeaking ? "rgba(16,185,129,0.15)" : "rgba(249,115,22,0.15)",
            color: isSpeaking ? "#6ee7b7" : "#fdba74", marginBottom: 8,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 999,
              background: isSpeaking ? "#10b981" : "#f97316",
              animation: "pcPulse 1.2s ease-in-out infinite",
            }} />
            {isSpeaking ? "Dave is speaking" : "Listening"}
            <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, Menlo, monospace" }}>{fmtTime(elapsed)}</span>
          </div>
          <button
            onClick={endCall}
            style={{
              width: "100%", background: "transparent", color: "#fca5a5",
              border: "1px solid #ef4444", borderRadius: 8, padding: "8px 14px",
              fontWeight: 600, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <PhoneOff className="h-4 w-4" /> End call
          </button>
        </>
      )}
      <style>{`@keyframes pcPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.6); opacity: 0.5; } }`}</style>
    </div>
  );
}

function PracticeCallPageWrapper() {
  return (
    <ConversationProvider>
      <SalesCallPortal practiceMode />
      <AIPracticeWidget />
    </ConversationProvider>
  );
}
