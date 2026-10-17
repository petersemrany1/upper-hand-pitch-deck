/** Persist only bounded diagnostic codes, never provider text or photographs. */
export const NORWOOD_REVIEW_CODES = ['HP-REVIEW', 'HP-EVIDENCE'] as const;
export function analysisNeedsReview(status: string, problems: readonly string[]) {
  return status === 'failed' && problems.some(p => (NORWOOD_REVIEW_CODES as readonly string[]).includes(p));
}
export function analysisFailure(status: string, problems: readonly string[]): 'review' | 'service' | null {
  return status === 'failed' ? analysisNeedsReview(status, problems) ? 'review' : 'service' : null;
}
