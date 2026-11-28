import { createFileRoute } from "@tanstack/react-router";
import { LegalStandalone } from "@/legal/LegalStandalone";

// Legal Group page, at the same address as on boldfamilylaw.com.au (Legal move).
export const Route = createFileRoute("/deposit-confirmed")({
  component: () => <LegalStandalone path="/legal/deposit-confirmed" />,
});
