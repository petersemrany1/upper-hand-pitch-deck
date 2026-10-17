import type { LiveState } from './norwood-live';
/** Only join an explicitly shared, fresh room, once per room. Never steal a live advisor. */
export function canAutoJoin(state: LiveState | null, attempted: ReadonlySet<string>, now = Date.now()) {
  return Boolean(state && state.offer && !state.answer && !state.ended && state.patientPresent
    && !state.repPresent && Date.parse(state.expiresAt) > now && !attempted.has(state.roomId));
}
