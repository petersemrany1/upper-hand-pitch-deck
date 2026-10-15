type Block = { type: string; text?: string; name?: string; input?: unknown };
export class NorwoodServiceError extends Error {
  constructor(public code: string) { super(code === "HP-429" || code === "HP-529" ? "The photo service is busy. Tap Retry." : "The photo check is unavailable. Tap Retry."); }
}

/** Bounded provider transport. Diagnostics deliberately exclude images, tokens and response text. */
export async function requestNorwoodJson<T>({ model, apiKey, schema, system, content, parse, request = fetch }: {
  model: string; apiKey: string; schema: object; system: string; content: object[];
  parse: (raw: string) => T; request?: typeof fetch;
}): Promise<T> {
  const signal = AbortSignal.timeout(40_000);
  let toolFormat = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await request("https://api.anthropic.com/v1/messages", {
        method: "POST", signal,
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 768, system,
          ...(toolFormat ? {
            tools: [{ name: "photo_check", description: "Return the camera framing check.", input_schema: schema }],
            tool_choice: { type: "tool", name: "photo_check" },
          } : { output_config: { format: { type: "json_schema", schema } } }),
          messages: [{ role: "user", content }],
        }),
      });
    } catch {
      console.warn("Norwood photo service", { code: signal.aborted ? "HP-TIMEOUT" : "HP-NETWORK", model });
      if (!attempt && !signal.aborted) continue;
      throw new NorwoodServiceError(signal.aborted ? "HP-TIMEOUT" : "HP-NETWORK");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const code = `HP-${response.status}`;
      console.warn("Norwood photo service", { code, model, requestId: response.headers.get("request-id") });
      // Some configured models do not support output_config. The same image is
      // retried with a forced tool response; our validator is unchanged.
      if (!attempt && response.status === 400 && /output_config|output_format|structured output/i.test(String(body?.error?.message ?? ""))) { toolFormat = true; continue; }
      if (!attempt && (response.status === 429 || response.status >= 500)) continue;
      throw new NorwoodServiceError(code);
    }
    try {
      const json = await response.json();
      if (json.stop_reason === "refusal") throw new NorwoodServiceError("HP-REFUSAL");
      const blocks: Block[] = json.content;
      if (toolFormat) {
        const tools = blocks.filter(b => b.type === "tool_use" && b.name === "photo_check");
        if (json.stop_reason !== "tool_use" || tools.length !== 1) throw new Error("Incomplete tool response");
        return parse(JSON.stringify(tools[0].input));
      }
      if (json.stop_reason !== "end_turn") throw new Error("Incomplete response");
      return parse(blocks.filter(b => b.type === "text").map(b => b.text).join(""));
    } catch (error) {
      console.warn("Norwood photo service", { code: error instanceof NorwoodServiceError ? error.code : "HP-REPLY", model });
      if (error instanceof NorwoodServiceError) throw error;
      if (attempt || signal.aborted) throw new NorwoodServiceError("HP-REPLY");
    }
  }
  throw new NorwoodServiceError("HP-REPLY");
}
