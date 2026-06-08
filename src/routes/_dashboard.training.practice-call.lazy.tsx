import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { SalesCallPortal } from "@/components/SalesCallPortal";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuizLockedNotice } from "./_dashboard.training.knowledge-quiz";
import { loadIsAdmin } from "@/lib/training-modules";

export const Route = createLazyFileRoute("/_dashboard/training/practice-call")({
  component: PracticeCallPageWrapper,
  head: () => ({ meta: [{ title: "Practice Call" }] }),
});

function PracticeCallPageWrapper() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setStatus("locked");
        return;
      }
      const [{ data }, isAdmin] = await Promise.all([
        supabase
          .from("rep_quiz_progress")
          .select("passed")
          .eq("user_id", uid)
          .maybeSingle(),
        loadIsAdmin(),
      ]);
      setStatus(isAdmin || data?.passed ? "unlocked" : "locked");
    })();
  }, []);


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
        {status === "loading" && (
          <div style={{ padding: 40, textAlign: "center", color: "#6b6b6b", fontFamily: `"DM Sans", system-ui, sans-serif` }}>
            Checking access…
          </div>
        )}
        {status === "locked" && <QuizLockedNotice />}
        {status === "unlocked" && (
          <ConversationProvider>
            <SalesCallPortal practiceMode />
          </ConversationProvider>
        )}
      </div>
    </div>
  );
}
