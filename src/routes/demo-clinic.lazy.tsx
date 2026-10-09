import { createLazyFileRoute } from "@tanstack/react-router";
import { DemoClinicPortal } from "@/components/DemoClinicPortal";
export const Route = createLazyFileRoute("/demo-clinic")({ component: DemoClinicPortal });
