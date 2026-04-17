import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getErrorLogs, resolveErrorLog } from "@/utils/error-logger.functions";
import { CheckCircle, Copy, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_dashboard/logs")({
  component: LogsPage,
});

const FUNCTION_LABELS: Record<string, string> = {
  sendContractEmail: "Send Contract Email",
  sendInvoiceEmail: "Send Invoice Email",
  sendPaymentLinkSMS: "Send Payment Link SMS",
  initiateCall: "Initiate Phone Call",
  "twilio-token": "Twilio Token Generation",
  "twilio-device": "Twilio Device (Browser)",
  "twilio-call": "Twilio Call (Browser)",
  "window.error": "Uncaught Browser Error",
  "window.unhandledrejection": "Unhandled Promise Rejection",
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
  if (isToday) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return `${d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} at ${time}`;
}

interface ErrorLog {
  id: string;
  created_at: string;
  function_name: string;
  error_message: string;
  context: Record<string, unknown>;
  resolved: boolean;
}

function LogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getErrorLogs();
      setLogs(data as ErrorLog[]);
    } catch {
      console.error("Failed to fetch logs");
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleResolve = async (id: string) => {
    await resolveErrorLog({ data: { id } });
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, resolved: true } : l)));
  };

  const handleCopy = (log: ErrorLog) => {
    const ctx = log.context || {};
    const text = `ERROR REPORT
------------
Time: ${new Date(log.created_at).toLocaleString("en-AU")}
Function: ${FUNCTION_LABELS[log.function_name] || log.function_name}
Error: ${log.error_message}
Context: ${JSON.stringify(ctx, null, 2)}
Raw API Response: ${ctx.rawResponse ? JSON.stringify(ctx.rawResponse, null, 2) : "N/A"}
Steps to reproduce: ${ctx.stepsToReproduce || "N/A"}`;

    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Error Logs</h1>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {logs.length === 0 && !loading && (
        <p className="text-muted-foreground text-center py-12">No errors logged yet — that's a good sign!</p>
      )}

      {logs.map((log) => (
        <Card key={log.id} className="border-l-4" style={{ borderLeftColor: log.resolved ? "var(--color-green-500, #22c55e)" : "var(--color-red-500, #ef4444)" }}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${log.resolved ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="font-semibold text-sm">
                    {FUNCTION_LABELS[log.function_name] || log.function_name}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatTime(log.created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{log.error_message}</p>
                {log.context && Object.keys(log.context).length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Context details</summary>
                    <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              {!log.resolved && (
                <Badge variant="destructive" className="shrink-0">Unresolved</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {!log.resolved && (
                <Button size="sm" variant="outline" onClick={() => handleResolve(log.id)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Resolved
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => handleCopy(log)}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                {copiedId === log.id ? "Copied!" : "Copy for Claude"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
