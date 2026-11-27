// Ported from the Legal app (family-law-floater/src/components/sales-call/chat-summaries.tsx). Re-run the port script to refresh.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/legal/components/ui/dialog";
import { listConversationsFn, type InboxConversation } from "@/legal/lib/inbox.functions";

function relative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function state(c: InboxConversation) {
  if (!c.lastDirection) return { label: "No messages yet", tone: "text-muted-foreground" };
  if (c.lastDirection === "inbound")
    return { label: "They replied — waiting on you", tone: "text-amber-600" };
  return { label: "You sent last — waiting on them", tone: "text-muted-foreground" };
}

export function ChatSummariesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const listConversations = useServerFn(listConversationsFn);
  const conversations = useQuery({
    queryKey: ["chat-summaries"],
    queryFn: () => listConversations(),
    enabled: open,
  });

  const rows = conversations.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Text chats — where they were left</DialogTitle>
        </DialogHeader>

        {conversations.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No text conversations yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => {
              const s = state(c);
              return (
                <li
                  key={`${c.leadId ?? "x"}-${c.phone}`}
                  className="rounded-lg border px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relative(c.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-[11px] font-medium ${s.tone}`}>{s.label}</p>
                  {c.lastBody ? (
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {c.lastDirection === "inbound" ? "Them: " : "You: "}
                      </span>
                      {c.lastBody}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ChatSummariesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <span className="truncate">Chat summaries</span>
    </button>
  );
}
