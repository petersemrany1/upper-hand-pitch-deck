// Single source of truth for the Norwood expectations gate.
// Only Norwood 6 and 7 require the advisor to confirm expectations were set.
export const NORWOOD_EXPECTATIONS_MIN = 6;

export function norwoodNeedsExpectations(level: number | null | undefined): boolean {
  return level != null && Number.isFinite(level) && level >= NORWOOD_EXPECTATIONS_MIN;
}
