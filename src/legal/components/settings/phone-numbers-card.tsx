// Ported from the Legal app (family-law-floater/src/components/settings/phone-numbers-card.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Phone, Plus, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/legal/components/ui/alert-dialog";
import { Badge } from "@/legal/components/ui/badge";
import { Button } from "@/legal/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/legal/components/ui/table";
import { buyPoolNumber, diagnosePoolNumbers, releasePoolNumber } from "@/legal/lib/phone-numbers.functions";
import {
  fetchPoolNumbers,
  formatLastUsed,
  setPoolNumberStatus,
  type PoolNumber,
} from "@/legal/lib/phone-numbers";

export function PhoneNumbersCard() {
  const queryClient = useQueryClient();
  const [pendingRelease, setPendingRelease] = useState<PoolNumber | null>(null);
  // Failures are also shown inline — a toast alone is easy to miss on a long page.
  const [lastError, setLastError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[] | null>(null);

  const numbers = useQuery({ queryKey: ["phone-numbers"], queryFn: fetchPoolNumbers });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });

  const buy = useServerFn(buyPoolNumber);
  const diagnose = useServerFn(diagnosePoolNumbers);
  const release = useServerFn(releasePoolNumber);

  const showFailure = (message: string) => {
    setLastError(message);
    toast.error(message, { duration: 15000 });
  };

  const buying = useMutation({
    mutationFn: () => buy(),
    onSuccess: (result) => {
      if (!result.ok) {
        showFailure(result.error);
        return;
      }
      setLastError(null);
      toast.success(`Bought ${result.number} — it's live in the pool`);
      void invalidate();
    },
    onError: (error: Error) => showFailure(error.message || "The purchase request failed"),
  });

  const diagnosing = useMutation({
    mutationFn: () => diagnose(),
    onSuccess: (result) => {
      const lines: string[] = [];
      if (result.recovered.length > 0) {
        lines.push(`Recovered into the pool: ${result.recovered.join(", ")}`);
      }
      if (result.ownedError) lines.push(`Owned-number lookup: ${result.ownedError}`);
      for (const step of result.steps) {
        lines.push(`${step.ok ? "PASS" : "FAIL"} — ${step.step}: ${step.detail}`);
      }
      if (lines.length === 0) lines.push("No numbers on the Twilio account and no steps returned.");
      setDiagnostics(lines);
      const failing = result.steps.find((step) => !step.ok);
      if (failing || result.ownedError) {
        showFailure(failing ? failing.detail : (result.ownedError as string));
      } else {
        toast.success("Twilio checks passed — buying should work");
      }
      if (result.recovered.length > 0) void invalidate();
    },
    onError: (error: Error) => showFailure(error.message || "Diagnostics failed"),
  });

  const releasing = useMutation({
    mutationFn: (id: string) => release({ data: { id } }),
    onSuccess: (result) => {
      setLastError(null);
      toast.success(`Released ${result.number} from Twilio`);
      setPendingRelease(null);
      void invalidate();
    },
    onError: (error: Error) => showFailure(error.message || "Could not release that number"),
  });

  const toggling = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      setPoolNumberStatus(id, status),
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "active" ? "Number reactivated" : "Number deactivated");
      void invalidate();
    },
    onError: (error: Error) => showFailure(error.message || "Could not update that number"),
  });

  const rows = numbers.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-4 w-4" aria-hidden />
          Phone Numbers
        </CardTitle>
        <CardDescription>
          The outbound number pool. Calls and texts rotate through the active numbers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => buying.mutate()}
            disabled={buying.isPending}
            aria-label="Buy a new Australian mobile number for the outbound pool"
          >
            {buying.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
            {buying.isPending ? "Buying…" : "Buy new number"}
          </Button>
          <Button
            variant="outline"
            onClick={() => diagnosing.mutate()}
            disabled={diagnosing.isPending}
            aria-label="Test the Twilio purchase steps without buying a number"
          >
            {diagnosing.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Stethoscope className="h-4 w-4" aria-hidden />
            )}
            {diagnosing.isPending ? "Checking…" : "Test Twilio"}
          </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Each number costs a few dollars a month on the Twilio account.
          </p>
          {lastError ? (
            <p
              role="alert"
              className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {lastError}
            </p>
          ) : null}
          {diagnostics ? (
            <ul className="mt-3 space-y-1 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              {diagnostics.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {numbers.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading numbers…</p>
        ) : numbers.isError ? (
          <p className="text-sm text-destructive">
            Could not load the number pool: {(numbers.error as Error).message}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No numbers yet. Buy one to start making calls and sending texts.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Calls made</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const active = row.status === "active";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium tabular-nums">{row.number}</TableCell>
                      <TableCell>
                        <Badge variant={active ? "default" : "secondary"}>
                          {active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.call_count}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLastUsed(row.last_used_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={toggling.isPending}
                            onClick={() =>
                              toggling.mutate({ id: row.id, status: active ? "inactive" : "active" })
                            }
                            aria-label={`${active ? "Deactivate" : "Reactivate"} ${row.number}`}
                          >
                            {active ? "Deactivate" : "Reactivate"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setPendingRelease(row)}
                            aria-label={`Release ${row.number} from Twilio`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Release
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={pendingRelease !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRelease(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release {pendingRelease?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the number from the Twilio account and removes it from the pool. You cannot
              get the same number back, and anyone who texts or calls it will no longer reach us.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releasing.isPending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={releasing.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingRelease) releasing.mutate(pendingRelease.id);
              }}
            >
              {releasing.isPending ? "Releasing…" : "Release number"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
