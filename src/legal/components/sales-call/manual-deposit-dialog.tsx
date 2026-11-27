// Ported from the Legal app (family-law-floater/src/components/sales-call/manual-deposit-dialog.tsx). Re-run the port script to refresh.
// Take the $75 refundable deposit over the phone as a real card charge.
// Card details are typed straight into Square's hosted iframe — they never touch our app.
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/legal/components/ui/dialog";
import {
  confirmManualDepositFn,
  createManualDepositIntentFn,
  stripePublishableKeyFn,
} from "@/legal/lib/manual-deposit.functions";

const SQUARE_SDK = "https://web.squarecdn.com/v1/square.js";

type SquareCard = {
  attach: (el: HTMLElement) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy: () => Promise<void>;
};
type SquarePayments = { card: () => Promise<SquareCard> };
type SquareGlobal = { payments: (appId: string, locationId: string) => SquarePayments };

let sdkPromise: Promise<SquareGlobal> | null = null;
function loadSquare(): Promise<SquareGlobal> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<SquareGlobal>((resolve, reject) => {
    const existing = (window as unknown as { Square?: SquareGlobal }).Square;
    if (existing) return resolve(existing);
    const script = document.createElement("script");
    script.src = SQUARE_SDK;
    script.async = true;
    script.onload = () => {
      const sq = (window as unknown as { Square?: SquareGlobal }).Square;
      sq ? resolve(sq) : reject(new Error("Square card form failed to load"));
    };
    script.onerror = () => reject(new Error("Square card form failed to load"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function ManualDepositDialog({
  open,
  leadId,
  onClose,
  onPaid,
}: {
  open: boolean;
  leadId: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const getConfig = useServerFn(stripePublishableKeyFn);
  const createIntent = useServerFn(createManualDepositIntentFn);
  const confirmDeposit = useServerFn(confirmManualDepositFn);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      setError(null);
      void cardRef.current?.destroy().catch(() => undefined);
      cardRef.current = null;
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [config, intent] = await Promise.all([
          getConfig({}),
          createIntent({ data: { leadId } }),
        ]);
        if (cancelled) return;
        if (!config.key) throw new Error("Square is not configured");
        if (intent.alreadyPaid) {
          setError("This deposit has already been paid.");
          return;
        }
        setDescription(intent.description);
        const sq = await loadSquare();
        if (cancelled) return;
        const payments = sq.payments(config.key, config.locationId);
        const card = await payments.card();
        if (cancelled) return;
        // Wait a tick so the container is in the DOM before attaching.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (cancelled || !containerRef.current) return;
        await card.attach(containerRef.current);
        cardRef.current = card;
        setReady(true);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  const submit = async () => {
    const card = cardRef.current;
    if (!card) return;
    setCharging(true);
    try {
      const result = await card.tokenize();
      if (result.status !== "OK" || !result.token) {
        toast.error(result.errors?.[0]?.message ?? "The card details were rejected");
        return;
      }
      const settled = await confirmDeposit({
        data: { leadId, sourceId: result.token },
      });
      if (settled.paid) {
        toast.success("$75 deposit charged — booking unlocked");
        onPaid();
        onClose();
      } else {
        toast.error(settled.message ?? `Payment came back as ${settled.status}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCharging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Take deposit over the phone
          </DialogTitle>
          <DialogDescription>
            {description ||
              "Enter the client's card details and charge the $75 refundable booking fee."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="py-4 text-sm text-destructive">{error}</p>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Preparing a secure card form…
              </div>
            ) : null}
            <div ref={containerRef} className="rounded-xl border bg-card p-3" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Card details go directly to Square. Nothing
              is stored in this portal.
            </p>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={onClose} disabled={charging}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={charging || !ready}>
                {charging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Charging…
                  </>
                ) : (
                  "Charge $75.00 AUD"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
