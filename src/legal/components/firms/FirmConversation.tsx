// Ported from the Legal app (family-law-floater/src/components/firms/FirmConversation.tsx). Re-run the port script to refresh.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, PhoneIncoming, PhoneOutgoing, Send, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useFirmTextDraft } from "@/legal/hooks/use-firm-text-draft";
import { FirmCallRecording } from "./FirmCallRecording";
import {
  callbackText,
  firmEventWasRead,
  latestFirmIncomingAt,
  type FirmMessage,
} from "@/legal/lib/firm-conversations";
import type { FirmApplication } from "@/legal/lib/firm-applications";
import { formatDateTime } from "@/legal/lib/firm-applications";
import type { FirmCall } from "@/legal/lib/firm-calling";
import type { getFirmCallWorkspace } from "@/legal/lib/firm-calling.functions";
import {
  getFirmConversation,
  reconnectFirmNumber,
  readFirmConversation,
  sendFirmMessage,
} from "@/legal/lib/firm-conversations.functions";

export function FirmConversation({
  app,
  calls,
  onDirtyChange,
  callsError,
  userId,
}: {
  app: FirmApplication;
  calls: FirmCall[];
  onDirtyChange: (dirty: boolean) => void;
  callsError?: string | undefined;
  userId?: string;
}) {
  const get = useServerFn(getFirmConversation);
  const send = useServerFn(sendFirmMessage);
  const reconnect = useServerFn(reconnectFirmNumber);
  const review = useServerFn(readFirmConversation);
  const client = useQueryClient();
  const { draft, setDraft, attempt, setAttempt, protectedDraft } = useFirmTextDraft(
    userId ? `firm-text-draft:v1:${userId}:${app.id}` : null,
  );
  const [older, setOlder] = useState<FirmMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [more, setMore] = useState(true);
  const sendLock = useRef(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [readCheck, setReadCheck] = useState(0);
  const lastReadAttempt = useRef("");
  const receipt = useRef<{
    messageThrough: string | null;
    callThrough: string | null;
    reviewedAt: string;
  } | null>(null);
  const query = useQuery({
    queryKey: ["firm-conversation", app.id],
    queryFn: () => get({ data: { applicationId: app.id } }),
    refetchInterval: 5000,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["firm-conversation", app.id] });
    void client.invalidateQueries({ queryKey: ["firm-conversation-inbox"] });
    void client.invalidateQueries({ queryKey: ["firm-call-workspace", app.id] });
  };
  const mutation = useMutation({ mutationFn: send });
  const connection = useMutation({
    mutationFn: () => reconnect(),
    onSuccess: () => {
      toast.success("Bold number reconnected");
      void client.invalidateQueries({ queryKey: ["firm-conversation"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  useEffect(() => {
    onDirtyChange((!protectedDraft && (!!draft.trim() || !!attempt)) || mutation.isPending);
  }, [draft, mutation.isPending, attempt, protectedDraft, onDirtyChange]);
  const messages = [
    ...new Map([...older, ...(query.data?.messages ?? [])].map((m) => [m.id, m])).values(),
  ];
  const events = [
    ...messages.map((m) => ({ id: m.id, date: m.created_at, message: m, call: null })),
    ...calls.map((c) => ({ id: c.id, date: c.created_at, message: null, call: c })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const latestEvent = events.at(-1)?.id;
  useEffect(() => {
    const check = () => {
      const el = feedRef.current;
      if (el && pinned.current) el.scrollTop = el.scrollHeight;
      setReadCheck((n) => n + 1);
    };
    const observer = new IntersectionObserver(check);
    if (feedRef.current) observer.observe(feedRef.current);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  // Calls and messages load independently: older texts can increase the feed
  // height without changing its newest event. Pin before scroll events fire.
  useLayoutEffect(() => {
    if (pinned.current && feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [latestEvent, events.length]);
  const unreadMessages = messages
    .filter(
      (m) =>
        m.direction === "inbound" &&
        !m.reviewed_at &&
        !firmEventWasRead(m, receipt.current?.messageThrough ?? null),
    )
    .map((m) => m.id);
  const unreadCalls = calls
    .filter(
      (c) =>
        c.direction === "inbound" &&
        !c.reviewed_at &&
        !firmEventWasRead(c, receipt.current?.callThrough ?? null),
    )
    .map((c) => c.id);
  const acknowledge = useMutation({
    mutationFn: review,
    onSuccess: ({ reviewedAt }, { data }) => {
      receipt.current = {
        messageThrough: data.messageThrough,
        callThrough: data.callThrough,
        reviewedAt,
      };
      const read = <
        T extends { direction?: string; created_at: string; reviewed_at?: string | null },
      >(
        row: T,
        through: string | null,
      ): T =>
        firmEventWasRead(row, through)
          ? { ...row, reviewed_at: row.reviewed_at ?? reviewedAt }
          : row;
      setOlder((rows) => rows.map((row) => read(row, data.messageThrough)));
      client.setQueryData<typeof query.data>(["firm-conversation", data.applicationId], (cached) =>
        cached
          ? { ...cached, messages: cached.messages.map((row) => read(row, data.messageThrough)) }
          : cached,
      );
      client.setQueryData<Awaited<ReturnType<typeof getFirmCallWorkspace>>>(
        ["firm-call-workspace", data.applicationId],
        (cached) =>
          cached
            ? { ...cached, calls: cached.calls.map((row) => read(row, data.callThrough)) }
            : cached,
      );
      refresh();
    },
  });
  const acknowledgeVisible = () => {
    acknowledge.mutate({
      data: {
        applicationId: app.id,
        messageThrough: latestFirmIncomingAt(messages),
        callThrough: latestFirmIncomingAt(calls),
      },
    });
  };
  const unreadKey = [...unreadMessages, ...unreadCalls].sort().join(",");
  // Recheck after render as well as focus/scroll changes: CSS can hide the feed
  // when switching workspace tabs. Each loaded snapshot is attempted only once.
  useEffect(() => {
    const el = feedRef.current;
    if (!unreadKey || acknowledge.isPending || !query.data || query.isError || !el) return;
    if (
      document.visibilityState !== "visible" ||
      !document.hasFocus() ||
      !el.getClientRects().length
    )
      return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    if (!pinned.current || el.scrollHeight - el.scrollTop - el.clientHeight >= 80) return;
    const attemptKey = `${app.id}:${unreadKey}:${query.dataUpdatedAt}:${readCheck}`;
    if (lastReadAttempt.current === attemptKey) return;
    lastReadAttempt.current = attemptKey;
    acknowledgeVisible();
  });
  const submit = async () => {
    if (sendLock.current || (!draft.trim() && !attempt)) return;
    sendLock.current = true;
    const request = attempt ?? { id: crypto.randomUUID(), body: draft.trim() };
    setAttempt(request);
    try {
      const result = await mutation.mutateAsync({ data: { applicationId: app.id, ...request } });
      setAttempt(null);
      if (result.status === "rejected") {
        toast.error(result.rejectionReason || "Could not prepare this text.");
        refresh();
        return;
      }
      if (result.status === "failed" || result.status === "undelivered")
        toast.error("Text was not delivered. Check its status below before trying again.");
      else {
        setDraft("");
        if (result.status === "unknown" || result.status === "sending")
          toast.info(
            "Send submitted; delivery is not confirmed. Check the conversation before sending again.",
          );
      }
      refresh();
    } catch (e) {
      toast.error("Could not confirm the send", {
        description:
          e instanceof Error ? e.message : "Try Check send to safely check the same request.",
      });
    } finally {
      sendLock.current = false;
    }
  };
  const loadOlder = async () => {
    const before = messages.map((m) => m.created_at).sort()[0];
    if (!before) return;
    setLoadingOlder(true);
    try {
      const result = await get({ data: { applicationId: app.id, before } });
      setOlder((v) => [...v, ...result.messages]);
      setMore(result.hasMore);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load older texts");
    } finally {
      setLoadingOlder(false);
    }
  };
  return (
    <section className="firm-conversation" aria-label="Messages and calls">
      <div className="firm-conversation-heading">
        <div>
          <h3>Messages & calls</h3>
          <p>
            {query.data?.sender
              ? `Your Bold number ${query.data.sender}`
              : "Connecting your Bold number…"}
          </p>
        </div>
        {unreadMessages.length + unreadCalls.length > 0 && (
          <button
            type="button"
            onClick={acknowledgeVisible}
            disabled={acknowledge.isPending}
            title="Mark visible replies and callbacks reviewed"
          >
            <CheckCheck size={15} /> Mark reviewed
          </button>
        )}
      </div>
      {acknowledge.error && (
        <p role="alert">Couldn’t mark this conversation read. We’ll retry automatically.</p>
      )}
      <div
        className="firm-conversation-feed"
        ref={feedRef}
        onScroll={() => {
          const el = feedRef.current;
          if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          setReadCheck((n) => n + 1);
        }}
      >
        {query.isLoading && <p>Loading conversation…</p>}
        {query.error && (
          <p role="alert">
            Could not load messages. {query.error.message}{" "}
            <button onClick={() => void query.refetch()}>Retry</button>
          </p>
        )}
        {callsError && <p role="alert">Call history unavailable: {callsError}</p>}
        {query.data?.hasMore && more && (
          <button className="firm-older" disabled={loadingOlder} onClick={() => void loadOlder()}>
            {loadingOlder ? "Loading…" : "Load older texts"}
          </button>
        )}
        {!query.isLoading && !query.error && !events.length && (
          <div className="firm-conversation-empty">
            <MessageSquare size={30} />
            <h4>Start the conversation</h4>
            <p>Send a text after your call. Replies and callbacks will appear here.</p>
          </div>
        )}
        {events.map(({ id, date, message, call }) =>
          message ? (
            <article key={id} className={`firm-message ${message.direction}`}>
              <p>{message.body}</p>
              <div className="firm-event-meta">
                <span>{formatDateTime(date)}</span>
                <span>
                  {message.direction === "inbound"
                    ? message.reviewed_at ||
                      firmEventWasRead(message, receipt.current?.messageThrough ?? null)
                      ? "Received"
                      : "New reply"
                    : message.status === "unknown"
                      ? "Delivery uncertain — check before resending"
                      : message.status === "sending"
                        ? "Awaiting send confirmation"
                        : message.status}
                  {message.error_code ? ` (${message.error_code})` : ""}
                </span>
              </div>
            </article>
          ) : (
            call && (
              <article key={id} className="firm-call-event">
                {call.direction === "inbound" ? (
                  <PhoneIncoming size={17} />
                ) : (
                  <PhoneOutgoing size={17} />
                )}
                <div>
                  <strong>
                    {call.direction === "inbound"
                      ? call.status === "voicemail"
                        ? "Voicemail received"
                        : "Callback received"
                      : "Outgoing call"}{" "}
                    · {call.status.replaceAll("-", " ")}
                  </strong>
                  <p className="firm-event-meta">
                    {formatDateTime(date)}
                    {call.duration_seconds != null ? ` · ${call.duration_seconds}s` : ""}
                    {call.direction === "inbound" &&
                    !call.reviewed_at &&
                    !firmEventWasRead(call, receipt.current?.callThrough ?? null)
                      ? " · Needs attention"
                      : ""}
                  </p>
                  {call.has_recording && (
                    <FirmCallRecording
                      applicationId={app.id}
                      callId={call.id}
                      filename={`${(app.firm_name || app.first_name || "firm").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${call.id}.mp3`}
                    />
                  )}
                  {call.summary && (
                    <details>
                      <summary>Call notes</summary>
                      <p className="whitespace-pre-wrap">{call.summary}</p>
                    </details>
                  )}
                  {call.transcript && (
                    <details>
                      <summary>
                        {call.status === "voicemail" ? "Voicemail transcript" : "Transcript"}
                      </summary>
                      <p className="whitespace-pre-wrap">{call.transcript}</p>
                    </details>
                  )}
                  {call.direction === "inbound" && call.has_recording && !call.transcript && (
                    <p>
                      {call.status === "voicemail" ? "Voicemail transcript" : "Call transcript"}{" "}
                      {call.analysis_status === "failed"
                        ? "needs a retry in Notes & call sheet history."
                        : "is being prepared."}
                    </p>
                  )}
                </div>
              </article>
            )
          ),
        )}
      </div>
      <div className="firm-text-composer">
        {query.data?.configurationError && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p role="alert">{query.data.configurationError}</p>
            {query.data.canReconnect && (
              <button
                type="button"
                className="mt-2 font-semibold underline"
                disabled={connection.isPending}
                onClick={() => connection.mutate()}
              >
                {connection.isPending ? "Reconnecting…" : "Reconnect number"}
              </button>
            )}
          </div>
        )}
        {query.data?.optedOut && (
          <p role="alert" className="text-destructive">
            This contact has opted out of texts.
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`firm-sms-${app.id}`}>Text {app.first_name || "this firm"}</label>
          <button
            type="button"
            disabled={!query.data?.sender || !!attempt || !!draft}
            onClick={() => setDraft(callbackText(app.first_name, query.data!.sender!))}
          >
            Use callback introduction
          </button>
        </div>
        <textarea
          id={`firm-sms-${app.id}`}
          rows={4}
          maxLength={1600}
          value={draft}
          disabled={mutation.isPending || !!attempt}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write your message…"
        />
        {draft && protectedDraft && (
          <p className="crm-coach-note">Draft saved on this device · not sent</p>
        )}
        <div className="firm-text-actions">
          <span>
            {draft.length}/1600 · To {app.phone || "no mobile added"}
          </span>
          <button
            type="button"
            disabled={
              mutation.isPending ||
              (!draft.trim() && !attempt) ||
              !query.data ||
              !!query.error ||
              (!attempt && (!!query.data.configurationError || query.data.optedOut)) ||
              !app.phone
            }
            onClick={() => void submit()}
          >
            <Send size={14} />
            {mutation.isPending ? "Sending…" : attempt ? "Check send" : "Send text"}
          </button>
        </div>
        {!attempt && draft && (
          <button type="button" className="firm-discard-text" onClick={() => setDraft("")}>
            Discard draft
          </button>
        )}
        {attempt && !mutation.isPending && (
          <p>
            Send status is unconfirmed. “Check send” uses the same reference to avoid a duplicate.
          </p>
        )}
      </div>
    </section>
  );
}
