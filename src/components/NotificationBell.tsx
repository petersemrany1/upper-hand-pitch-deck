import { useState } from "react";
import { Bell, MessageSquare, PhoneMissed, PhoneCall, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/useNotifications";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { normalizeAUPhone } from "@/utils/phone";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function relTime(d: string | null): string {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    unreadThreads,
    missedCalls,
    totalCount,
    unseenCount,
    unreadSmsCount,
    missedCount,
    acknowledgeMissed,
    acknowledgeAllMissed,
    acknowledgeThread,
    acknowledgeAll,
    markNotificationsSeen,
  } = useNotifications();
  const { call, dialerStatus } = useTwilioDevice();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) markNotificationsSeen();
  };

  const handleCallback = async (id: string, phone: string | null, clinicId: string | null) => {
    if (!phone) return;
    if (dialerStatus !== "ready") {
      toast.error("Dialler not ready yet");
      return;
    }
    const normalised = normalizeAUPhone(phone) || phone;
    try {
      await call(normalised, clinicId ? { clinicId } : undefined);
      acknowledgeMissed(id);
      setOpen(false);
    } catch {
      toast.error("Could not start callback");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unseenCount > 0 ? `${unseenCount} new notifications` : "Notifications"}
          className="relative inline-flex items-center justify-center rounded-md transition"
          style={{
            width: 36,
            height: 36,
            background: "#ffffff",
            border: "1px solid #ebebeb",
            color: "#111111",
          }}
        >
          <Bell className="h-4 w-4" />
          {unseenCount > 0 && (
            <span
              className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                background: "#ef4444",
                color: "#ffffff",
                border: "2px solid #ffffff",
              }}
            >
              {unseenCount > 99 ? "99+" : unseenCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 w-[340px] max-h-[480px] overflow-hidden"
        style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid #f0f0f0" }}
        >
          <span className="text-[12px] font-semibold" style={{ color: "#111" }}>
            Notifications
          </span>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={acknowledgeAll}
              className="text-[10px]"
              style={{ color: "#6b7280" }}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
          {totalCount === 0 ? (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: "#6b7280" }}>
              You're all caught up.
            </div>
          ) : (
            <>
              {missedCalls.length > 0 && (
                <div>
                  <div
                    className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "#6b7280", background: "#fafafa" }}
                  >
                    Missed calls ({missedCount})
                  </div>
                  {missedCalls.map((m) => {
                    const label = m.lead_name || m.clinic_name || m.phone || "Unknown";
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 px-3 py-2"
                        style={{ borderBottom: "1px solid #f5f5f5" }}
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
                          style={{ background: "#fef2f2", color: "#ef4444" }}
                        >
                          <PhoneMissed className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium truncate" style={{ color: "#111" }}>
                            {label}
                          </div>
                          <div className="text-[10px]" style={{ color: "#6b7280" }}>
                            {relTime(m.called_at)} {m.phone ? `· ${m.phone}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleCallback(m.id, m.phone, m.clinic_id)}
                          disabled={!m.phone || dialerStatus !== "ready"}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-white disabled:opacity-40"
                          style={{ background: "#f4522d" }}
                          title="Call back"
                          aria-label={`Call back ${label}`}
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => acknowledgeMissed(m.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md"
                          style={{ color: "#9ca3af" }}
                          title="Dismiss"
                          aria-label="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {unreadThreads.length > 0 && (
                <div>
                  <div
                    className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "#6b7280", background: "#fafafa" }}
                  >
                    Unread messages ({unreadSmsCount})
                  </div>
                  {unreadThreads.map((t) => {
                    const label = t.display_name || t.clinic_name || t.phone || "Unknown";
                    return (
                      <div
                        key={t.thread_id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-[#fafafa]"
                        style={{ borderBottom: "1px solid #f5f5f5" }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigate({ to: "/inbox", search: { thread: t.thread_id } });
                          }}
                          className="flex flex-1 items-center gap-2 text-left min-w-0"
                        >
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
                            style={{ background: "#ecfdf5", color: "#10b981" }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-medium truncate" style={{ color: "#111" }}>
                                {label}
                              </span>
                              <span
                                className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-full text-[9px] font-semibold flex-shrink-0"
                                style={{ background: "#10b981", color: "#fff" }}
                              >
                                {t.unread_count}
                              </span>
                            </div>
                            <div className="text-[10px] truncate" style={{ color: "#6b7280" }}>
                              {t.last_message_preview || "New message"} · {relTime(t.last_message_at)}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => acknowledgeThread(t.thread_id, t.last_message_at)}
                          className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0"
                          style={{ color: "#9ca3af" }}
                          title="Dismiss"
                          aria-label="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
