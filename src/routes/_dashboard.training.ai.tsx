import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ModuleGate } from "@/components/ModuleProgress";
import { markModuleComplete } from "@/lib/training-modules";

export const Route = createFileRoute("/_dashboard/training/ai")({
  component: AiWrapper,
});

function AiWrapper() {
  return (
    <ModuleGate slug="ai">
      <AiRedirect />
    </ModuleGate>
  );
}

function AiRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await markModuleComplete("ai");
      navigate({ to: "/training/practice-call", replace: true });
    })();
  }, [navigate]);
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b6b6b", fontFamily: `"DM Sans", system-ui, sans-serif` }}>
      Opening practice call…
    </div>
  );
}
