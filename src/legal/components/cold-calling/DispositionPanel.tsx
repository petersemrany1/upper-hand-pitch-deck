// Ported from the Legal app (family-law-floater/src/components/cold-calling/DispositionPanel.tsx). Re-run the port script to refresh.
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/legal/components/ui/alert-dialog";
import { Button } from "@/legal/components/ui/button";
import { Checkbox } from "@/legal/components/ui/checkbox";
import { Input } from "@/legal/components/ui/input";
import { Label } from "@/legal/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import { Textarea } from "@/legal/components/ui/textarea";
import type { StaffMember } from "@/legal/lib/cold-calling/client";
import type { DispositionInput } from "@/legal/lib/cold-calling/dispositions";
import { DISPOSITIONS, type Disposition } from "@/legal/lib/cold-calling/types";
import { cn } from "@/legal/lib/utils";

/** Local datetime-local value → ISO instant (browser timezone = the caller's). */
function localToIso(value: string): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function defaultLocal(hoursAhead: number): string {
  const d = new Date(Date.now() + hoursAhead * 3600000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TONE: Record<Disposition, string> = {
  no_answer: "",
  gatekeeper_try_again: "",
  dm_not_interested: "",
  follow_up: "",
  interested: "",
  meeting_booked: "",
  bad_fit: "",
  do_not_contact: "text-destructive",
};

export function DispositionPanel({
  staff,
  currentUserId,
  bookingUrl,
  saving,
  onSave,
  notes,
  onNotesChange,
  exclude = [],
}: {
  staff: StaffMember[];
  currentUserId: string;
  bookingUrl: string | null;
  saving: boolean;
  onSave: (input: DispositionInput) => Promise<void>;
  notes: string;
  onNotesChange: (value: string) => void;
  exclude?: Disposition[];
}) {
  const [chosen, setChosen] = useState<Disposition | null>(null);
  const [followUp, setFollowUp] = useState(() => defaultLocal(24));
  const [owner, setOwner] = useState(currentUserId);
  const [meetingAt, setMeetingAt] = useState(() => defaultLocal(48));
  const [meetingRef, setMeetingRef] = useState("");
  const [reason, setReason] = useState("");
  const [askedNotToCall, setAskedNotToCall] = useState(false);
  const [confirmDnc, setConfirmDnc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owners = useMemo(() => staff.filter((s) => s.is_active && s.user_id), [staff]);

  const buildInput = (): DispositionInput | null => {
    if (!chosen) return null;
    const base: DispositionInput = { disposition: chosen, notes };
    switch (chosen) {
      case "gatekeeper_try_again":
        return { ...base, followUpAt: localToIso(followUp), assignedOwnerUserId: owner };
      case "follow_up":
        return { ...base, followUpAt: localToIso(followUp), assignedOwnerUserId: owner };
      case "interested":
        return { ...base, followUpAt: localToIso(followUp), assignedOwnerUserId: owner };
      case "meeting_booked":
        return { ...base, meetingAt: localToIso(meetingAt), meetingReference: meetingRef };
      case "bad_fit":
        return { ...base, reason };
      case "do_not_contact":
        return { ...base, reason };
      case "dm_not_interested":
        return { ...base, recipientAskedNotToBeCalled: askedNotToCall };
      default:
        return base;
    }
  };

  const validate = (input: DispositionInput): string | null => {
    switch (input.disposition) {
      case "gatekeeper_try_again":
      case "follow_up":
        if (!input.notes.trim()) return "Add a note first.";
        if (!input.followUpAt || Date.parse(input.followUpAt) <= Date.now())
          return "Pick a follow-up date and time in the future.";
        return null;
      case "meeting_booked":
        if (!input.meetingAt) return "Enter the meeting date and time.";
        return null;
      case "bad_fit":
        return input.reason?.trim() ? null : "Say why this firm is a bad fit.";
      case "do_not_contact":
        return input.reason?.trim() ? null : "Record why they must not be contacted.";
      default:
        return null;
    }
  };

  const submit = async () => {
    const input = buildInput();
    if (!input) return;
    const problem = validate(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (input.disposition === "do_not_contact" && !confirmDnc) {
      setConfirmDnc(true);
      return;
    }
    await onSave(input);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="disposition-notes" className="text-sm font-semibold">
          Call notes
        </Label>
        <Textarea
          id="disposition-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Who you spoke to, what they said, what they asked…"
          rows={4}
          className="mt-1"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Outcome</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DISPOSITIONS.filter((d) => !exclude.includes(d.code)).map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => {
                setChosen(d.code);
                setError(null);
              }}
              aria-pressed={chosen === d.code}
              className={cn(
                "min-h-14 rounded-lg border-2 border-border bg-card px-3 py-2 text-left text-sm font-bold uppercase tracking-wide transition hover:bg-accent",
                TONE[d.code],
                chosen === d.code &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {chosen === "gatekeeper_try_again" || chosen === "follow_up" || chosen === "interested" ? (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="follow-up-at">
              Follow-up date &amp; time{chosen === "interested" ? " (optional)" : ""}
            </Label>
            <Input
              id="follow-up-at"
              type="datetime-local"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="follow-up-owner">Owner</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger id="follow-up-owner" className="mt-1">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((s) => (
                  <SelectItem key={s.user_id!} value={s.user_id!}>
                    {s.name || s.email || "Staff"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {chosen === "interested" && bookingUrl ? (
            <div className="sm:col-span-2">
              <Button asChild variant="outline">
                <a href={bookingUrl} target="_blank" rel="noreferrer noopener">
                  Book Meeting <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Opens the booking page in a new tab. If you book now, choose MEETING BOOKED instead.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {chosen === "meeting_booked" ? (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="meeting-at">Meeting date &amp; time</Label>
            <Input
              id="meeting-at"
              type="datetime-local"
              value={meetingAt}
              onChange={(e) => setMeetingAt(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="meeting-ref">Booking reference or URL</Label>
            <Input
              id="meeting-ref"
              value={meetingRef}
              onChange={(e) => setMeetingRef(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
          {bookingUrl ? (
            <div className="sm:col-span-2">
              <Button asChild variant="outline">
                <a href={bookingUrl} target="_blank" rel="noreferrer noopener">
                  Open booking page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {chosen === "bad_fit" || chosen === "do_not_contact" ? (
        <div className="rounded-lg border bg-muted/30 p-3">
          <Label htmlFor="outcome-reason">
            {chosen === "bad_fit"
              ? "Why is this firm a bad fit?"
              : "Why must they not be contacted?"}
          </Label>
          <Input
            id="outcome-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1"
          />
        </div>
      ) : null}

      {chosen === "dm_not_interested" ? (
        <label className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <Checkbox
            checked={askedNotToCall}
            onCheckedChange={(v) => setAskedNotToCall(v === true)}
            className="mt-0.5"
          />
          <span>They asked not to be called again (adds the number to Do Not Contact).</span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        size="lg"
        className="w-full"
        disabled={!chosen || saving}
        onClick={() => void submit()}
      >
        {saving ? "Saving…" : "Save outcome"}
      </Button>

      <AlertDialog open={confirmDnc} onOpenChange={setConfirmDnc}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this firm Do Not Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              The number goes on the global suppression list immediately. Every caller is blocked
              from dialling it, queued items and follow-ups are cancelled, and a reimport cannot
              make it callable again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                const input = buildInput();
                if (input) void onSave(input).finally(() => setConfirmDnc(false));
              }}
            >
              Yes, Do Not Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
