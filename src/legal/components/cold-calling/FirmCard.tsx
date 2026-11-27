// Ported from the Legal app (family-law-floater/src/components/cold-calling/FirmCard.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/legal/components/ui/badge";
import type { ProspectCallAttempt, ProspectContact, ProspectFirm } from "@/legal/lib/cold-calling/client";
import { formatWhen } from "@/legal/lib/cold-calling/client";
import { formatAuPhone } from "@/legal/lib/cold-calling/normalise";
import { OBJECTIONS } from "@/legal/lib/cold-calling/script";
import { dispositionLabel } from "@/legal/lib/cold-calling/types";
import { cn } from "@/legal/lib/utils";

import { FitScore, TierBadge, primaryContact } from "./prospect-ui";

export function confidenceLabel(value: string | null | undefined): {
  text: string;
  tone: "good" | "mid" | "low";
} {
  const v = (value ?? "").toUpperCase();
  if (v === "HIGH") return { text: "High confidence this is the decision-maker", tone: "good" };
  if (v === "MEDIUM")
    return { text: "Medium confidence — confirm they make the decisions", tone: "mid" };
  return { text: "Not verified — ask who owns the firm", tone: "low" };
}

export function DecisionMaker({
  contacts,
  size = "md",
}: {
  contacts: ProspectContact[];
  size?: "md" | "lg";
}) {
  const contact = primaryContact(contacts);
  const conf = confidenceLabel(contact?.confidence);
  return (
    <div>
      <p className={cn("font-bold", size === "lg" ? "text-2xl" : "text-lg")}>
        {contact ? contact.full_name : "Decision-maker not found"}
        {contact?.position ? (
          <span className="font-normal text-muted-foreground"> · {contact.position}</span>
        ) : null}
      </p>
      <p
        className={cn(
          "mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
          conf.tone === "good" &&
            "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
          conf.tone === "mid" &&
            "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          conf.tone === "low" && "bg-muted text-muted-foreground",
        )}
      >
        {conf.text}
      </p>
      {!contact ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Ask reception for the principal or practice owner.
        </p>
      ) : null}
    </div>
  );
}

function tri(v: boolean | null): string {
  return v === true ? "Yes" : v === false ? "No" : "Not verified";
}

/** Right-hand card: who you're calling, objection handlers, firm facts. No evidence links. */
export function FirmCard({
  firm,
  contacts,
  previousAttempts,
  onGoToStage,
}: {
  firm: ProspectFirm;
  contacts: ProspectContact[];
  previousAttempts: ProspectCallAttempt[];
  onGoToStage: (id: string) => void;
}) {
  const [objection, setObjection] = useState<string | null>(null);
  const active = OBJECTIONS.find((o) => o.id === objection) ?? null;
  const address =
    firm.office_locations[0] ??
    [firm.primary_city, firm.state, firm.postcode].filter(Boolean).join(" ");
  const secondary = contacts.find((c) => c.is_secondary_decision_maker);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <FitScore score={firm.fit_score} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-tight">{firm.firm_name}</h2>
            <p className="text-sm text-muted-foreground">{address || "Address not verified"}</p>
            <p className="mt-1 font-mono text-base">{formatAuPhone(firm.phone_e164)}</p>
          </div>
          <TierBadge tier={firm.priority_tier} />
        </div>
        <div className="mt-3 border-t pt-3">
          <DecisionMaker contacts={contacts} />
          {secondary ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Also: {secondary.full_name}
              {secondary.position ? ` · ${secondary.position}` : ""}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Objections
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {OBJECTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setObjection(objection === o.id ? null : o.id)}
              aria-pressed={objection === o.id}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                objection === o.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {active ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm italic text-muted-foreground">{active.them}</p>
            <p className="rounded-md border-l-4 border-primary bg-primary/5 px-3 py-2 text-[16px] leading-relaxed">
              {active.handler}
            </p>
            {active.goToStage ? (
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => onGoToStage(active.goToStage!)}
              >
                Open the pitch →
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Firm facts
        </h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Family lawyers</dt>
          <dd>{firm.family_law_team_size ?? "Not verified"}</dd>
          <dt className="text-muted-foreground">Accredited specialists</dt>
          <dd>{firm.accredited_specialist_count ?? "Not verified"}</dd>
          <dt className="text-muted-foreground">Complex property</dt>
          <dd>{tri(firm.complex_property)}</dd>
          <dt className="text-muted-foreground">Businesses / trusts / SMSF</dt>
          <dd>
            {[
              firm.businesses_indicator && "businesses",
              firm.trusts_indicator && "trusts",
              firm.smsf_indicator && "SMSF",
            ]
              .filter(Boolean)
              .join(", ") || "Not verified"}
          </dd>
          <dt className="text-muted-foreground">Google</dt>
          <dd>
            {firm.google_rating !== null
              ? `${firm.google_rating} ★ (${firm.google_review_count ?? 0})`
              : "Not found"}
          </dd>
          <dt className="text-muted-foreground">Website</dt>
          <dd className="truncate">
            {firm.website ? (
              <a
                href={firm.website}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline"
              >
                {firm.root_domain ?? firm.website}{" "}
                <ExternalLink className="inline h-3 w-3" aria-hidden />
              </a>
            ) : (
              "Not found"
            )}
          </dd>
          <dt className="text-muted-foreground">Offices</dt>
          <dd>{firm.office_locations.length || "Not verified"}</dd>
        </dl>
        {[firm.reason_1, firm.reason_2, firm.reason_3].some(Boolean) ? (
          <>
            <h4 className="mb-1 mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Why we picked them
            </h4>
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {[firm.reason_1, firm.reason_2, firm.reason_3].filter(Boolean).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </>
        ) : null}
        {previousAttempts.length > 0 ? (
          <>
            <h4 className="mb-1 mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Previous calls
            </h4>
            <ul className="space-y-1 text-sm">
              {previousAttempts.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Badge variant="outline" className="mr-1">
                    {dispositionLabel(a.business_disposition)}
                  </Badge>
                  <span className="text-muted-foreground">{formatWhen(a.started_at)}</span>
                  {a.notes ? (
                    <p className="whitespace-pre-wrap text-muted-foreground">{a.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {firm.follow_up_note ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {firm.follow_up_note}
          </p>
        ) : null}
      </section>
    </div>
  );
}
