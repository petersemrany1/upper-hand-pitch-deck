import { createFileRoute } from "@tanstack/react-router";
import { LegalStandalone } from "@/legal/LegalStandalone";

// Legal Group page, at the same address as on boldfamilylaw.com.au (Legal move).
export const Route = createFileRoute("/firm-offer-complete")({
  component: () => <LegalStandalone path="/legal/firm-offer-complete" />,
});
