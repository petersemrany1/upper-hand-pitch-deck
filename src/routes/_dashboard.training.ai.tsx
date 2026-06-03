import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training/ai")({
  component: () => <Navigate to="/training/practice-call" replace />,
});
