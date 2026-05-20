import { MessageCircle } from "lucide-react";
import { useMessenger, toggleMessenger } from "@/hooks/useMessenger";
import { useNotifications } from "@/hooks/useNotifications";

export function MessengerLauncher() {
  const { open } = useMessenger();
  const { unreadSmsCount } = useNotifications();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => toggleMessenger()}
      className="fixed z-[94] bottom-4 left-4 h-12 w-12 rounded-full shadow-xl inline-flex items-center justify-center active:scale-95 transition"
      style={{ background: "#111111", color: "#ffffff", border: "2px solid #ffffff" }}
      title="Open messenger"
      aria-label="Open messenger"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadSmsCount > 0 && (
        <span
          className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold"
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            background: "#10b981",
            color: "#ffffff",
            border: "2px solid #ffffff",
          }}
        >
          {unreadSmsCount > 99 ? "99+" : unreadSmsCount}
        </span>
      )}
    </button>
  );
}
