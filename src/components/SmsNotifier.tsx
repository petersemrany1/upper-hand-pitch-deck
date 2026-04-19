import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Global listener for inbound SMS. Shows a top-left toast on any page,
// click to jump straight into the matching thread on the Inbox page.
type InboundMessage = {
  id: string;
  thread_id: string;
  direction: string;
  body: string | null;
  from_number: string | null;
};

export function SmsNotifier() {
  const navigate = useNavigate();
  const location = useLocation();
  const locRef = useRef(location.pathname);
  useEffect(() => { locRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    const ch = supabase
      .channel("global-sms-notifier")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sms_messages" },
        async (payload) => {
          const m = payload.new as InboundMessage;
          if (m.direction !== "inbound") return;
          // Skip notification if already on this thread
          if (locRef.current === "/inbox") return;

          // Look up sender display
          const { data: thread } = await supabase
            .from("sms_threads")
            .select("phone, display_name, clinic:clinics(clinic_name)")
            .eq("id", m.thread_id)
            .maybeSingle();
          const t = thread as { phone: string; display_name: string | null; clinic: { clinic_name: string } | null } | null;
          const sender = t?.display_name || t?.clinic?.clinic_name || t?.phone || m.from_number || "Unknown";
          const preview = m.body?.trim() || "📷 Media message";

          toast(`New message from ${sender}`, {
            description: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
            position: "top-left",
            duration: 8000,
            action: {
              label: "Open",
              onClick: () => navigate({ to: "/inbox", search: { thread: m.thread_id } }),
            },
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [navigate]);

  return null;
}
