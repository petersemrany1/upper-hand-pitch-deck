import { NORWOOD_VIEWS, type NorwoodView } from './norwood-assessment';

/** Database polling and the data channel can finish in either order. Never lose
 * a confirmed save to an older response, or advance an unsaved/rejected view. */
export function mergeSavedViews(current: readonly NorwoodView[], received: readonly NorwoodView[]): NorwoodView[] {
  return NORWOOD_VIEWS.filter(view => current.includes(view) || received.includes(view));
}
export function nextCaptureView(current: NorwoodView, saved: readonly NorwoodView[]): NorwoodView {
  return saved.includes(current) ? NORWOOD_VIEWS.find(view => !saved.includes(view)) ?? 'right' : current;
}
export function captureFailureText(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'The photo check took too long. Please retry this angle.';
    if (/^(This link|Please ask|The photo|Your photo|Camera|Check your connection|We could not|All five|Please take|Connection|Use a)/.test(error.message)) return error.message.slice(0, 300);
  }
  return 'The photo could not be checked. Check the connection and retry this angle.';
}
