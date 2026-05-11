import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Mail, Phone as PhoneIcon, Trash2, Pencil, X, Plus, UserCheck, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
};

type RepOption = { id: string; name: string };

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
  const isAdmin = role === "admin";
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

  // Bulk selection + assign (admin only)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRepId, setBulkRepId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { setCustomStatuses(loadCustomStatuses()); }, []);

  // Load reps list (for admin bulk-assign + name lookup)
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("id, name")
        .order("name", { ascending: true });
      setReps((data ?? []) as RepOption[]);
    })();
  }, [ready]);

  const repNameById = (id: string | null | undefined) =>
    reps.find((r) => r.id === id)?.name ?? "—";

  // Collapsed status groups (folder-style)
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

  // Detect duplicates: same normalized phone, or same email when phone is missing.
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

  // Reps see only their own assigned leads; admins see everything.
  const visibleRows = isAdmin ? rows : rows.filter((r) => r.rep_id === user?.id);

  const filtered = visibleRows.filter((r) => {
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
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };
  const bulkAssign = async () => {
    if (!isAdmin || selected.size === 0) return;
    setAssigning(true);
    const ids = Array.from(selected);
    const newRepId = bulkRepId === "" ? null : bulkRepId;
    const { error } = await supabase
      .from("meta_leads")
      .update({ rep_id: newRepId })
      .in("id", ids);
    if (!error) {
      setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, rep_id: newRepId } : r)));
      setSelected(new Set());
    }
    setAssigning(false);
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

  return (
    <div className="h-full md:h-screen overflow-y-auto" style={{ background: "#ffffff" }}>
      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#111111]">Meta Leads</h1>
          <p className="text-sm text-[#111111] mt-1">
            {loading
              ? "Loading…"
              : `${filtered.length} of ${visibleRows.length} leads${duplicateCount > 0 ? ` · ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}` : ""}${isAdmin ? "" : " assigned to you"}`}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#111111]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, status, rep, campaign…"
              className="w-full pl-10 pr-3 py-2 rounded-md bg-[#f9f9f9] border border-[#ebebeb]/10 text-sm text-[#111111] placeholder:text-[#666] focus:outline-none focus:border-[#f4522d]"
            />
          </div>

          {isAdmin && selected.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#fff5f3] border border-[#f4522d]/30">
              <UserCheck className="h-4 w-4 text-[#f4522d]" />
              <span className="text-sm text-[#111111] font-medium">{selected.size} selected</span>
              <select
                value={bulkRepId}
                onChange={(e) => setBulkRepId(e.target.value)}
                className="px-2 py-1.5 rounded bg-white border border-[#ebebeb] text-sm text-[#111111] focus:outline-none focus:border-[#f4522d]"
              >
                <option value="">— Unassigned —</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>{rep.name}</option>
                ))}
              </select>
              <button
                onClick={bulkAssign}
                disabled={assigning}
                className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#f4522d] hover:bg-[#dd431f] disabled:opacity-50"
              >
                {assigning ? "Assigning…" : "Assign"}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="px-2 py-1.5 rounded text-xs text-[#666] hover:text-[#111111]"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#ebebeb]/10 overflow-hidden" style={{ background: "#f9f9f9" }}>
          {loading ? (
            <div className="p-12 text-center text-[#111111] text-sm">Loading leads…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#111111] text-sm">
              {rows.length === 0 ? "No leads yet. Once Make.com posts to your webhook, they'll appear here." : "No leads match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebebeb]/10 text-xs uppercase tracking-wider text-[#111111]">
                    {isAdmin && (
                      <th className="px-3 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && selected.size === filtered.length}
                          onChange={toggleSelectAll}
                          className="accent-[#f4522d] cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="text-left px-4 py-3 font-medium">Received</th>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    {isAdmin && <th className="text-left px-4 py-3 font-medium">Assigned</th>}
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Funding</th>
                    <th className="text-left px-4 py-3 font-medium">Campaign / Ad Set / Ad</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const colSpan = isAdmin ? 9 : 7;
                    // Group filtered rows by status preserving DEFAULT_STATUSES order, then any extras.
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
                      const collapsed = collapsedStatuses.has(statusKey);
                      const headBadge = statusBadge(statusKey);
                      const headerRow = (
                        <tr key={`hdr-${statusKey}`} className="bg-[#f3f3f3] border-b border-[#ebebeb]">
                          <td colSpan={colSpan} className="px-3 py-2">
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
                        className="border-b border-[#ebebeb]/5 hover:bg-white/[0.02] transition-colors"
                        style={dup ? { background: "#fff4e5", borderLeft: "3px solid #f59e0b" } : undefined}
                      >
                        {isAdmin && (
                          <td className="px-3 py-3 w-8">
                            <input
                              type="checkbox"
                              checked={selected.has(r.id)}
                              onChange={() => toggleSelect(r.id)}
                              className="accent-[#f4522d] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-[#111111] whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 text-[#111111] font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{fullName}</span>
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
                        {isAdmin && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.rep_id ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff6ff] text-[#1d4ed8]">
                                {repNameById(r.rep_id)}
                              </span>
                            ) : (
                              <span className="text-xs text-[#999]">Unassigned</span>
                            )}
                          </td>
                        )}
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
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[#f4522d]/15 text-[#7ba3ee] border border-[#f4522d]/30">
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
                                className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded text-xs bg-[#f9f9f9] text-[#111111] hover:bg-[#f9f9f9]"
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
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-[#111111] hover:text-red-400 hover:bg-red-500/10"
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

              {/* Status dropdown with + button */}
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
