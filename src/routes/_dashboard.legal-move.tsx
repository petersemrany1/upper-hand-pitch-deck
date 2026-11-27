import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { RequireLegal } from "@/components/business/LegalConnect";
import { legalDb } from "@/lib/legal/client";
import { LEGAL_TABLES } from "@/legal/move/manifest";
import { importLegalRowsFn, legalCopyCountsFn } from "@/utils/legal-move.functions";

// Admin tool for the Legal move (docs/legal-move-plan.md): copies every Legal
// record into this database's legal_ tables and compares the counts. Safe to
// re-run; rows are matched by their Legal ids. Not in the menu.
export const Route = createFileRoute("/_dashboard/legal-move")({
  component: LegalMovePage,
});

type Line = { table: string; legal: number; copied: number; state: "waiting" | "copying" | "done" | "failed"; error?: string };

const PAGE = 500;

async function exportPage(table: string, offset: number): Promise<Record<string, unknown>[]> {
  const { data, error } = await legalDb().rpc("portal_table_export", { p_table: table, p_offset: offset, p_limit: PAGE });
  if (error) throw new Error(`Reading Legal ${table}: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

function LegalMovePage() {
  const importRows = useServerFn(importLegalRowsFn);
  const counts = useServerFn(legalCopyCountsFn);
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const update = (table: string, patch: Partial<Line>) =>
    setLines((all) => all.map((l) => (l.table === table ? { ...l, ...patch } : l)));

  async function run() {
    setRunning(true);
    setSummary(null);
    setLines(LEGAL_TABLES.map((t) => ({ table: t.name, legal: 0, copied: 0, state: "waiting" })));
    const all: Record<string, Record<string, unknown>[]> = {};
    let failed = 0;
    // Pass 1: every row, parents first, with self/cyclic links left empty.
    for (const t of LEGAL_TABLES) {
      update(t.name, { state: "copying" });
      try {
        const rows: Record<string, unknown>[] = [];
        for (let offset = 0; ; offset += PAGE) {
          const page = await exportPage(t.name, offset);
          rows.push(...page);
          if (page.length < PAGE) break;
        }
        all[t.name] = rows;
        let copied = 0;
        for (let i = 0; i < rows.length; i += 200) {
          const res = await importRows({ data: { table: t.name, rows: rows.slice(i, i + 200), pass: "rows" } });
          copied += res.written;
          update(t.name, { legal: rows.length, copied });
        }
        update(t.name, { legal: rows.length, copied, state: t.deferred.length ? "copying" : "done" });
      } catch (e) {
        failed++;
        update(t.name, { state: "failed", error: e instanceof Error ? e.message : String(e) });
      }
    }
    // Pass 2: fill in the self/cyclic links now that every row exists.
    for (const t of LEGAL_TABLES.filter((t) => t.deferred.length && all[t.name])) {
      try {
        const rows = all[t.name]!;
        for (let i = 0; i < rows.length; i += 200)
          await importRows({ data: { table: t.name, rows: rows.slice(i, i + 200), pass: "links" } });
        update(t.name, { state: "done" });
      } catch (e) {
        failed++;
        update(t.name, { state: "failed", error: e instanceof Error ? e.message : String(e) });
      }
    }
    // Check: every table here has exactly as many rows as Legal had.
    const here = await counts();
    const mismatched = LEGAL_TABLES.filter((t) => all[t.name] && here[t.name] !== all[t.name]!.length);
    for (const t of mismatched)
      update(t.name, { state: "failed", error: `Legal has ${all[t.name]!.length}, here ${here[t.name]}` });
    const total = Object.values(all).reduce((n, r) => n + r.length, 0);
    setSummary(
      failed || mismatched.length
        ? `${failed + mismatched.length} table(s) need attention.`
        : `All ${LEGAL_TABLES.length} tables copied: ${total.toLocaleString()} records, counts match.`,
    );
    setRunning(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Legal move: copy records</h1>
        <p className="text-sm" style={{ color: "#6b6b68" }}>
          Copies every Legal Group record into this portal's Legal area and checks the counts match. Nothing is
          sent to clients or firms. Safe to run again.
        </p>
      </div>
      <RequireLegal>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "#1e40af" }}
          >
            {running ? "Copying…" : "Copy all Legal records"}
          </button>
          {summary && <span className="text-sm font-medium">{summary}</span>}
        </div>
        {lines.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "#6b6b68" }}>
                <th className="py-1">Table</th>
                <th className="py-1 text-right">Legal</th>
                <th className="py-1 text-right">Copied</th>
                <th className="py-1 pl-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.table} className="border-t" style={{ borderColor: "#ebebeb" }}>
                  <td className="py-1 font-mono text-xs">{l.table}</td>
                  <td className="py-1 text-right tabular-nums">{l.legal}</td>
                  <td className="py-1 text-right tabular-nums">{l.copied}</td>
                  <td className="py-1 pl-3">
                    {l.state === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {l.state === "copying" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {l.state === "failed" && (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" /> {l.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RequireLegal>
    </div>
  );
}
