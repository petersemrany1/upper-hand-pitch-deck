import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Mail, Phone as PhoneIcon, Trash2, Pencil, X, Plus, UserCheck, ChevronDown, ChevronRight, MapPin, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deleteBookedDuplicateLeads } from "@/lib/lead-dedupe.functions";


export const Route = createFileRoute("/_dashboard/leads")({
  component: LeadsPage,
});

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  funding_preference: string | null;
  ad_name: string | null;
  ad_set_name: string | null;
  campaign_name: string | null;
  creative_time: string | null;
  created_at: string;
  status?: string | null;
  call_notes?: string | null;
  rep_id?: string | null;
  raw_payload?: unknown;
  previous_lead_id?: string | null;
  lead_class?: string | null;
  lead_class_reason?: string | null;
  superseded_by_lead_id?: string | null;
};

const CLASS_BADGE: Record<string, { label: string; bg: string; fg: string; title: string }> = {
  returning: {
    label: "Returning",
    bg: "#f59e0b",
    fg: "#fff",
    title: "This person has enquired with us before — history is loaded on the call screen",
  },
  post_consult: {
    label: "Been in before",
    bg: "#7c3aed",
    fg: "#fff",
    title: "This person has already attended a consult",
  },
  booked_active: {
    label: "Already booked",
    bg: "#dc2626",
    fg: "#fff",
    title: "This person already has an upcoming appointment — do not cold call",
  },
};

type RepOption = { id: string; name: string; email: string | null };

const DEFAULT_STATUSES = [
  "New",
  "No Answer",
  "Callback Scheduled",
  "Spoke — No Sale",
  "Not Interested",
  "Booked — No Deposit",
  "Booked — Deposit Paid",
  "Dropped",
] as const;

const STATUS_STORAGE_KEY = "custom_lead_statuses";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  "New": { bg: "#ebebeb", fg: "#111111" },
  "No Answer": { bg: "#fffbeb", fg: "#92400e" },
  "Callback Scheduled": { bg: "#eff6ff", fg: "#3b82f6" },
  "Spoke — No Sale": { bg: "#fff7ed", fg: "#c2410c" },
  "Not Interested": { bg: "#fef2f2", fg: "#dc2626" },
  "Booked — No Deposit": { bg: "#f5f3ff", fg: "#7c3aed" },
  "Booked — Deposit Paid": { bg: "#ecfdf5", fg: "#059669" },
  "Dropped": { bg: "#f3f3f3", fg: "#666666" },
};

const CUSTOM_STATUS_COLOR = { bg: "#fff5f3", fg: "#f4522d" };

function statusBadge(s: string | null | undefined) {
  const value = (s ?? "").trim() || "New";
  return STATUS_COLORS[value] ?? CUSTOM_STATUS_COLOR;
}

function readRawString(payload: unknown, key: string): string | null {
  if (payload === null || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>)[key];
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

// Same logic as dashboard: strip "Hair Transplant " prefix from campaign_name,
// else fall back to raw_payload.location (or nested website payload).
function deriveLocation(l: Lead): string | null {
  const camp = (l.campaign_name ?? "").trim();
  if (camp) {
    const cleaned = camp.replace(/^hair\s+transplant\s+/i, "").trim();
    if (cleaned) return cleaned;
  }
  const rp = (l.raw_payload && typeof l.raw_payload === "object")
    ? (l.raw_payload as Record<string, unknown>)
    : null;
  const nested = rp && typeof rp.raw_payload === "object" && rp.raw_payload !== null
    ? (rp.raw_payload as Record<string, unknown>)
    : null;
  const loc =
    (typeof rp?.location === "string" ? rp.location : "") ||
    (typeof nested?.location === "string" ? nested.location : "");
  return loc.trim() || null;
}

const UNKNOWN_LOC = "__unknown__";

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

type EditableFields = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  funding_preference: string;
  status: string;
  call_notes: string;
};

const toForm = (r: Lead): EditableFields => ({
  first_name: r.first_name ?? "",
  last_name: r.last_name ?? "",
  email: r.email ?? "",
  phone: r.phone ?? "",
  funding_preference: r.funding_preference ?? "",
  status: r.status ?? "New",
  call_notes: r.call_notes ?? "",
});

