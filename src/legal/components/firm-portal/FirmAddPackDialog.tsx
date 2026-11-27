// Ported from the Legal app (family-law-floater/src/components/firm-portal/FirmAddPackDialog.tsx). Re-run the port script to refresh.
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { orderFirmPackFn } from "@/legal/lib/firm-pack-orders.functions";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/legal/components/ui/dialog";

export function FirmAddPackDialog({
  firmId,
  balance,
  onClose,
  onAdded,
}: {
  firmId: string;
  balance: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const order = useServerFn(orderFirmPackFn);
  const storageKey = `firm-pack-confirmation:${firmId}`;
  const [draft] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved.requestId === "string" && Number.isInteger(saved.quantity))
        return saved as { requestId: string; quantity: number };
    } catch {
      /* Storage may be unavailable; the in-memory key still protects retries. */
    }
    return null;
  });
  const [quantity, setQuantity] = useState(String(draft?.quantity ?? 10));
  const [requestId] = useState(() => draft?.requestId ?? crypto.randomUUID());
  const [submitted, setSubmitted] = useState(!!draft);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const amount = Number(quantity);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= 100;

  const confirm = async () => {
    if (!valid || inFlight.current || added !== null) return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    setSubmitted(true);
    try {
      // Persist before the request: reloading after a lost response replays the
      // same confirmation instead of purchasing another pack.
      try {
        localStorage.setItem(storageKey, JSON.stringify({ requestId, quantity: amount }));
      } catch {
        /* optional persistence */
      }
      const result = await order({ data: { firmId, requestId, quantity: amount } });
      setAdded(result.quantity);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* optional persistence */
      }
      onAdded();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not confirm your pack. Try again to check this same order.",
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent
        className="bold-portal firm-portal-ui portal-dialog"
        onEscapeKeyDown={(e) => {
          if (saving) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (saving) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{added === null ? "Add Pack" : "Your pack is added"}</DialogTitle>
          <DialogDescription>
            {added === null
              ? "Choose how many consultation credits you would like to add."
              : "Your balance has been updated."}
          </DialogDescription>
        </DialogHeader>
        {added === null ? (
          <>
            <div className="flex flex-wrap gap-2" aria-label="Pack sizes">
              {[10, 20, 30, 50].map((n) => (
                <Button
                  key={n}
                  variant={amount === n ? "default" : "outline"}
                  aria-pressed={amount === n}
                  disabled={submitted}
                  onClick={() => setQuantity(String(n))}
                >
                  {n} credits
                </Button>
              ))}
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Number of credits
              <Input
                type="number"
                min={1}
                max={100}
                step={1}
                value={quantity}
                disabled={submitted}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span>Available now</span>
                <strong>{balance}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <span>After adding this pack</span>
                <strong>{valid ? balance + amount : "—"}</strong>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Credits are added immediately at your existing agreed rate. Bold will arrange payment
              with you separately. No payment is taken when you confirm.
            </p>
            {balance < 0 && (
              <p className="text-sm text-muted-foreground">
                Your new pack first covers the {Math.abs(balance)} credits owing.
              </p>
            )}
            {submitted && !saving && (
              <p className="text-sm text-muted-foreground">
                Retry checks this same confirmation and will not add a second pack.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" disabled={saving} onClick={onClose}>
                {submitted ? "Close" : "Cancel"}
              </Button>
              <Button disabled={!valid || saving} onClick={() => void confirm()}>
                {saving
                  ? "Adding credits…"
                  : submitted
                    ? "Retry confirmation"
                    : `Confirm ${amount} credits`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
            <p className="text-lg font-semibold">{added} credits added</p>
            <p className="text-sm text-muted-foreground">
              Your order is saved. Bold will receive a notification to arrange payment. You can
              return to your appointments.
            </p>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
