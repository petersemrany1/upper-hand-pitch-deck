// Ported from the Legal app (family-law-floater/src/components/cold-calling/ImportWizard.tsx). Re-run the port script to refresh.
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Badge } from "@/legal/components/ui/badge";
import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { Label } from "@/legal/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/legal/components/ui/table";
import {
  importProspectsFn,
  type ImportChunkResult,
} from "@/legal/lib/cold-calling/cold-calling.functions";
import { parseCsv, type ParsedCsv } from "@/legal/lib/cold-calling/csv";
import {
  IMPORT_FIELDS,
  autoMapColumns,
  buildImportRow,
  type ColumnMapping,
  type ImportRow,
} from "@/legal/lib/cold-calling/import";

const CHUNK = 40;
const NONE = "__none__";

type Summary = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: Array<{ rowNumber: number; outcome: string; message: string | null }>;
};

export function ImportWizard() {
  const queryClient = useQueryClient();
  const importFn = useServerFn(importProspectsFn);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [running, setRunning] = useState<"dry" | "commit" | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ mode: "dry" | "commit"; data: Summary } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      toast.error("That file has no rows.");
      return;
    }
    setFileName(file.name);
    setCsv(parsed);
    setMapping(autoMapColumns(parsed.headers));
    setSummary(null);
  };

  const built = useMemo<ImportRow[]>(() => {
    if (!csv) return [];
    return csv.rows.map((row, i) => buildImportRow(row, mapping, i + 2));
  }, [csv, mapping]);

  const okRows = useMemo(
    () => built.filter((r): r is Extract<ImportRow, { ok: true }> => r.ok),
    [built],
  );
  const badRows = useMemo(
    () => built.filter((r): r is Extract<ImportRow, { ok: false }> => !r.ok),
    [built],
  );
  const mandatoryMissing = IMPORT_FIELDS.filter((f) => f.required && mapping[f.key] == null);

  const run = async (mode: "dry" | "commit") => {
    if (!csv || okRows.length === 0) return;
    setRunning(mode);
    setProgress(0);
    setStatus(null);
    const totals: Summary = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: badRows.length,
      rows: badRows.map((r) => ({
        rowNumber: r.rowNumber,
        outcome: "failed",
        message: r.errors.join(" "),
      })),
    };
    let batchId: string | null = null;
    try {
      for (let i = 0; i < okRows.length; i += CHUNK) {
        const chunk = okRows.slice(i, i + CHUNK);
        // A dropped request (server time limit, flaky network) is retried; chunks are idempotent.
        let result: ImportChunkResult | null = null;
        for (let attempt = 1; attempt <= 4 && !result; attempt += 1) {
          try {
            result = await importFn({
              data: {
                rows: chunk,
                fileName: fileName ?? "import.csv",
                dryRun: mode === "dry",
                batchId,
                totalRows: csv.rows.length,
                failedRows: badRows.length,
              },
            });
          } catch (error) {
            if (attempt === 4) throw error;
            setStatus(
              `Chunk ${i / CHUNK + 1} failed (${error instanceof Error ? error.message : "error"}) — retrying…`,
            );
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
        if (!result) throw new Error("Import stopped");
        batchId = result.batchId;
        totals.inserted += result.inserted;
        totals.updated += result.updated;
        totals.skipped += result.skipped;
        totals.failed += result.failed;
        totals.rows.push(...result.rowResults);
        setProgress(Math.min(okRows.length, i + chunk.length));
        setStatus(null);
      }
      setSummary({ mode, data: totals });
      if (mode === "commit") {
        toast.success(
          `Imported: ${totals.inserted} new, ${totals.updated} updated, ${totals.skipped} skipped, ${totals.failed} failed`,
        );
        void queryClient.invalidateQueries({ queryKey: ["prospects"] });
      } else {
        toast.success("Dry run complete — nothing was saved");
      }
    } catch (error) {
      setStatus(
        `Stopped after ${progress} rows: ${error instanceof Error ? error.message : "Import failed"}. Press Import again to resume — rows already saved are updated, not duplicated.`,
      );
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Choose a CSV file</CardTitle>
          <CardDescription>
            The file is read in your browser. Nothing is saved until you press Import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void onFile(e.target.files?.[0])}
            aria-label="Prospect CSV file"
          />
          {csv ? (
            <p className="text-sm text-muted-foreground">
              {fileName}: {csv.rows.length} rows, {csv.headers.length} columns.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {csv ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Map columns</CardTitle>
            <CardDescription>
              Columns were matched by name; adjust anything that looks wrong. Firm name is
              mandatory, plus a domain or a phone number per row.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  <Select
                    value={mapping[field.key] == null ? NONE : String(mapping[field.key])}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [field.key]: v === NONE ? null : Number(v) }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— not imported —</SelectItem>
                      {csv.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {mandatoryMissing.length > 0 ? (
              <p className="mt-3 text-sm text-destructive">
                Map: {mandatoryMissing.map((f) => f.label).join(", ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {csv && mandatoryMissing.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Preview</CardTitle>
            <CardDescription>
              {okRows.length} rows ready · {badRows.length} rows with errors ·{" "}
              {okRows.filter((r) => r.warnings.length > 0).length} with warnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-96 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Phone (E.164)</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Score / Tier</TableHead>
                    <TableHead>Decision-maker</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {built.slice(0, 200).map((r) =>
                    r.ok ? (
                      <TableRow key={r.rowNumber}>
                        <TableCell className="tabular-nums">{r.rowNumber}</TableCell>
                        <TableCell className="font-medium">{r.firm.firm_name}</TableCell>
                        <TableCell>
                          {r.firm.root_domain ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.firm.phone_e164 ?? <span className="text-destructive">none</span>}
                        </TableCell>
                        <TableCell>
                          {r.firm.state ?? <span className="text-destructive">?</span>}
                        </TableCell>
                        <TableCell>
                          {r.firm.fit_score ?? "—"} / {r.firm.priority_tier ?? "—"}
                        </TableCell>
                        <TableCell>
                          {r.contacts[0]?.full_name ?? (
                            <span className="text-muted-foreground">not found</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs text-muted-foreground">
                          {r.warnings.join(" ")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={r.rowNumber} className="bg-destructive/5">
                        <TableCell className="tabular-nums">{r.rowNumber}</TableCell>
                        <TableCell>{r.firmName ?? "—"}</TableCell>
                        <TableCell colSpan={6} className="text-xs text-destructive">
                          {r.errors.join(" ")}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
              {built.length > 200 ? (
                <p className="p-2 text-xs text-muted-foreground">Showing the first 200 rows.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={running !== null || okRows.length === 0}
                onClick={() => void run("dry")}
              >
                {running === "dry"
                  ? `Checking… ${progress}/${okRows.length}`
                  : "Dry run (validate only)"}
              </Button>
              <Button
                disabled={running !== null || okRows.length === 0}
                onClick={() => void run("commit")}
              >
                {running === "commit"
                  ? `Importing… ${progress}/${okRows.length}`
                  : `Import ${okRows.length} rows`}
              </Button>
              {status ? <span className="w-full text-sm text-destructive">{status}</span> : null}
              <span className="text-xs text-muted-foreground">
                Existing firms are matched by root domain (then phone) and updated; blank cells
                never overwrite existing research.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {summary.mode === "dry" ? "Dry-run result (nothing saved)" : "Import result"}
            </CardTitle>
            <CardDescription className="flex flex-wrap gap-2">
              <Badge>{summary.data.inserted} new</Badge>
              <Badge variant="secondary">{summary.data.updated} updated</Badge>
              <Badge variant="outline">{summary.data.skipped} skipped</Badge>
              <Badge variant="destructive">{summary.data.failed} failed</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.data.rows.filter((r) => r.outcome !== "inserted" && r.outcome !== "updated")
              .length === 0 ? (
              <p className="text-sm text-muted-foreground">No skipped or failed rows.</p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.data.rows
                      .filter((r) => r.outcome !== "inserted" && r.outcome !== "updated")
                      .map((r, i) => (
                        <TableRow key={`${r.rowNumber}-${i}`}>
                          <TableCell className="tabular-nums">{r.rowNumber}</TableCell>
                          <TableCell>{r.outcome}</TableCell>
                          <TableCell className="text-xs">{r.message}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
