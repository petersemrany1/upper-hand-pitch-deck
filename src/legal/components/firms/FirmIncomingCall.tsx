// Ported from the Legal app (family-law-floater/src/components/firms/FirmIncomingCall.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellOff, MessageSquare, Mic, MicOff, Phone, PhoneOff, X } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { Textarea } from "@/legal/components/ui/textarea";
import { sendIncomingFirmMessage } from "@/legal/lib/firm-callbacks.functions";
import type { FirmCallbacks } from "@/legal/hooks/use-firm-callbacks";
import type { FirmIncomingCaller } from "@/legal/lib/firm-callbacks";

// Presentation also used by the local preview; no provider request without Send.
export function FirmIncomingCall({
  receiver,
  onSent,
  onDraftChange,
  preview = false,
  senderName = "Peter",
}: {
  receiver: FirmCallbacks;
  onSent: () => void;
  onDraftChange?: (dirty: boolean) => void;
  preview?: boolean;
  senderName?: string;
}) {
  const sendMessage = useServerFn(sendIncomingFirmMessage);
  const latestReceiver = useRef(receiver);
  latestReceiver.current = receiver;
  const [draftCaller, setDraftCaller] = useState<FirmIncomingCaller | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
  const sendId = useRef<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    onDraftChange?.(!!draftCaller);
  }, [draftCaller, onDraftChange]);
  const caller = receiver.caller ?? draftCaller;
  if (!caller) return null;
  const composing = draftCaller?.callSid === caller.callSid;
  const connected = !!receiver.caller && receiver.phase === "connected";
  const incoming = !!receiver.caller && receiver.phase !== "connected";
  const closeDraft = () => {
    setDraftCaller(null);
    setBody("");
    setFeedback("");
    setUncertain(false);
    sendId.current = null;
  };
  const compose = () => {
    receiver.silence();
    setDraftCaller(caller);
    setBody(
      `Hi ${caller.name.split(" ")[0]}, it's ${senderName} from Bold. I can't take your call right now. I'll call you back shortly.`,
    );
    setFeedback("");
    setUncertain(false);
    sendId.current = null;
  };
  const send = async () => {
    if (!draftCaller || sendLock.current || !body.trim() || uncertain || preview) return;
    sendLock.current = true;
    setSending(true);
    setFeedback("");
    sendId.current ??= crypto.randomUUID();
    try {
      const result = await sendMessage({
        data: { callSid: draftCaller.callSid, id: sendId.current, body: body.trim() },
      });
      if (
        result.status === "rejected" ||
        result.status === "failed" ||
        result.status === "undelivered"
      ) {
        setFeedback(
          result.rejectionReason || "The message was not delivered. Check the firm's inbox.",
        );
        sendId.current = null;
      } else if (result.status === "unknown" || result.status === "sending") {
        setUncertain(true);
        setFeedback("Delivery is unconfirmed. Check the firm's inbox before sending another text.");
      } else {
        const current = latestReceiver.current;
        if (current.caller?.callSid === draftCaller.callSid && current.phase === "ringing")
          void current.hangUp();
        closeDraft();
      }
      onSent();
    } catch {
      setUncertain(true);
      setFeedback(
        "The send could not be confirmed. Check the firm's inbox before sending another text.",
      );
    } finally {
      setSending(false);
      sendLock.current = false;
    }
  };
  return (
    <section
      role="dialog"
      aria-label={connected ? "Firm call in progress" : "Incoming firm call"}
      className="fixed right-4 bottom-4 z-[100] max-h-[calc(100dvh-2rem)] w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl"
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${connected ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}
        >
          <Phone size={21} />
        </div>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-xs font-medium text-muted-foreground">
            {connected
              ? `Connected · ${Math.floor(receiver.seconds / 60)}:${String(receiver.seconds % 60).padStart(2, "0")}`
              : incoming
                ? "Firm calling back"
                : "Reply to missed call"}
          </p>
          <h2 className="truncate text-xl font-semibold">{caller.name}</h2>
          <p className="truncate text-sm text-muted-foreground">{caller.firmName}</p>
          <p className="text-xs text-muted-foreground">{caller.phone}</p>
        </div>
        {!receiver.caller && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close reply"
            disabled={sending}
            onClick={closeDraft}
          >
            <X size={18} />
          </Button>
        )}
      </div>
      {receiver.error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {receiver.error}
        </p>
      )}
      {incoming && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => void receiver.answer()}
              disabled={receiver.phase === "answering"}
            >
              <Phone size={16} />
              {receiver.phase === "answering" ? "Answering…" : "Answer"}
            </Button>
            <Button variant="destructive" onClick={receiver.hangUp}>
              <PhoneOff size={16} />
              Hang up
            </Button>
            <Button variant="outline" onClick={receiver.silence} disabled={receiver.silenced}>
              <BellOff size={16} />
              {receiver.silenced ? "Silenced" : "Silence"}
            </Button>
            <Button
              variant="outline"
              disabled={!caller.phone.startsWith("+614") || !!draftCaller || sending}
              onClick={compose}
            >
              <MessageSquare size={16} />
              Send message
            </Button>
          </div>
          {receiver.silenced && (
            <p className="mt-2 text-xs text-muted-foreground">
              Ringtone silenced. You can still answer.
            </p>
          )}
          {!caller.phone.startsWith("+614") && (
            <p className="mt-2 text-xs text-muted-foreground">
              Text replies require a mobile number.
            </p>
          )}
        </>
      )}
      {connected && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={receiver.toggleMute}>
            {receiver.muted ? <MicOff size={16} /> : <Mic size={16} />}
            {receiver.muted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="destructive" onClick={receiver.hangUp}>
            <PhoneOff size={16} />
            Hang up
          </Button>
        </div>
      )}
      {composing && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <label htmlFor="firm-callback-reply" className="text-sm font-medium">
            Text reply
          </label>
          <Textarea
            id="firm-callback-reply"
            value={body}
            maxLength={1600}
            disabled={sending || uncertain}
            onChange={(event) => setBody(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {preview
              ? "Preview only. No message will be sent."
              : "Send queues the text and dismisses this ringing call for you."}
          </p>
          {feedback && (
            <p role="status" className="text-sm">
              {feedback}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              disabled={preview || sending || uncertain || !body.trim()}
              onClick={() => void send()}
            >
              {sending ? "Sending…" : "Send text"}
            </Button>
            <Button variant="ghost" disabled={sending} onClick={closeDraft}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
