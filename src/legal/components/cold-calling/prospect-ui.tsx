// Ported from the Legal app (family-law-floater/src/components/cold-calling/prospect-ui.tsx). Re-run the port script to refresh.
import { ExternalLink } from "lucide-react";

import { Badge } from "@/legal/components/ui/badge";
import type { ProspectContact, ProspectFirm } from "@/legal/lib/cold-calling/client";
import { formatAuPhone, isNationalRateNumber } from "@/legal/lib/cold-calling/normalise";
import { prospectStatusLabel } from "@/legal/lib/cold-calling/types";
import { cn } from "@/legal/lib/utils";

/** Missing research is shown as such — never turned into a claim. */
export function orNotFound(value: string | number | null | undefined, verified = false): string {
  if (value === null || value === undefined || value === "")
    return verified ? "Not verified" : "Not found";
  return String(value);
}

export function FitScore({ score, size = "md" }: { score: number | null; size?: "md" | "lg" }) {
  const band = score === null ? "muted" : score >= 80 ? "high" : score >= 60 ? "mid" : "low";
  return (
    <span
      aria-label={`Fit score ${score ?? "not scored"}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold tabular-nums",
        size === "lg" ? "h-16 w-16 text-3xl" : "h-11 w-11 text-lg",
        band === "high" && "bg-primary text-primary-foreground",
        band === "mid" && "bg-[oklch(0.72_0.15_75)] text-white",
        band === "low" && "bg-secondary text-secondary-foreground",
        band === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {score ?? "—"}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <Badge variant="outline">No tier</Badge>;
  return <Badge variant={tier === "A" ? "default" : "secondary"}>Tier {tier}</Badge>;
}

export function StatusBadge({
  firm,
}: {
  firm: Pick<ProspectFirm, "prospect_status" | "do_not_contact" | "suppressed">;
}) {
  if (firm.do_not_contact || firm.suppressed)
    return <Badge variant="destructive">Do Not Contact</Badge>;
  const status = firm.prospect_status;
  const variant =
    status === "warm" || status === "meeting_booked"
      ? "default"
      : status === "new"
        ? "outline"
        : "secondary";
  return <Badge variant={variant}>{prospectStatusLabel(status)}</Badge>;
}

export function EvidenceLink({ url, label = "Evidence" }: { url: string | null; label?: string }) {
  if (!url) return <span className="text-xs text-muted-foreground">No evidence URL</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
    >
      {label} <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

export const REASON_HEADINGS = ["Case fit", "Expertise", "Capacity"] as const;

export function Reasons({ firm, compact = false }: { firm: ProspectFirm; compact?: boolean }) {
  const reasons = [
    { text: firm.reason_1, url: firm.reason_1_url },
    { text: firm.reason_2, url: firm.reason_2_url },
    { text: firm.reason_3, url: firm.reason_3_url },
  ];
  return (
    <ol className={cn("space-y-1.5", compact ? "text-sm" : "text-base")}>
      {reasons.map((reason, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-accent text-center text-xs font-semibold leading-5 text-accent-foreground">
            {i + 1}
          </span>
          <div className="min-w-0">
            {!compact && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {REASON_HEADINGS[i]}
              </p>
            )}
            <p className={cn(!reason.text && "italic text-muted-foreground")}>
              {reason.text ?? "Not verified"}
            </p>
            {!compact && <EvidenceLink url={reason.url} />}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function primaryContact(contacts: ProspectContact[] | undefined): ProspectContact | null {
  if (!contacts || contacts.length === 0) return null;
  return contacts.find((c) => c.is_primary_decision_maker) ?? contacts[0] ?? null;
}

export function PhoneLine({
  firm,
  masked = false,
}: {
  firm: Pick<ProspectFirm, "phone_e164" | "phone_kind" | "phone_source_url">;
  masked?: boolean;
}) {
  if (!firm.phone_e164)
    return <span className="text-muted-foreground">No valid public number</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono text-base">
        {masked ? "•••• •••• ••" : formatAuPhone(firm.phone_e164)}
      </span>
      {isNationalRateNumber(firm.phone_e164) ? (
        <Badge variant="destructive">1300/1800 — can't be dialled, add a landline</Badge>
      ) : firm.phone_kind ? (
        <Badge variant="outline">{firm.phone_kind}</Badge>
      ) : null}
      {firm.phone_source_url ? <EvidenceLink url={firm.phone_source_url} label="Source" /> : null}
    </span>
  );
}
