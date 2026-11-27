// Ported from the Legal app (family-law-floater/src/lib/training/content-facts.ts). Re-run the port script to refresh.
import { CALL_EXAMPLES } from "./call-examples";
import type { ContentFacts } from "./completion";
import { READ_ALONG_SECTIONS } from "./read-along";
import { DRILL_CARDS, SALES_BEATS, STRICT_FINISH } from "./sales-framework";

/** Counts and ids the completion check needs, read from the live content. */
export function contentFacts(): ContentFacts {
  return {
    readAlongSectionCount: READ_ALONG_SECTIONS.length,
    salesFramework: {
      beatIds: SALES_BEATS.map((b) => b.id),
      cardIds: DRILL_CARDS.map((c) => c.id),
      strict: STRICT_FINISH,
    },
    callExamples: CALL_EXAMPLES.map((c) => ({ id: c.id, duration_s: c.duration_s })),
  };
}

/** AI Training completes once a saved practice call is at least this long (Q43 default). */
export const MIN_PRACTICE_CALL_S = 5 * 60;
