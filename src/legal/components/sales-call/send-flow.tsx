// Ported from the Legal app (family-law-floater/src/components/sales-call/send-flow.tsx). Re-run the port script to refresh.
// Review-before-send dialogs for the booking confirmation text and the firm handover email.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Mail, MessageSquare } from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import { Textarea } from "@/legal/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import { withIntelPreview } from "@/legal/lib/handover-intel-format";
import { FUNDING_LABELS } from "@/legal/lib/client-leads";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/legal/components/ui/dialog";

export type SmsPreview = {
  ok: boolean;
  error?: string | undefined;
  body?: string | undefined;
  phone?: string | null | undefined;
  bookingKey?: string | undefined;
};

export function ConfirmationSmsDialog({
  open,
  preview,
  loading,
  sending,
  onCancel,
  onSend,
}: {
  open: boolean;
  preview: SmsPreview | null;
  loading: boolean;
  sending: boolean;
  onCancel: () => void;
  onSend: (body: string) => void;
}) {
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open && preview?.body) setBody(preview.body);
  }, [open, preview?.body]);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onCancel())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Confirmation text to the client
          </DialogTitle>
          <DialogDescription>
            Read it before it goes out{preview?.phone ? ` to ${preview.phone}` : ""}. You can edit
            the wording. A confirmation is sent once for this booking.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Building the message…
          </div>
        ) : preview && !preview.ok ? (
          <p className="py-4 text-sm text-destructive">
            {preview.error ?? "Could not build the text"}
          </p>
        ) : (
          <>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className="text-[14px] leading-relaxed"
              aria-label="Confirmation text message"
            />
            <p className="text-xs text-muted-foreground">{body.length} characters</p>
          </>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={() => onSend(body)}
            disabled={sending || loading || !body.trim() || !preview?.ok}
          >
            {sending ? "Sending…" : "Send text"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type HandoverPreview = {
  ok: boolean;
  error?: string | undefined;
  to?: string | undefined;
  cc?: string[] | undefined;
  automaticCc?: string[] | undefined;
  subject?: string | undefined;
  html?: string | undefined;
  notes?: string | undefined;
  firmName?: string | undefined;
  lawyerName?: string | null | undefined;
  clientName?: string | undefined;
  appointmentDate?: string | null | undefined;
  appointmentTime?: string | null | undefined;
  funding?: string | null | undefined;
  clientPhone?: string | null | undefined;
  clientEmail?: string | null | undefined;
};

function Label({ children, tag }: { children: ReactNode; tag?: "editable" | "required" }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
      {tag ? (
        <span className="ml-2" style={{ color: "var(--coral)" }}>
          — {tag === "editable" ? "EDITABLE" : "REQUIRED"}
        </span>
      ) : null}
    </p>
  );
}

function prettyAppointment(date?: string | null, time?: string | null) {
  if (!date) return "Not booked";
  const parsed = new Date(`${date}T00:00:00`);
  const day = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  return time ? `${day} at ${time}` : day;
}

export function HandoverDialog({
  open,
  preview,
  loading,
  intelBuilding,
  intelError,
  intelProgress,
  onRetry,
  onRetrySummary,
  sending,
  onCancel,
  onSend,
}: {
  open: boolean;
  preview: HandoverPreview | null;
  loading: boolean;
  intelBuilding?: boolean;
  intelError?: string | null;
  intelProgress?: string | null;
  onRetry?: () => void;
  onRetrySummary?: () => void;
  sending: boolean;
  onCancel: () => void;
  onSend: (payload: { to: string; cc: string; notes: string; funding: string }) => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [notes, setNotes] = useState("");
  const notesEdited = useRef(false);
  const [notesReviewed, setNotesReviewed] = useState(false);
  const [funding, setFunding] = useState("");
  const defaultCc = (preview?.cc ?? []).join(", ");
  useEffect(() => {
    if (!open || !preview?.ok) return;
    setTo(preview.to ?? "");
    setCc(defaultCc);
  }, [open, preview?.ok, preview?.to, defaultCc]);

  useEffect(() => {
    if (!open || !preview?.ok) return;
    // Once the rep chooses the notes, a late summary must not change the email
    // they have just reviewed. The parent keys this dialog by client ID.
    if (!notesEdited.current && !notesReviewed) setNotes(preview.notes ?? "");
  }, [open, preview?.ok, preview?.notes, notesReviewed]);

  useEffect(() => {
    if (!open || !preview?.ok) return;
    setFunding(preview.funding ?? "");
  }, [open, preview?.ok, preview?.funding]);

  const manualNotes = notesEdited.current && Boolean(notes.trim());
  const reviewedNotes = notesReviewed && Boolean(notes.trim());
  const needsReview = (intelBuilding || Boolean(intelError)) && !manualNotes && !reviewedNotes;
  const sendBlockedReason = loading
    ? "Loading the handover…"
    : !preview?.ok
      ? "Load the handover before sending."
      : !notes.trim()
        ? "Add the client handover notes before sending."
        : needsReview
          ? "Check that the saved notes include the latest call before continuing."
          : !to.trim()
            ? "Enter the firm's email address before sending."
            : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onCancel())}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col p-0">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Review before sending
          </DialogTitle>
          <DialogDescription className="text-xs">
            Edit anything before it goes to the firm
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Building the handover…
          </div>
        ) : preview && !preview.ok ? (
          <div className="px-5 py-6 text-sm text-destructive">
            {preview.error ?? "Could not build the handover"}
            {onRetry && (
              <Button variant="outline" className="mt-3 block" onClick={onRetry}>
                Retry handover
              </Button>
            )}
          </div>
        ) : (
          <div className="min-h-0 space-y-3 overflow-y-auto px-5 py-4">
            <div className="space-y-0.5">
              <Label>Appointment</Label>
              <p className="text-[14px] font-semibold">
                {prettyAppointment(preview?.appointmentDate, preview?.appointmentTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                {preview?.lawyerName ? `with ${preview.lawyerName} · ` : ""}
                {preview?.firmName ?? ""}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label tag="editable">Client intel</Label>
              {intelBuilding && !manualNotes && !reviewedNotes && (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm"
                >
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  {intelProgress ?? "Preparing the call transcript and summary…"}
                </p>
              )}
              <Textarea
                id="handover-notes"
                value={notes}
                onChange={(e) => {
                  notesEdited.current = true;
                  setNotesReviewed(false);
                  setNotes(e.target.value);
                }}
                aria-label="Client handover notes"
                rows={12}
                className="min-h-[240px] resize-y whitespace-pre-wrap p-3 text-[14px] leading-[1.7]"
                placeholder="Add or tidy up the key points the lawyer needs"
              />
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {reviewedNotes ? (
                  "Using the notes you checked. A later automatic summary will not replace them."
                ) : manualNotes ? (
                  "Using your written notes. Review them before sending the handover."
                ) : intelBuilding ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {notes.trim()
                      ? "Showing saved intel while the latest call summary is prepared. You can check these notes and continue without waiting."
                      : "Preparing the call transcript and summary. You can also write the handover notes above and send them yourself."}
                  </>
                ) : (
                  "Organised by topic. Each bullet appears under its section heading in the firm email."
                )}
              </p>
              {intelError && (
                <div
                  role="alert"
                  className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
                >
                  <p className="font-medium">
                    Automatic summary unavailable. Your booking is saved.
                  </p>
                  <p className="text-muted-foreground">
                    {manualNotes || reviewedNotes
                      ? "Your checked notes can be sent using Confirm & Send below."
                      : notes.trim()
                        ? "Your saved notes are still shown above. Check they include the latest call, make any corrections, then continue below."
                        : "Write the client handover notes above to continue, or retry the automatic summary."}
                  </p>
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Summary details</summary>
                    <p className="mt-1">{intelError}</p>
                  </details>
                  {(onRetrySummary || onRetry) && (
                    <Button
                      variant="outline"
                      onClick={onRetrySummary ?? onRetry}
                      disabled={intelBuilding || sending}
                    >
                      Retry summary
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label tag="editable">Funding path</Label>
              <Select value={funding} onValueChange={setFunding}>
                <SelectTrigger id="handover-funding" className="h-9 text-[14px]">
                  <SelectValue placeholder="Select a funding path" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FUNDING_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-[14px]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Phone</Label>
                <div className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-[13px]">
                  {preview?.clientPhone ?? "—"}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <div className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-[13px]">
                  {preview?.clientEmail ?? "—"}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label tag="required">Firm email</Label>
              <Input
                id="handover-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="bookings@bold-marketing.com.au"
                className="h-9 text-[14px]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="handover-cc" className="text-xs font-semibold">
                CC recipients (optional)
              </label>
              <Input
                id="handover-cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="colleague@firm.com.au, assistant@firm.com.au"
              />
              <p className="text-xs text-muted-foreground">
                These people receive the full handover. Changes here apply to this email only. Save
                regular recipients under the firm's Profile → Handover emails.
              </p>
            </div>
            {Boolean(preview?.automaticCc?.length) && (
              <div className="space-y-1 rounded-md border bg-muted/40 px-2.5 py-2">
                <Label>Always included</Label>
                <p className="text-[13px]">{preview?.automaticCc?.join(", ")}</p>
                <p className="text-xs text-muted-foreground">
                  Automatically copied on every handover, including resends.
                </p>
              </div>
            )}
            <details className="rounded-md border">
              <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium">
                Preview the email the firm receives
              </summary>
              <div className="overflow-hidden border-t bg-white">
                <iframe
                  title="Handover email preview"
                  srcDoc={withIntelPreview(preview?.html ?? "", notes)}
                  className="h-[420px] w-full"
                />
              </div>
            </details>
          </div>
        )}

        <div className="shrink-0 border-t px-5 py-3">
          {sendBlockedReason && (
            <p
              id="handover-send-status"
              role="status"
              className="mb-2 text-xs text-muted-foreground"
            >
              {sendBlockedReason}
            </p>
          )}
          {!loading && preview?.ok && needsReview && Boolean(notes.trim()) && (
            <Button
              variant="outline"
              className="mb-3 h-auto w-full whitespace-normal border-primary py-2 text-primary"
              onClick={() => setNotesReviewed(true)}
              disabled={sending}
            >
              I've checked these notes — continue
            </Button>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={onCancel} disabled={sending} size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => onSend({ to: to.trim(), cc, notes, funding })}
              disabled={sending || Boolean(sendBlockedReason)}
              aria-describedby={sendBlockedReason ? "handover-send-status" : undefined}
              size="sm"
            >
              {sending ? "Sending…" : "Confirm & Send →"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
