/** A signalling heartbeat is not the video transport. Brief API/network failures
 * must not destroy a healthy peer; revocation/expiry still stop immediately. */
export class LiveHeartbeatHealth {
  private missingSince: number | null = null;
  constructor(private graceMs = 30_000) {}
  healthy() { this.missingSince = null; }
  shouldStop(now = Date.now()) {
    this.missingSince ??= now;
    return now - this.missingSince >= this.graceMs;
  }
}
export function terminalLiveError(error: unknown) {
  if(typeof Response!=='undefined' && error instanceof Response && [401,403].includes(error.status))return true;
  return error instanceof Error && /^(This camera session|This camera is|Camera access required|Camera sharing stopped|Connect the camera again|Your camera is already|An advisor already|This link has expired|Please ask your advisor|Lead access required|Sales access required|Unauthorized|Unauthenticated|Forbidden)/i.test(error.message);
}
export const LIVE_STOP_REASONS = ['user_stop','page_hidden','unmount','peer_failed','channel_closed','peer_timeout','heartbeat_timeout','access_ended','setup_failed'] as const;
export type LiveStopReason = typeof LIVE_STOP_REASONS[number];
