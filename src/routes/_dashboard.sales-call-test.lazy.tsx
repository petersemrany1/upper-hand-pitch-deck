import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ConversationProvider } from "@elevenlabs/react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SalesCallPortal } from "@/components/SalesCallPortal";
import { useAuth, ViewAsRoleProvider, type Role } from "@/hooks/useAuth";
import { resetPeterTestLead, simulateDepositPaid } from "@/utils/test-sandbox.functions";

const PETER_TEST_LEAD_ID = "5e70f557-73ce-4bb7-a11a-6b718dbd092f";
const TEST_TESTED_LEAD_ID = "b2828129-1c28-4502-927a-11f43a0a8473";
const TEST_LEAD_IDS = [PETER_TEST_LEAD_ID, TEST_TESTED_LEAD_ID];

const VIEW_AS_KEY = "sandbox-view-as-role";

const TEST_LEAD_NAMES: Record<string, string> = {
  [PETER_TEST_LEAD_ID]: "Peter Test",
  [TEST_TESTED_LEAD_ID]: "Test Tested",
};

function TestControlBar({ viewAs, onViewAsChange }: { viewAs: Role; onViewAsChange: (r: Role) => void }) {
  const reset = useServerFn(resetPeterTestLead);
  const markPaid = useServerFn(simulateDepositPaid);
  const [busy, setBusy] = useState<null | "reset" | "paid">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [payLeadId, setPayLeadId] = useState(PETER_TEST_LEAD_ID);

  async function onReset() {
    if (busy) return;
    if (!confirm("Reset both test leads (Peter Test + Test Tested) back to clean intake stage? Clears payment + status only.")) return;
    setBusy("reset");
    setMsg(null);
    try {
      await Promise.all(TEST_LEAD_IDS.map((id) => reset({ data: { leadId: id } })));
      setMsg("🧹 Test leads reset. Reloading…");
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
      setBusy(null);
    }
  }

  async function onMarkPaid() {
    if (busy) return;
    setBusy("paid");
    setMsg(null);
    try {
      const res = await markPaid({ data: { leadId: payLeadId } });
      setMsg(
        res?.needsBooking
          ? `💰 $75 received for ${TEST_LEAD_NAMES[payLeadId]} — now fill in the clinic, doctor, date & time. Reloading…`
          : `💰 ${TEST_LEAD_NAMES[payLeadId]} marked as paid. Reloading…`,
      );
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
      <select
        value={payLeadId}
        onChange={(e) => setPayLeadId(e.target.value)}
        style={{
          background: "#111827",
          color: "white",
          border: "1px solid #4b5563",
          padding: "6px 8px",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        {TEST_LEAD_IDS.map((id) => (
          <option key={id} value={id}>{TEST_LEAD_NAMES[id]}</option>
        ))}
      </select>
      <button
        onClick={onMarkPaid}
        disabled={busy !== null}
        style={{
          background: "#22c55e",
          color: "white",
          border: "none",
          padding: "6px 12px",
          borderRadius: 8,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
          opacity: busy === "paid" ? 0.6 : 1,
        }}
      >
        {busy === "paid" ? "Marking…" : "Mark as paid"}
      </button>
      <span style={{ opacity: 0.7, marginLeft: 8 }}>Signed on as:</span>
      {(["admin", "rep"] as Role[]).map((r) => (
        <button
          key={r}
          onClick={() => onViewAsChange(r)}
          style={{
            background: viewAs === r ? "#22c55e" : "transparent",
            color: "white",
            border: "1px solid #4b5563",
            padding: "6px 12px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            textTransform: "capitalize",
          }}
        >
          {r}
        </button>
      ))}
      {msg && <span style={{ marginLeft: 6 }}>{msg}</span>}
    </div>
  );
}

function SalesCallTestRoute() {
  const { role, ready } = useAuth();
  const [viewAs, setViewAs] = useState<Role>("admin");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_AS_KEY) : null;
    if (saved === "admin" || saved === "rep") setViewAs(saved);
  }, []);
  function changeViewAs(r: Role) {
    setViewAs(r);
    try { window.localStorage.setItem(VIEW_AS_KEY, r); } catch { /* noop */ }
  }
  if (!ready) return null;
  // Admins and reps: the sandbox only ever touches the two test leads, and
  // a rep login is the only way to test the dialler as a rep without
  // ringing a real customer. The button that links here stays admin-only.
  if (role !== "admin" && role !== "rep") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Admin only</h2>
        <p style={{ opacity: 0.7 }}>This sandbox is for the sales team.</p>
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
        <span>
          🧪 TEST SANDBOX — Peter Test only. Mirrors live Sales Call portal. Signed on as{" "}
          {viewAs === "rep" ? "a rep" : "admin"}.
        </span>
        <Link to="/sales-call" style={{ color: "#92400e", textDecoration: "underline" }}>
          Exit to live
        </Link>
      </div>
      <ViewAsRoleProvider role={viewAs}>
        <ConversationProvider>
          <SalesCallPortal testLeadId={TEST_LEAD_IDS} />
        </ConversationProvider>
      </ViewAsRoleProvider>
      <TestControlBar viewAs={viewAs} onViewAsChange={changeViewAs} />
    </div>
  );
}

export const Route = createLazyFileRoute("/_dashboard/sales-call-test")({
  component: SalesCallTestRoute,
});
