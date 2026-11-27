// Ported from the Legal app (family-law-floater/src/lib/intel-review.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { withIntelTimeoutMessage } from "./intel-timeout.server";
/** Independent source review; uses the existing transcription provider credentials. */
export async function independentIntelReview(
  system: string,
  input: string,
  schema: Record<string, unknown>,
): Promise<string> {
  const key = legalEnv["OPENAI_API_KEY"];
  if (!key) throw new Error("The independent evidence reviewer is not configured.");
  return withIntelTimeoutMessage(
    "Checking the summary against the call transcript took too long. Please retry the summary.",
    async () => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(90_000),
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "gpt-5.4",
          store: false,
          instructions: system,
          input,
          reasoning: { effort: "medium" },
          max_output_tokens: 10000,
          text: {
            format: { type: "json_schema", name: "client_intel_evidence", strict: true, schema },
          },
        }),
      });
      if (!response.ok)
        throw new Error(
          `Independent evidence review unavailable (${response.status}). Please retry.`,
        );
      const result = (await response.json()) as {
        status?: string;
        output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
      };
      if (result.status !== "completed")
        throw new Error("The independent evidence review was incomplete. Please retry.");
      const text = (result.output ?? [])
        .filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text ?? "")
        .join("");
      if (!text.trim())
        throw new Error("The independent evidence reviewer returned no verified result.");
      return text;
    },
  );
}
