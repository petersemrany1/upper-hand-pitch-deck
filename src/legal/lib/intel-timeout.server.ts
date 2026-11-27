// Ported from the Legal app (family-law-floater/src/lib/intel-timeout.server.ts). Re-run the port script to refresh.
/** Identify which AI stage exceeded its deadline, including response-body reads. */
export async function withIntelTimeoutMessage<T>(
  message: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
      throw new Error(message);
    }
    throw error;
  }
}
