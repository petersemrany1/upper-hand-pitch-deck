// Ported from the Legal app (family-law-floater/src/routes/_authenticated/handover-check.tsx). Re-run the port script to refresh.
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runHandoverCheckFn } from "@/legal/lib/handover-check.functions";
import { prepareHandoverIntel } from "@/legal/lib/handover-preparation";
import { readHandoverIntel } from "@/legal/lib/handover-stream";
import type { HandoverCheckResult } from "@/legal/lib/handover-check.server";
import type { IntelProgress } from "@/legal/lib/intel-progress.server";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { HandoverCheck as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [{ title: "Internal handover check" }, { name: "robots", content: "noindex" }],
  }),
  component: HandoverCheck,
});
function HandoverCheck() {
  const run = useServerFn(runHandoverCheckFn);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [result, setResult] = useState<HandoverCheckResult>();
  const [elapsed, setElapsed] = useState(0);
  const progress = useRef<IntelProgress>({ reviews: {} });
  const lastLong = useRef(false);
  async function check(long: boolean, resume = false) {
    if (busy) return;
    if (!resume || lastLong.current !== long) progress.current = { reviews: {} };
    lastLong.current = long;
    setBusy(true);
    setResult(undefined);
    const started = Date.now();
    let latest: HandoverCheckResult | undefined;
    try {
      await prepareHandoverIntel(
        async (signal) => {
          latest = (await readHandoverIntel(
            await run({ data: { long, progress: progress.current }, signal }),
          )) as HandoverCheckResult;
          if (latest.progress) progress.current = latest.progress;
          setElapsed(Math.round((Date.now() - started) / 1000));
          return new Response(JSON.stringify({ type: "result", ...latest }) + "\n");
        },
        { signal: new AbortController().signal, onProgress: setStatus },
      );
      setResult(latest);
      setStatus(latest?.notes ? "Complete" : "Check failed — saved progress can be retried");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      setElapsed(Math.round((Date.now() - started) / 1000));
    }
  }
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 overflow-auto p-8">
      <h1 className="text-2xl font-semibold">Internal handover check</h1>
      <p>
        Fictional client Taylor Sample · Internal Test Clinic. Uses the production summary and
        evidence checks. No customer records, bookings, emails or SMS are created.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded border px-4 py-2"
          disabled={busy}
          onClick={() => void check(false)}
        >
          Run short conversation
        </button>
        <button
          className="rounded border px-4 py-2"
          disabled={busy}
          onClick={() => void check(true)}
        >
          Run long conversation
        </button>
        <button
          className="rounded border px-4 py-2"
          disabled={busy || !progress.current.draft}
          onClick={() => void check(lastLong.current, true)}
        >
          Resume saved check
        </button>
      </div>
      <p role="status">
        {status} · {elapsed}s
      </p>
      {result?.error && <p role="alert">{result.error}</p>}
      {result?.checks && (
        <ul>
          {result.checks.map((item) => (
            <li key={item.label}>
              {item.passed ? "PASS" : "FAIL"} — {item.label}
            </li>
          ))}
        </ul>
      )}
      {result?.notes && (
        <>
          <label htmlFor="test-handover">Generated handover</label>
          <textarea
            id="test-handover"
            aria-label="Generated test handover"
            className="h-96 w-full rounded border p-3"
            value={result.notes}
            readOnly
          />
          <details>
            <summary>Email content preview — delivery disabled</summary>
            <div dangerouslySetInnerHTML={{ __html: result.html ?? "" }} />
          </details>
        </>
      )}
    </main>
  );
}
