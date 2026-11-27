// Ported from the Legal app (family-law-floater/src/components/firms/FirmPipelineReadOnly.tsx). Re-run the port script to refresh.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/legal/components/ui/input";
import { Badge } from "@/legal/components/ui/badge";
import { FirmCalendlyBooking } from "./FirmCalendlyBooking";
import {
  displayName,
  fetchApplications,
  fetchFirmDuplicateHistory,
  fetchNotes,
  stageLabel,
} from "@/legal/lib/firm-applications";
import { findFirmDuplicates } from "@/legal/lib/firm-duplicates";
import { FirmDuplicateBadge, FirmDuplicateNotice } from "./FirmDuplicateNotice";

/** Staff can view a granted pipeline without receiving account-wide admin powers. */
export function FirmPipelineReadOnly() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const firms = useQuery({
    queryKey: ["firm-applications"],
    queryFn: fetchApplications,
    refetchInterval: 30_000,
  });
  const notes = useQuery({
    queryKey: ["firm-application-notes", selected],
    queryFn: () => fetchNotes(selected!),
    enabled: !!selected,
  });
  const duplicates = useMemo(() => findFirmDuplicates(firms.data ?? []), [firms.data]);
  const matches = selected ? (duplicates.get(selected) ?? []) : [];
  const duplicateIds = matches.map(({ application }) => application.id).sort();
  const history = useQuery({
    queryKey: ["firm-duplicate-history", duplicateIds, false],
    // Read-only staff retain their existing notes access, without call-sheet access.
    queryFn: () => fetchFirmDuplicateHistory(duplicateIds, false),
    enabled: duplicateIds.length > 0,
    refetchInterval: 15_000,
  });
  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold">Firm Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          View firm applications and notes. Pipeline management is available to admins.
        </p>
      </header>
      <Input
        aria-label="Search firm applications"
        placeholder="Search firms, contacts or cities…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {firms.isPending && <p role="status">Loading firms…</p>}
      {firms.error && <p role="alert">{firms.error.message}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(firms.data ?? [])
          .filter((firm) =>
            [displayName(firm), firm.email, firm.city]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((firm) => (
            <div key={firm.id} className="space-y-2 rounded-lg border p-4">
              <button
                className="flex w-full items-center justify-between gap-3 text-left font-medium"
                onClick={() => setSelected(selected === firm.id ? null : firm.id)}
                aria-expanded={selected === firm.id}
              >
                {displayName(firm)} <Badge variant="secondary">{stageLabel(firm.stage)}</Badge>
              </button>
              <FirmDuplicateBadge count={duplicates.get(firm.id)?.length ?? 0} />
              <p className="text-sm text-muted-foreground">
                {[firm.first_name, firm.last_name].filter(Boolean).join(" ")} ·{" "}
                {firm.city || "City not set"}
              </p>
              <p className="text-sm">
                {firm.email} {firm.phone}
              </p>
              <FirmCalendlyBooking app={firm} />
              {selected === firm.id && (
                <div className="space-y-2 border-t pt-3 text-sm">
                  <FirmDuplicateNotice
                    matches={matches}
                    history={history.data}
                    loading={history.isLoading}
                    error={history.isError}
                    onRetry={() => void history.refetch()}
                    onOpen={(id) => {
                      setSearch("");
                      setSelected(id);
                    }}
                  />
                  {notes.isPending ? (
                    "Loading notes…"
                  ) : notes.error ? (
                    <p role="alert">{notes.error.message}</p>
                  ) : notes.data?.length ? (
                    notes.data.map((note) => (
                      <p key={note.id} className="whitespace-pre-wrap">
                        {note.body}
                      </p>
                    ))
                  ) : (
                    "No notes yet."
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
