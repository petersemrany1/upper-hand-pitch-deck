// Ported from the Legal app (family-law-floater/src/components/settings/export-transcripts-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/legal/components/ui/dropdown-menu";
import {
  exportSingleTranscriptFn,
  exportTranscriptsFn,
  listTranscriptCallsFn,
} from "@/legal/lib/transcript-export.functions";

function download(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Temporary admin-only one-off transcript export. */
export function ExportTranscriptsCard() {
  const exportTranscripts = useServerFn(exportTranscriptsFn);
  const listCalls = useServerFn(listTranscriptCallsFn);
  const exportOne = useServerFn(exportSingleTranscriptFn);
  const [busy, setBusy] = useState(false);
  const [calls, setCalls] = useState<{ id: string; label: string }[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const loadList = () => {
    if (calls || loadingList) return;
    setLoadingList(true);
    void listCalls({})
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setCalls(result.calls);
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setLoadingList(false));
  };

  const runOne = (callId: string) => {
    void exportOne({ data: { callId } })
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        download(result.text, `transcript-${result.name}.txt`);
        toast.success("Transcript downloaded");
      })
      .catch((e: unknown) => toast.error((e as Error).message));
  };

  const run = () => {
    setBusy(true);
    void exportTranscripts({})
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        download(result.text, "call-transcripts.txt");
        toast.success(`Exported ${result.count} call${result.count === 1 ? "" : "s"}`);
      })
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setBusy(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export transcripts</CardTitle>
        <CardDescription>
          Downloads a .txt file with every call longer than 2 minutes, oldest to newest. Temporary tool.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={run} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export transcripts
        </Button>
        <DropdownMenu onOpenChange={(open) => open && loadList()}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export one transcript
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-96 overflow-y-auto">
            {loadingList ? (
              <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
            ) : calls && calls.length ? (
              calls.map((call) => (
                <DropdownMenuItem key={call.id} onSelect={() => runOne(call.id)}>
                  {call.label}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No transcripts found</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
