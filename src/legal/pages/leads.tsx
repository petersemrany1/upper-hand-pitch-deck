// Ported from the Legal app (family-law-floater/src/routes/_authenticated/leads.tsx). Re-run the port script to refresh.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/legal/runtime/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, PhoneCall, Trash2 } from "lucide-react";

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
import { Checkbox } from "@/legal/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/legal/components/ui/select";
import { supabase } from "@/legal/integrations/supabase/client";
import { formAnswers } from "@/legal/lib/form-answers";
import {
  ASSET_BAND_LABELS,
  FUNDING_LABELS,
  LEAD_STATUSES,
  RELATIONSHIP_STAGE_LABELS,
  TIMELINE_LABELS,
  assignLeads,
  deleteLeads,
  fetchClientLeads,
  fetchSalesReps,
  formatCreated,
  leadName,
  statusMeta,
  updateLeadStatus,
  type ClientLead,
} from "@/legal/lib/client-leads";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LeadsPage as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Leads — Legal Group Portal" },
      { name: "description", content: "Assign incoming divorce enquiry leads to sales reps." },
      { property: "og:title", content: "Leads — Legal Group Portal" },
      {
        property: "og:description",
        content: "Assign incoming divorce enquiry leads to sales reps.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

const UNASSIGNED = "__unassigned__";
const ALL = "__all__";

/** The five standard answers already have their own chip once they map to a known value. */
function isShownAsChip(lead: ClientLead, key: string): boolean {
  if (key === "relationship_stage") return Boolean(lead.relationship_stage);
  if (key === "has_kids_under_18") return lead.has_kids_under_18 !== null;
  if (key === "asset_band") return Boolean(lead.asset_band);
  if (key === "settlement_timeline") return Boolean(lead.settlement_timeline);
  if (key === "funding_preference") return Boolean(lead.funding_preference);
  return false;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] leading-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

function LeadRow({
  lead,
  reps,
  selected,
  onToggle,
  onAssign,
  onStatusChange,
  onDelete,
}: {
  lead: ClientLead;
  reps: { id: string; name: string | null; email: string | null }[];
  selected: boolean;
  onToggle: (checked: boolean) => void;
  onAssign: (repId: string | null) => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}) {
  const meta = statusMeta(lead.status);
  const rep = reps.find((r) => r.id === lead.rep_id);

  return (
    <div className="flex flex-col gap-2 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/30 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggle(v === true)}
          aria-label={`Select ${leadName(lead)}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{leadName(lead)}</span>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {lead.phone}
              </a>
            )}
            {lead.city && <Badge variant="secondary">{lead.city}</Badge>}
            {lead.previous_lead_id && (
              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Returning</Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {lead.relationship_stage && (
              <Chip
                label="Stage"
                value={RELATIONSHIP_STAGE_LABELS[lead.relationship_stage] ?? lead.relationship_stage}
              />
            )}
            {lead.has_kids_under_18 !== null && (
              <Chip label="Kids <18" value={lead.has_kids_under_18 ? "Yes" : "No"} />
            )}
            {lead.asset_band && (
              <Chip label="Assets" value={ASSET_BAND_LABELS[lead.asset_band] ?? lead.asset_band} />
            )}
            {lead.settlement_timeline && (
              <Chip
                label="Timeline"
                value={TIMELINE_LABELS[lead.settlement_timeline] ?? lead.settlement_timeline}
              />
            )}
            {lead.funding_preference && (
              <Chip
                label="Funding"
                value={FUNDING_LABELS[lead.funding_preference] ?? lead.funding_preference}
              />
            )}
            {formAnswers(lead.raw_payload)
              .filter((a) => !isShownAsChip(lead, a.key))
              .map((a) => (
                <Chip key={a.key} label={a.question} value={a.answer} />
              ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-8 lg:pl-0">
        <span className="w-28 text-xs text-muted-foreground">
          {lead.status === "callback_scheduled" && lead.callback_scheduled_at ? (
            <span className="block font-medium text-orange-600">
              Call back {formatCreated(lead.callback_scheduled_at)}
            </span>
          ) : null}
          <span className="block">Enquired {formatCreated(lead.created_at)}</span>
        </span>
        <Select value={lead.status} onValueChange={onStatusChange}>
          <SelectTrigger
            className="h-8 w-[190px] text-xs"
            style={{ borderColor: `${meta.color}55`, color: meta.color }}
            aria-label={`Status for ${leadName(lead)}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.emoji} {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={lead.rep_id ?? UNASSIGNED}
          onValueChange={(v) => onAssign(v === UNASSIGNED ? null : v)}
        >
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {reps.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name ?? r.email ?? "Rep"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rep ? null : <span className="sr-only">Unassigned</span>}
        <Button asChild variant="outline" size="sm">
          <Link to="/my-recordings" search={{ biz: "legal", ...({ lead: lead.id }) } as never} aria-label={`Transcripts for ${leadName(lead)}`}>
            <FileText className="mr-1 size-4" /> Transcripts
          </Link>
        </Button>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          aria-label={`Open ${leadName(lead)} in the sales call workspace`}
          title="Open in sales call"
        >
          <Link to="/sales-call" search={{ biz: "legal", ...({ lead: lead.id }) } as never}>
            <PhoneCall className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${leadName(lead)}`}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LeadsPage() {
  const queryClient = useQueryClient();
  const [city, setCity] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTo, setAssignTo] = useState<string>("");
  const [pendingDelete, setPendingDelete] = useState<ClientLead[] | null>(null);

  const leadsQuery = useQuery({ queryKey: ["client-leads"], queryFn: fetchClientLeads });
  const repsQuery = useQuery({ queryKey: ["sales-reps"], queryFn: fetchSalesReps });

  useEffect(() => {
    const channel = supabase
      .channel("client-leads-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_leads" },
        () => void queryClient.invalidateQueries({ queryKey: ["client-leads"] }),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [queryClient]);

  const leads = leadsQuery.data ?? [];
  const reps = (repsQuery.data ?? []).filter((r) => r.is_active);

  const cities = useMemo(
    () => Array.from(new Set(leads.map((l) => l.city).filter((c): c is string => !!c))).sort(),
    [leads],
  );

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (city !== ALL && l.city !== city) return false;
        if (status !== ALL && l.status !== status) return false;
        if (unassignedOnly && l.rep_id) return false;
        return true;
      }),
    [leads, city, status, unassignedOnly],
  );

  const groups = useMemo(
    () =>
      LEAD_STATUSES.map((s) => ({
        ...s,
        leads: filtered.filter((l) => l.status === s.value),
      })).filter((g) => g.leads.length > 0),
    [filtered],
  );

  const assignMutation = useMutation({
    mutationFn: ({ ids, repId }: { ids: string[]; repId: string | null }) =>
      assignLeads(ids, repId),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.repId
          ? `Assigned ${vars.ids.length} lead${vars.ids.length === 1 ? "" : "s"}`
          : `Unassigned ${vars.ids.length} lead${vars.ids.length === 1 ? "" : "s"}`,
      );
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ["client-leads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteLeads(ids),
    onSuccess: (_data, ids) => {
      toast.success(`Deleted ${ids.length} lead${ids.length === 1 ? "" : "s"}`);
      setPendingDelete(null);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["client-leads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateLeadStatus(id, status),
    onSuccess: (_data, vars) => {
      toast.success(`Status set to ${statusMeta(vars.status).label}`);
      void queryClient.invalidateQueries({ queryKey: ["client-leads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleMany = (ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const allFilteredIds = filtered.map((l) => l.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-24">
      <div className="shrink-0 border-b px-4 py-4 md:px-6">
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Leads
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign incoming enquiries to reps. {filtered.length} of {leads.length} shown.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[210px] text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.emoji} {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={unassignedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnassignedOnly((v) => !v)}
          >
            Unassigned only
          </Button>

          <label className="ml-auto flex items-center gap-2 text-sm">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => toggleMany(allFilteredIds, v === true)}
              aria-label="Select all filtered leads"
            />
            Select all filtered
          </label>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 md:px-6">
        {leadsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading leads…</p>}
        {leadsQuery.isError && (
          <p className="text-sm text-destructive">
            Could not load leads: {(leadsQuery.error as Error).message}
          </p>
        )}
        {!leadsQuery.isLoading && groups.length === 0 && (
          <p className="text-sm text-muted-foreground">No leads match these filters yet.</p>
        )}

        <div className="space-y-6">
          {groups.map((group) => {
            const ids = group.leads.map((l) => l.id);
            const groupSelected = ids.every((id) => selected.has(id));
            return (
              <section key={group.value} className="rounded-lg border">
                <header className="flex items-center gap-3 border-b bg-muted/30 px-3 py-2">
                  <Checkbox
                    checked={groupSelected}
                    onCheckedChange={(v) => toggleMany(ids, v === true)}
                    aria-label={`Select all ${group.label}`}
                  />
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: group.color }}
                  >
                    {group.emoji} {group.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{group.leads.length}</span>
                </header>
                <div>
                  {group.leads.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      reps={reps}
                      selected={selected.has(lead.id)}
                      onToggle={(checked) => toggle(lead.id, checked)}
                      onAssign={(repId) =>
                        assignMutation.mutate({ ids: [lead.id], repId })
                      }
                      onStatusChange={(status) =>
                        statusMutation.mutate({ id: lead.id, status })
                      }
                      onDelete={() => setPendingDelete([lead])}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="h-9 w-[200px] text-sm">
                <SelectValue placeholder="Choose rep" />
              </SelectTrigger>
              <SelectContent>
                {reps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name ?? r.email ?? "Rep"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!assignTo || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({ ids: Array.from(selected), repId: assignTo })
              }
            >
              Assign
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                setPendingDelete(leads.filter((l) => selected.has(l.id)))
              }
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDelete?.length === 1 ? "this lead" : `${pendingDelete?.length ?? 0} leads`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.length === 1 && pendingDelete[0]
                ? `${leadName(pendingDelete[0])} will be permanently removed, along with their call and message history.`
                : "These leads will be permanently removed, along with their call and message history."}{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate((pendingDelete ?? []).map((l) => l.id));
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
