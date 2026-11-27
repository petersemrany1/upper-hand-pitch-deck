// Ported from the Legal app (family-law-floater/src/components/firm-portal/SendContractWizard.tsx). Re-run the port script to refresh.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/legal/components/ui/dialog";
import { Input } from "@/legal/components/ui/input";
import { Label } from "@/legal/components/ui/label";
import { Switch } from "@/legal/components/ui/switch";
import {
  defaultBlock1Shows,
  formatCents,
  parseDollarsToCents,
  pricePack,
  splitPack,
} from "@/legal/lib/contracts/pricing";
import {
  previewContractPdfFn,
  sendFirmContractFn,
  type ContractDraftInput,
} from "@/legal/lib/firm-contracts.functions";

/**
 * Send contract — four short steps: firm details → the pack → payment →
 * review & send. Fills the Bold Marketing Agreement, sends it for e-signature
 * (Annature) and emails the Stripe payment link in one go.
 */

export type WizardFirm = {
  id: string;
  firm_name: string;
  abn?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  signatory_name?: string | null;
  signatory_email?: string | null;
};

const STEPS = ["Firm details", "The pack", "Payment", "Review & send"] as const;

export function SendContractWizard({
  firm,
  onClose,
  onSent,
}: {
  firm: WizardFirm;
  onClose: () => void;
  onSent: () => void;
}) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: firm.firm_name ?? "",
    abn: firm.abn ?? "",
    address: firm.address ?? "",
    email: firm.email ?? "",
    signatoryName: firm.signatory_name ?? "",
    signatoryEmail: firm.signatory_email ?? firm.email ?? "",
    mobile: firm.phone ?? "",
  });
  const [showsText, setShowsText] = useState("10");
  const [feeText, setFeeText] = useState("");
  const [packName, setPackName] = useState("");
  const [split, setSplit] = useState(false);
  const [block1Text, setBlock1Text] = useState("");
  const [preview, setPreview] = useState<{
    url: string;
    amountDueCents: number;
    template: string;
  } | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);

  const shows = Number.parseInt(showsText, 10);
  const feeCents = (() => {
    try {
      return feeText ? parseDollarsToCents(feeText) : 0;
    } catch {
      return 0;
    }
  })();
  const pricing = useMemo(
    () => (shows > 0 && feeCents > 0 ? pricePack(shows, feeCents) : null),
    [shows, feeCents],
  );
  const b1 = block1Text
    ? Number.parseInt(block1Text, 10)
    : shows > 1
      ? defaultBlock1Shows(shows)
      : 1;
  const blocks = useMemo(() => {
    if (!pricing || !split) return null;
    try {
      return splitPack(pricing, b1);
    } catch {
      return null;
    }
  }, [pricing, split, b1]);
  const effectivePackName = packName.trim() || (shows > 0 ? `${shows}-Pack` : "");

  const draft: ContractDraftInput | null =
    pricing && effectivePackName && f.name && f.signatoryName && f.signatoryEmail
      ? {
          firmId: firm.id,
          firm: {
            name: f.name,
            abn: f.abn,
            address: f.address,
            email: f.email,
            signatoryName: f.signatoryName,
            signatoryEmail: f.signatoryEmail,
            mobile: f.mobile,
          },
          packName: effectivePackName,
          shows,
          feeExCents: feeCents,
          split: split ? { block1Shows: b1 } : null,
        }
      : null;

  const stepValid = [
    Boolean(f.name.trim() && f.signatoryName.trim() && /\S+@\S+\.\S+/.test(f.signatoryEmail)),
    Boolean(pricing),
    !split || Boolean(blocks),
    Boolean(preview),
  ];

  // Build the preview when arriving at the review step.
  useEffect(() => {
    if (step !== 3 || !draft || preview) return;
    let cancelled = false;
    setBusy("preview");
    previewContractPdfFn({ data: draft })
      .then((r) => {
        if (cancelled) return;
        const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setPreview({ url, amountDueCents: r.amountDueCents, template: r.template });
      })
      .catch((e: Error) => {
        toast.error(e.message);
        setStep(2);
      })
      .finally(() => {
        if (!cancelled) setBusy(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Any edit invalidates the preview.
  const invalidate = () => {
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  };

  const send = async () => {
    if (!draft) return;
    setBusy("send");
    try {
      const r = await sendFirmContractFn({ data: draft });
      toast.success("Contract sent for signature and payment link emailed");
      r.warnings.forEach((w) => toast.warning(w));
      onSent();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const field = (label: string, key: keyof typeof f, type = "text") => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        className="mt-1"
        value={f[key]}
        onChange={(e) => {
          invalidate();
          setF({ ...f, [key]: e.target.value });
        }}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send contract — {firm.firm_name}</DialogTitle>
        </DialogHeader>

        <ol className="flex gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`flex items-center gap-1.5 ${i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i <= step ? "bg-primary text-white" : "bg-muted"}`}
              >
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {field("Firm name", "name")}
            {field("Firm ABN / ACN", "abn")}
            <div className="sm:col-span-2">{field("Firm address", "address")}</div>
            {field("Firm email", "email", "email")}
            <div />
            {field("Signatory name", "signatoryName")}
            {field("Signatory email (Annature sends here)", "signatoryEmail", "email")}
            {field("Signatory mobile (gets a text with the emails)", "mobile", "tel")}
            <p className="text-[12px] text-muted-foreground sm:col-span-2">
              Edits are saved back to the firm record when you send.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Number of shows</Label>
              <Input
                inputMode="numeric"
                className="mt-1"
                value={showsText}
                onChange={(e) => {
                  invalidate();
                  setShowsText(e.target.value.replace(/\D/g, ""));
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Per-show fee (exc. GST)</Label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[13px] text-muted-foreground">
                  $
                </span>
                <Input
                  inputMode="decimal"
                  className="pl-6"
                  value={feeText}
                  placeholder="1,850"
                  onChange={(e) => {
                    invalidate();
                    setFeeText(e.target.value);
                  }}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pack name</Label>
              <Input
                className="mt-1"
                value={packName}
                placeholder={shows > 0 ? `${shows}-Pack` : "10-Pack"}
                onChange={(e) => {
                  invalidate();
                  setPackName(e.target.value);
                }}
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-[13px] sm:col-span-3">
              {pricing ? (
                <div className="grid grid-cols-3 gap-2 tabular-nums">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total exc. GST
                    </p>
                    <p className="font-semibold">{formatCents(pricing.totalExCents)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      GST 10%
                    </p>
                    <p className="font-semibold">{formatCents(pricing.gstCents)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total inc. GST
                    </p>
                    <p className="font-semibold text-primary">
                      {formatCents(pricing.totalIncCents)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Enter shows and a per-show fee to see the totals.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && pricing && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-[14px]">
              <Switch
                checked={split}
                onCheckedChange={(v) => {
                  invalidate();
                  setSplit(v);
                }}
              />
              Split payment (two blocks — uses the agreement with Schedule A)
            </label>
            {split ? (
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div>
                  <Label className="text-xs text-muted-foreground">Block 1 shows</Label>
                  <Input
                    inputMode="numeric"
                    className="mt-1"
                    value={block1Text || String(b1)}
                    onChange={(e) => {
                      invalidate();
                      setBlock1Text(e.target.value.replace(/\D/g, ""));
                    }}
                  />
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-[13px] tabular-nums">
                  {blocks ? (
                    <>
                      <p>
                        <strong>Block 1</strong> — {blocks.block1.shows} shows ·{" "}
                        {formatCents(blocks.block1.incCents)} inc. GST ·{" "}
                        <span className="text-muted-foreground">{blocks.block1.whenPayable}</span>
                      </p>
                      <p className="mt-1">
                        <strong>Block 2</strong> — {blocks.block2.shows} shows ·{" "}
                        {formatCents(blocks.block2.incCents)} inc. GST ·{" "}
                        <span className="text-muted-foreground">{blocks.block2.whenPayable}</span>
                      </p>
                      <p className="mt-2 text-muted-foreground">
                        Only the Block 1 payment link is sent now. Block 2 is requested from the
                        firm's Contract panel when it falls due.
                      </p>
                    </>
                  ) : (
                    <p className="text-destructive">
                      Block 1 must be between 1 and {pricing.shows - 1} shows.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border bg-muted/40 p-3 text-[13px]">
                One payment link for <strong>{formatCents(pricing.totalIncCents)}</strong> inc. GST.
                Standard agreement, pay in full upfront.
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-[13px] sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Signs:</span> {f.signatoryName} &lt;
                {f.signatoryEmail}&gt;
              </p>
              <p>
                <span className="text-muted-foreground">Text to:</span>{" "}
                {f.mobile || "— (no mobile)"}
              </p>
              <p>
                <span className="text-muted-foreground">Payment link to:</span>{" "}
                {Array.from(
                  new Set(
                    [f.signatoryEmail, f.email].filter(Boolean).map((e) => e.trim().toLowerCase()),
                  ),
                ).join(", ")}
              </p>
              <p>
                <span className="text-muted-foreground">Pack:</span> {effectivePackName} · {shows}{" "}
                shows · {formatCents(feeCents)} / show
              </p>
              <p>
                <span className="text-muted-foreground">Due now:</span>{" "}
                <strong>{preview ? formatCents(preview.amountDueCents) : "…"}</strong> inc. GST
                {split ? " (Block 1)" : ""}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Reminders:</span> days 1, 2, 3, 5, 9, 11,
                14, 15 at 9am Sydney. Weekend reminders move to Monday, with at most one per
                weekday, then flagged for your call. Stop as soon as it's signed and paid.
              </p>
            </div>
            {preview ? (
              <iframe
                title="Contract preview"
                src={preview.url}
                className="h-[52vh] w-full rounded-lg border bg-white"
              />
            ) : (
              <div className="flex h-[52vh] items-center justify-center rounded-lg border text-[13px] text-muted-foreground">
                Preparing the contract…
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            disabled={busy !== null}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={() => setStep(step + 1)} disabled={!stepValid[step]}>
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={send}
              disabled={!stepValid[3] || busy !== null}
              className="bg-primary"
            >
              {busy === "send" ? "Sending…" : "Send contract & payment link"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
