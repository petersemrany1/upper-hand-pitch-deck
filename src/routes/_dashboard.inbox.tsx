import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendSms, markThreadRead } from "@/utils/sms.functions";
import { useServerFn } from "@tanstack/react-start";
import { Send, Image as ImageIcon, Loader2, X, Search, MessageSquarePlus, RefreshCw } from "lucide-react";

type Thread = {
  id: string;
  phone: string;
  clinic_id: string | null;
  display_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_direction: string | null;
  unread_count: number;
  clinic?: { clinic_name: string } | null;
};

type Message = {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  media_urls: string[];
  status: string | null;
  created_at: string;
};

type SearchParams = { thread?: string; phone?: string };

export const Route = createFileRoute("/_dashboard/inbox")({
  component: InboxPage,
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    thread: typeof s.thread === "string" ? s.thread : undefined,
    phone: typeof s.phone === "string" ? s.phone : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inbox — SMS conversations" },
      { name: "description", content: "Send and receive SMS/MMS messages with clinics." },
    ],
  }),
});

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function InboxPage() {
  const search = useSearch({ from: "/_dashboard/inbox" }) as SearchParams;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const sendSmsFn = useServerFn(sendSms);
  const markReadFn = useServerFn(markThreadRead);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from("sms_threads")
      .select("id, phone, clinic_id, display_name, last_message_preview, last_message_at, last_direction, unread_count, clinic:clinics(clinic_name)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) {
      console.error("loadThreads", error);
      return;
    }
    setThreads((data as unknown as Thread[]) ?? []);
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    const { data, error } = await supabase
      .from("sms_messages")
      .select("id, thread_id, direction, body, media_urls, status, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("loadMessages", error);
      return;
    }
    setMessages((data as unknown as Message[]) ?? []);
  }, []);

  // Initial load + handle deep links from clinics page
  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (search.thread) {
      setActiveId(search.thread);
    } else if (search.phone && threads.length > 0) {
      const t = threads.find((x) => x.phone === search.phone);
      if (t) setActiveId(t.id);
      else setNewPhone(search.phone);
    }
  }, [search.thread, search.phone, threads]);

  // Realtime: refresh thread list and active conversation on any change
  useEffect(() => {
    const ch = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_threads" }, () => {
        void loadThreads();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sms_messages" }, (payload) => {
        const m = payload.new as Message;
        if (activeId && m.thread_id === activeId) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [activeId, loadThreads]);

  // Load messages and mark read when activeId changes
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    void loadMessages(activeId);
    void markReadFn({ data: { threadId: activeId } }).then(() => loadThreads());
  }, [activeId, loadMessages, loadThreads, markReadFn]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const name = (t.display_name || t.clinic?.clinic_name || "").toLowerCase();
      return name.includes(q) || t.phone.toLowerCase().includes(q) || (t.last_message_preview ?? "").toLowerCase().includes(q);
    });
  }, [threads, filter]);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const activePhone = active?.phone || newPhone;

  async function uploadAttachments(): Promise<string[]> {
    if (composeFiles.length === 0) return [];
    const urls: string[] = [];
    for (const f of composeFiles) {
      const ext = f.name.split(".").pop() || "bin";
      const path = `outbound/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("sms-media").upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) {
        console.error("upload failed", upErr);
        throw new Error(upErr.message);
      }
      const { data } = supabase.storage.from("sms-media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSend() {
    if (!activePhone) { setError("Enter a phone number to start a new thread."); return; }
    if (!composeBody.trim() && composeFiles.length === 0) return;
    setSending(true); setError(null);
    try {
      const mediaUrls = await uploadAttachments();
      const result = await sendSmsFn({ data: { to: activePhone, body: composeBody, mediaUrls } });
      if (!result.success) {
        setError(result.error);
      } else {
        setComposeBody("");
        setComposeFiles([]);
        setShowNewThread(false);
        if (result.threadId) setActiveId(result.threadId);
        await loadThreads();
        if (result.threadId) await loadMessages(result.threadId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-full w-full flex" style={{ background: "#f7f7f5", color: "#111111" }}>
      {/* Thread list */}
      <aside className="w-[320px] flex flex-col" style={{ borderRight: "1px solid #ebebeb", background: "#ffffff" }}>
        <div className="p-4" style={{ borderBottom: "1px solid #ebebeb" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold tracking-tight">Inbox</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  setRefreshing(true);
                  await loadThreads();
                  if (activeId) await loadMessages(activeId);
                  setRefreshing(false);
                }}
                className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-[#f9f9f9] disabled:opacity-50"
                title="Refresh"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => { setShowNewThread(true); setActiveId(null); setNewPhone(""); }}
                className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-[#f9f9f9]"
                title="New message"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#111111]" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search conversations…"
              className="w-full h-9 pl-8 pr-3 rounded text-sm outline-none"
              style={{ background: "#f9f9f9", color: "#111111", border: "1px solid #ebebeb" }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-[#111111]">No conversations yet.</div>
          )}
          {filtered.map((t) => {
            const name = t.display_name || t.clinic?.clinic_name || "Unknown";
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => { setShowNewThread(false); setActiveId(t.id); }}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  background: isActive ? "#f9f9f9" : "transparent",
                  borderLeft: isActive ? "3px solid #f4522d" : "3px solid transparent",
                  borderBottom: "1px solid #ffffff",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{name}</span>
                      {t.clinic_id && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "#eff6ff", color: "#60a5fa" }}>
                          Clinic
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#111111] truncate">{t.phone}</div>
                    <div className="text-xs text-[#111111] truncate mt-1">
                      {t.last_direction === "outbound" ? "You: " : ""}{t.last_message_preview || "—"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-[#111111]">{fmtTime(t.last_message_at)}</span>
                    {t.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-emerald-500 text-[#111111] text-[9px] font-bold">
                        {t.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Conversation pane */}
      <section className="flex-1 flex flex-col">
        {!active && !showNewThread && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#111111]">
            Select a conversation or start a new one.
          </div>
        )}

        {(active || showNewThread) && (
          <>
            <header className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #ebebeb", background: "#ffffff" }}>
              <div className="flex-1 min-w-0">
                {active ? (
                  <>
                    <div className="text-sm font-semibold">
                      {active.display_name || active.clinic?.clinic_name || "Unknown"}
                    </div>
                    <div className="text-xs text-[#111111]">{active.phone}</div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#111111]">To:</span>
                    <input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+61..."
                      className="h-8 px-2 rounded text-sm outline-none"
                      style={{ background: "#f9f9f9", color: "#111111", border: "1px solid #ebebeb" }}
                    />
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ background: "#f7f7f5" }}>
              {active && messages.length === 0 && (
                <div className="text-center text-xs text-[#111111] py-8">No messages in this conversation yet.</div>
              )}
              {messages.map((m) => {
                const out = m.direction === "outbound";
                return (
                  <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[70%] rounded-2xl px-4 py-2"
                      style={{
                        background: out ? "#f4522d" : "#ffffff",
                        color: out ? "#ffffff" : "#111111",
                        border: out ? "none" : "1px solid #ebebeb",
                        borderBottomRightRadius: out ? 4 : 16,
                        borderBottomLeftRadius: out ? 16 : 4,
                      }}
                    >
                      {m.media_urls && m.media_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-1">
                          {m.media_urls.map((u) => (
                            <a key={u} href={u} target="_blank" rel="noreferrer">
                              <img src={u} alt="MMS" className="max-h-48 rounded-lg" />
                            </a>
                          ))}
                        </div>
                      )}
                      {m.body && <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>}
                      <div className="text-[10px] mt-1 opacity-60">{fmtTime(m.created_at)}{m.status ? ` · ${m.status}` : ""}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="px-6 py-3" style={{ borderTop: "1px solid #ebebeb", background: "#ffffff" }}>
              {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
              {composeFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {composeFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded" style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}>
                      <ImageIcon className="h-3 w-3" />
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <button onClick={() => setComposeFiles((arr) => arr.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="h-9 w-9 inline-flex items-center justify-center rounded cursor-pointer hover:bg-[#f9f9f9]" title="Attach image">
                  <ImageIcon className="h-4 w-4 text-[#111111]" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const fs = Array.from(e.target.files ?? []);
                      setComposeFiles((prev) => [...prev, ...fs]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 resize-none rounded px-3 py-2 text-sm outline-none"
                  style={{ background: "#f9f9f9", color: "#111111", border: "1px solid #ebebeb", maxHeight: 120 }}
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || (!composeBody.trim() && composeFiles.length === 0)}
                  className="h-9 px-4 rounded inline-flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                  style={{ background: "#f4522d", color: "#ffffff" }}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
              <div className="text-[10px] text-[#111111] mt-2">
                Press Enter to send · Shift+Enter for new line · Sent from +61 468 031 075
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
