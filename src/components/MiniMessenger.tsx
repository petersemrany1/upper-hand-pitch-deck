import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendSms, markThreadRead } from "@/utils/sms.functions";
import { useServerFn } from "@tanstack/react-start";
import { Send, Image as ImageIcon, Loader2, X, Search, MessageSquarePlus, ArrowLeft, Minus, Phone, UserSquare2 } from "lucide-react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";
import { useMessenger, closeMessenger, setMessengerThread } from "@/hooks/useMessenger";
import { useNavigate } from "@tanstack/react-router";
import { findLeadByPhone } from "@/utils/sales-call.functions";

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

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MiniMessenger() {
  const { open, threadId } = useMessenger();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const sendSmsFn = useServerFn(sendSms);
  const markReadFn = useServerFn(markThreadRead);
  const { call: dialerCall, dialerStatus } = useTwilioDevice();
  const myRepId = useCurrentRepId();
  const navigate = useNavigate();
  const lookupLead = useServerFn(findLeadByPhone);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from("sms_threads")
      .select("id, phone, clinic_id, display_name, last_message_preview, last_message_at, last_direction, unread_count, clinic:clinics(clinic_name)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) return;
    const rows = (data as unknown as Thread[]) ?? [];
    const norm = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "");
    const needsLookup = rows.filter((t) => !t.display_name && !t.clinic?.clinic_name);
    if (needsLookup.length > 0) {
      const { data: leads } = await supabase
        .from("meta_leads")
        .select("first_name, last_name, phone");
      const leadMap = new Map<string, string>();
      for (const l of (leads as Array<{ first_name: string | null; last_name: string | null; phone: string | null }>) ?? []) {
        const key = norm(l.phone);
        if (!key) continue;
        const name = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
        if (name && !leadMap.has(key)) leadMap.set(key, name);
      }
      for (const t of rows) {
        if (t.display_name || t.clinic?.clinic_name) continue;
        const name = leadMap.get(norm(t.phone));
        if (name) t.display_name = name;
      }
    }
    setThreads(rows);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("sms_messages")
      .select("id, thread_id, direction, body, media_urls, status, created_at")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    if (error) return;
    setMessages((data as unknown as Message[]) ?? []);
  }, []);

  // Load threads when opened
  useEffect(() => {
    if (open) void loadThreads();
  }, [open, loadThreads]);

  // Realtime updates while open
  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel("mini-messenger-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_threads" }, () => {
        void loadThreads();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sms_messages" }, (payload) => {
        const m = payload.new as Message;
        if (threadId && m.thread_id === threadId) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [open, threadId, loadThreads]);

  // Load messages + mark read when threadId changes
  useEffect(() => {
    if (!open) return;
    if (!threadId) { setMessages([]); return; }
    void loadMessages(threadId);
    void markReadFn({ data: { threadId } }).then(() => loadThreads());
  }, [open, threadId, loadMessages, loadThreads, markReadFn]);

  // Auto-scroll messages
  useEffect(() => {
    const end = messagesEndRef.current;
    if (!end) return;
    const container = end.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const name = (t.display_name || t.clinic?.clinic_name || "").toLowerCase();
      return name.includes(q) || t.phone.toLowerCase().includes(q) || (t.last_message_preview ?? "").toLowerCase().includes(q);
    });
  }, [threads, filter]);

  const active = threads.find((t) => t.id === threadId) ?? null;
  const activePhone = active?.phone || newPhone;

  async function uploadAttachments(files: File[] = composeFiles): Promise<string[]> {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const f of files) {
      const ext = f.name.split(".").pop() || "bin";
      const path = `outbound/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("sms-media").upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("sms-media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSend() {
    if (sendingRef.current) return;
    if (!activePhone) { setError("Enter a phone number."); return; }
    if (!composeBody.trim() && composeFiles.length === 0) return;
    sendingRef.current = true;
    setSending(true); setError(null);
    const bodyToSend = composeBody;
    const filesToSend = composeFiles;
    setComposeBody("");
    setComposeFiles([]);
    try {
      const mediaUrls = await uploadAttachments(filesToSend);
      const result = await sendSmsFn({ data: { to: activePhone, body: bodyToSend, mediaUrls } });
      if (!result.success) {
        setComposeBody(bodyToSend);
        setComposeFiles(filesToSend);
        setError(result.error);
      } else {
        setShowNewThread(false);
        if (result.threadId) setMessengerThread(result.threadId);
        await loadThreads();
        if (result.threadId) await loadMessages(result.threadId);
      }
    } catch (e) {
      setComposeBody(bodyToSend);
      setComposeFiles(filesToSend);
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  if (!open) return null;

  const showConversation = !!active || showNewThread;

  return (
    <>
      <div
        className="fixed z-[96] bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] rounded-[28px] shadow-2xl animate-fade-in flex flex-col overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #ebebeb",
          height: "min(640px, calc(100vh - 32px))",
        }}
      >
        {/* Phone-style header bar */}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ background: "#111111", color: "#ffffff" }}
        >
          {showConversation ? (
            <button
              type="button"
              onClick={() => { setMessengerThread(null); setShowNewThread(false); setNewPhone(""); }}
              className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-white/10"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="h-7 w-7 inline-flex items-center justify-center rounded-full" style={{ background: "#f4522d" }}>
              <Send className="h-3.5 w-3.5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">
              {showConversation
                ? (active?.display_name || active?.clinic?.clinic_name || (showNewThread ? "New message" : "Conversation"))
                : "Messenger"}
            </div>
            {showConversation && active && (
              <div className="text-[10px] opacity-70 truncate">{active.phone}</div>
            )}
          </div>
          {showConversation && activePhone && (
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await lookupLead({ data: { phone: activePhone } });
                    const leadId = res?.success && res.lead ? res.lead.id : null;
                    if (leadId) {
                      navigate({ to: "/sales-call", search: { leadId } });
                    } else {
                      navigate({ to: "/sales-call", search: { phone: activePhone } });
                    }
                    closeMessenger();
                  } catch {
                    navigate({ to: "/sales-call", search: { phone: activePhone } });
                    closeMessenger();
                  }
                }}
                title="Open in Sales Call"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-white/10"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                <UserSquare2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => dialerCall(activePhone, myRepId ? { repId: myRepId } : undefined)}
                disabled={dialerStatus !== "ready"}
                title={dialerStatus === "ready" ? `Call ${activePhone}` : "Phone not ready"}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full disabled:opacity-40"
                style={{ background: "#10b981", color: "#fff" }}
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {!showConversation && (
            <button
              type="button"
              onClick={() => { setShowNewThread(true); setMessengerThread(null); setNewPhone(""); }}
              className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-white/10"
              title="New message"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => closeMessenger()}
            className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-white/10"
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* Thread list view */}
        {!showConversation && (
          <>
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#6b7280" }} />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-8 pl-8 pr-3 rounded-full text-[12px] outline-none"
                  style={{ background: "#f4f4f5", color: "#111111", border: "1px solid #ebebeb" }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-6 text-center text-[11px]" style={{ color: "#6b7280" }}>
                  No conversations yet.
                </div>
              )}
              {filtered.map((t) => {
                const name = t.display_name || t.clinic?.clinic_name || "Unknown";
                return (
                  <button
                    key={t.id}
                    onClick={() => { setShowNewThread(false); setMessengerThread(t.id); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#fafafa] transition-colors"
                    style={{ borderBottom: "1px solid #f5f5f5" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-9 w-9 rounded-full flex-shrink-0 inline-flex items-center justify-center text-[11px] font-semibold"
                        style={{ background: "#fef2f2", color: "#f4522d" }}
                      >
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold truncate" style={{ color: "#111" }}>{name}</span>
                          <span className="text-[10px] flex-shrink-0" style={{ color: "#6b7280" }}>{fmtTime(t.last_message_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] truncate" style={{ color: t.unread_count > 0 ? "#111" : "#6b7280", fontWeight: t.unread_count > 0 ? 600 : 400 }}>
                            {t.last_direction === "outbound" ? "You: " : ""}{t.last_message_preview || "—"}
                          </span>
                          {t.unread_count > 0 && (
                            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex-shrink-0" style={{ background: "#10b981", color: "#fff" }}>
                              {t.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Conversation view */}
        {showConversation && (
          <>
            {showNewThread && (
              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
                <span className="text-[11px]" style={{ color: "#6b7280" }}>To:</span>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+61..."
                  className="flex-1 h-7 px-2 rounded text-[12px] outline-none"
                  style={{ background: "#ffffff", color: "#111", border: "1px solid #ebebeb" }}
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ background: "#f7f7f5" }}>
              {active && messages.length === 0 && (
                <div className="text-center text-[11px] py-6" style={{ color: "#6b7280" }}>No messages yet.</div>
              )}
              {messages.map((m) => {
                const out = m.direction === "outbound";
                return (
                  <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] rounded-2xl px-3 py-1.5"
                      style={{
                        background: out ? "#f4522d" : "#ffffff",
                        color: out ? "#ffffff" : "#111111",
                        border: out ? "none" : "1px solid #ebebeb",
                        borderBottomRightRadius: out ? 4 : 16,
                        borderBottomLeftRadius: out ? 16 : 4,
                      }}
                    >
                      {m.media_urls && m.media_urls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {m.media_urls.map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setLightboxUrl(u)}
                              className="block p-0 border-0 bg-transparent cursor-zoom-in"
                            >
                              <img src={u} alt="MMS" className="max-h-36 rounded-lg" />
                            </button>
                          ))}
                        </div>
                      )}
                      {m.body && <div className="text-[12px] whitespace-pre-wrap break-words">{m.body}</div>}
                      <div className="text-[9px] mt-0.5 opacity-60">{fmtTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-2.5 py-2" style={{ borderTop: "1px solid #ebebeb", background: "#ffffff" }}>
              {error && <div className="text-[10px] text-red-500 mb-1">{error}</div>}
              {composeFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {composeFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#f4f4f5", border: "1px solid #ebebeb" }}>
                      <ImageIcon className="h-2.5 w-2.5" />
                      <span className="max-w-[100px] truncate">{f.name}</span>
                      <button onClick={() => setComposeFiles((arr) => arr.filter((_, idx) => idx !== i))}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <label className="h-8 w-8 inline-flex items-center justify-center rounded-full cursor-pointer hover:bg-[#f4f4f5] flex-shrink-0" title="Attach image">
                  <ImageIcon className="h-4 w-4" style={{ color: "#6b7280" }} />
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
                  placeholder="iMessage"
                  rows={1}
                  className="flex-1 resize-none rounded-2xl px-3 py-1.5 text-[12px] outline-none"
                  style={{ background: "#f4f4f5", color: "#111", border: "1px solid #ebebeb", maxHeight: 100 }}
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || (!composeBody.trim() && composeFiles.length === 0)}
                  className="h-8 w-8 rounded-full inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{ background: "#f4522d", color: "#fff" }}
                  title="Send"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox for photos — stays inside the React app, doesn't navigate */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-6 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
            className="absolute top-4 right-4 h-9 w-9 inline-flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Photo"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
