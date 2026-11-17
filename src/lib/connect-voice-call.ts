export const VOICE_RATE_LIMIT_CODES = new Set([31206, 20429]);

/** A transport failure can follow acceptance. Only an explicit rate-limit rejection is replayable. */
export async function connectVoiceCall<T>(connect: () => Promise<T>, requirePermission: () => void,
  onError: (code: number | undefined) => void, wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))) {
  const delays = [800, 1600, 3200];
  for (let attempt = 0; ; attempt++) {
    requirePermission();
    try {
      return await connect();
    } catch (error) {
      const code = (error as { code?: number } | null)?.code;
      onError(code);
      if (code === undefined || !VOICE_RATE_LIMIT_CODES.has(code) || attempt >= delays.length) throw error;
      await wait(delays[attempt]);
    }
  }
}
