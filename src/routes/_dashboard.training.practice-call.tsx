import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ConversationProvider } from "@elevenlabs/react";
import { SalesCallPortal } from "@/components/SalesCallPortal";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_dashboard/training/practice-call")({
  component: PracticeCallPageWrapper,
  head: () => ({ meta: [{ title: "Practice Call" }] }),
});

function PracticeCallPageWrapper() {
  const navigate = useNavigate();
  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
        style={{ background: "#fff", borderColor: "#ebebeb" }}
      >
        <button
          onClick={() => navigate({ to: "/training" })}
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "#111", cursor: "pointer" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to training
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ConversationProvider>
          <SalesCallPortal practiceMode />
        </ConversationProvider>
      </div>
    </div>
  );
}
