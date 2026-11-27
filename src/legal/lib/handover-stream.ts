// Ported from the Legal app (family-law-floater/src/lib/handover-stream.ts). Re-run the port script to refresh.
export type HandoverIntelResult = {
  notes: string | null;
  error?: string;
  pending?: boolean;
  stage?: string;
  retryAfterMs?: number;
  retryable?: boolean;
};

/** Send headers immediately and keep the connection alive during long recordings. */
export function handoverIntelResponse(
  generate: () => Promise<HandoverIntelResult>,
  heartbeatMs = 5_000,
): Response {
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (value: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
      };
      emit({ type: "working" });
      heartbeat = setInterval(() => emit({ type: "working" }), heartbeatMs);
      void Promise.resolve()
        .then(generate)
        .then(
          (result) => emit({ type: "result", ...result }),
          () =>
            emit({
              type: "result",
              notes: null,
              error: "The summary could not be prepared. Please retry.",
            }),
        )
        .finally(() => {
          clearInterval(heartbeat);
          if (!closed) {
            closed = true;
            controller.close();
          }
        });
    },
    cancel() {
      closed = true;
      clearInterval(heartbeat);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function readHandoverIntel(
  response: Response,
  maxWaitMs = 180_000,
): Promise<HandoverIntelResult> {
  if (!response.ok || !response.body)
    throw new Error("The summary connection failed. Please retry.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const readResult = async (): Promise<HandoverIntelResult> => {
    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      if (done && pending.trim()) lines.push(pending);
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "result") {
          const { type: _, ...result } = event;
          return result as HandoverIntelResult;
        }
      }
      if (done)
        throw new Error(
          "The summary connection was interrupted. Please retry; your booking is saved.",
        );
    }
  };
  try {
    return await Promise.race([
      readResult(),
      new Promise<HandoverIntelResult>((resolve) => {
        deadline = setTimeout(
          () =>
            resolve({
              notes: null,
              retryable: true,
              error:
                "The summary is taking too long. Retry the summary, or write and review your own notes to continue; your booking and payment are saved.",
            }),
          maxWaitMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(deadline);
    // A stalled connection must not keep the dialog spinning during cleanup.
    void reader.cancel().catch(() => {});
  }
}
