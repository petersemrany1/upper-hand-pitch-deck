// Ported from the Legal app (family-law-floater/src/components/sales-call/inbox-phone.tsx). Re-run the port script to refresh.
// Little phone that slides in over the workspace: the current lead's text thread
// with calls inline, plus a back arrow to every other conversation.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Delete,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Search,
  ArrowUpRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ClientFinder } from "./client-finder";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { cn } from "@/legal/lib/utils";
import { useDialler } from "@/legal/hooks/use-dialler";
import { formatDuration } from "@/legal/lib/sales-call";
import { getVoiceToken } from "@/legal/lib/voice.functions";
import {
  getConversationFn,
  listConversationsFn,
  sendInboxSmsFn,
  type InboxItem,
} from "@/legal/lib/inbox.functions";

function time(value: string) {
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function duration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** Paste-a-number dial pad for calling back unknown callers. */
function DialerPad({ onBack }: { onBack: () => void }) {
  const dialler = useDialler();
  const tokenFn = useServerFn(getVoiceToken);
  const repIdRef = useRef<string | null>(null);
  const [number, setNumber] = useState("");

  // Grab the rep id once so outbound calls are logged against the advisor.
  useEffect(() => {
    void tokenFn()
      .then((r) => {
        repIdRef.current = r.repId;
      })
      .catch(() => {
        /* startCall will surface a useful error if there's no advisor profile */
      });
  }, [tokenFn]);

  const onCall = dialler.status !== "idle";
  const clean = number.replace(/[^\d+]/g, "");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "⌫"];

  const press = (k: string) => {
    if (onCall) return;
    if (k === "⌫") setNumber((n) => n.slice(0, -1));
    else setNumber((n) => (n + k).slice(0, 20));
  };

  const call = () => {
    if (!clean || clean === "+") {
      toast.error("Enter a number first");
      return;
    }
    void dialler.startCall({ to: clean, leadId: "", repId: repIdRef.current });
  };

  return (
    <div className="flex flex-1 flex-col p-3">
      <div className="flex items-center gap-2 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dial a number
        </p>
      </div>
      <Input
        value={number}
        onChange={(e) => !onCall && setNumber(e.target.value)}
        placeholder="Paste or type a number…"
        inputMode="tel"
        aria-label="Phone number to call"
        className="mb-3 text-center text-lg tracking-wider"
        disabled={onCall}
      />
      <div className="mx-auto grid w-full max-w-[240px] flex-1 grid-cols-3 content-start gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            disabled={onCall}
            className="flex h-12 items-center justify-center rounded-full border bg-card text-lg font-medium hover:bg-muted disabled:opacity-40"
            aria-label={k === "⌫" ? "Delete" : k}
          >
            {k === "⌫" ? <Delete className="h-5 w-5" /> : k}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 pt-3">
        {onCall ? (
          <>
            <span className="text-xs text-muted-foreground">
              {dialler.status === "connecting"
                ? "Connecting…"
                : dialler.status === "ringing"
                  ? "Ringing…"
                  : dialler.status === "ending"
                    ? "Hanging up…"
                    : `On call · ${formatDuration(dialler.seconds)}`}
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={dialler.toggleMute}
              disabled={dialler.status !== "on-call"}
              aria-label={dialler.muted ? "Unmute" : "Mute"}
              className="h-11 w-11 rounded-full"
            >
              {dialler.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="destructive"
              onClick={dialler.hangUp}
              aria-label="Hang up"
              className="h-12 w-12 rounded-full"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <Button
            size="icon"
            onClick={call}
            disabled={!clean || clean === "+"}
            aria-label="Call"
            className="h-12 w-12 rounded-full bg-green-600 text-white hover:bg-green-700"
          >
            <Phone className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CallRow({ item }: { item: Extract<InboxItem, { kind: "call" }> }) {
  const [open, setOpen] = useState(false);
  const label = `${item.direction === "inbound" ? "Inbound" : "Outbound"} call`;
  return (
    <div className="mx-auto w-full max-w-[92%]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
      >
        <Phone className="h-3 w-3" />
        {label}
        {duration(item.duration_seconds) ? ` · ${duration(item.duration_seconds)}` : ""}
        {item.call_status ? ` · ${item.call_status}` : ""}
        <span className="opacity-60">· {time(item.created_at)}</span>
      </button>
      {open ? (
        <div className="mt-1.5 rounded-xl border bg-card p-2.5 text-[12px] leading-relaxed">
          {item.recording_url ? (
            <audio controls src={item.recording_url} className="mb-2 w-full" />
          ) : (
            <p className="text-muted-foreground">No recording.</p>
          )}
          {item.transcript ? (
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap">{item.transcript}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function InboxPhone({
  open,
  onClose,
  leadId,
  leadName,
  leadPhone,
  onSeen,
  onOpenSalesCall,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string | null;
  leadName: string;
  leadPhone: string | null;
  onSeen: () => void;
  onOpenSalesCall: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const listConversations = useServerFn(listConversationsFn);
  const getConversation = useServerFn(getConversationFn);
  const sendSms = useServerFn(sendInboxSmsFn);

  const [view, setView] = useState<"thread" | "list" | "dial">("thread");
  const [active, setActive] = useState<{
    leadId: string | null;
    phone: string | null;
    name: string;
  }>({ leadId, phone: leadPhone, name: leadName });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const onSeenRef = useRef(onSeen);
  onSeenRef.current = onSeen;

  useEffect(() => {
    if (open) {
      setView("list");
      setActive({ leadId, phone: leadPhone, name: leadName });
      onSeenRef.current();
    }
  }, [open, leadId, leadPhone, leadName]);

  const threadQuery = useQuery({
    queryKey: ["inbox-thread", active.leadId, active.phone],
    queryFn: () => getConversation({ data: { leadId: active.leadId, phone: active.phone } }),
    enabled: open && (Boolean(active.leadId) || Boolean(active.phone)),
    refetchInterval: open && view === "thread" ? 8000 : false,
  });

  const listQuery = useQuery({
    queryKey: ["inbox-conversations"],
    queryFn: () => listConversations({}),
    enabled: open && view === "list",
    refetchInterval: open && view === "list" ? 15000 : false,
  });

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  const items = useMemo(() => threadQuery.data ?? [], [threadQuery.data]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, view, open]);

  const send = () => {
    if (!draft.trim() || !active.phone) return;
    setSending(true);
    void sendSms({ data: { leadId: active.leadId, phone: active.phone, body: draft } })
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error ?? "The text could not be sent");
          return;
        }
        setDraft("");
        toast.success("Text sent");
        void queryClient.invalidateQueries({ queryKey: ["inbox-thread"] });
        void queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setSending(false));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4 sm:p-8">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close inbox"
        onClick={onClose}
      />
      <div className="relative flex h-[min(760px,92vh)] w-[min(480px,94vw)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b bg-card px-3 py-2.5">
          {view === "thread" ? (
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-md p-1.5 hover:bg-muted"
              aria-label="Find a client"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : view === "dial" ? (
            <span className="px-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dialler
            </span>
          ) : (
            <span className="px-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Inbox
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">
              {view === "thread"
                ? active.name || "Conversation"
                : view === "dial"
                  ? "Call any number"
                  : "Clients & conversations"}
            </p>
            {view === "thread" && active.phone ? (
              <p className="truncate text-[11px] text-muted-foreground">{active.phone}</p>
            ) : null}
          </div>
          {view !== "dial" ? (
            <button
              type="button"
              onClick={() => setView("dial")}
              className="rounded-md p-1.5 hover:bg-muted"
              aria-label="Open dialler"
              title="Call any number"
            >
              <Phone className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "dial" ? (
          <DialerPad onBack={() => setView("thread")} />
        ) : view === "list" ? (
          <ClientFinder
            onOpenSalesCall={onOpenSalesCall}
            onThread={(client) => {
              setActive(client);
              setDraft("");
              setView("thread");
            }}
          >
            {leadId && (
              <button
                type="button"
                className="mx-4 mt-3 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setActive({ leadId, phone: leadPhone, name: leadName });
                  setDraft("");
                  setView("thread");
                }}
              >
                Current client: <span className="font-semibold">{leadName}</span>
              </button>
            )}
            <p className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent conversations
            </p>
            {listQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conversations…
              </div>
            ) : (listQuery.data ?? []).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul>
                {(listQuery.data ?? []).map((c) => (
                  <li key={`${c.leadId ?? "x"}-${c.phone}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft("");
                        setActive({ leadId: c.leadId, phone: c.phone, name: c.name });
                        setView("thread");
                      }}
                      className="flex w-full items-start gap-2 border-b px-3 py-2.5 text-left hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{c.name}</p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {c.lastDirection === "outbound" ? "You: " : ""}
                          {c.lastBody ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {c.lastMessageAt ? time(c.lastMessageAt) : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ClientFinder>
        ) : (
          <>
            {active.leadId && (
              <div className="border-b bg-muted/30 p-3">
                <Button className="w-full" onClick={() => onOpenSalesCall(active.leadId!)}>
                  Open sales call <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
              {threadQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet — say hello below.</p>
              ) : (
                items.map((item) =>
                  item.kind === "call" ? (
                    <CallRow key={item.id} item={item} />
                  ) : (
                    <div
                      key={item.id}
                      className={cn(
                        "flex",
                        item.direction === "outbound" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                          item.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{item.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            item.direction === "outbound"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {time(item.created_at)}
                          {item.direction === "outbound" && item.delivery_status
                            ? ` · ${item.delivery_status}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            <div className="border-t bg-card p-2.5">
              {active.phone ? (
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    placeholder="Type a message…"
                    className="min-h-[42px] resize-none text-[13px]"
                    aria-label="Message"
                  />
                  <Button
                    size="icon"
                    onClick={send}
                    disabled={sending || !draft.trim()}
                    aria-label="Send"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This lead has no phone number on file.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