function loadCustomStatuses(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveCustomStatuses(list: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(list));
}

function LeadsPage() {
  const { user, role, ready } = useAuth();
  void role;
  const [rows, setRows] = useState<Lead[]>([]);
  const [reps, setReps] = useState<RepOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<EditableFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [addingStatus, setAddingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRepId, setBulkRepId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // New filters
  const [locationFilter, setLocationFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [assignedFilter, setAssignedFilter] = useState<string>("__all__"); // "__all__" | "__unassigned__" | rep id
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  // Row quick-assign popover
  const [quickAssignId, setQuickAssignId] = useState<string | null>(null);
  const quickRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setCustomStatuses(loadCustomStatuses()); }, []);

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("id, name, email")
        .order("name", { ascending: true });
      setReps((data ?? []) as RepOption[]);
    })();
  }, [ready]);

  const repNameById = (id: string | null | undefined) =>
    reps.find((r) => r.id === id)?.name ?? "—";

  const myEmail = (user?.email ?? "").toLowerCase();
  const mySalesRepId = reps.find((r) => (r.email ?? "").toLowerCase() === myEmail)?.id ?? null;
  void mySalesRepId;

  // Duplicate enquiries from patients who already have an active booking are
  // deleted automatically — the booked lead row stays, the extra one goes.
  const purgingRef = useRef<Set<string>>(new Set());


  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());

  const toggleStatusGroup = (s: string) => {
    setCollapsedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const allStatuses = [...DEFAULT_STATUSES, ...customStatuses];

  const addCustomStatus = () => {
    const v = newStatus.trim();
    if (!v) return;
    if (allStatuses.includes(v)) {
      setNewStatus("");
      setAddingStatus(false);
      return;
    }
    const next = [...customStatuses, v];
    setCustomStatuses(next);
    saveCustomStatuses(next);
    setEditForm((prev) => (prev ? { ...prev, status: v } : prev));
    setNewStatus("");
    setAddingStatus(false);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meta_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    setRows((data ?? []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel("meta-leads-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "meta_leads" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickAssignId(null);
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setShowStatusMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const normPhone = (p: string | null) => (p ?? "").replace(/\D/g, "");
  const normEmail = (e: string | null) => (e ?? "").trim().toLowerCase();
  const dupKeys = new Set<string>();
  {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = normPhone(r.phone) || normEmail(r.email);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [k, n] of counts) if (n > 1) dupKeys.add(k);
  }
  const isDuplicate = (r: Lead) => {
    const key = normPhone(r.phone) || normEmail(r.email);
    return key !== "" && dupKeys.has(key);
  };
  const duplicateCount = rows.filter(isDuplicate).length;

  const HIDDEN_STATUSES = new Set([
    "Not Interested",
    "Dropped",
    "Spoke — No Sale",
    "Booked — Deposit Paid",
  ]);
  const queueRows = rows.filter((r) => !HIDDEN_STATUSES.has((r.status ?? "").trim()));

  // A re-enquiry from a patient who already has an upcoming appointment is an
  // extra duplicate row — delete it automatically and keep the booked lead.
  const bookedDuplicates = queueRows.filter((r) => r.lead_class === "booked_active");
  const visibleRows = queueRows.filter((r) => r.lead_class !== "booked_active");

  useEffect(() => {
    const ids = bookedDuplicates.map((r) => r.id).filter((id) => !purgingRef.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => purgingRef.current.add(id));
    void (async () => {
      try {
        await deleteBookedDuplicateLeads({ data: { ids } });
        await load();
      } catch {
        ids.forEach((id) => purgingRef.current.delete(id));
      }
    })();
  }, [bookedDuplicates.map((r) => r.id).join(",")]);



  const locationOf = (r: Lead) => deriveLocation(r) ?? UNKNOWN_LOC;

  const availableLocations = useMemo(() => {
    const set = new Map<string, number>();
    for (const r of visibleRows) {
      const loc = locationOf(r);
      set.set(loc, (set.get(loc) ?? 0) + 1);
    }
    return Array.from(set.entries()).sort((a, b) => {
      if (a[0] === UNKNOWN_LOC) return 1;
      if (b[0] === UNKNOWN_LOC) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [visibleRows]);

  const matchesSearch = (r: Lead) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.first_name ?? "").toLowerCase().includes(q) ||
      (r.last_name ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q) ||
      (r.campaign_name ?? "").toLowerCase().includes(q) ||
      (r.ad_name ?? "").toLowerCase().includes(q) ||
      (r.ad_set_name ?? "").toLowerCase().includes(q) ||
      (r.funding_preference ?? "").toLowerCase().includes(q) ||
      (r.status ?? "").toLowerCase().includes(q) ||
      repNameById(r.rep_id).toLowerCase().includes(q) ||
      (q === "duplicate" && isDuplicate(r))
    );
  };

  const matchesLocation = (r: Lead) =>
    locationFilter === "__all__" ? true : locationOf(r) === locationFilter;

  const matchesStatus = (r: Lead) => {
    if (statusFilter.size === 0) return true;
    const s = (r.status ?? "").trim() || "New";
    return statusFilter.has(s);
  };

  const matchesAssigned = (r: Lead) => {
    if (assignedFilter === "__all__") return true;
    if (assignedFilter === "__unassigned__") return !r.rep_id;
    return r.rep_id === assignedFilter;
  };

  const filtered = visibleRows.filter(
    (r) => matchesSearch(r) && matchesLocation(r) && matchesStatus(r) && matchesAssigned(r),
  );

  const anyFilterActive =
    search.trim() !== "" ||
    locationFilter !== "__all__" ||
    statusFilter.size > 0 ||
    assignedFilter !== "__all__";

  // Location chip counts: unassigned leads within current STATUS filter (ignore location filter itself)
  const chipCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of visibleRows) {
      if (!matchesStatus(r)) continue;
      if (r.rep_id) continue;
      const loc = locationOf(r);
      map.set(loc, (map.get(loc) ?? 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const filteredIds = filtered.map((r) => r.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.add(id);
        return next;
      });
    }
  };
  const toggleSelectGroup = (ids: string[], allOn: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) for (const id of ids) next.delete(id);
      else for (const id of ids) next.add(id);
      return next;
    });
  };

  const applyAssignment = async (ids: string[], newRepId: string | null) => {
    if (ids.length === 0) return { error: null as string | null };
    const { error } = await supabase
      .from("meta_leads")
      .update({ rep_id: newRepId })
      .in("id", ids);
    if (error) return { error: error.message };
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, rep_id: newRepId } : r)));
    return { error: null };
  };

  const bulkAssign = async () => {
    if (selected.size === 0) return;
    setAssigning(true);
    const ids = Array.from(selected);
    // Snapshot prior rep_ids for undo
    const prior = new Map<string, string | null>();
    for (const r of rows) if (selected.has(r.id)) prior.set(r.id, r.rep_id ?? null);
    const newRepId = bulkRepId === "" ? null : bulkRepId;

    const { error } = await applyAssignment(ids, newRepId);
    setAssigning(false);
    if (error) {
      toast.error(`Assign failed: ${error}`);
      return;
    }
    setSelected(new Set());
    const repLabel = newRepId ? (reps.find((r) => r.id === newRepId)?.name ?? "rep") : "Unassigned";
    toast.success(`Assigned ${ids.length} lead${ids.length === 1 ? "" : "s"} to ${repLabel}`, {
      action: {
        label: "Undo",
        onClick: async () => {
          // Revert each id to its prior rep, batched by prior value
          const byPrior = new Map<string | null, string[]>();
          for (const id of ids) {
            const p = prior.get(id) ?? null;
            const list = byPrior.get(p) ?? [];
            list.push(id);
            byPrior.set(p, list);
          }
          for (const [p, list] of byPrior) {
            await applyAssignment(list, p);
          }
          toast("Assignment reverted");
        },
      },
    });
  };

  const quickAssign = async (leadId: string, newRepId: string | null) => {
    const prior = rows.find((r) => r.id === leadId)?.rep_id ?? null;
    const { error } = await applyAssignment([leadId], newRepId);
    setQuickAssignId(null);
    if (error) { toast.error(`Assign failed: ${error}`); return; }
    const repLabel = newRepId ? (reps.find((r) => r.id === newRepId)?.name ?? "rep") : "Unassigned";
    toast.success(`Assigned to ${repLabel}`, {
      action: {
        label: "Undo",
        onClick: async () => { await applyAssignment([leadId], prior); toast("Reverted"); },
      },
    });
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("meta_leads").delete().eq("id", id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
    setConfirmDeleteId(null);
    setBusyId(null);
  };

  const openEdit = (r: Lead) => {
    setSaveError(null);
    setEditLead(r);
    setEditForm(toForm(r));
    setAddingStatus(false);
    setNewStatus("");
  };

  const closeEdit = () => {
    if (saving) return;
    setEditLead(null);
    setEditForm(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editLead || !editForm) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      first_name: editForm.first_name.trim() || null,
      last_name: editForm.last_name.trim() || null,
      email: editForm.email.trim() || null,
      phone: editForm.phone.trim() || null,
      funding_preference: editForm.funding_preference.trim() || null,
      status: editForm.status.trim() || "New",
      call_notes: editForm.call_notes.trim() || null,
    };
    const { data, error } = await supabase
      .from("meta_leads")
      .update(payload)
      .eq("id", editLead.id)
      .select()
      .single();
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    if (data) {
      setRows((prev) => prev.map((r) => (r.id === editLead.id ? { ...r, ...(data as Lead) } : r)));
    }
    setSaving(false);
    setEditLead(null);
    setEditForm(null);
  };

  const statusChipsSummary = statusFilter.size === 0
    ? "All statuses"
    : `${statusFilter.size} status${statusFilter.size === 1 ? "" : "es"}`;

  const clearAll = () => {
    setSearch("");
    setLocationFilter("__all__");
    setStatusFilter(new Set());
    setAssignedFilter("__all__");
  };

  return (
    <div className="h-full md:h-screen overflow-y-auto" style={{ background: "#ffffff" }}>
      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#111111]">Meta Leads</h1>
          <p className="text-sm text-[#111111] mt-1">
            {loading
              ? "Loading…"
              : `Showing ${filtered.length} of ${visibleRows.length} leads${duplicateCount > 0 ? ` · ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}` : ""}`}
          </p>
        </div>

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-30 -mx-6 px-6 py-3 mb-3 bg-white/95 backdrop-blur border-b border-[#ebebeb]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone, campaign…"
                className="w-full pl-10 pr-3 py-2 rounded-full bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111] placeholder:text-[#888] focus:outline-none focus:border-[#f4522d]"
              />
            </div>

            {/* Location filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 rounded-full bg-white border border-[#ebebeb] text-sm text-[#111111] hover:border-[#f4522d] focus:outline-none focus:border-[#f4522d]"
            >
              <option value="__all__">All locations</option>
              {availableLocations.map(([loc, n]) => (
                <option key={loc} value={loc}>
                  {loc === UNKNOWN_LOC ? "Unknown" : loc} ({n})
                </option>
              ))}
            </select>

            {/* Status multi-select */}
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setShowStatusMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#ebebeb] text-sm text-[#111111] hover:border-[#f4522d]"
              >
                <Filter className="h-3.5 w-3.5" />
                {statusChipsSummary}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showStatusMenu && (
                <div className="absolute z-40 mt-1 min-w-[240px] rounded-lg border border-[#ebebeb] bg-white shadow-lg p-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#888]">Status</span>
                    {statusFilter.size > 0 && (
                      <button
                        onClick={() => setStatusFilter(new Set())}
                        className="text-[11px] text-[#f4522d] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {allStatuses.map((s) => {
                      const on = statusFilter.has(s);
                      const b = statusBadge(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatusFilter((prev) => {
                            const next = new Set(prev);
                            if (next.has(s)) next.delete(s); else next.add(s);
                            return next;
                          })}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-[#f6f6f6] ${on ? "bg-[#fff5f3]" : ""}`}
                        >
                          <input type="checkbox" readOnly checked={on} className="accent-[#f4522d]" />
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{ background: b.bg, color: b.fg }}
                          >
                            {s}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Assigned filter */}
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="px-3 py-2 rounded-full bg-white border border-[#ebebeb] text-sm text-[#111111] hover:border-[#f4522d] focus:outline-none focus:border-[#f4522d]"
            >
              <option value="__all__">All reps</option>
              <option value="__unassigned__">Unassigned</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {anyFilterActive && (
              <button
                onClick={clearAll}
                className="px-3 py-2 rounded-full text-sm text-[#666] hover:text-[#111] hover:bg-[#f6f6f6]"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Location chips */}
          {availableLocations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setLocationFilter("__all__")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition ${
                  locationFilter === "__all__"
                    ? "bg-[#f4522d] text-white border-[#f4522d]"
                    : "bg-white text-[#111] border-[#ebebeb] hover:border-[#f4522d]"
                }`}
              >
                All
              </button>
              {availableLocations.map(([loc]) => {
                const active = locationFilter === loc;
                const count = chipCounts.get(loc) ?? 0;
                const label = loc === UNKNOWN_LOC ? "Unknown" : loc;
                return (
                  <button
                    key={loc}
                    onClick={() => setLocationFilter(active ? "__all__" : loc)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition ${
                      active
                        ? "bg-[#f4522d] text-white border-[#f4522d]"
                        : "bg-white text-[#111] border-[#ebebeb] hover:border-[#f4522d]"
                    }`}
                    title={`${count} unassigned in current status filter`}
                  >
                    <MapPin className="h-3 w-3" />
                    {label} · {count}
                  </button>
                );
              })}
            </div>
          )}
        </div>





        <div className="rounded-lg border border-[#ebebeb] overflow-visible" style={{ background: "#f9f9f9" }}>
          {loading ? (
            <div className="p-12 text-center text-[#111111] text-sm">Loading leads…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#111111] text-sm">
              {rows.length === 0
                ? "No leads yet. Once Make.com posts to your webhook, they'll appear here."
                : "No leads match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebebeb] text-xs uppercase tracking-wider text-[#111111]">
                    <th className="px-3 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="accent-[#f4522d] cursor-pointer"
                        title="Select all matching filters"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Received</th>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Assigned</th>
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Funding</th>
                    <th className="text-left px-4 py-3 font-medium">Campaign / Ad Set / Ad</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const colSpan = 9;
                    const groups = new Map<string, Lead[]>();
                    for (const r of filtered) {
                      const key = (r.status ?? "").trim() || "New";
                      const arr = groups.get(key) ?? [];
                      arr.push(r);
                      groups.set(key, arr);
                    }
                    const orderedKeys: string[] = [];
                    for (const s of allStatuses) if (groups.has(s)) orderedKeys.push(s);
                    for (const k of groups.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);

                    return orderedKeys.flatMap((statusKey) => {
                      const groupRows = groups.get(statusKey)!;
                      // User's manual collapse always wins; otherwise auto-expand when filters are active.
                      const collapsed = collapsedStatuses.has(statusKey);
                      const headBadge = statusBadge(statusKey);
                      const groupIds = groupRows.map((r) => r.id);
                      const groupAllOn = groupIds.every((id) => selected.has(id));
                      const groupSomeOn = !groupAllOn && groupIds.some((id) => selected.has(id));
                      const headerRow = (
                        <tr key={`hdr-${statusKey}`} className="bg-[#f3f3f3] border-b border-[#ebebeb]">
                          <td className="px-3 py-2 w-8">
                            <input
                              type="checkbox"
                              checked={groupAllOn}
                              ref={(el) => { if (el) el.indeterminate = groupSomeOn; }}
                              onChange={() => toggleSelectGroup(groupIds, groupAllOn)}
                              className="accent-[#f4522d] cursor-pointer"
                              title="Select all in group"
                            />
                          </td>
                          <td colSpan={colSpan - 1} className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => toggleStatusGroup(statusKey)}
                              className="flex items-center gap-2 w-full text-left text-[#111111]"
                            >
                              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span
                                className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: headBadge.bg, color: headBadge.fg }}
                              >
                                {statusKey}
                              </span>
                              <span className="text-xs text-[#666]">{groupRows.length} lead{groupRows.length === 1 ? "" : "s"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                      if (collapsed) return [headerRow];
                      return [headerRow, ...groupRows.map((r) => {
                        const fullName = [r.first_name, r.last_name].filter(Boolean).join(" ") || "—";
                        const dup = isDuplicate(r);
                        const badge = statusBadge(r.status);
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-[#ebebeb]/60 hover:bg-white transition-colors"
                            style={dup ? { background: "#fff4e5", borderLeft: "3px solid #f59e0b" } : undefined}
                          >
                            <td className="px-3 py-3 w-8">
                              <input
                                type="checkbox"
                                checked={selected.has(r.id)}
                                onChange={() => toggleSelect(r.id)}
                                className="accent-[#f4522d] cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-[#111111] whitespace-nowrap">{fmtDate(r.created_at)}</td>
                            <td className="px-4 py-3 text-[#111111] font-medium whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span>{fullName}</span>
                                {(() => {
                                  const cb = CLASS_BADGE[r.lead_class ?? ""];
                                  if (!cb) return null;
                                  return (
                                    <span
                                      className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                                      style={{ background: cb.bg, color: cb.fg }}
                                      title={r.lead_class_reason ?? cb.title}
                                    >
                                      {cb.label}
                                    </span>
                                  );
                                })()}

                                {dup && (
                                  <span
                                    className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                                    style={{ background: "#f59e0b", color: "#fff" }}
                                    title="Same phone or email already exists in another lead"
                                  >
                                    Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: badge.bg, color: badge.fg }}
                              >
                                {(r.status ?? "").trim() || "New"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setQuickAssignId(quickAssignId === r.id ? null : r.id); }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold hover:ring-2 hover:ring-[#f4522d]/30 transition ${
                                  r.rep_id ? "bg-[#eff6ff] text-[#1d4ed8]" : "bg-[#f3f3f3] text-[#666]"
                                }`}
                                title="Click to reassign"
                              >
                                {r.rep_id ? repNameById(r.rep_id) : "Unassigned"}
                                <ChevronDown className="h-3 w-3 opacity-70" />
                              </button>
                              {quickAssignId === r.id && (
                                <div
                                  ref={quickRef}
                                  className="absolute z-40 mt-1 min-w-[180px] rounded-lg border border-[#ebebeb] bg-white shadow-lg p-1"
                                >
                                  <button
                                    onClick={() => quickAssign(r.id, null)}
                                    className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-[#f6f6f6] text-[#666]"
                                  >
                                    Unassigned
                                  </button>
                                  {reps.map((rep) => (
                                    <button
                                      key={rep.id}
                                      onClick={() => quickAssign(r.id, rep.id)}
                                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-[#f6f6f6] text-[#111]"
                                    >
                                      {rep.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-[#111111]">
                              <div className="flex flex-col gap-1">
                                {r.email && (
                                  <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-[#f4522d]">
                                    <Mail className="h-3 w-3" />{r.email}
                                  </a>
                                )}
                                {r.phone && (
                                  <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#f4522d]">
                                    <PhoneIcon className="h-3 w-3" />{r.phone}
                                  </a>
                                )}
                                {!r.email && !r.phone && <span className="text-[#111111]">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {r.funding_preference ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[#f4522d]/15 text-[#f4522d] border border-[#f4522d]/30">
                                  {r.funding_preference}
                                </span>
                              ) : <span className="text-[#111111]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-[#111111] text-xs">
                              <div className="flex flex-col gap-0.5 max-w-xs">
                                <div className="text-[#111111]">{r.campaign_name || "—"}</div>
                                <div>{r.ad_set_name || "—"}</div>
                                <div className="text-[#111111]">{r.ad_name || "—"}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {confirmDeleteId === r.id ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => handleDelete(r.id)}
                                    disabled={busyId === r.id}
                                    className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-600 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded text-xs bg-[#f9f9f9] text-[#111111] hover:bg-[#f0f0f0]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => openEdit(r)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-[#111111] hover:text-[#f4522d] hover:bg-[#f4522d]/10"
                                    title="Edit lead"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(r.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-[#111111] hover:text-red-500 hover:bg-red-500/10"
                                    title="Delete lead"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })];
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sticky assign bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-white shadow-2xl border border-[#f4522d]/40">
          <UserCheck className="h-4 w-4 text-[#f4522d]" />
          <span className="text-sm text-[#111111] font-medium">{selected.size} selected</span>
          <select
            value={bulkRepId}
            onChange={(e) => setBulkRepId(e.target.value)}
            className="px-2 py-1.5 rounded-full bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111] focus:outline-none focus:border-[#f4522d]"
          >
            <option value="">— Unassigned —</option>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </select>
          <button
            onClick={bulkAssign}
            disabled={assigning}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#f4522d] hover:bg-[#dd431f] disabled:opacity-50"
          >
            {assigning ? "Assigning…" : "Assign"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 rounded-full text-xs text-[#666] hover:text-[#111111] hover:bg-[#f3f3f3]"
          >
            Clear
          </button>
        </div>
      )}

      {editLead && editForm && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeEdit}
            aria-hidden
          />
          <div
            className="relative ml-auto h-full w-full sm:max-w-md bg-white shadow-xl flex flex-col"
            style={{ background: "#ffffff" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebebeb]">
              <div>
                <h2 className="text-lg font-semibold text-[#111111]">Edit lead</h2>
                <p className="text-xs text-[#666] mt-0.5">
                  {[editLead.first_name, editLead.last_name].filter(Boolean).join(" ") || "Untitled lead"}
                </p>
              </div>
              <button
                onClick={closeEdit}
                disabled={saving}
                className="p-1.5 rounded hover:bg-[#f3f3f3] text-[#111111] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {(
                [
                  ["first_name", "First name"],
                  ["last_name", "Last name"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["funding_preference", "Funding preference"],
                ] as [keyof EditableFields, string][]
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#666]">{label}</label>
                  <input
                    type="text"
                    value={editForm[key]}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                    }
                    className="w-full px-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111] focus:outline-none focus:border-[#f4522d]"
                  />
                </div>
              ))}

              {(() => {
                const nested = (editLead.raw_payload && typeof editLead.raw_payload === "object")
                  ? (editLead.raw_payload as Record<string, unknown>).raw_payload
                  : null;
                const treatmentTimeline = readRawString(editLead.raw_payload, "treatment_timeline");
                const hairLossLevel = readRawString(editLead.raw_payload, "hair_loss_level");
                const location =
                  readRawString(editLead.raw_payload, "location") ||
                  readRawString(nested, "location");
                if (!treatmentTimeline && !hairLossLevel && !location) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {location && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-[#666]">Location</label>
                        <div className="w-full px-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111]">
                          {location}
                        </div>
                      </div>
                    )}
                    {treatmentTimeline && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-[#666]">Treatment timeline</label>
                        <div className="w-full px-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111]">
                          {treatmentTimeline}
                        </div>
                      </div>
                    )}
                    {hairLossLevel && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-[#666]">Hair loss level</label>
                        <div className="w-full px-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111]">
                          {hairLossLevel}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#666]">Status</label>
                <div className="flex items-center gap-2">
                  <select
                    value={allStatuses.includes(editForm.status) ? editForm.status : "New"}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, status: e.target.value } : prev))
                    }
                    className="flex-1 px-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111] focus:outline-none focus:border-[#f4522d]"
                  >
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAddingStatus((v) => !v)}
                    className="p-2 rounded-md bg-[#f4522d]/10 text-[#f4522d] hover:bg-[#f4522d]/20"
                    title="Add custom status"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: statusBadge(editForm.status).bg, color: statusBadge(editForm.status).fg }}
                  >
                    {editForm.status || "New"}
                  </span>
                </div>
                {addingStatus && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      autoFocus
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomStatus(); } }}
                      placeholder="New status name"
                      className="flex-1 px-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111] focus:outline-none focus:border-[#f4522d]"
                    />
                    <button
                      type="button"
                      onClick={addCustomStatus}
                      className="px-3 py-2 rounded-md text-xs font-semibold bg-[#f4522d] text-white"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[#666]">Call notes</label>
                <textarea
                  rows={5}
                  value={editForm.call_notes}
                  onChange={(e) =>
                    setEditForm((prev) => (prev ? { ...prev, call_notes: e.target.value } : prev))
                  }
                  className="w-full px-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb] text-sm text-[#111111] focus:outline-none focus:border-[#f4522d] resize-y"
                />
              </div>

              {saveError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#ebebeb] bg-white">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="px-3 py-2 rounded-md text-sm text-[#111111] bg-[#f3f3f3] hover:bg-[#e9e9e9] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-3 py-2 rounded-md text-sm text-white bg-[#f4522d] hover:bg-[#dd431f] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
