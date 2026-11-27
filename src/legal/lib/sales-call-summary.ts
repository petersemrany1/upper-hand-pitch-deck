// Ported from the Legal app (family-law-floater/src/lib/sales-call-summary.ts). Re-run the port script to refresh.
import { z } from "zod";

const detailSchema = z.object({
  text: z.string().trim().min(1),
  evidence: z.array(z.string().trim().min(1)).min(1),
});

export const salesCallSummarySchema = z.object({
  outcome: z.object({
    status: z.enum(["booked", "not_booked", "no_conversation", "unclear"]),
    evidence: z.array(z.string().trim().min(1)),
  }),
  notBookedReason: detailSchema.nullable(),
  clientSaid: detailSchema.nullable(),
  waitingFor: detailSchema.nullable(),
  nextStep: detailSchema.nullable(),
  datesDiscussed: z.array(
    detailSchema.extend({
      status: z.enum(["agreed", "proposed", "mentioned"]),
    }),
  ),
});

export type SalesCallSummary = z.infer<typeof salesCallSummarySchema>;

const normalise = (value: string) => value.replace(/\s+/g, " ").trim();

/** Unverifiable details never become facts in the sales review. */
export function parseSalesCallSummary(value: unknown, transcript: string): SalesCallSummary {
  const parsed = salesCallSummarySchema.parse(value);
  const source = normalise(transcript);
  const supported = (evidence: string[]) =>
    evidence.length > 0 && evidence.every((quote) => source.includes(normalise(quote)));
  const detail = (value: SalesCallSummary["clientSaid"]) =>
    value && supported(value.evidence) ? value : null;
  const outcome = supported(parsed.outcome.evidence)
    ? parsed.outcome
    : { status: "unclear" as const, evidence: [] };
  return {
    outcome,
    notBookedReason: outcome.status === "not_booked" ? detail(parsed.notBookedReason) : null,
    clientSaid: detail(parsed.clientSaid),
    waitingFor: detail(parsed.waitingFor),
    nextStep: detail(parsed.nextStep),
    datesDiscussed: parsed.datesDiscussed.filter((date) => supported(date.evidence)),
  };
}
