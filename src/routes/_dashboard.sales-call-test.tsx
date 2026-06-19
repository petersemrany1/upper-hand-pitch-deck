import { createFileRoute, Link } from "@tanstack/react-router";
import { ConversationProvider } from "@elevenlabs/react";
import { SalesCallPortal } from "@/components/SalesCallPortal";
import { useAuth } from "@/hooks/useAuth";

const PETER_TEST_LEAD_ID = "5e70f557-73ce-4bb7-a11a-6b718dbd092f";

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
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/sales-call-test")({
  component: SalesCallTestRoute,
});
