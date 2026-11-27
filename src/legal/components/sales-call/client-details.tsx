// Ported from the Legal app (family-law-floater/src/components/sales-call/client-details.tsx). Re-run the port script to refresh.
import { salesCallDetails, type ClientDetailsLead } from "@/legal/lib/sales-call-details";

export function ClientDetails({ lead }: { lead: ClientDetailsLead }) {
  const details = salesCallDetails(lead);
  const unclearAssets = details.some(({ key }) => key.startsWith("asset_context_"));
  const summary = details.filter(({ key, value }) => !(key === "wants_lawyer" && value === "Yes"));
  return (
    <section
      aria-label="Client details"
      className="mt-2 max-h-[50%] shrink-0 overflow-y-auto rounded-lg border bg-card px-2.5 py-1.5"
    >
      <h3 className="pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Client details
      </h3>
      <dl aria-label="Client summary">
        {summary.map(({ key, label, value, formAnswer, isQuestion, needsConfirmation }) => {
          const check =
            (needsConfirmation && !(key === "city" && !formAnswer)) ||
            (key === "asset_band" && unclearAssets);
          // Show the complete submitted wording, not a shortened amount or a tooltip.
          // Conflicting saved/form answers remain visible and explicitly unconfirmed.
          const answer = check
            ? [...new Set([value, formAnswer].filter(Boolean))].join(" / ")
            : (formAnswer ?? value);
          const fullWidth = isQuestion || key.startsWith("asset_context_") || (answer?.length ?? 0) > 65;
          return (
            <div
              key={key}
              className={`grid items-start gap-x-1.5 border-b py-1 last:border-0 ${fullWidth ? "grid-cols-1 gap-y-0.5" : "grid-cols-[5.5rem_minmax(0,1fr)]"}`}
            >
              <dt className="text-[11px] leading-4 text-muted-foreground">{label}</dt>
              <dd
                className={`whitespace-pre-wrap break-words text-xs leading-4 ${fullWidth ? "text-left" : "text-right"} ${check ? "text-amber-700" : !answer ? "text-muted-foreground" : "font-medium"}`}
              >
                {check && <span className="block font-semibold">Confirm</span>}
                {answer || (!check && "Not provided")}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
