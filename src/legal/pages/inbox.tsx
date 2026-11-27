// Ported from the Legal app (family-law-floater/src/routes/_authenticated/inbox.tsx). Re-run the port script to refresh.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  MessageSquare,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import { CallWidget } from "@/legal/components/sales-call/call-widget";
import { useDialler } from "@/legal/hooks/use-dialler";
import { cn } from "@/legal/lib/utils";
import { getVoiceToken } from "@/legal/lib/voice.functions";
import {
  getConversationFn,
  listCallsFn,
  listConversationsFn,
  sendInboxSmsFn,
  type CallLogEntry,
  type InboxItem,
} from "@/legal/lib/inbox.functions";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { InboxPage as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Inbox — Legal Group Portal" },
      { name: "description", content: "Every text message and phone call with your leads in one place." },
      { property: "og:title", content: "Inbox — Legal Group Portal" },
      {
        property: "og:description",
        content: "Every text message and phone call with your leads in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InboxPage,
});

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

function CallRow({ item }: { item: Extract<InboxItem, { kind: "call" }> }) {
  const [open, setOpen] = useState(false);
  const label = `${item.direction === "inbound" ? "Inbound" : "Outbound"} call`;
  const d = duration(item.duration_seconds);
  return (
    <div className="mx-auto w-full max-w-[92%]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
      >
        <Phone className="h-3 w-3" />
        {label}
        {d ? ` · ${d}` : ""}
        {item.call_status ? ` · ${item.call_status}` : ""}
        <span className="opacity-60">· {time(item.created_at)}</span>
      </button>
      {open ? (
        <div className="mt-1.5 rounded-xl border bg-card p-3 text-[12px] leading-relaxed">
          {item.recording_url ? (
            <audio controls src={item.recording_url} className="mb-2 w-full max-w-full" />
          ) : (
            <p className="text-muted-foreground">No recording.</p>
          )}
          {item.transcript ? (
            <p className="max-h-64 overflow-y-auto whitespace-pre-wrap">{item.transcript}</p>
          ) : (
            <p className="text-muted-foreground">No transcript yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function InboxPage() {
  const queryClient = useQueryClient();
  const listConversations = useServerFn(listConversationsFn);
  const getConversation = useServerFn(getConversationFn);
  const sendSms = useServerFn(sendInboxSmsFn);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"messages" | "calls">("messages");
  const [active, setActive] = useState<{ leadId: string | null; phone: string; name: string } | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const listCalls = useServerFn(listCallsFn);

  // Paste-a-number dialler for ringing back unknown callers.
  const dialler = useDialler();
  const tokenFn = useServerFn(getVoiceToken);
  const repIdRef = useRef<string | null>(null);
  const [dialOpen, setDialOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState("");

  useEffect(() => {
    void tokenFn()
      .then((r) => {
        repIdRef.current = r.repId;
      })
      .catch(() => {
        /* startCall surfaces a useful error if there's no advisor profile */
      });
  }, [tokenFn]);

  const startDial = () => {
    const clean = dialNumber.replace(/[^\d+]/g, "");
    if (!clean || clean === "+") {
      toast.error("Enter a number first");
      return;
    }
    void dialler.startCall({ to: clean, leadId: "", repId: repIdRef.current });
  };

  const callsQuery = useQuery({
    queryKey: ["inbox-calls"],
    queryFn: () => listCalls({}),
    refetchInterval: 30000,
    enabled: tab === "calls",
  });

  const listQuery = useQuery({
    queryKey: ["inbox-conversations"],
    queryFn: () => listConversations({}),
    refetchInterval: 20000,
  });

  const conversations = useMemo(() => {
    const rows = listQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.lastBody ?? "").toLowerCase().includes(q),
    );
  }, [listQuery.data, search]);

  useEffect(() => {
    if (!active && conversations.length) {
      const first = conversations[0]!;
      setActive({ leadId: first.leadId, phone: first.phone, name: first.name });
    }
  }, [conversations, active]);

  const threadQuery = useQuery({
    queryKey: ["inbox-thread", active?.leadId ?? null, active?.phone ?? null],
    queryFn: () => getConversation({ data: { leadId: active?.leadId ?? null, phone: active?.phone ?? null } }),
    enabled: Boolean(active),
    refetchInterval: 10000,
  });

  const items = threadQuery.data ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, active?.phone]);

  const send = () => {
    if (!draft.trim() || !active?.phone) return;
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

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Inbox
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Every text message and phone call with your leads.
            </p>
          </div>
          <Button
            variant={dialOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setDialOpen((v) => !v)}
            aria-label="Open dialler"
          >
            <Phone className="h-4 w-4" />
            <span className="ml-2">Dial</span>
          </Button>
        </div>
        {dialOpen ? (
          <div className="mt-3 flex max-w-md items-center gap-2">
            <Input
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") startDial();
              }}
              placeholder="Paste or type a number to call…"
              inputMode="tel"
              aria-label="Phone number to call"
              disabled={dialler.status !== "idle"}
            />
            <Button
              onClick={startDial}
              disabled={dialler.status !== "idle"}
              className="shrink-0 bg-green-600 text-white hover:bg-green-700"
            >
              <Phone className="h-4 w-4" />
              <span className="ml-2">Call</span>
            </Button>
          </div>
        ) : null}
        <div className="mt-3 inline-flex rounded-lg border bg-muted/40 p-0.5">
          {(["messages", "calls"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium capitalize",
                tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "messages" ? "Messages" : "Calls log"}
            </button>
          ))}
        </div>
      </div>

      <CallWidget dialler={dialler} leadName={dialNumber || "Dialled call"} />

      {tab === "calls" ? (
        <CallsLog
          rows={callsQuery.data ?? []}
          loading={callsQuery.isLoading}
          onOpenThread={(row) => {
            if (!row.phone) return;
            setActive({ leadId: row.leadId, phone: row.phone, name: row.name });
            setTab("messages");
          }}
        />
      ) : (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Conversation list */}
        <aside className="flex min-h-0 w-full min-w-0 flex-col border-b md:w-[320px] md:min-w-[260px] md:max-w-[320px] md:border-b-0 md:border-r">
          <div className="relative p-3">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, number or text"
              aria-label="Search conversations"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conversations…
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul>
                {conversations.map((c) => {
                  const isActive = active?.phone === c.phone && active?.leadId === c.leadId;
                  return (
                    <li key={`${c.leadId ?? "x"}-${c.phone}`}>
                      <button
                        type="button"
                        onClick={() => setActive({ leadId: c.leadId, phone: c.phone, name: c.name })}
                        className={cn(
                          "flex w-full items-start gap-2 border-b px-3 py-2.5 text-left hover:bg-muted/50",
                          isActive && "bg-muted",
                        )}
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
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-6 w-6" />
              Pick a conversation to see the messages and calls.
            </div>
          ) : (
            <>
              <div className="border-b bg-card px-4 py-3">
                <p className="text-[14px] font-semibold">{active.name}</p>
                <p className="text-[12px] text-muted-foreground">{active.phone}</p>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {threadQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages or calls with this person yet.
                  </p>
                ) : (
                  items.map((item) =>
                    item.kind === "call" ? (
                      <CallRow key={item.id} item={item} />
                    ) : (
                      <div
                        key={item.id}
                        className={cn(
                          "flex min-w-0",
                          item.direction === "outbound" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "min-w-0 max-w-[70%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
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

              <div className="border-t bg-card p-3">
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
                    className="min-h-[44px] resize-none text-[13px]"
                    aria-label="Message"
                  />
                  <Button onClick={send} disabled={sending || !draft.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Send</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      )}
    </main>
  );
}

function CallsLog({
  rows,
  loading,
  onOpenThread,
}: {
  rows: CallLogEntry[];
  loading: boolean;
  onOpenThread: (row: CallLogEntry) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading calls…
      </div>
    );
  }
  if (!rows.length) {
    return <p className="p-6 text-sm text-muted-foreground">No calls logged yet.</p>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ul className="divide-y">
        {rows.map((row) => {
          const inbound = row.direction === "inbound";
          const d = duration(row.duration_seconds);
          const isOpen = openId === row.id;
          return (
            <li key={row.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    inbound ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {inbound ? (
                    <PhoneIncoming className="h-4 w-4" />
                  ) : (
                    <PhoneOutgoing className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{row.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {inbound ? "Inbound" : "Outbound"}
                    {d ? ` · ${d}` : ""}
                    {row.call_status ? ` · ${row.call_status}` : ""}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {time(row.created_at)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-[11px]"
                  onClick={() => setOpenId(isOpen ? null : row.id)}
                >
                  {isOpen ? "Hide" : "Details"}
                </Button>
                {row.phone ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-[11px]"
                    onClick={() => onOpenThread(row)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              {isOpen ? (
                <div className="mt-2 rounded-xl border bg-card p-3 text-[12px] leading-relaxed">
                  {row.recording_url ? (
                    <audio controls src={row.recording_url} className="mb-2 w-full max-w-full" />
                  ) : (
                    <p className="text-muted-foreground">No recording.</p>
                  )}
                  {row.transcript ? (
                    <p className="max-h-72 overflow-y-auto whitespace-pre-wrap">{row.transcript}</p>
                  ) : (
                    <p className="text-muted-foreground">No transcript yet.</p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
