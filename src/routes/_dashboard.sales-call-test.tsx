import { createFileRoute, Link } from "@tanstack/react-router";
import { ConversationProvider } from "@elevenlabs/react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SalesCallPortal } from "@/components/SalesCallPortal";
import { useAuth } from "@/hooks/useAuth";
import { simulateDepositPaid, resetPeterTestLead } from "@/utils/test-sandbox.functions";

const PETER_TEST_LEAD_ID = "5e70f557-73ce-4bb7-a11a-6b718dbd092f";

function TestControlBar() {
  const simulate = useServerFn(simulateDepositPaid);
  const reset = useServerFn(resetPeterTestLead);
  const [busy, setBusy] = useState<null | "paid" | "reset">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onMarkPaid() {
    if (busy) return;
    setBusy("paid");
    setMsg(null);
    try {
      await simulate({ data: { leadId: PETER_TEST_LEAD_ID } });
      setMsg("✅ Deposit marked as paid. Reloading…");
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
      setBusy(null);
    }
  }

  async function onReset() {
    if (busy) return;
    if (!confirm("Reset Peter Test back to a clean intake-stage lead? Clears payment + status only.")) return;
    setBusy("reset");
    setMsg(null);
    try {
      await reset({ data: { leadId: PETER_TEST_LEAD_ID } });
      setMsg("🧹 Peter reset. Reloading…");
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        background: "#1f2937",
        color: "white",
        padding: "10px 14px",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        display: "flex",
        gap: 10,
        alignItems: "center",
        fontSize: 13,
        maxWidth: "min(720px, 92vw)",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <span style={{ opacity: 0.7 }}>🧪 Test controls:</span>
      <button
        onClick={onMarkPaid}
        disabled={busy !== null}
        style={{
          background: "#10b981",
          color: "white",
          border: "none",
          padding: "6px 12px",
          borderRadius: 8,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
          opacity: busy === "paid" ? 0.6 : 1,
        }}
      >
        {busy === "paid" ? "Marking…" : "Mark as Paid"}
      </button>
      <button
        onClick={onReset}
        disabled={busy !== null}
        style={{
          background: "#ef4444",
          color: "white",
          border: "none",
          padding: "6px 12px",
          borderRadius: 8,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
          opacity: busy === "reset" ? 0.6 : 1,
        }}
      >
        {busy === "reset" ? "Resetting…" : "Reset"}
      </button>
      {msg && <span style={{ marginLeft: 6 }}>{msg}</span>}
    </div>
  );
}

function SalesCallTestRoute() {
  const { role, ready } = useAuth();
  if (!ready) return null;
  if (role !== "admin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Admin only</h2>
        <p style={{ opacity: 0.7 }}>This sandbox is restricted to admins.</p>
        <Link to="/sales-call">Back to sales call</Link>
      </div>
    );
  }
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#fde68a",
          color: "#92400e",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>🧪 TEST SANDBOX — Peter Test only. Mirrors live Sales Call portal.</span>
        <Link to="/sales-call" style={{ color: "#92400e", textDecoration: "underline" }}>
          Exit to live
        </Link>
      </div>
      <ConversationProvider>
        <SalesCallPortal testLeadId={PETER_TEST_LEAD_ID} />
      </ConversationProvider>
      <TestControlBar />
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/sales-call-test")({
  component: SalesCallTestRoute,
});
