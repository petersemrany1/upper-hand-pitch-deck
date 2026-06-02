import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training")({
  component: TrainingLayout,
});

function TrainingLayout() {
  return <Outlet />;
}
