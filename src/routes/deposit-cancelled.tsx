import { createFileRoute } from "@tanstack/react-router";
import { LegalStandalone } from "@/legal/LegalStandalone";

// Legal Group page, at the same address as on boldfamilylaw.com.au (Legal move).
export const Route = createFileRoute("/deposit-cancelled")({
  component: () => <LegalStandalone path="/legal/deposit-cancelled" />,
});
