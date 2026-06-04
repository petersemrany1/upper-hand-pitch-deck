import { createFileRoute } from "@tanstack/react-router";
import { ConversationProvider } from "@elevenlabs/react";
import { SalesCallPortal } from "@/components/SalesCallPortal";

export const Route = createFileRoute("/_dashboard/training/practice-call")({
  component: PracticeCallPageWrapper,
  head: () => ({ meta: [{ title: "Practice Call" }] }),
});

function PracticeCallPageWrapper() {
  return (
    <ConversationProvider>
      <SalesCallPortal practiceMode />
    </ConversationProvider>
  );
}
