import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { ListSkeleton } from "@/components/app/LoadingState";
import { EmptyState } from "@/components/app/EmptyState";
import { sendSms, markThreadRead } from "@/utils/sms.functions";
import { useServerFn } from "@tanstack/react-start";
import { Send, Image as ImageIcon, Loader2, X, Search, MessageSquarePlus, RefreshCw, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Delete, ArrowRight } from "lucide-react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";

type CallRow = {
  id: string;
  direction: string | null;
  phone: string | null;
  from_number: string | null;
  status: string | null;
  outcome: string | null;
  duration: number | null;
  duration_seconds: number | null;
  called_at: string;
  recording_url: string | null;
  lead_id: string | null;
  clinic_id: string | null;
  rep_id: string | null;
};

function fmtCallDuration(secs: number | null): string {
  if (!secs || secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtCallTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

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
  const [tab, setTab] = useState<"messages" | "calls">("messages");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // Lightbox state — opening photos in a new tab inside the preview iframe
  // can navigate the iframe away from the React app and kill an in-progress
  // sales call. Keep image preview in-page instead.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const sendSmsFn = useServerFn(sendSms);
  const markReadFn = useServerFn(markThreadRead);
  const { call: dialerCall, dialerStatus } = useTwilioDevice(true);
  const myRepId = useCurrentRepId();

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from("sms_threads")
      .select("id, phone, clinic_id, display_name, last_message_preview, last_message_at, last_direction, unread_count, clinic:clinics(clinic_name)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) {
      console.error("loadThreads", error);
      return;
    }
    const rows = (data as unknown as Thread[]) ?? [];

    // For threads without a display_name or clinic match, look up the lead by phone
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
  useRealtimeSubscription({ table: "sms_threads" }, () => void loadThreads());
  useRealtimeSubscription({ table: "sms_messages", event: "INSERT" }, (payload) => {
    const m = payload.new as Message;
    if (activeId && m.thread_id === activeId) {
      setMessages((prev) => [...prev, m]);
    }
  });

  // Load messages and mark read when activeId changes
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    void loadMessages(activeId);
    void markReadFn({ data: { threadId: activeId } }).then(() => loadThreads());
  }, [activeId, loadMessages, loadThreads, markReadFn]);

  // Auto-scroll to latest message — scroll only the messages container,
  // not the whole page (otherwise clicking a thread jumps the page to the bottom).
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

  const active = threads.find((t) => t.id === activeId) ?? null;
  const activePhone = active?.phone || newPhone;

  async function uploadAttachments(files: File[] = composeFiles): Promise<string[]> {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const f of files) {
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
    if (sendingRef.current) return;
    if (!activePhone) { setError("Enter a phone number to start a new thread."); return; }
    if (!composeBody.trim() && composeFiles.length === 0) return;
    sendingRef.current = true;
    setSending(true); setError(null);
    // Snapshot + clear immediately so repeat Enter has nothing to send.
    const bodyToSend = composeBody;
    const filesToSend = composeFiles;
    setComposeBody("");
    setComposeFiles([]);
    try {
      const mediaUrls = await uploadAttachments(filesToSend);
      const result = await sendSmsFn({ data: { to: activePhone, body: bodyToSend, mediaUrls } });
      if (!result.success) {
        // Restore so the user can retry
        setComposeBody(bodyToSend);
        setComposeFiles(filesToSend);
        setError(result.error);
      } else {
        setShowNewThread(false);
        if (result.threadId) setActiveId(result.threadId);
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

  return (
    <div className="h-full w-full flex flex-col" style={{ background: "#f7f7f5", color: "#111111" }}>
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3" style={{ background: "#ffffff", borderBottom: "1px solid #ebebeb" }}>
        {([
          { key: "messages", label: "Messages", Icon: MessageSquarePlus },
          { key: "calls", label: "Calls", Icon: Phone },
        ] as const).map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: active ? "#f4522d" : "#666",
                borderBottom: active ? "2px solid #f4522d" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "calls" ? (
        <CallsPanel />
      ) : (
      <div className="flex-1 flex min-h-0">
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
                className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-surface-soft disabled:opacity-50"
                title="Refresh"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => { setShowNewThread(true); setActiveId(null); setNewPhone(""); }}
                className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-surface-soft"
                title="New message"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground" />
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
            <EmptyState
              title="No conversations yet"
              description="Inbound and outbound SMS threads will appear here."
            />
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
                    <div className="text-[11px] text-foreground truncate">{t.phone}</div>
                    <div className="text-xs text-foreground truncate mt-1">
                      {t.last_direction === "outbound" ? "You: " : ""}{t.last_message_preview || "—"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-foreground">{fmtTime(t.last_message_at)}</span>
                    {t.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
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
          <div className="flex-1 flex items-center justify-center text-sm text-foreground">
            Select a conversation or start a new one.
          </div>
        )}

        {(active || showNewThread) && (
          <>
            <header className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid #ebebeb", background: "#ffffff" }}>
              <div className="flex-1 min-w-0">
                {active ? (
                  <>
                    <div className="text-sm font-semibold">
                      {active.display_name || active.clinic?.clinic_name || "Unknown"}
                    </div>
                    <div className="text-xs text-foreground">{active.phone}</div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground">To:</span>
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
              {activePhone && (
                <button
                  type="button"
                  onClick={() => dialerCall(activePhone, myRepId ? { repId: myRepId } : undefined)}
                  disabled={dialerStatus !== "ready"}
                  title={dialerStatus === "ready" ? `Call ${activePhone}` : "Phone not ready"}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-white text-xs font-semibold shadow active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#10b981" }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ background: "#f7f7f5" }}>
              {active && messages.length === 0 && (
                <div className="text-center text-xs text-foreground py-8">No messages in this conversation yet.</div>
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
                            <button
                              key={u}
                              type="button"
                              onClick={() => setLightboxUrl(u)}
                              className="block p-0 border-0 bg-transparent cursor-zoom-in"
                            >
                              <img src={u} alt="MMS" className="max-h-48 rounded-lg" />
                            </button>
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
                <label className="h-9 w-9 inline-flex items-center justify-center rounded cursor-pointer hover:bg-surface-soft" title="Attach image">
                  <ImageIcon className="h-4 w-4 text-foreground" />
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
              <div className="text-[10px] text-foreground mt-2">
                Press Enter to send · Shift+Enter for new line · Sent from +61 468 031 075
              </div>
            </div>
          </>
        )}
      </section>
      </div>
      )}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 cursor-zoom-out"
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
    </div>
  );
}

function CallsPanel() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [clinicMap, setClinicMap] = useState<Map<string, string>>(new Map());
  const [phoneNameMap, setPhoneNameMap] = useState<Map<string, string>>(new Map());
  const [dialInput, setDialInput] = useState("");
  const [filter, setFilter] = useState("");
  const { call: dialerCall, dialerStatus, status, activePhone, hangup } = useTwilioDevice(true);
  const myRepId = useCurrentRepId();
  const navigate = useNavigate();

  const loadCalls = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("call_records")
      .select("id, direction, phone, from_number, status, outcome, duration, duration_seconds, called_at, recording_url, lead_id, clinic_id, rep_id")
      .order("called_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("loadCalls", error);
      setLoading(false);
      return;
    }
    const rows = (data as unknown as CallRow[]) ?? [];
    setCalls(rows);

    const tail9 = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").slice(-9);

    // Resolve lead names + clinic names by id
    const leadIds = Array.from(new Set(rows.map((r) => r.lead_id).filter(Boolean) as string[]));
    const clinicIds = Array.from(new Set(rows.map((r) => r.clinic_id).filter(Boolean) as string[]));
    const leadNameMap = new Map<string, string>();
    const clinicNameMap = new Map<string, string>();
    if (leadIds.length) {
      const { data: leads } = await supabase
        .from("meta_leads").select("id, first_name, last_name").in("id", leadIds);
      for (const l of (leads as Array<{ id: string; first_name: string | null; last_name: string | null }>) ?? []) {
        const name = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
        if (name) leadNameMap.set(l.id, name);
      }
    }
    if (clinicIds.length) {
      const { data: clinics } = await supabase
        .from("clinics").select("id, clinic_name").in("id", clinicIds);
      for (const c of (clinics as Array<{ id: string; clinic_name: string }>) ?? []) {
        clinicNameMap.set(c.id, c.clinic_name);
      }
    }
    setNameMap(leadNameMap);
    setClinicMap(clinicNameMap);

    // Phone-tail fallback: for rows we couldn't name via id, look up the
    // number in meta_leads / clinics so the call log never shows "Unknown"
    // when we actually have the contact saved.
    const unknownTails = new Set<string>();
    for (const r of rows) {
      const hasName = (r.lead_id && leadNameMap.get(r.lead_id)) || (r.clinic_id && clinicNameMap.get(r.clinic_id));
      if (hasName) continue;
      const t = tail9(r.phone ?? r.from_number);
      if (t.length >= 7) unknownTails.add(t);
    }
    const pm = new Map<string, string>();
    if (unknownTails.size) {
      const tails = Array.from(unknownTails);
      const orExpr = tails.map((t) => `phone.ilike.%${t}%`).join(",");
      try {
        const { data: leads2 } = await supabase
          .from("meta_leads").select("first_name, last_name, phone").or(orExpr).limit(500);
        for (const l of (leads2 as Array<{ first_name: string | null; last_name: string | null; phone: string | null }>) ?? []) {
          const t = tail9(l.phone);
          if (!t) continue;
          const name = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
          if (name && !pm.has(t)) pm.set(t, name);
        }
      } catch { /* noop */ }
      try {
        const { data: clinics2 } = await supabase
          .from("clinics").select("clinic_name, phone").or(orExpr).limit(500);
        for (const c of (clinics2 as Array<{ clinic_name: string | null; phone: string | null }>) ?? []) {
          const t = tail9(c.phone);
          if (!t) continue;
          if (c.clinic_name && !pm.has(t)) pm.set(t, c.clinic_name);
        }
      } catch { /* noop */ }
    }
    setPhoneNameMap(pm);
    setLoading(false);
  }, []);

  useEffect(() => { void loadCalls(); }, [loadCalls]);

  useRealtimeSubscription({ table: "call_records" }, () => void loadCalls());

  const resolveName = useCallback((c: CallRow): string => {
    if (c.lead_id && nameMap.get(c.lead_id)) return nameMap.get(c.lead_id)!;
    if (c.clinic_id && clinicMap.get(c.clinic_id)) return clinicMap.get(c.clinic_id)!;
    const t = (c.phone ?? c.from_number ?? "").replace(/\D/g, "").slice(-9);
    if (t && phoneNameMap.get(t)) return phoneNameMap.get(t)!;
    return "";
  }, [nameMap, clinicMap, phoneNameMap]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((c) => {
      const name = resolveName(c);
      return name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q);
    });
  }, [calls, resolveName, filter]);

  const inCall = status === "in-call" || status === "connecting";

  function doDial() {
    const num = dialInput.trim();
    if (!num) return;
    dialerCall(num, myRepId ? { repId: myRepId } : undefined);
  }

  function append(ch: string) {
    setDialInput((p) => p + ch);
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Dialer */}
      <aside className="w-[340px] flex flex-col p-5" style={{ borderRight: "1px solid #ebebeb", background: "#ffffff" }}>
        <div className="mb-3">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Dialer</div>
          <input
            value={dialInput}
            onChange={(e) => setDialInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") doDial(); }}
            placeholder="+61..."
            className="w-full h-12 px-3 rounded-lg text-lg font-mono outline-none text-center tracking-wider"
            style={{ background: "#f9f9f9", border: "1px solid #ebebeb", color: "#111" }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {["1","2","3","4","5","6","7","8","9","*","0","#"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => append(d)}
              className="h-12 rounded-lg text-lg font-semibold hover:bg-[#f1f1f1] active:scale-95 transition"
              style={{ background: "#f9f9f9", border: "1px solid #ebebeb", color: "#111" }}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3">
          {inCall ? (
            <button
              type="button"
              onClick={() => hangup()}
              className="flex-1 h-12 rounded-lg text-white font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition"
              style={{ background: "#dc2626" }}
            >
              <Phone className="h-4 w-4 rotate-[135deg]" />
              Hang up
            </button>
          ) : (
            <button
              type="button"
              onClick={doDial}
              disabled={dialerStatus !== "ready" || !dialInput.trim()}
              title={dialerStatus === "ready" ? "Call" : "Phone not ready"}
              className="flex-1 h-12 rounded-lg text-white font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#10b981" }}
            >
              <Phone className="h-4 w-4" />
              Call
            </button>
          )}
          <button
            type="button"
            onClick={() => setDialInput((p) => p.slice(0, -1))}
            className="h-12 w-12 inline-flex items-center justify-center rounded-lg hover:bg-[#f1f1f1]"
            style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
            title="Backspace"
          >
            <Delete className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Status: <span style={{ color: dialerStatus === "ready" ? "#10b981" : "#f59e0b", fontWeight: 600 }}>{dialerStatus}</span>
          {activePhone && <> · <span className="text-foreground">{activePhone}</span></>}
        </div>
      </aside>

      {/* Call log */}
      <section className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid #ebebeb", background: "#ffffff" }}>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Call log</h2>
            <div className="text-[11px] text-muted-foreground">Recent calls — who, when, how long</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search name or number…"
                className="h-9 w-[240px] pl-8 pr-3 rounded text-sm outline-none"
                style={{ background: "#f9f9f9", color: "#111", border: "1px solid #ebebeb" }}
              />
            </div>
            <button
              type="button"
              onClick={() => void loadCalls()}
              className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-surface-soft"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && calls.length === 0 && (
            <div className="p-4"><ListSkeleton rows={6} /></div>
          )}
          {!loading && filtered.length === 0 && (
            <EmptyState
              title="No calls yet"
              description="Placed and received calls will show up here with their recordings."
            />
          )}
          {filtered.map((c) => {
            const isOutbound = (c.direction ?? "outbound") === "outbound";
            const name = resolveName(c) || c.phone || c.from_number || "Unknown";
            const secs = c.duration_seconds ?? c.duration ?? null;
            const missed = !isOutbound && (!secs || secs === 0);
            const Icon = missed ? PhoneMissed : isOutbound ? PhoneOutgoing : PhoneIncoming;
            const iconColor = missed ? "#dc2626" : isOutbound ? "#3b82f6" : "#10b981";
            const phone = c.phone ?? c.from_number ?? "";
            return (
              <div
                key={c.id}
                className="flex items-center gap-4 px-6 py-3 hover:bg-surface-soft transition-colors"
                style={{ borderBottom: "1px solid #f1f1f1" }}
              >
                <div className="h-9 w-9 inline-flex items-center justify-center rounded-full" style={{ background: `${iconColor}15` }}>
                  <Icon className="h-4 w-4" style={{ color: iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-foreground">{name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{phone}</div>
                </div>
                <div className="text-xs text-muted-foreground w-[140px] text-right">{fmtCallTime(c.called_at)}</div>
                <div className="text-xs font-mono text-foreground w-[60px] text-right">{fmtCallDuration(secs)}</div>
                <div className="w-[90px] flex justify-end">
                  {c.outcome && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "#f1f5f9", color: "#334155" }}>
                      {c.outcome}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Prefer exact lead_id (safe even when multiple leads share a number).
                    // Fall back to phone-number lookup handled by the sales-call route.
                    if (c.lead_id) {
                      navigate({ to: "/sales-call", search: { leadId: c.lead_id } });
                    } else if (phone) {
                      navigate({ to: "/sales-call", search: { phone } });
                    }
                  }}
                  disabled={!c.lead_id && !phone}
                  className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-full text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
                  style={{ background: "#0ea5e9" }}
                  title="Open this person in the Sales Call portal"
                >
                  Open
                  <ArrowRight className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!phone) return;
                    const extra: Record<string, string> = {};
                    if (myRepId) extra.repId = myRepId;
                    // Pass leadId when we know it so the FloatingCallWidget's
                    // "Open in Sales Call" button jumps to the correct person
                    // instead of falling back to a phone-number match (which
                    // can resolve to the wrong lead when numbers are shared).
                    if (c.lead_id) extra.leadId = c.lead_id;
                    dialerCall(phone, Object.keys(extra).length ? extra : undefined);
                  }}
                  disabled={!phone || dialerStatus !== "ready" || inCall}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-full text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
                  style={{ background: "#10b981" }}
                  title={`Call ${phone}`}
                >
                  <Phone className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
